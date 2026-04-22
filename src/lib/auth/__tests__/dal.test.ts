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

import { AuthError, requireSession, verifySession, withAuth } from "../dal";

const fakeUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  avatarUrl: null,
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
});
