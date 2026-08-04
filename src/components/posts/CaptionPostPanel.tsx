"use client";

import { AlertCircle, Check, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { METADATA_STATUS } from "@/lib/constants";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { addEventListener } from "@/lib/sse-client";

interface MediaItem {
  id: string;
  type: string;
  url: string;
}

interface PostData {
  id: string;
  title: string;
  platformLabel: string;
  metadata: PlatformMetadata | null;
  metadataStatus: string;
  metadataErrorMessage: string | null;
  createdAtLabel: string;
  media: MediaItem[];
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-muted-foreground text-xs">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-sm">{children}</p>;
}

function getCaptionText(metadata: PlatformMetadata | null): string {
  if (!metadata) return "";
  if (metadata.platform === "YOUTUBE_SHORTS") return metadata.description;
  return metadata.caption;
}

export function CaptionPostPanel({ post }: { post: PostData }) {
  const router = useRouter();
  const [editingCaption, setEditingCaption] = useState(false);
  const [savedTitle] = useState(post.title);
  const [metadata, setMetadata] = useState(post.metadata);
  const [metadataStatus, setMetadataStatus] = useState(post.metadataStatus);
  const [metadataError, setMetadataError] = useState(post.metadataErrorMessage);
  const [caption, setCaption] = useState(getCaptionText(post.metadata));
  const [savedCaption, setSavedCaption] = useState(getCaptionText(post.metadata));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const captionLoading = metadataStatus === METADATA_STATUS.GENERATING;
  const captionFailed = metadataStatus === METADATA_STATUS.FAILED && !savedCaption;
  const captionChanged = caption.trim() !== (savedCaption?.trim() ?? "");

  // Listen for SSE metadata status updates
  useEffect(() => {
    const unsubscribe = addEventListener("post-metadata-status-update", (payload: unknown) => {
      const update = payload as { postId: string; metadataStatus: string };
      if (update.postId !== post.id) return;

      setMetadataStatus(update.metadataStatus);

      if (update.metadataStatus === METADATA_STATUS.COMPLETED) {
        // Re-fetch post to get updated metadata
        fetch(`/api/posts/${post.id}/status`)
          .then((r) => r.json())
          .then((data) => {
            if (data.metadata) {
              const newCaptionText = getCaptionText(data.metadata as PlatformMetadata);
              setMetadata(data.metadata as PlatformMetadata);
              setSavedCaption(newCaptionText);
              setCaption(newCaptionText);
              setMetadataError(null);
              startTransition(() => router.refresh());
            }
          })
          .catch(console.error);
      } else if (update.metadataStatus === METADATA_STATUS.FAILED) {
        // Re-fetch to surface the failure reason
        fetch(`/api/posts/${post.id}/status`)
          .then((r) => r.json())
          .then((data: { metadataErrorMessage: string | null }) => {
            setMetadataError(data.metadataErrorMessage ?? null);
          })
          .catch(console.error);
      }
    });
    return unsubscribe;
  }, [post.id, router]);

  function handleCancelCaption() {
    setCaption(savedCaption);
    setEditingCaption(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(savedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Post deleted");
      router.push("/posts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  async function handleSaveCaption() {
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: savedTitle, caption }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      setSavedCaption(caption.trim());
      setEditingCaption(false);
      toast.success("Caption updated");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <PropLabel>Title</PropLabel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-xl">{savedTitle}</h1>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <PropLabel>Platform</PropLabel>
          <PropValue>{post.platformLabel}</PropValue>
        </div>

        <div suppressHydrationWarning>
          <PropLabel>Created</PropLabel>
          <PropValue>{post.createdAtLabel}</PropValue>
        </div>
      </div>

      <div className="pt-4">
        <div className="mb-1 flex items-center justify-between">
          <PropLabel>
            Caption
            {captionLoading && <span className="text-destructive">*</span>}
          </PropLabel>
          {!editingCaption && (savedCaption || captionFailed) && (
            <div className="flex items-center gap-2">
              {savedCaption && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/80"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingCaption(true)}
                className="inline-flex items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/80"
              >
                <Pencil className="h-3.5 w-3.5" />
                {savedCaption ? "Edit" : "Write"}
              </button>
            </div>
          )}
        </div>
        {editingCaption ? (
          <div className="space-y-2">
            <Textarea
              value={caption}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
              rows={4}
              required
              className="text-sm leading-relaxed"
            />
            <p className="text-muted-foreground text-xs">{caption.length} characters</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCaption}
                disabled={saving || !caption.trim() || !captionChanged}
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCancelCaption}>
                Cancel
              </Button>
            </div>
          </div>
        ) : captionLoading && !savedCaption ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="font-medium text-sm">Generating caption...</p>
            </div>
          </div>
        ) : captionFailed ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-destructive text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {metadataError ?? "Caption generation failed. You can write one manually below."}
            </span>
          </div>
        ) : (
          <PropValue>
            <span className="whitespace-pre-wrap">{savedCaption}</span>
          </PropValue>
        )}

        {metadata && "hashtags" in metadata && metadata.hashtags.length > 0 && (
          <div className="mt-3">
            <PropLabel>Hashtags</PropLabel>
            <p className="text-muted-foreground text-sm">
              {metadata.hashtags.map((h) => `#${h}`).join(" ")}
            </p>
          </div>
        )}
        {metadata && "tags" in metadata && metadata.tags.length > 0 && (
          <div className="mt-3">
            <PropLabel>Tags</PropLabel>
            <p className="text-muted-foreground text-sm">{metadata.tags.join(", ")}</p>
          </div>
        )}
      </div>

      {post.media.length > 0 && (
        <div className="pt-6">
          <PropLabel>Media</PropLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {post.media.map((m) => (
              <div
                key={m.id}
                className={`relative overflow-hidden rounded-lg bg-muted ${m.type === "VIDEO" ? "aspect-[9/16]" : "aspect-[4/5]"}`}
              >
                {m.type === "VIDEO" ? (
                  <video src={m.url} controls playsInline className="h-full w-full object-cover">
                    <track kind="captions" />
                  </video>
                ) : (
                  <Image src={m.url} alt="" fill className="object-cover" unoptimized />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
