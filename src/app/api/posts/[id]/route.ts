import { type NextRequest, NextResponse } from "next/server";
import { broadcastPostStatusUpdate, SSE_STATUS } from "@/app/api/dashboard/subscribe/route";
import { withAuth } from "@/lib/auth/dal";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { METADATA_STATUS, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getLLMAdapter } from "@/lib/llm-models/registry";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { isPostEditable } from "@/lib/posts";
import { archiveFile } from "@/lib/storage";
import { enqueuePostMetadataJob } from "@/lib/worker/jobs";

function normalizeTagList(values: unknown) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => (typeof value === "string" ? value.trim().replace(/^#/, "") : ""))
    .filter(Boolean);
}

function sanitizeMetadata(platform: string, metadata: unknown): PlatformMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;

  if (platform === "INSTAGRAM") {
    const candidate = metadata as { caption?: unknown; hashtags?: unknown };
    if (typeof candidate.caption !== "string") return null;
    return {
      platform: "INSTAGRAM",
      caption: candidate.caption.trim(),
      hashtags: normalizeTagList(candidate.hashtags),
    };
  }

  if (platform === "TIKTOK") {
    const candidate = metadata as { caption?: unknown; hashtags?: unknown };
    if (typeof candidate.caption !== "string") return null;
    return {
      platform: "TIKTOK",
      caption: candidate.caption.trim(),
      hashtags: normalizeTagList(candidate.hashtags),
    };
  }

  if (platform === "YOUTUBE_SHORTS") {
    const candidate = metadata as { title?: unknown; description?: unknown; tags?: unknown };
    if (typeof candidate.title !== "string" || typeof candidate.description !== "string")
      return null;
    return {
      platform: "YOUTUBE_SHORTS",
      title: candidate.title.trim(),
      description: candidate.description.trim(),
      tags: normalizeTagList(candidate.tags),
    };
  }

  return null;
}

export const GET = withAuth(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({
    where: { id, userId },
    include: { avatar: true, media: { orderBy: { order: "asc" } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
});

export const PATCH = withAuth(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  { userId },
) {
  const { id } = await params;
  const post = await prisma.post.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const {
    title,
    script,
    llmModelId,
    avatarId,
    avatarVariationId,
    metadata,
    archive,
    regenerateMetadata,
    caption,
  } = body as {
    title?: string;
    script?: string;
    llmModelId?: string;
    avatarId?: string;
    avatarVariationId?: string | null;
    metadata?: PlatformMetadata | null;
    archive?: boolean;
    regenerateMetadata?: boolean;
    caption?: string;
  };

  if (archive) {
    // Archive the post and broadcast to all tabs
    const archiveAndBroadcast = async () => {
      await prisma.post.update({ where: { id }, data: { archivedAt: new Date() } });
      // Ensure broadcast completes before returning response
      // Log but don't fail the response - archived state is persisted in DB
      try {
        await broadcastWithContext("post-archive", () =>
          broadcastPostStatusUpdate(userId, id, SSE_STATUS.ARCHIVED),
        );
      } catch (broadcastErr) {
        console.error(
          `[PATCH /api/posts/:id] Archive broadcast failed for postId=${id}:`,
          broadcastErr,
        );
      }
    };

    if (post.type === "CAPTION") {
      await archiveAndBroadcast();
      return new NextResponse(null, { status: 204 });
    }
    if (post.status !== POST_STATUS.DRAFT) {
      return NextResponse.json({ error: "Only DRAFT posts can be archived" }, { status: 409 });
    }
    if (post.videoPath) await archiveFile(post.videoPath).catch(() => null);
    await archiveAndBroadcast();
    return new NextResponse(null, { status: 204 });
  }

  if (post.type === "CAPTION") {
    if (!title?.trim() || !caption?.trim()) {
      return NextResponse.json({ error: "Title and caption are required" }, { status: 400 });
    }
    const updated = await prisma.post.update({
      where: { id },
      data: { title: title.trim(), caption: caption.trim() },
    });
    return NextResponse.json(updated);
  }

  if (!isPostEditable(post)) {
    return NextResponse.json(
      { error: "Only posts without a created video can be edited" },
      { status: 409 },
    );
  }
  if (!title?.trim() || !script?.trim()) {
    return NextResponse.json({ error: "Title and script are required" }, { status: 400 });
  }
  if (!llmModelId?.trim()) {
    return NextResponse.json({ error: "Metadata model is required" }, { status: 400 });
  }
  if (!avatarId?.trim()) {
    return NextResponse.json({ error: "Avatar is required" }, { status: 400 });
  }
  try {
    getLLMAdapter(llmModelId.trim());
  } catch {
    return NextResponse.json({ error: "Unknown metadata model" }, { status: 400 });
  }

  const avatar = await prisma.avatar.findFirst({
    where: { id: avatarId.trim(), userId, archivedAt: null },
  });
  if (!avatar) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
  }

  // Validate variation if provided
  if (avatarVariationId !== undefined && avatarVariationId !== null) {
    const variation = await prisma.avatarVariation.findFirst({
      where: { id: avatarVariationId, avatarId: avatar.id, archivedAt: null },
    });
    if (!variation) {
      return NextResponse.json(
        { error: "Avatar variation not found or does not belong to the selected avatar" },
        { status: 404 },
      );
    }
  }

  const trimmedTitle = title.trim();
  const trimmedScript = script.trim();
  const trimmedLlmModelId = llmModelId.trim();
  const nextAvatarId = avatar.id;
  const nextAvatarVariationId =
    avatarVariationId !== undefined ? (avatarVariationId ?? null) : post.avatarVariationId;
  const nextMetadata = sanitizeMetadata(post.platform, metadata);
  // If avatar changed, reset variation (variation belongs to the old avatar)
  const resolvedVariationId = nextAvatarId !== post.avatarId ? null : nextAvatarVariationId;

  const metadataChanged =
    trimmedScript !== post.script ||
    trimmedLlmModelId !== post.llmModelId ||
    nextAvatarId !== post.avatarId;
  const shouldRegenerateMetadata = metadataChanged && regenerateMetadata === true;

  const updated = await prisma.post.update({
    where: { id },
    data: {
      title: trimmedTitle,
      script: trimmedScript,
      llmModelId: trimmedLlmModelId,
      avatarId: nextAvatarId,
      avatarVariationId: resolvedVariationId,
      ...(shouldRegenerateMetadata
        ? {
            status: POST_STATUS.DRAFT,
            generationStartedAt: null,
            metadata: null,
            metadataStatus: METADATA_STATUS.IDLE,
            metadataErrorMessage: null,
            metadataUpdatedAt: null,
            heygenVideoId: null,
            heygenVideoUrl: null,
          }
        : nextMetadata
          ? {
              metadata: JSON.stringify(nextMetadata),
              metadataStatus: METADATA_STATUS.COMPLETED,
              metadataErrorMessage: null,
              metadataUpdatedAt: new Date(),
            }
          : {}),
    },
  });

  if (shouldRegenerateMetadata) {
    await enqueuePostMetadataJob({ postId: id });
  }

  return NextResponse.json({
    ...updated,
    metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
    metadataRegenerated: shouldRegenerateMetadata,
  });
});
