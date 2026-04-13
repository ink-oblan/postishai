import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Platform } from "@prisma/client";
import { DEFAULT_LLM_MODEL_ID, getLLMAdapter } from "@/lib/llm-models/registry";
import { enqueueJob } from "@/lib/worker/jobs";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true, imagePath: true } } },
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, platform, script, avatarId, llmModelId } = body as {
    title: string;
    platform: Platform;
    script: string;
    avatarId: string;
    llmModelId?: string;
  };

  const trimmedTitle = title?.trim();
  const trimmedScript = script?.trim();
  const selectedLlmModelId = llmModelId?.trim() || DEFAULT_LLM_MODEL_ID;

  if (!trimmedTitle || !platform || !trimmedScript || !avatarId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    getLLMAdapter(selectedLlmModelId);
  } catch {
    return NextResponse.json({ error: "Unknown metadata model" }, { status: 400 });
  }

  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) return NextResponse.json({ error: "Avatar not found" }, { status: 404 });

  const post = await prisma.post.create({
    data: {
      title: trimmedTitle,
      platform,
      script: trimmedScript,
      avatarId,
      llmModelId: selectedLlmModelId,
    },
    include: { avatar: { select: { id: true, name: true, imagePath: true } } },
  });

  await enqueueJob("post.metadata", { postId: post.id });

  return NextResponse.json(post, { status: 201 });
}
