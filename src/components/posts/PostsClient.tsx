"use client";

import type { Post } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { addEventListener, onTabMessage } from "@/lib/sse-client";
import { PostsContent } from "./PostsContent";

interface PostsClientProps {
  initialPosts: Array<
    Post & {
      avatar: { id: string; name: string } | null;
    }
  >;
}

export function PostsClient({ initialPosts }: PostsClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [postStatuses, setPostStatuses] = useState<Map<string, string>>(
    new Map(initialPosts.map((p) => [p.id, p.status])),
  );

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let fetchTimeout: NodeJS.Timeout | null = null;

    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/posts/list", { credentials: "include" });
        if (res.ok) {
          const updated = await res.json();
          setPosts(updated);
          const newStatuses = new Map<string, string>();
          for (const post of updated) {
            newStatuses.set(post.id, post.status);
          }
          setPostStatuses(newStatuses);

          const hasGenerating = updated.some((p: Post) => p.status === "GENERATING");
          if (!hasGenerating && pollIntervalRef.current) {
            console.log("[PostsList] Stopping poll - all posts completed");
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("[PostsList] Fetch error:", err);
      }
    };

    const handleUpdate = (payload: unknown) => {
      const update = payload as { postId: string; status: string };
      console.log(`[PostsList] Update: ${update.postId} = ${update.status}`);

      setPostStatuses((prev) => {
        const next = new Map(prev);
        next.set(update.postId, update.status);
        return next;
      });

      if (update.status === "GENERATING") {
        if (!pollIntervalRef.current) {
          console.log("[PostsList] Starting poll");
          pollIntervalRef.current = setInterval(() => {
            fetchPosts();
          }, 2000);
        }
      } else if (
        (update.status === "COMPLETED" || update.status === "FAILED") &&
        pollIntervalRef.current
      ) {
        console.log("[PostsList] Stopping poll");
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        if (fetchTimeout) clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          fetchPosts();
        }, 1000);
      }
    };

    const unsubscribeSse = addEventListener("post-status-update", handleUpdate);
    const unsubscribeTab = onTabMessage("post-status-update", handleUpdate);

    return () => {
      unsubscribeSse();
      unsubscribeTab();
      if (fetchTimeout) clearTimeout(fetchTimeout);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const postsWithLiveStatus = posts.map((post) => ({
    ...post,
    status: postStatuses.get(post.id) || post.status,
  }));

  return <PostsContent posts={postsWithLiveStatus} />;
}
