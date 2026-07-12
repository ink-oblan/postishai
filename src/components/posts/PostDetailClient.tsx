"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { addEventListener } from "@/lib/sse-client";
import { SSE_STATUS } from "@/lib/sse-constants";

interface PostDetailClientProps {
  postId: string;
}

export function PostDetailClient({ postId }: PostDetailClientProps) {
  const router = useRouter();

  useEffect(() => {
    const handleUpdate = (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      if (update.postId === postId) {
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

  return null;
}
