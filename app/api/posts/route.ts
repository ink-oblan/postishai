import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Platform } from "@prisma/client";
import { DEFAULT_LLM_MODEL_ID, getLLMAdapter } from "@/lib/llm-models/registry";
import { enqueuePostMetadataJob } from "@/lib/worker/jobs";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET(_req: NextRequest, _ctx: unknown, { userId }) {
  const posts = await prisma.post.findMany({
    where: { archivedAt: null, userId },
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true, imagePath: true } } },
  });
  return NextResponse.json(posts);
});

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown, { userId }) {
  const body = await req.json();
  const { title, platform, script, avatarId, avatarVariationId, llmModelId } = body as {
    title: string;
    platform: Platform;
    script: string;
    avatarId: string;
    avatarVariationId?: string | null;
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

  const avatar = await prisma.avatar.findFirst({ where: { id: avatarId, userId, archivedAt: null } });
  if (!avatar) return NextResponse.json({ error: "Avatar not found" }, { status: 404 });

  if (avatarVariationId) {
    const variation = await prisma.avatarVariation.findFirst({
      where: { id: avatarVariationId, avatarId, archivedAt: null },
    });
    if (!variation) {
      return NextResponse.json({ error: "Invalid avatar variation" }, { status: 400 });
    }
  }

  const post = await prisma.post.create({
    data: {
      title: trimmedTitle,
      platform,
      script: trimmedScript,
      avatarId,
      avatarVariationId: avatarVariationId ?? null,
      llmModelId: selectedLlmModelId,
      userId,
    },
    include: { avatar: { select: { id: true, name: true, imagePath: true } } },
  });

  await enqueuePostMetadataJob({ postId: post.id });

  return NextResponse.json(post, { status: 201 });
});
