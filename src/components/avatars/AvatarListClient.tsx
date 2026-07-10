"use client";

import { useEffect, useState } from "react";
import { addEventListener } from "@/lib/sse-client";
import { AvatarGrid } from "./AvatarGrid";

interface AvatarWithCount {
  id: string;
  name: string;
  status: string;
  imagePath: string;
  imageModel: string | null;
  createdAt: Date;
  _count: { posts: number };
}

interface AvatarListClientProps {
  initialAvatars: AvatarWithCount[];
}

export function AvatarListClient({ initialAvatars }: AvatarListClientProps) {
  const [avatarStatuses, setAvatarStatuses] = useState<Map<string, string>>(
    new Map(initialAvatars.map((a) => [a.id, a.status])),
  );

  useEffect(() => {
    const handleUpdate = (payload: unknown) => {
      const update = payload as { avatarId: string; status: string };
      if (process.env.NODE_ENV === "development") {
        console.log(`[AvatarList] Update: ${update.avatarId} = ${update.status}`);
      }

      setAvatarStatuses((prev) => {
        const next = new Map(prev);
        next.set(update.avatarId, update.status);
        return next;
      });

      if (update.status === "COMPLETED" || update.status === "FAILED") {
        // Reload page to show updated avatar
        window.location.reload();
      }
    };

    const unsubscribe = addEventListener("avatar-status-update", handleUpdate);

    return () => {
      unsubscribe();
    };
  }, []);

  const avatarsWithLiveStatus = initialAvatars.map((avatar) => ({
    ...avatar,
    status: avatarStatuses.get(avatar.id) || avatar.status,
  }));

  return <AvatarGrid avatars={avatarsWithLiveStatus} />;
}
