import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAdminAuth, withSuperAdminAuth } from "@/lib/auth/dal";

// GET /api/admin/users — list all users (admin + super admin)
export const GET = withAdminAuth(async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approvedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
});

// PATCH /api/admin/users — update a user's role (super admin only)
export const PATCH = withSuperAdminAuth(async function PATCH(req) {
  const body = await req.json();
  const { userId, role } = body as { userId: string; role: Role };

  if (!userId || !Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json(user);
});
