"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { POST_STATUS } from "@/lib/constants";
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
        if (update.status === SSE_STATUS.ARCHIVED) {
          router.push("/posts");
        } else if (
          update.status !== POST_STATUS.DRAFT &&
          update.status !== POST_STATUS.GENERATING &&
          update.status !== POST_STATUS.COMPLETED &&
          update.status !== POST_STATUS.FAILED
        ) {
          console.error(
            `[PostDetailClient] Received unknown post status: ${update.status} for postId=${postId}`,
          );
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
