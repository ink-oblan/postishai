import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

export const GET = withAuth(async function GET(_req: NextRequest, _ctx, { userId }) {
  const posts = await prisma.post.findMany({
    where: { archivedAt: null, userId },
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true } } },
  });

  return NextResponse.json(posts);
});
