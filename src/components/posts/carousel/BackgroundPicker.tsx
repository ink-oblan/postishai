"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CAROUSEL_SLIDE_STATUS } from "@/lib/constants";

interface HistoryEntry {
  id: string;
  createdAt: string;
}

interface BackgroundPickerProps {
  postId: string;
  slideId: string;
  visualPrompt: string;
  status: string;
  onRegenerated: () => void;
}

export function BackgroundPicker({
  postId,
  slideId,
  visualPrompt,
  status,
  onRegenerated,
}: BackgroundPickerProps) {
  const [prompt, setPrompt] = useState(visualPrompt);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const generating =
    status === CAROUSEL_SLIDE_STATUS.GENERATING || status === CAROUSEL_SLIDE_STATUS.PENDING;

  useEffect(() => {
    setPrompt(visualPrompt);
  }, [visualPrompt]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a finished generation is what adds a history entry
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/${postId}/carousel/slides/${slideId}/images`)
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((data) => {
        if (!cancelled) setHistory(data.images ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, slideId, status]);

  async function regenerate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/slides/${slideId}/image/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualPrompt: prompt.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to regenerate");
      }
      onRegenerated();
      toast.success("Regenerating the background");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setBusy(false);
    }
  }

  async function restore(imageId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/slides/${slideId}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to switch background");
      }
      onRegenerated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch background");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <Label htmlFor="visual-prompt">Background</Label>
      <Textarea
        id="visual-prompt"
        value={prompt}
        rows={3}
        disabled={generating}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={regenerate}
        disabled={busy || generating || !prompt.trim()}
      >
        {busy || generating ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        )}
        Regenerate
      </Button>

      {history.length > 1 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Previous backgrounds</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => restore(entry.id)}
                disabled={busy}
                className="w-16 shrink-0 overflow-hidden rounded border border-border transition-all hover:border-primary"
              >
                {/* biome-ignore lint/performance/noImgElement: API-served bytes, not a static asset */}
                <img
                  src={`/api/posts/${postId}/carousel/slides/${slideId}/image?v=${entry.id}`}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
