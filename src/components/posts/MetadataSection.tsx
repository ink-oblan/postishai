"use client";

import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { AiRegenerateIcon } from "@/components/ui/ai-regenerate-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { METADATA_STATUS } from "@/lib/constants";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { CaptionTagsField } from "./CaptionTagsField";

interface MetadataSectionProps {
  postId: string;
  platformLabel: string;
  metadata: PlatformMetadata | null;
  metadataStatus: string;
  metadataErrorMessage: string | null;
  canRegenerate?: boolean;
  editing?: boolean;
  onChange?: (metadata: PlatformMetadata) => void;
}

export function MetadataSection({
  postId,
  platformLabel,
  metadata,
  metadataStatus,
  metadataErrorMessage,
  canRegenerate = true,
  editing = false,
  onChange,
}: MetadataSectionProps) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const regenerateHint = "It will wipe and regenerate metadata of the post.";

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/posts/${postId}/metadata/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to queue metadata regeneration");
      }
      toast.success("Metadata regeneration started.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue metadata regeneration");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-medium text-sm">{platformLabel} Metadata</CardTitle>
        {canRegenerate && !editing && (
          <CardAction>
            <Tooltip
              content={
                <span className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-golden-earth-600 dark:text-golden-earth-400" />
                  <span>{regenerateHint}</span>
                </span>
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                aria-label={regenerateHint}
              >
                <AiRegenerateIcon spinning={regenerating} />
              </Button>
            </Tooltip>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {metadataStatus === METADATA_STATUS.GENERATING && !metadata ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating metadata...</span>
          </div>
        ) : null}
        {metadataStatus === METADATA_STATUS.FAILED && !metadata ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-destructive text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{metadataErrorMessage ?? "Metadata generation failed."}</span>
          </div>
        ) : null}
        {metadata ? (
          <MetadataDisplay editing={editing} metadata={metadata} onChange={onChange} />
        ) : metadataStatus === METADATA_STATUS.IDLE ? (
          <p className="text-muted-foreground text-sm">No metadata yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetadataDisplay({
  metadata,
  editing,
  onChange,
}: {
  metadata: PlatformMetadata;
  editing: boolean;
  onChange?: (metadata: PlatformMetadata) => void;
}) {
  if (metadata.platform === "INSTAGRAM" || metadata.platform === "TIKTOK") {
    return (
      <CaptionTagsField
        caption={metadata.caption}
        onCaptionChange={(caption) => onChange?.({ ...metadata, caption })}
        tags={metadata.hashtags}
        onTagsChange={(hashtags) => onChange?.({ ...metadata, hashtags })}
        tagPrefix="#"
        tagLabel="hashtag"
        tagPlaceholder="Type a hashtag or paste many hashtags"
        tagSplitOnWhitespace
        editing={editing}
      />
    );
  }

  return (
    <>
      <div>
        <p className="mb-1 text-muted-foreground text-xs">Title</p>
        {editing ? (
          <Input
            value={metadata.title}
            onChange={(e) => onChange?.({ ...metadata, title: e.target.value })}
            className="h-9 text-sm"
            placeholder="e.g. 5 Morning Habits That Changed My Life"
          />
        ) : (
          <p className="font-medium">{metadata.title}</p>
        )}
      </div>
      <CaptionTagsField
        label="Description"
        caption={metadata.description}
        onCaptionChange={(description) => onChange?.({ ...metadata, description })}
        tags={metadata.tags}
        onTagsChange={(tags) => onChange?.({ ...metadata, tags })}
        tagLabel="tag"
        tagPlaceholder="Type a tag or paste comma/newline separated tags"
        editing={editing}
      />
    </>
  );
}
