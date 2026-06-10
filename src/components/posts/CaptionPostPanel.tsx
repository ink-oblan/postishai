"use client";

import { Check, Copy, Loader2, Pencil } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  statusLabel: string;
  caption: string;
  createdAtLabel: string;
  media: MediaItem[];
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-muted-foreground text-xs">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return <p className="font-medium text-sm">{children}</p>;
}

export function CaptionPostPanel({ post }: { post: PostData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [savedTitle, setSavedTitle] = useState(post.title);
  const [savedCaption, setSavedCaption] = useState(post.caption);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasChanges = title.trim() !== savedTitle || caption.trim() !== savedCaption;

  function handleCancel() {
    setTitle(savedTitle);
    setCaption(savedCaption);
    setEditing(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(savedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, caption }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      setSavedTitle(title.trim());
      setSavedCaption(caption.trim());
      setEditing(false);
      toast.success("Post updated");
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
            {editing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-8 text-sm"
              />
            ) : (
              <h1 className="truncate font-semibold text-xl">{savedTitle}</h1>
            )}
          </div>
          <div className="shrink-0">
            {editing ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !caption.trim() || !hasChanges}
                >
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <PropLabel>Platform</PropLabel>
          <PropValue>{post.platformLabel}</PropValue>
        </div>

        <div>
          <PropLabel>Status</PropLabel>
          <PropValue>{post.statusLabel}</PropValue>
        </div>

        <div>
          <PropLabel>Created</PropLabel>
          <PropValue>{post.createdAtLabel}</PropValue>
        </div>
      </div>

      <div className="pt-4">
        <div className="mb-1 flex items-center justify-between">
          <PropLabel>Caption</PropLabel>
          {!editing && (
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
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={caption}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
              rows={4}
              required
              className="text-sm leading-relaxed"
            />
            <p className="text-muted-foreground text-xs">{caption.length} characters</p>
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
                className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted"
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
