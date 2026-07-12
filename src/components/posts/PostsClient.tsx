"use client";

import type { Post, PostStatus } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { POLLING } from "@/lib/polling-config";
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
  const [postStatuses, setPostStatuses] = useState<Map<string, PostStatus>>(
    new Map(initialPosts.map((p) => [p.id, p.status])),
  );

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPosts = useCallback(async (generating = false) => {
    try {
      const url = generating ? "/api/posts/list?status=GENERATING" : "/api/posts/list";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;

      const updated = await res.json();

      if (generating) {
        // Polling: only update statuses for generating posts
        setPostStatuses((prev) => {
          const newStatuses = new Map(prev);
          for (const post of updated) {
            newStatuses.set(post.id, post.status);
          }
          return newStatuses;
        });

        // Check if any are still generating
        const hasGenerating = updated.some((p: Post) => p.status === "GENERATING");
        if (!hasGenerating && pollIntervalRef.current) {
          if (process.env.NODE_ENV === "development")
            console.log("[PostsList] Stopping poll - all posts completed");
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          // Fetch full list to get updated statuses (COMPLETED/FAILED)
          fetchPosts(false);
        }
      } else {
        // Full refresh: update entire list
        setPosts(updated as typeof initialPosts);
        const newStatuses = new Map<string, PostStatus>();
        for (const post of updated) {
          newStatuses.set(post.id, post.status as PostStatus);
        }
        setPostStatuses(newStatuses);
      }
    } catch (err) {
      console.error("[PostsList] Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    let fullRefreshTimeout: NodeJS.Timeout | null = null;

    const scheduleFullRefresh = () => {
      // Debounce full list refreshes (e.g., from stats-refresh events)
      if (fullRefreshTimeout) clearTimeout(fullRefreshTimeout);
      fullRefreshTimeout = setTimeout(() => {
        fetchPosts(false);
        fullRefreshTimeout = null;
      }, 300);
    };

    const handleUpdate = (payload: unknown) => {
      const update = payload as { postId: string; status: PostStatus };
      if (process.env.NODE_ENV === "development")
        console.log(`[PostsList] Update: ${update.postId} = ${update.status}`);

      setPostStatuses((prev) => {
        const next = new Map(prev);
        next.set(update.postId, update.status);
        return next;
      });

      if (update.status === "GENERATING") {
        if (!pollIntervalRef.current) {
          if (process.env.NODE_ENV === "development")
            console.log("[PostsList] Starting poll for generating posts");
          // First fetch full list to get the new post, then poll for updates
          fetchPosts(false).then(() => {
            if (!pollIntervalRef.current) {
              pollIntervalRef.current = setInterval(() => {
                fetchPosts(true);
              }, POLLING.STATUS);
            }
          });
        }
      } else if (
        (update.status === "COMPLETED" || update.status === "FAILED") &&
        pollIntervalRef.current
      ) {
        if (process.env.NODE_ENV === "development") console.log("[PostsList] Stopping poll");
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        // Schedule a full refresh to get updated statuses
        scheduleFullRefresh();
      }
    };

    const handleStatsRefresh = () => {
      // When stats refresh (which indicates status changes), schedule full list fetch
      if (process.env.NODE_ENV === "development")
        console.log("[PostsList] Stats refreshed, scheduling fetch");
      scheduleFullRefresh();
    };

    const unsubscribePostSse = addEventListener("post-status-update", handleUpdate);
    const unsubscribeStatsSse = addEventListener("stats-refresh", handleStatsRefresh);
    const unsubscribePostTab = onTabMessage("post-status-update", handleUpdate);
    const unsubscribeStatsTab = onTabMessage("stats-refresh", handleStatsRefresh);

    return () => {
      unsubscribePostSse();
      unsubscribeStatsSse();
      unsubscribePostTab();
      unsubscribeStatsTab();
      if (fullRefreshTimeout) clearTimeout(fullRefreshTimeout);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchPosts]);

  const postsWithLiveStatus = posts.map((post) => ({
    ...post,
    status: postStatuses.get(post.id) || post.status,
  }));

  return <PostsContent posts={postsWithLiveStatus} />;
}
