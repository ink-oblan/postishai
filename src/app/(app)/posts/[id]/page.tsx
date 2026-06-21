import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptionPostPanel } from "@/components/posts/CaptionPostPanel";
import { PostEditPanel } from "@/components/posts/PostEditPanel";
import { VideoSection } from "@/components/posts/VideoSection";
import { prisma } from "@/lib/db";
import { listVoices } from "@/lib/heygen/client";
import { getLLMModelInfo } from "@/lib/llm-models/registry";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { isPostEditable } from "@/lib/posts";
import { formatDistanceToNow, PLATFORM_LABELS, STATUS_CONFIG } from "@/lib/utils";

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; avatarId?: string }>;
}) {
  const { id } = await params;
  const { edit, avatarId } = await searchParams;
  const [post, voices] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: { avatar: true, avatarVariation: true, media: { orderBy: { order: "asc" } } },
    }),
    listVoices().catch(() => []),
  ]);
  if (!post) notFound();

  if (post.type === "CAPTION") {
    return (
      <div className="space-y-6 px-6 py-8 sm:px-10">
        <div className="flex items-center gap-3">
          <Link
            href="/posts"
            className="inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="max-w-3xl">
          <CaptionPostPanel
            post={{
              id: post.id,
              title: post.title,
              platformLabel: PLATFORM_LABELS[post.platform],
              caption: post.caption ?? "",
              createdAtLabel: formatDistanceToNow(post.createdAt),
              media: post.media.map((m) => ({
                id: m.id,
                type: m.type,
                url: `/api/posts/${post.id}/media/${m.id}`,
              })),
            }}
          />
        </div>
      </div>
    );
  }

  const avatar = post.avatar;
  if (!avatar) notFound();

  const voice = voices.find((v) => v.voice_id === avatar.voiceId);
  const llmModel = getLLMModelInfo(post.llmModelId);

  const metadata: PlatformMetadata | null = post.metadata ? JSON.parse(post.metadata) : null;
  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
  const canEditPost = isPostEditable(post);

  return (
    <div className="space-y-6 px-6 py-8 sm:px-10">
      <div className="flex items-center gap-3">
        <Link
          href="/posts"
          className="inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4">
          {/* Video / generation area */}
          <VideoSection
            post={{
              id: post.id,
              status: post.status,
              videoPath: post.videoPath,
              errorMessage: post.errorMessage,
              generationStartedAt: post.generationStartedAt?.toISOString() ?? null,
            }}
          />
        </div>

        <div className="space-y-4 md:col-span-2">
          <PostEditPanel
            editable={canEditPost}
            post={{
              id: post.id,
              title: post.title,
              platformLabel: PLATFORM_LABELS[post.platform],
              statusLabel: statusCfg.label,
              script: post.script ?? "",
              llmModelId: post.llmModelId,
              llmModelName: llmModel?.name ?? post.llmModelId,
              avatarId: avatar.id,
              avatarName: avatar.name,
              avatarImageUrl: `/api/avatars/${avatar.id}/image?t=${avatar.updatedAt.getTime()}`,
              avatarVariationId: post.avatarVariationId,
              avatarVariationImageUrl: post.avatarVariation
                ? `/api/avatars/${avatar.id}/variations/${post.avatarVariation.id}/image?t=${post.avatarVariation.updatedAt.getTime()}`
                : null,
              voiceName: voice?.name ?? null,
              createdAtLabel: formatDistanceToNow(post.createdAt),
              status: post.status,
              downloadUrl: post.status === "COMPLETED" ? `/api/posts/${post.id}/download` : null,
              metadata,
              metadataStatus: post.metadataStatus,
              metadataErrorMessage: post.metadataErrorMessage,
            }}
            initialEditing={edit === "1" && canEditPost}
            initialAvatarId={avatarId ?? null}
          />
        </div>
      </div>
    </div>
  );
}
