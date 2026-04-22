// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockPrisma, mockHashPassword, mockVerifyPassword, mockCreateSession, mockRedirect } =
  vi.hoisted(() => {
    class RedirectError extends Error {
      url: string;
      constructor(url: string) {
        super(`NEXT_REDIRECT:${url}`);
        this.url = url;
      }
    }
    return {
      mockPrisma: {
        user: {
          findUnique: vi.fn(),
          create: vi.fn(),
        },
      },
      mockHashPassword: vi.fn(),
      mockVerifyPassword: vi.fn(),
      mockCreateSession: vi.fn(),
      mockRedirect: vi.fn((url: string) => {
        throw new RedirectError(url);
      }),
    };
  });

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...(args as [string])),
}));

import { login, register } from "../actions";

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation errors for invalid input", async () => {
    const result = await register(undefined, makeFormData({ name: "", email: "bad", password: "short" }));
    expect(result?.errors).toBeDefined();
  });

  it("returns error when email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const result = await register(
      undefined,
      makeFormData({ name: "John", email: "john@example.com", password: "secure1pass" }),
    );

    expect(result?.message).toBe("An account with this email already exists.");
  });

  it("creates user, session, and redirects on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue("hashed");
    mockPrisma.user.create.mockResolvedValue({ id: "user-new" });
    mockCreateSession.mockResolvedValue(undefined);

    await expect(
      register(undefined, makeFormData({ name: "John", email: "john@example.com", password: "secure1pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mockHashPassword).toHaveBeenCalledWith("secure1pass");
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "John",
          email: "john@example.com",
          passwordHash: "hashed",
        }),
      }),
    );
    expect(mockCreateSession).toHaveBeenCalledWith("user-new");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("validates name minimum length", async () => {
    const result = await register(
      undefined,
      makeFormData({ name: "J", email: "john@example.com", password: "secure1pass" }),
    );
    expect(result?.errors?.name).toBeDefined();
  });

  it("validates password requirements", async () => {
    const result = await register(
      undefined,
      makeFormData({ name: "John", email: "john@example.com", password: "nodigits" }),
    );
    expect(result?.errors?.password).toBeDefined();
  });
});

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation errors for invalid input", async () => {
    const result = await login(undefined, makeFormData({ email: "bad", password: "" }));
    expect(result?.errors).toBeDefined();
  });

  it("returns error when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await login(
      undefined,
      makeFormData({ email: "john@example.com", password: "secure1pass" }),
    );

    expect(result?.message).toBe("Invalid email or password.");
  });

  it("returns error when user has no password hash (OAuth-only)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", passwordHash: null });

    const result = await login(
      undefined,
      makeFormData({ email: "john@example.com", password: "secure1pass" }),
    );

    expect(result?.message).toBe("Invalid email or password.");
  });

  it("returns error when password is wrong", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", passwordHash: "hash" });
    mockVerifyPassword.mockResolvedValue(false);

    const result = await login(
      undefined,
      makeFormData({ email: "john@example.com", password: "wrong" }),
    );

    expect(result?.message).toBe("Invalid email or password.");
  });

  it("creates session and redirects on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", passwordHash: "hash" });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSession.mockResolvedValue(undefined);

    await expect(
      login(undefined, makeFormData({ email: "john@example.com", password: "correct1pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mockVerifyPassword).toHaveBeenCalledWith("correct1pass", "hash");
    expect(mockCreateSession).toHaveBeenCalledWith("user-1");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
