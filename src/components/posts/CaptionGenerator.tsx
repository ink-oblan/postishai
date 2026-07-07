"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MediaUploader } from "@/components/posts/MediaUploader";
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
import type { MediaFile } from "@/lib/types/media";
import { PLATFORM_LABELS } from "@/lib/utils";

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS"] as const;

export function CaptionGenerator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<string>("INSTAGRAM");
  const [details, setDetails] = useState("");
  const [llmModelId, setLlmModelId] = useState(DEFAULT_LLM_MODEL_ID);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  useEffect(() => {
    fetch("/api/llm-models")
      .then((r) => r.json())
      .then(setLLMModels);
  }, []);

  async function handleGenerate() {
    if (!title.trim()) {
      toast.error("Please enter a title for the post");
      return;
    }
    if (mediaFiles.length === 0) {
      toast.error("Please upload at least one media file");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
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
      const { postId } = await res.json();

      // Navigate to post page where caption will load
      router.push(`/posts/${postId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate caption");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <MediaUploader mediaFiles={mediaFiles} onMediaChange={setMediaFiles} processingCount={0} />

      <div className="space-y-2">
        <Label htmlFor="title">
          Post Title<span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
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

      <Button onClick={handleGenerate} disabled={loading || !title.trim()}>
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
    </div>
  );
}
