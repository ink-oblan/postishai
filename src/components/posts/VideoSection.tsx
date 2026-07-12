"use client";

import { AlertCircle, Loader2, Play, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { POLLING } from "@/lib/polling-config";
import { addEventListener, onTabMessage } from "@/lib/sse-client";

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
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(post.generationStartedAt));

  // Listen for SSE updates or poll if SSE is unavailable
  useEffect(() => {
    if (status !== "GENERATING") return;

    let elapsedTimer: ReturnType<typeof setInterval>;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // Listen for SSE post status updates
    const unsubscribeSse = addEventListener("post-status-update", (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === post.id) {
        setStatus(update.status);
        if (update.status === "COMPLETED" || update.status === "FAILED") {
          if (pollTimer) clearInterval(pollTimer);
          clearInterval(elapsedTimer);
          router.refresh();
        }
      }
    });

    // Also listen to other tab messages
    const unsubscribeTab = onTabMessage("post-status-update", (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === post.id) {
        setStatus(update.status);
        if (update.status === "COMPLETED" || update.status === "FAILED") {
          if (pollTimer) clearInterval(pollTimer);
          clearInterval(elapsedTimer);
          router.refresh();
        }
      }
    });

    // Update elapsed time every second for smooth UI
    setElapsed(getElapsedSeconds(post.generationStartedAt));
    elapsedTimer = setInterval(() => setElapsed(getElapsedSeconds(post.generationStartedAt)), 1000);

    // Fallback polling in case SSE doesn't work
    pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}`, { credentials: "include" });
        if (!res.ok) return;
        const updatedPost = await res.json();
        if (
          updatedPost.status !== status &&
          (updatedPost.status === "COMPLETED" || updatedPost.status === "FAILED")
        ) {
          setStatus(updatedPost.status);
          if (pollTimer) {
            clearInterval(pollTimer);
          }
          clearInterval(elapsedTimer);
          router.refresh();
        }
      } catch (err) {
        console.error("[VideoSection] Poll error:", err);
      }
    }, POLLING.SSE_FALLBACK);

    return () => {
      unsubscribeSse();
      unsubscribeTab();
      clearInterval(elapsedTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [status, post.id, post.generationStartedAt, router]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/generate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start generation");
      }
      const data = (await res.json()) as { status: string; generationStartedAt: string };
      setStatus(data.status);
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
      <Card suppressHydrationWarning>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-medium text-sm">Generating video...</p>
          <p className="text-muted-foreground text-xs" suppressHydrationWarning>
            {elapsed}s elapsed
          </p>
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
      suppressHydrationWarning
    >
      <track kind="captions" />
    </video>
  );
}
