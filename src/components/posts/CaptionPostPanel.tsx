"use client";

import { Check, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MediaItem {
  id: string;
  type: string;
  url: string;
}

interface PostData {
  id: string;
  title: string;
  platformLabel: string;
  caption: string;
  createdAtLabel: string;
  media: MediaItem[];
  status: string;
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-muted-foreground text-xs">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-sm">{children}</p>;
}

export function CaptionPostPanel({ post }: { post: PostData }) {
  const router = useRouter();
  const [editingCaption, setEditingCaption] = useState(false);
  const [savedTitle] = useState(post.title);
  const [savedCaption, setSavedCaption] = useState(post.caption);
  const [caption, setCaption] = useState(post.caption);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [captionLoading, setCaptionLoading] = useState(post.status === "GENERATING");
  const [status, setStatus] = useState(post.status);

  const captionChanged = caption.trim() !== (savedCaption?.trim() ?? "");

  // Poll for caption while status is GENERATING
  useEffect(() => {
    // Only poll if status is GENERATING
    if (status !== "GENERATING") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/status`);
        if (res.ok) {
          const data = await res.json();
          // Update status in real-time
          setStatus(data.status);

          // Update caption if it's ready
          if (data.caption && !caption) {
            setSavedCaption(data.caption);
            setCaption(data.caption);
            setCaptionLoading(false);
            clearInterval(pollInterval);
            startTransition(() => router.refresh());
          }

          // Stop polling if status is no longer GENERATING
          if (data.status !== "GENERATING") {
            clearInterval(pollInterval);
            setCaptionLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to poll caption:", err);
      }
    }, 2000);

    // Timeout after 5 minutes
    const timeout = setTimeout(
      () => {
        clearInterval(pollInterval);
        setCaptionLoading(false);
      },
      5 * 60 * 1000,
    );

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [post.id, status, caption, router]);

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

        <div>
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
          {!editingCaption && savedCaption && (
            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={() => setEditingCaption(true)}
                className="inline-flex items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/80"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
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
        ) : (
          <PropValue>
            <span className="whitespace-pre-wrap">{savedCaption}</span>
          </PropValue>
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
