import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PLATFORM_LABELS, STATUS_CONFIG, formatDistanceToNow } from "@/lib/utils";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { VideoSection } from "@/components/posts/VideoSection";
import { PostEditPanel } from "@/components/posts/PostEditPanel";
import { listVoices } from "@/lib/heygen/client";
import { isPostEditable } from "@/lib/posts";
import { getLLMModelInfo } from "@/lib/llm-models/registry";

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
    prisma.post.findUnique({ where: { id }, include: { avatar: true } }),
    listVoices().catch(() => []),
  ]);
  if (!post) notFound();

  const voice = voices.find((v) => v.voice_id === post.avatar.voiceId);
  const llmModel = getLLMModelInfo(post.llmModelId);

  const metadata: PlatformMetadata | null = post.metadata ? JSON.parse(post.metadata) : null;
  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
  const canEditPost = isPostEditable(post);

  return (
    <div className="px-6 py-8 sm:px-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/posts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="md:col-span-2 space-y-4">
          <PostEditPanel
            editable={canEditPost}
            post={{
              id: post.id,
              title: post.title,
              platformLabel: PLATFORM_LABELS[post.platform],
              statusLabel: statusCfg.label,
              script: post.script,
              llmModelId: post.llmModelId,
              llmModelName: llmModel?.name ?? post.llmModelId,
              avatarId: post.avatar.id,
              avatarName: post.avatar.name,
              avatarImageUrl: `/api/avatars/${post.avatar.id}/image?t=${post.avatar.updatedAt.getTime()}`,
              voiceName: voice?.name ?? null,
              createdAtLabel: formatDistanceToNow(post.createdAt),
              status: post.status,
              downloadUrl: post.status === "COMPLETED" ? `/api/posts/${post.id}/download` : null,
              metadata,
            }}
            initialEditing={edit === "1" && canEditPost}
            initialAvatarId={avatarId ?? null}
          />
        </div>
      </div>
    </div>
  );
}
