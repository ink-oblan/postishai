import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { CONTENT_STATUS } from "@/lib/sse-constants";
import { enqueueJobInDb } from "@/lib/worker/jobs";

export const POST = withAuth(async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;

  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const queued = await prisma.$transaction(async (tx) => {
    const result = await enqueueJobInDb(tx, "post.metadata", { postId: id });
    if (result.created) {
      await tx.post.update({ where: { id }, data: { metadata: null } });
    }
    return result;
  });

  if (!queued.created) {
    return NextResponse.json({ error: "Metadata regeneration already queued" }, { status: 409 });
  }

  return NextResponse.json({ status: CONTENT_STATUS.GENERATING }, { status: 202 });
});
