"use client";

import { AlertCircle, Loader2, Play, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONTENT_STATUS } from "@/lib/constants";
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
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState(post.status);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(post.generationStartedAt));

  // Handle SSE updates and cross-tab messages
  useEffect(() => {
    if (status !== CONTENT_STATUS.GENERATING) return;

    const handleStatusUpdate = (newStatus: string) => {
      if (newStatus === CONTENT_STATUS.COMPLETED || newStatus === CONTENT_STATUS.FAILED) {
        // Cancel all timers before reload to prevent memory leak
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setStatus(newStatus);
        window.location.reload();
      }
    };

    const unsubscribeSse = addEventListener("post-status-update", (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === post.id) {
        handleStatusUpdate(update.status);
      }
    });

    const unsubscribeTab = onTabMessage("post-status-update", (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === post.id) {
        handleStatusUpdate(update.status);
      }
    });

    return () => {
      unsubscribeSse();
      unsubscribeTab();
    };
  }, [post.id, status]);

  // Elapsed time display timer
  useEffect(() => {
    if (status !== CONTENT_STATUS.GENERATING) return;

    setElapsed(getElapsedSeconds(post.generationStartedAt));
    const elapsedTimer = setInterval(
      () => setElapsed(getElapsedSeconds(post.generationStartedAt)),
      POLLING.UI_TIMER,
    );

    return () => clearInterval(elapsedTimer);
  }, [status, post.generationStartedAt]);

  // Fallback polling: only active if SSE fails
  useEffect(() => {
    if (status !== CONTENT_STATUS.GENERATING) return;

    const abortController = new AbortController();

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}`, {
          credentials: "include",
          signal: abortController.signal,
        });
        if (!res.ok) return;
        const updatedPost = await res.json();
        // Compare against actual data from server, not stale state
        if (
          updatedPost.status === CONTENT_STATUS.COMPLETED ||
          updatedPost.status === CONTENT_STATUS.FAILED
        ) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setStatus(updatedPost.status);
          window.location.reload();
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[VideoSection] Poll error:", err);
      }
    }, POLLING.SSE_FALLBACK);

    return () => {
      abortController.abort();
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [post.id, status]);

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

  if (status === CONTENT_STATUS.COMPLETED && post.videoPath) {
    const filename = post.videoPath.split("/").pop() as string;
    return (
      <Card className="overflow-hidden">
        <VideoPlayer src={`/api/storage/${filename}`} />
      </Card>
    );
  }

  if (status === CONTENT_STATUS.GENERATING) {
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

  if (status === CONTENT_STATUS.FAILED) {
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
