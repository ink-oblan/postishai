import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import type { PostStatusValue } from "@/lib/constants";
import { prisma } from "@/lib/db";

// GET /api/posts/list?status=GENERATING
// Returns posts for authenticated user, optionally filtered by status
export const GET = withAuth(async function GET(req: NextRequest, _ctx, { userId }) {
  const status = req.nextUrl.searchParams.get("status") as PostStatusValue | null;

  const where: { archivedAt: null; userId: string; status?: PostStatusValue } = {
    archivedAt: null,
    userId,
  };
  if (status) {
    where.status = status;
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true } } },
  });

  return NextResponse.json(posts);
});
