import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

export const GET = withAuth(async function GET(_req: NextRequest, _ctx, { userId }) {
  const activeWhere = { archivedAt: null, userId };

  const [avatarCount, postCount, recentPosts, statusCounts] = await Promise.all([
    prisma.avatar.count({ where: activeWhere }),
    prisma.post.count({ where: activeWhere }),
    prisma.post.findMany({
      where: activeWhere,
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        avatar: { select: { name: true } },
        createdAt: true,
      },
    }),
    prisma.post.groupBy({
      by: ["status"],
      where: activeWhere,
      _count: true,
    }),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const completedCount = byStatus.COMPLETED ?? 0;
  const generatingCount = byStatus.GENERATING ?? 0;
  const completionRate = postCount > 0 ? Math.round((completedCount / postCount) * 100) : 0;

  return NextResponse.json({
    avatarCount,
    postCount,
    completedCount,
    generatingCount,
    completionRate,
    recentPosts: recentPosts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});
