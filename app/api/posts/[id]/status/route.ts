import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { status: true, videoPath: true, errorMessage: true, generationStartedAt: true, metadataStatus: true, metadataErrorMessage: true, metadata: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...post,
    generationStartedAt: post.generationStartedAt?.toISOString() ?? null,
  });
}
