import type { PostStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

// GET /api/posts/list?status=GENERATING
// Returns posts for authenticated user, optionally filtered by status
export const GET = withAuth(async function GET(req: NextRequest, _ctx, { userId }) {
  const status = req.nextUrl.searchParams.get("status");

  const where = { archivedAt: null, userId } as {
    archivedAt: null;
    userId: string;
    status?: PostStatus;
  };
  if (status) {
    where.status = status as PostStatus;
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true } } },
  });

  return NextResponse.json(posts);
});
