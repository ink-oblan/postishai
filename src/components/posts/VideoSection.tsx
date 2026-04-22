"use client";

import { AlertCircle, Loader2, Play, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  post: {
    id: string;
    status: string;
    videoPath: string | null;
    errorMessage: string | null;
    generationStartedAt: string | null;
  };
}

function getElapsedSeconds(startedAt: string | null): number {
  if (!startedAt) return 0;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

export function VideoSection({ post }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(post.status);
  const [generationStartedAt, setGenerationStartedAt] = useState(post.generationStartedAt);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(post.generationStartedAt));

  const pollStatus = useCallback(async () => {
    const res = await fetch(`/api/posts/${post.id}/status`);
    const data = (await res.json()) as {
      status: string;
      generationStartedAt: string | null;
    };
    setStatus(data.status);
    setGenerationStartedAt(data.generationStartedAt);
    if (data.status === "COMPLETED" || data.status === "FAILED") {
      router.refresh();
    }
    return data;
  }, [post.id, router]);

  // Poll while GENERATING
  useEffect(() => {
    if (status !== "GENERATING") return;
    let interval: ReturnType<typeof setInterval>;
    let timer: ReturnType<typeof setInterval>;

    interval = setInterval(async () => {
      const next = await pollStatus();
      if (next.status === "COMPLETED" || next.status === "FAILED") {
        clearInterval(interval);
        clearInterval(timer);
      }
    }, 5000);

    setElapsed(getElapsedSeconds(generationStartedAt));
    timer = setInterval(() => setElapsed(getElapsedSeconds(generationStartedAt)), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [status, pollStatus, generationStartedAt]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start generation");
      }
      const data = (await res.json()) as { status: string; generationStartedAt: string | null };
      setStatus(data.status);
      setGenerationStartedAt(data.generationStartedAt);
      setElapsed(getElapsedSeconds(data.generationStartedAt));
      toast.success("Video generation started!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setGenerating(false);
    }
  }

  if (status === "COMPLETED" && post.videoPath) {
    const filename = post.videoPath.split("/").pop() as string;
    return (
      <Card className="overflow-hidden">
        <VideoPlayer src={`/api/storage/${filename}`} />
      </Card>
    );
  }

  if (status === "GENERATING") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-medium text-sm">Generating video...</p>
          <p className="text-muted-foreground text-xs">{elapsed}s elapsed</p>
          <p className="text-muted-foreground text-xs">This usually takes 30–120 seconds</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "FAILED") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium text-destructive text-sm">Generation failed</p>
          {post.errorMessage && (
            <p className="max-w-xs text-center text-muted-foreground text-xs">
              {post.errorMessage}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // DRAFT state
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
        <Video className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No video yet</p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function VideoPlayer({ src }: { src: string }) {
  return (
    <video
      src={src}
      controls
      playsInline
      className="w-full"
      style={{ height: "auto", display: "block" }}
    >
      <track kind="captions" />
    </video>
  );
}
