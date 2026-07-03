"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  avatarCount: number;
  postCount: number;
  completedCount: number;
  generatingCount: number;
  completionRate: number;
  recentPosts: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    avatar: { name: string } | null;
    createdAt: string;
  }>;
}

import { DashboardContent } from "./DashboardContent";

interface Props {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPolling, setIsPolling] = useState(initialData.generatingCount > 0);

  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const newData = await res.json();
          setData(newData);

          // Stop polling if no more generating posts
          if (newData.generatingCount === 0) {
            setIsPolling(false);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Failed to poll dashboard stats:", err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling]);

  return <DashboardContent data={data} />;
}
