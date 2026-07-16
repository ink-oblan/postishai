"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENT_STATUS } from "@/lib/constants";
import { addEventListener, onTabMessage } from "@/lib/sse-client";
import { SSE_STATUS } from "@/lib/sse-constants";
import { AvatarGrid } from "./AvatarGrid";

interface AvatarWithCount {
  id: string;
  name: string;
  status: string;
  imagePath: string;
  imageModel: string | null;
  createdAt: Date;
  updatedAt?: Date;
  _count: { posts: number };
}

interface AvatarListClientProps {
  initialAvatars: AvatarWithCount[];
}

export function AvatarListClient({ initialAvatars }: AvatarListClientProps) {
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingAvatarIds, setPendingAvatarIds] = useState<Set<string>>(new Set());

  // Clear pending when initialAvatars updates (server refresh completed)
  useEffect(() => {
    const serverAvatarIds = new Set(initialAvatars.map((a) => a.id));
    setPendingAvatarIds((prev) => {
      const next = new Set(prev);
      for (const id of prev) {
        if (serverAvatarIds.has(id)) {
          next.delete(id);
        }
      }
      return next;
    });
  }, [initialAvatars]);

  useEffect(() => {
    const handleUpdate = (payload: unknown) => {
      const update = payload as { avatarId: string; status: string };
      if (process.env.NODE_ENV === "development") {
        console.log(`[AvatarList] Update: ${update.avatarId} = ${update.status}`);
      }

      // Track new avatars
      setPendingAvatarIds((prev) => {
        const isNew = !initialAvatars.some((a) => a.id === update.avatarId);
        if (isNew) {
          return new Set(prev).add(update.avatarId);
        }
        return prev;
      });

      // Refresh when avatar completes, fails, is deleted, or starts regenerating
      if (
        update.status === CONTENT_STATUS.COMPLETED ||
        update.status === CONTENT_STATUS.FAILED ||
        update.status === SSE_STATUS.ARCHIVED ||
        update.status === CONTENT_STATUS.GENERATING
      ) {
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = setTimeout(() => {
          router.refresh();
        }, 500);
      }
    };

    // Listen to avatar updates from this tab's SSE
    const unsubscribeAvatarSse = addEventListener("avatar-status-update", handleUpdate);
    // Listen to avatar updates from other tabs
    const unsubscribeAvatarTab = onTabMessage("avatar-status-update", handleUpdate);

    return () => {
      unsubscribeAvatarSse();
      unsubscribeAvatarTab();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [router, initialAvatars]);

  // Build list: real avatars + mock for pending (not yet in server list)
  const avatarsList = useMemo(() => {
    const serverAvatarIds = new Set(initialAvatars.map((a) => a.id));
    const list: AvatarWithCount[] = [];

    // Add pending avatars as mocks (only if not already in server list)
    for (const avatarId of pendingAvatarIds) {
      if (!serverAvatarIds.has(avatarId)) {
        const now = new Date();
        list.push({
          id: avatarId,
          name: "New Avatar",
          status: CONTENT_STATUS.GENERATING,
          imagePath: "",
          imageModel: null,
          createdAt: now,
          updatedAt: now,
          _count: { posts: 0 },
        });
      }
    }

    // Add real avatars
    list.push(...initialAvatars);

    return list;
  }, [initialAvatars, pendingAvatarIds]);

  return <AvatarGrid avatars={avatarsList} />;
}
