"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AVATAR_STATUS } from "@/lib/constants";
import { POLLING } from "@/lib/polling-config";
import { addEventListener, onTabMessage } from "@/lib/sse-client";

interface Props {
  avatarId: string;
  initialStatus: string;
  generatedAt: string; // ISO timestamp of when status became GENERATING (avatar.updatedAt)
}

export function AvatarStatusPoller({ avatarId, initialStatus, generatedAt }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(generatedAt).getTime()) / 1000),
  );

  useEffect(() => {
    if (status !== AVATAR_STATUS.GENERATING) return;

    const timer = setInterval(() => setElapsed((s) => s + 1), POLLING.UI_TIMER);

    const handleUpdate = (payload: unknown) => {
      const update = payload as { avatarId: string; status: string };
      if (update.avatarId === avatarId) {
        setStatus(update.status);
        if (update.status !== AVATAR_STATUS.GENERATING) {
          clearInterval(timer);
          router.refresh();
        }
      }
    };

    // Listen for SSE avatar status updates from this tab
    const unsubscribeSse = addEventListener("avatar-status-update", handleUpdate);
    // Listen for avatar status updates from other tabs
    const unsubscribeTab = onTabMessage("avatar-status-update", handleUpdate);

    // Fallback polling in case SSE is unavailable
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/avatars/${avatarId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        if (data.status !== AVATAR_STATUS.GENERATING) {
          clearInterval(poll);
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // ignore transient errors
      }
    }, POLLING.STATUS);

    return () => {
      unsubscribeSse();
      unsubscribeTab();
      clearInterval(poll);
      clearInterval(timer);
    };
  }, [avatarId, status, router]);

  if (status === AVATAR_STATUS.GENERATING) {
    return (
      <div className="flex aspect-[9/16] flex-col items-center justify-center gap-3 rounded-xl bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium text-sm">Generating image…</p>
          <p className="mt-0.5 text-muted-foreground text-xs">{elapsed}s elapsed</p>
        </div>
      </div>
    );
  }

  if (status === AVATAR_STATUS.FAILED) {
    return (
      <div className="flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-xl bg-destructive/10">
        <p className="font-medium text-destructive text-sm">Generation failed</p>
        <p className="text-muted-foreground text-xs">Try regenerating from the actions below</p>
      </div>
    );
  }

  return null;
}
