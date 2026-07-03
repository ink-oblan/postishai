// @vitest-environment node
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@prisma/client", () => ({
  Role: { USER: "USER", ADMIN: "ADMIN", SUPER_ADMIN: "SUPER_ADMIN" },
}));

// Bypass auth wrappers — role access is tested in dal.test.ts
vi.mock("@/lib/auth/dal", () => ({
  withAdminAuth: (handler: (...args: unknown[]) => unknown) => handler,
  withSuperAdminAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));

import { GET, PATCH } from "../route";

const makeRequest = (body?: unknown) =>
  new Request("http://localhost/api/admin/users", {
    method: body ? "PATCH" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of users", async () => {
    const users = [
      {
        id: "u1",
        name: "Alice",
        email: "alice@example.com",
        role: "USER",
        approvedAt: null,
        createdAt: new Date(),
      },
      {
        id: "u2",
        name: "Bob",
        email: "bob@example.com",
        role: "ADMIN",
        approvedAt: new Date(),
        createdAt: new Date(),
      },
    ];
    mockPrisma.user.findMany.mockResolvedValue(users);

    const response = await GET(makeRequest(), {});
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0].email).toBe("alice@example.com");
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("returns empty array when no users exist", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    const response = await GET(makeRequest(), {});
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });
});

describe("PATCH /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user role and returns updated user", async () => {
    const updated = { id: "u1", email: "alice@example.com", role: "ADMIN" };
    mockPrisma.user.update.mockResolvedValue(updated);

    const response = await PATCH(makeRequest({ userId: "u1", role: "ADMIN" }), {});
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.role).toBe("ADMIN");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" }, data: { role: "ADMIN" } }),
    );
  });

  it("returns 400 when userId is missing", async () => {
    const response = await PATCH(makeRequest({ role: "ADMIN" }), {});
    expect(response.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("returns 400 when role is invalid", async () => {
    const response = await PATCH(makeRequest({ userId: "u1", role: "SUPERUSER" }), {});
    expect(response.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const response = await PATCH(makeRequest({}), {});
    expect(response.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
