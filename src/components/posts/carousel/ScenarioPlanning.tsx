"use client";

import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LongActionLoader } from "@/components/ui/long-action-loader";
import { POST_STATUS } from "@/lib/constants";
import { POLLING } from "@/lib/polling-config";
import { responseError } from "@/lib/utils";

interface ScenarioPlanningProps {
  postId: string;
  platformLabel: string;
  slideCount: number | null;
  status: string;
  errorMessage: string | null;
  startedAt: string | null;
}

function startedAtMs(startedAt: string | null): number {
  const parsed = startedAt ? new Date(startedAt).getTime() : Number.NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function ScenarioPlanning({
  postId,
  platformLabel,
  slideCount,
  status,
  errorMessage,
  startedAt,
}: ScenarioPlanningProps) {
  const router = useRouter();
  const [planning, setPlanning] = useState(status === POST_STATUS.GENERATING);
  const [error, setError] = useState(errorMessage);
  const [since, setSince] = useState(() => startedAtMs(startedAt));
  const [elapsed, setElapsed] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!planning) return;

    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - since) / 1000)));
    tick();
    const timer = setInterval(tick, POLLING.UI_TIMER);

    return () => clearInterval(timer);
  }, [planning, since]);

  // The worker runs in its own process and never reaches the SSE stream, so the plan is polled for.
  useEffect(() => {
    if (!planning) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/carousel/status`);
        if (!res.ok) return;

        const data = (await res.json()) as { status: string; errorMessage: string | null };
        if (data.status === POST_STATUS.GENERATING) return;

        if (data.status === POST_STATUS.FAILED) {
          setError(data.errorMessage ?? "The plan could not be written");
          setPlanning(false);
          return;
        }

        // A rewrite that failed comes back as a draft, because the slides it was replacing are
        // still there — say so once, since the editor below is about to show the older plan.
        if (data.errorMessage) toast.error(data.errorMessage);

        // The spinner stays up until the refreshed page swaps this view for the editor, so a
        // server render that has not caught up yet cannot flash an empty plan.
        router.refresh();
      } catch {
        // transient, next tick retries
      }
    }, POLLING.STATUS);

    return () => clearInterval(poll);
  }, [planning, postId, router]);

  async function retry() {
    setRetrying(true);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/scenario/plan`, { method: "POST" });
      if (!res.ok) throw await responseError(res, "Failed to restart the plan");

      setError(null);
      setSince(Date.now());
      setPlanning(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restart the plan");
    } finally {
      setRetrying(false);
    }
  }

  if (planning) {
    return (
      <Card data-testid="scenario-planning" className="max-w-2xl">
        <CardContent className="py-12">
          <LongActionLoader
            title="Planning your carousel…"
            description={
              slideCount
                ? `Writing ${slideCount} slides for ${platformLabel}`
                : `Writing the slides for ${platformLabel}`
            }
            elapsedSeconds={elapsed}
            estimate="usually under a minute"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="scenario-planning-failed" className="max-w-2xl border-destructive/30">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-destructive text-sm">Planning failed</p>
        {error && <p className="max-w-md text-center text-muted-foreground text-xs">{error}</p>}
        <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
          {retrying ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
