import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueJob } from "@/lib/worker/jobs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const pendingJob = await prisma.job.findFirst({
    where: {
      type: "post.metadata",
      status: { in: ["PENDING", "PROCESSING"] },
      payload: { contains: `"postId":"${id}"` },
    },
  });

  if (pendingJob) {
    return NextResponse.json({ error: "Metadata regeneration already queued" }, { status: 409 });
  }

  await enqueueJob("post.metadata", { postId: id });

  return NextResponse.json({ status: "QUEUED" });
}
