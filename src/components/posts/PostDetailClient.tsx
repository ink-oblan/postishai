"use client";

import { useEffect, useState } from "react";
import { addEventListener } from "@/lib/sse-client";

interface PostDetailClientProps {
  postId: string;
  initialStatus: string;
}

export function PostDetailClient({ postId, initialStatus }: PostDetailClientProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const unsubscribe = addEventListener("post-status-update", (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === postId) {
        setStatus(update.status);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [postId]);

  useEffect(() => {
    if (status !== initialStatus && (status === "COMPLETED" || status === "FAILED")) {
      window.location.reload();
    }
  }, [status, initialStatus]);

  return null;
}
