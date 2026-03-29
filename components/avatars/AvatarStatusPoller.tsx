"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Props {
  avatarId: string;
  initialStatus: string;
  generatedAt: string; // ISO timestamp of when status became GENERATING (avatar.updatedAt)
}

export function AvatarStatusPoller({ avatarId, initialStatus, generatedAt }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(generatedAt).getTime()) / 1000)
  );

  useEffect(() => {
    if (status !== "GENERATING") return;

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/avatars/${avatarId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        if (data.status !== "GENERATING") {
          clearInterval(poll);
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);

    return () => {
      clearInterval(poll);
      clearInterval(timer);
    };
  }, [avatarId, status, router]);

  if (status === "GENERATING") {
    return (
      <div className="aspect-[9/16] flex flex-col items-center justify-center bg-muted rounded-xl gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium">Generating image…</p>
          <p className="text-xs text-muted-foreground mt-0.5">{elapsed}s elapsed</p>
        </div>
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="aspect-[9/16] flex flex-col items-center justify-center bg-destructive/10 rounded-xl gap-2">
        <p className="text-sm font-medium text-destructive">Generation failed</p>
        <p className="text-xs text-muted-foreground">Try regenerating from the actions below</p>
      </div>
    );
  }

  return null;
}
