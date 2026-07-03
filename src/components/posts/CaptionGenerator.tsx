"use client";

import { Check, Copy, Loader2, Save, Sparkles, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  name: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  willCrop: boolean;
}

function getMediaDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not read dimensions of ${file.name}`));
      };
      video.src = url;
    } else {
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not read dimensions of ${file.name}`));
      };
      img.src = url;
    }
  });
}

function needsCrop(width: number, height: number, targetW: number, targetH: number): boolean {
  return Math.abs(width / height - targetW / targetH) > 0.02;
}

async function convertImageForPreview(file: File): Promise<File> {
  // Convert non-JPEG images to JPEG for preview/dimension reading.
  // Videos pass through unchanged.
  if (file.type === "image/jpeg" || file.type.startsWith("video/")) {
    return file;
  }
  const formData = new FormData();
  formData.append("file", file, file.name);
  const res = await fetch("/api/media/convert-to-jpeg", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Failed to convert ${file.name} to JPEG`);
  const jpegBlob = await res.blob();
  const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  return new File([jpegBlob], name, { type: "image/jpeg" });
}

const MAX_FILES = 20;
const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS"] as const;

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
  const mediaFilesRef = useRef<MediaFile[]>(mediaFiles);
  mediaFilesRef.current = mediaFiles;
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [processingMediaCount, setProcessingMediaCount] = useState(0);

  useEffect(() => {
    fetch("/api/llm-models")
      .then((r) => r.json())
      .then(setLLMModels);
  }, []);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    let files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    // Check if we can accept any more files
    if (mediaFiles.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files reached. Remove files to add more.`);
      return;
    }

    // Limit files to available spots
    const spotsAvailable = MAX_FILES - mediaFiles.length;
    const selectedCount = files.length;
    if (files.length > spotsAvailable) {
      toast.warning(
        `Selecting only ${spotsAvailable} of ${selectedCount} files to reach the ${MAX_FILES}-file limit.`,
      );
      files = files.slice(0, spotsAvailable);
    }

    setProcessingMediaCount(files.length);
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const isVideo = file.type.startsWith("video/");
        // For non-JPEG images, convert to JPEG for preview and dimension reading.
        // Videos and JPEG files pass through unchanged.
        const resolved = await convertImageForPreview(file);
        const { width, height } = await getMediaDimensions(resolved);
        // Video aspect ratio depends on total media count:
        // - if this is the only media (current count + incoming = 1), use 9:16
        // - if multiple media, use 4:5 for video too
        const totalMedia = mediaFilesRef.current.length + files.length;
        const [targetW, targetH] = isVideo && totalMedia === 1 ? [9, 16] : [4, 5];
        return {
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          name: resolved.name,
          file: resolved,
          previewUrl: URL.createObjectURL(resolved),
          width,
          height,
          willCrop: needsCrop(width, height, targetW, targetH),
        };
      }),
    );

    const newFiles: MediaFile[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        newFiles.push(result.value);
      } else {
        toast.error(result.reason instanceof Error ? result.reason.message : "Failed to add file");
      }
    }

    // Enforce strict 20-file limit - reject excess files
    let acceptedFiles = newFiles;
    const finalSpotsAvailable = MAX_FILES - mediaFiles.length;
    if (acceptedFiles.length > finalSpotsAvailable) {
      // Revoke URLs for files that won't be accepted
      acceptedFiles.slice(finalSpotsAvailable).forEach((f) => {
        URL.revokeObjectURL(f.previewUrl);
      });
      toast.error(
        `Only ${finalSpotsAvailable} more file(s) can be added. You have ${mediaFiles.length}/${MAX_FILES} files.`,
      );
      acceptedFiles = acceptedFiles.slice(0, finalSpotsAvailable);
    }

    if (acceptedFiles.length > 0) {
      setMediaFiles((prev) => [...prev, ...acceptedFiles]);
      // Recalculate crop flags for all videos after adding new files
      updateVideoCropFlags();
      const totalNow = mediaFiles.length + acceptedFiles.length;
      toast.success(`${acceptedFiles.length} file(s) added (${totalNow}/${MAX_FILES})`);
    }
    setProcessingMediaCount(0);
  }

  function handleRemoveFile(id: string) {
    setMediaFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    // Recalculate crop flags for remaining videos
    updateVideoCropFlags();
  }

  const updateVideoCropFlags = useCallback(() => {
    setMediaFiles((prev) => {
      let needsUpdate = false;
      const updated = prev.map((f) => {
        if (!f.file.type.startsWith("video/")) return f;
        const [targetW, targetH] = prev.length === 1 ? [9, 16] : [4, 5];
        const willCrop = needsCrop(f.width, f.height, targetW, targetH);
        if (f.willCrop !== willCrop) {
          needsUpdate = true;
          return { ...f, willCrop };
        }
        return f;
      });
      return needsUpdate ? updated : prev;
    });
  }, []);

  useEffect(() => {
    return () => {
      for (const f of mediaFilesRef.current) URL.revokeObjectURL(f.previewUrl);
    };
  }, []);

  async function handleGenerate() {
    if (mediaFiles.length === 0) {
      toast.error("Please upload at least one media file");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (topic.trim()) formData.set("topic", topic.trim());
      formData.set("platform", platform);
      if (details.trim()) formData.set("details", details.trim());
      formData.set("llmModelId", llmModelId);
      for (const f of mediaFiles) formData.append("media", f.file, f.name);

      const res = await fetch("/api/posts/generate-caption", {
        method: "POST",
        body: formData,
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
    if (mediaFiles.length === 0) {
      toast.error("Please upload at least one media file");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("platform", platform);
      formData.set("caption", caption);
      for (const f of mediaFiles) formData.append("media", f.file, f.name);

      const res = await fetch("/api/posts/caption", {
        method: "POST",
        body: formData,
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
        <Label>
          Media<span className="text-destructive">*</span>
        </Label>
        <p className="text-muted-foreground text-xs">
          Upload images and videos for AI to analyze and generate captions. Maximum 20 files. (
          {mediaFiles.length}/20)
        </p>
        <div className="flex flex-wrap gap-2">
          {mediaFiles.map((f) => (
            <div
              key={f.id}
              className="group relative h-20 w-20 overflow-hidden rounded-md border bg-muted/40"
            >
              {f.file.type.startsWith("video/") ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={f.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                // biome-ignore lint/performance/noImgElement: blob preview URL, not suited for next/image
                <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => handleRemoveFile(f.id)}
                className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {f.willCrop && (
                <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                  Will crop
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-background/70 px-1 text-[10px]">
                {f.name}
              </span>
            </div>
          ))}
          {mediaFiles.length < MAX_FILES && (
            <>
              <Label
                htmlFor="media-upload"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {processingMediaCount > 0 ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Upload media
                  </>
                )}
              </Label>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={handleFilesSelected}
              />
            </>
          )}
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
