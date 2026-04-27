// @vitest-environment node

import { jwtVerify, SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_SECRET = new TextEncoder().encode("test-secret-key-that-is-at-least-32-chars-long");

const { mockCookieStore, mockPrisma } = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  mockPrisma: {
    session: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth/secret", () => ({
  getSessionSecret: () =>
    new TextEncoder().encode("test-secret-key-that-is-at-least-32-chars-long"),
}));

import { createSession, deleteSession, getSessionCookie, verifySessionToken } from "../session";

describe("verifySessionToken", () => {
  it("verifies a valid JWT and returns the payload", async () => {
    const token = await new SignJWT({ sessionId: "sess-1", userId: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(TEST_SECRET);

    const result = await verifySessionToken(token);
    expect(result).toEqual(expect.objectContaining({ sessionId: "sess-1", userId: "user-1" }));
  });

  it("returns null for an invalid token", async () => {
    const result = await verifySessionToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await new SignJWT({ sessionId: "sess-1", userId: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(new Date(Date.now() - 1000))
      .sign(TEST_SECRET);

    const result = await verifySessionToken(token);
    expect(result).toBeNull();
  });

  it("returns null for a token signed with a different key", async () => {
    const otherKey = new TextEncoder().encode("other-secret-key-that-is-at-least-32-chars!!");
    const token = await new SignJWT({ sessionId: "sess-1", userId: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(otherKey);

    const result = await verifySessionToken(token);
    expect(result).toBeNull();
  });
});

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a DB session and sets a cookie", async () => {
    mockPrisma.session.create.mockResolvedValue({ id: "sess-123" });

    await createSession("user-42");

    expect(mockPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-42",
          expiresAt: expect.any(Date),
        }),
      }),
    );

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );

    // Verify the token in the cookie is valid
    const setCookieCall = mockCookieStore.set.mock.calls[0];
    const token = setCookieCall[1];
    const { payload } = await jwtVerify(token, TEST_SECRET);
    expect(payload.sessionId).toBe("sess-123");
    expect(payload.userId).toBe("user-42");
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes session from DB and clears cookie when token is valid", async () => {
    const token = await new SignJWT({ sessionId: "sess-1", userId: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(TEST_SECRET);

    mockCookieStore.get.mockReturnValue({ value: token });
    mockPrisma.session.delete.mockResolvedValue({});

    await deleteSession();

    expect(mockPrisma.session.delete).toHaveBeenCalledWith({
      where: { id: "sess-1" },
    });
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
  });

  it("just clears cookie when no token exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    await deleteSession();

    expect(mockPrisma.session.delete).not.toHaveBeenCalled();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
  });

  it("still clears cookie when DB delete fails", async () => {
    const token = await new SignJWT({ sessionId: "sess-1", userId: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(TEST_SECRET);

    mockCookieStore.get.mockReturnValue({ value: token });
    mockPrisma.session.delete.mockRejectedValue(new Error("not found"));

    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
  });
});

describe("getSessionCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the cookie value when present", async () => {
    mockCookieStore.get.mockReturnValue({ value: "my-token" });
    const result = await getSessionCookie();
    expect(result).toBe("my-token");
  });

  it("returns undefined when cookie is missing", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const result = await getSessionCookie();
    expect(result).toBeUndefined();
  });
});
