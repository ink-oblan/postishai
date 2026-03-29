import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Platform } from "@prisma/client";
import { DEFAULT_LLM_MODEL_ID } from "@/lib/llm-models/registry";

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
  const { title, platform, script, voiceId, avatarId, llmModelId } = body as {
    title: string;
    platform: Platform;
    script: string;
    voiceId: string;
    avatarId: string;
    llmModelId?: string;
  };

  if (!title || !platform || !script || !voiceId || !avatarId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const avatar = await prisma.avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) return NextResponse.json({ error: "Avatar not found" }, { status: 404 });

  const post = await prisma.post.create({
    data: {
      title,
      platform,
      script,
      voiceId,
      avatarId,
      llmModelId: llmModelId ?? DEFAULT_LLM_MODEL_ID,
    },
    include: { avatar: { select: { id: true, name: true, imagePath: true } } },
  });

  return NextResponse.json(post, { status: 201 });
}
