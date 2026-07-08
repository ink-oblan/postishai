// @vitest-environment node
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type NextRouteContext = { params: Promise<Record<string, string>> };

const { mockGetSessionCookie, mockVerifySessionToken, mockPrisma } = vi.hoisted(() => ({
  mockGetSessionCookie: vi.fn(),
  mockVerifySessionToken: vi.fn(),
  mockPrisma: {
    session: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@prisma/client", () => ({
  Role: { USER: "USER", ADMIN: "ADMIN", SUPER_ADMIN: "SUPER_ADMIN" },
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionCookie: (...args: unknown[]) => mockGetSessionCookie(...args),
  verifySessionToken: (...args: unknown[]) => mockVerifySessionToken(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("react", () => ({
  cache: (fn: (...args: never) => unknown) => fn,
}));

import {
  ApprovalRequiredError,
  AuthError,
  ForbiddenError,
  requireSession,
  verifySession,
  withAdminAuth,
  withAuth,
  withSuperAdminAuth,
} from "../dal";

const fakeUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  avatarUrl: null,
  role: "USER" as const,
  approvedAt: new Date(),
};

describe("verifySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no cookie exists", async () => {
    mockGetSessionCookie.mockResolvedValue(undefined);
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns null when token is invalid", async () => {
    mockGetSessionCookie.mockResolvedValue("bad-token");
    mockVerifySessionToken.mockResolvedValue(null);
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns null when session not found in DB", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue(null);
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns null when session is expired", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
      user: fakeUser,
    });
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns session when everything is valid", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });
    const result = await verifySession();
    expect(result).toEqual({ userId: "user-1", user: fakeUser });
  });
});

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AuthError when no session", async () => {
    mockGetSessionCookie.mockResolvedValue(undefined);
    await expect(requireSession()).rejects.toThrow(AuthError);
  });

  it("returns session when authenticated", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });
    const result = await requireSession();
    expect(result.userId).toBe("user-1");
  });

  it("throws ApprovalRequiredError when user is pending", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: { ...fakeUser, approvedAt: null },
    });

    await expect(requireSession()).rejects.toThrow(ApprovalRequiredError);
  });
});

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSessionCookie.mockResolvedValue(undefined);

    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const request = new Request("http://localhost/api/test");
    const response = await wrapped(
      request as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with session when authenticated", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });

    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler);

    const request = new Request("http://localhost/api/test");
    const response = await wrapped(
      request as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ userId: "user-1", user: fakeUser }),
    );
  });

  it("returns 403 when authenticated user is pending approval", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: { ...fakeUser, approvedAt: null },
    });

    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler);

    const request = new Request("http://localhost/api/test");
    const response = await wrapped(
      request as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("catches AuthError from handler and returns 401", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });

    const handler = vi.fn().mockRejectedValue(new AuthError());
    const wrapped = withAuth(handler);

    const request = new Request("http://localhost/api/test");
    const response = await wrapped(
      request as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );

    expect(response.status).toBe(401);
  });

  it("re-throws non-AuthError errors", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });

    const handler = vi.fn().mockRejectedValue(new Error("unexpected"));
    const wrapped = withAuth(handler);

    const request = new Request("http://localhost/api/test");
    await expect(
      wrapped(request as unknown as NextRequest, {} as unknown as NextRouteContext),
    ).rejects.toThrow("unexpected");
  });

  it("catches P2025 Prisma error from handler and returns 404", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });

    const handler = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));
    const response = await withAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(404);
  });

  it("catches SyntaxError from handler and returns 400", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: fakeUser,
    });

    const handler = vi.fn().mockRejectedValue(new SyntaxError("Unexpected token"));
    const response = await withAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(400);
  });
});

function mockValidSession(role: "USER" | "ADMIN" | "SUPER_ADMIN") {
  mockGetSessionCookie.mockResolvedValue("good-token");
  mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
  mockPrisma.session.findUnique.mockResolvedValue({
    id: "sess-1",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 86400000),
    user: { ...fakeUser, role },
  });
}

describe("withAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSessionCookie.mockResolvedValue(undefined);
    const response = await withAdminAuth(vi.fn())(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when user is pending approval", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: { ...fakeUser, approvedAt: null },
    });
    const response = await withAdminAuth(vi.fn())(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(403);
  });

  it("returns 403 when user role is USER", async () => {
    mockValidSession("USER");
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await withAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when user role is ADMIN", async () => {
    mockValidSession("ADMIN");
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await withAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("calls handler when user role is SUPER_ADMIN", async () => {
    mockValidSession("SUPER_ADMIN");
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await withAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("catches ForbiddenError from handler and returns 403", async () => {
    mockValidSession("ADMIN");
    const handler = vi.fn().mockRejectedValue(new ForbiddenError());
    const response = await withAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(403);
  });
});

describe("withSuperAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSessionCookie.mockResolvedValue(undefined);
    const response = await withSuperAdminAuth(vi.fn())(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when user is pending approval", async () => {
    mockGetSessionCookie.mockResolvedValue("good-token");
    mockVerifySessionToken.mockResolvedValue({ sessionId: "sess-1", userId: "user-1" });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: { ...fakeUser, approvedAt: null },
    });
    const response = await withSuperAdminAuth(vi.fn())(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(403);
  });

  it("returns 403 when user role is USER", async () => {
    mockValidSession("USER");
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await withSuperAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is ADMIN", async () => {
    mockValidSession("ADMIN");
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await withSuperAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when user role is SUPER_ADMIN", async () => {
    mockValidSession("SUPER_ADMIN");
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const response = await withSuperAdminAuth(handler)(
      new Request("http://localhost/api/test") as unknown as NextRequest,
      {} as unknown as NextRouteContext,
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});
