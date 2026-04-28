// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPrisma,
  mockHashPassword,
  mockVerifyPassword,
  mockCreateSession,
  mockRedirect,
  mockNotifySignupForApproval,
  mockNotifyApprovalDetails,
  mockVerifySession,
} = vi.hoisted(() => {
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
        update: vi.fn(),
      },
    },
    mockHashPassword: vi.fn(),
    mockVerifyPassword: vi.fn(),
    mockCreateSession: vi.fn(),
    mockRedirect: vi.fn((url: string) => {
      throw new RedirectError(url);
    }),
    mockNotifySignupForApproval: vi.fn(),
    mockNotifyApprovalDetails: vi.fn(),
    mockVerifySession: vi.fn(),
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

vi.mock("@/lib/auth/telegram-approval", () => ({
  notifySignupForApproval: (...args: unknown[]) => mockNotifySignupForApproval(...args),
  notifyApprovalDetails: (...args: unknown[]) => mockNotifyApprovalDetails(...args),
}));

vi.mock("@/lib/auth/dal", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...(args as [string])),
}));

import { login, register, submitApprovalDetails } from "../actions";

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
    const result = await register(
      undefined,
      makeFormData({ name: "", email: "bad", password: "short" }),
    );
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

  it("creates pending user, notifies admin, creates session, and redirects", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue("hashed");
    mockPrisma.user.create.mockResolvedValue({
      id: "user-new",
      name: "John",
      email: "john@example.com",
      approvedAt: null,
      approvalDetails: "creator workflows",
      approvalToken: "approval-token",
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockCreateSession.mockResolvedValue(undefined);
    mockNotifySignupForApproval.mockResolvedValue(undefined);

    await expect(
      register(
        undefined,
        makeFormData({
          name: "John",
          email: "john@example.com",
          password: "secure1pass",
          useCaseDetails: "creator workflows",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/pending-approval");

    expect(mockHashPassword).toHaveBeenCalledWith("secure1pass");
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "John",
          email: "john@example.com",
          passwordHash: "hashed",
          approvalToken: expect.any(String),
          approvalDetails: "creator workflows",
        }),
      }),
    );
    expect(mockNotifySignupForApproval).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-new" }),
    );
    expect(mockCreateSession).toHaveBeenCalledWith("user-new");
    expect(mockRedirect).toHaveBeenCalledWith("/pending-approval");
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
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      approvedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(false);

    const result = await login(
      undefined,
      makeFormData({ email: "john@example.com", password: "wrong" }),
    );

    expect(result?.message).toBe("Invalid email or password.");
  });

  it("creates session and redirects on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      approvedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSession.mockResolvedValue(undefined);

    await expect(
      login(undefined, makeFormData({ email: "john@example.com", password: "correct1pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(mockVerifyPassword).toHaveBeenCalledWith("correct1pass", "hash");
    expect(mockCreateSession).toHaveBeenCalledWith("user-1");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects valid unapproved users to pending approval", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      approvedAt: null,
    });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSession.mockResolvedValue(undefined);

    await expect(
      login(undefined, makeFormData({ email: "john@example.com", password: "correct1pass" })),
    ).rejects.toThrow("NEXT_REDIRECT:/pending-approval");

    expect(mockCreateSession).toHaveBeenCalledWith("user-1");
    expect(mockRedirect).toHaveBeenCalledWith("/pending-approval");
  });
});

describe("submitApprovalDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login without a session", async () => {
    mockVerifySession.mockResolvedValue(null);

    await expect(
      submitApprovalDetails(makeFormData({ useCaseDetails: "I want to test video workflows." })),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("updates details and notifies admin", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user-1" });
    mockPrisma.user.update.mockResolvedValue({
      id: "user-1",
      email: "john@example.com",
      approvalDetails: "I want to test video workflows.",
    });
    mockNotifyApprovalDetails.mockResolvedValue(undefined);

    await expect(
      submitApprovalDetails(makeFormData({ useCaseDetails: "I want to test video workflows." })),
    ).rejects.toThrow("NEXT_REDIRECT:/pending-approval?details=sent");

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { approvalDetails: "I want to test video workflows." },
    });
    expect(mockNotifyApprovalDetails).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
    );
  });
});
