"use client";

import { Check, Copy, Loader2, Save, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_LLM_MODEL_ID } from "@/lib/llm-models/registry";
import { PLATFORM_LABELS } from "@/lib/utils";

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

interface MediaFile {
  id: string;
  type: "image" | "video";
  name: string;
  dataUrl: string;
}

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS"] as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CaptionGenerator() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<string>("INSTAGRAM");
  const [details, setDetails] = useState("");
  const [llmModelId, setLlmModelId] = useState(DEFAULT_LLM_MODEL_ID);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/llm-models")
      .then((r) => r.json())
      .then(setLLMModels);
  }, []);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const newFiles = await Promise.all(
      files.map(async (file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        type: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
        name: file.name,
        dataUrl: await readFileAsDataUrl(file),
      })),
    );
    setMediaFiles((prev) => [...prev, ...newFiles]);
  }

  function handleRemoveFile(id: string) {
    setMediaFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          platform,
          details: details.trim() || undefined,
          llmModelId,
          media: mediaFiles.map((f) => ({ type: f.type, dataUrl: f.dataUrl })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate caption");
      }
      const { caption: generated } = await res.json();
      setCaption(generated);
      setCopied(false);
      if (!title.trim()) setTitle(topic.trim() || "Caption post");
      toast.success("Caption generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate caption");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSavePost() {
    setSaving(true);
    try {
      const res = await fetch("/api/posts/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          platform,
          caption,
          media: mediaFiles.map((f) => ({ type: f.type, dataUrl: f.dataUrl })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save post");
      }
      const post = await res.json();
      toast.success("Post saved!");
      router.push(`/posts/${post.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Media (optional)</Label>
        <p className="text-muted-foreground text-xs">
          Upload your finished photo, video, or carousel images so the AI can describe what&apos;s
          shown and write a caption that fits.
        </p>
        <div className="flex flex-wrap gap-2">
          {mediaFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs"
            >
              <span className="max-w-40 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveFile(f.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Label
            htmlFor="media-upload"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload media
          </Label>
          <input
            id="media-upload"
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={handleFilesSelected}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">Topic (optional)</Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
          placeholder="e.g. Summer Sale Announcement"
        />
      </div>

      <div className="space-y-2">
        <Label>Platform</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Button
              key={p}
              type="button"
              variant={platform === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPlatform(p)}
            >
              {PLATFORM_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Additional details (optional)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDetails(e.target.value)}
          placeholder="Anything specific the caption should mention..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select value={llmModelId} onValueChange={(v: string | null) => v && setLlmModelId(v)}>
          <SelectTrigger>
            <SelectValue>
              {llmModels.find((m) => m.id === llmModelId)?.name ?? llmModelId}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {llmModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Caption
          </>
        )}
      </Button>

      {caption && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="caption">Caption</Label>
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
          </div>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
            rows={4}
          />
          <p className="text-muted-foreground text-xs">{caption.length} characters</p>

          <div className="space-y-2 pt-2">
            <Label htmlFor="post-title">Post title</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale Announcement"
            />
          </div>

          <Button onClick={handleSavePost} disabled={saving || !title.trim() || !caption.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Post
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
