"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { POLLING } from "@/lib/polling-config";
import { addEventListener } from "@/lib/sse-client";
import { SSE_STATUS } from "@/lib/sse-constants";

interface PostDetailClientProps {
  postId: string;
  initialStatus: string;
}

export function PostDetailClient({ postId, initialStatus }: PostDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleUpdate = (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === postId) {
        setStatus(update.status);
        // If post is archived (deleted), redirect back to posts list
        if (update.status === SSE_STATUS.ARCHIVED) {
          router.push("/posts");
        }
      }
    };

    const unsubscribe = addEventListener("post-status-update", handleUpdate);

    return () => {
      unsubscribe();
    };
  }, [postId, router]);

  useEffect(() => {
    const fetchPostStatus = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}`, { credentials: "include" });
        if (!res.ok) return;
        const post = await res.json();
        setStatus(post.status);
      } catch (err) {
        console.error("[PostDetail] Fetch error:", err);
      }
    };

    if (status === "GENERATING") {
      if (!pollIntervalRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[PostDetail] Starting poll for generating post");
        }
        pollIntervalRef.current = setInterval(() => {
          fetchPostStatus();
        }, POLLING.STATUS);
      }
    } else if (pollIntervalRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[PostDetail] Stopping poll");
      }
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [status, postId]);

  useEffect(() => {
    if (status !== initialStatus && (status === "COMPLETED" || status === "FAILED")) {
      window.location.reload();
    }
  }, [status, initialStatus]);

  return null;
}
