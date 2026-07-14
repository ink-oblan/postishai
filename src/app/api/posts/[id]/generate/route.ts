import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { CONTENT_STATUS } from "@/lib/sse-constants";
import { enqueuePostGenerateJob, enqueuePostMetadataJob } from "@/lib/worker/jobs";

export const POST = withAuth(async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;

  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === CONTENT_STATUS.GENERATING) {
    return NextResponse.json({ error: "Video already generating" }, { status: 409 });
  }
  if (post.status === CONTENT_STATUS.COMPLETED) {
    return NextResponse.json({ error: "Video already completed" }, { status: 409 });
  }

  if (!post.metadata) {
    await enqueuePostMetadataJob({ postId: id });
  }

  const queued = await enqueuePostGenerateJob({ postId: id });
  if (!queued.created) {
    return NextResponse.json({ error: "Video generation already queued" }, { status: 409 });
  }

  const updated = await prisma.post.findUnique({
    where: { id },
    select: { generationStartedAt: true },
  });
  if (!updated) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const generationStartedAt = updated.generationStartedAt?.toISOString() ?? null;

  return NextResponse.json({
    status: CONTENT_STATUS.GENERATING,
    generationStartedAt,
  });
});
