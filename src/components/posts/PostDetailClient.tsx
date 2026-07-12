"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addEventListener } from "@/lib/sse-client";

interface PostDetailClientProps {
  postId: string;
  initialStatus: string;
}

export function PostDetailClient({ postId, initialStatus }: PostDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const handleUpdate = (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === postId) {
        setStatus(update.status as string);
        // If post is archived (deleted), redirect back to posts list
        if (update.status === "ARCHIVED") {
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
    if (status !== initialStatus && (status === "COMPLETED" || status === "FAILED")) {
      window.location.reload();
    }
  }, [status, initialStatus]);

  return null;
}
