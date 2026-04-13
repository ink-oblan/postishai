import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/jobs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status === "GENERATING") {
    return NextResponse.json({ error: "Video already generating" }, { status: 409 });
  }
  if (post.status === "COMPLETED") {
    return NextResponse.json({ error: "Video already completed" }, { status: 409 });
  }

  if (!post.metadata) {
    await enqueueJob("post.metadata", { postId: id });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { status: "GENERATING", errorMessage: null, generationStartedAt: new Date() },
  });

  await enqueueJob("post.generate", { postId: id });

  return NextResponse.json({
    status: "GENERATING",
    generationStartedAt: updated.generationStartedAt?.toISOString() ?? null,
  });
}
