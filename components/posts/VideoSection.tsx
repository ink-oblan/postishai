"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Loader2, AlertCircle, Video } from "lucide-react";
import { toast } from "sonner";

interface Props {
  post: {
    id: string;
    status: string;
    videoPath: string | null;
    errorMessage: string | null;
  };
}

export function VideoSection({ post }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(post.status);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pollStatus = useCallback(async () => {
    const res = await fetch(`/api/posts/${post.id}/status`);
    const data = await res.json();
    setStatus(data.status);
    if (data.status === "COMPLETED" || data.status === "FAILED") {
      router.refresh();
    }
    return data.status;
  }, [post.id, router]);

  // Poll while GENERATING
  useEffect(() => {
    if (status !== "GENERATING") return;
    let interval: ReturnType<typeof setInterval>;
    let timer: ReturnType<typeof setInterval>;

    interval = setInterval(async () => {
      const s = await pollStatus();
      if (s === "COMPLETED" || s === "FAILED") {
        clearInterval(interval);
        clearInterval(timer);
      }
    }, 5000);

    timer = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [status, pollStatus]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start generation");
      }
      setStatus("GENERATING");
      setElapsed(0);
      toast.success("Video generation started!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setGenerating(false);
    }
  }

  if (status === "COMPLETED" && post.videoPath) {
    const filename = post.videoPath.split("/").pop()!;
    return (
      <Card className="overflow-hidden">
        <VideoPlayer src={`/api/storage/${filename}`} />
      </Card>
    );
  }

  if (status === "GENERATING") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Generating video...</p>
          <p className="text-xs text-muted-foreground">{elapsed}s elapsed</p>
          <p className="text-xs text-muted-foreground">This usually takes 30–120 seconds</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "FAILED") {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Generation failed</p>
          {post.errorMessage && (
            <p className="text-xs text-muted-foreground text-center max-w-xs">{post.errorMessage}</p>
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
      <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
        <Video className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No video yet</p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting...</>
          ) : (
            <><Play className="h-4 w-4 mr-2" />Generate Video</>
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
    />
  );
}
