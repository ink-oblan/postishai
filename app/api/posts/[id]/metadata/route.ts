import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueueJobInDb } from "@/lib/worker/jobs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
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

  return NextResponse.json({ status: "GENERATING" }, { status: 202 });
}
