import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPostEditable } from "@/lib/posts";
import { getLLMAdapter } from "@/lib/llm-models/registry";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { avatar: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { title, script, llmModelId, archive } = body as { title?: string; script?: string; llmModelId?: string; archive?: boolean };

  if (archive) {
    if (post.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT posts can be archived" }, { status: 409 });
    }
    await prisma.post.update({ where: { id }, data: { archivedAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  }

  if (!isPostEditable(post)) {
    return NextResponse.json({ error: "Only posts without a created video can be edited" }, { status: 409 });
  }
  if (!title?.trim() || !script?.trim()) {
    return NextResponse.json({ error: "Title and script are required" }, { status: 400 });
  }
  if (!llmModelId?.trim()) {
    return NextResponse.json({ error: "Metadata model is required" }, { status: 400 });
  }
  try {
    getLLMAdapter(llmModelId.trim());
  } catch {
    return NextResponse.json({ error: "Unknown metadata model" }, { status: 400 });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: {
      title: title.trim(),
      script: script.trim(),
      llmModelId: llmModelId.trim(),
      status: "DRAFT",
      generationStartedAt: null,
      metadata: null,
      errorMessage: null,
      heygenVideoId: null,
      heygenVideoUrl: null,
    },
  });
  return NextResponse.json(updated);
}
