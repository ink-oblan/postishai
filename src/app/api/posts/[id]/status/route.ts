import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId },
    select: {
      status: true,
      videoPath: true,
      errorMessage: true,
      generationStartedAt: true,
      metadataStatus: true,
      metadataErrorMessage: true,
      metadata: true,
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...post,
    generationStartedAt: post.generationStartedAt?.toISOString() ?? null,
  });
});
