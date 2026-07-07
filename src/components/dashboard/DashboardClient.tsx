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

  // Connect to SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/dashboard/subscribe");

    // BroadcastChannel for cross-tab communication
    const channel = new BroadcastChannel("dashboard-updates");

    eventSource.addEventListener("init", async () => {
      // Initial connection, fetch fresh stats
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (err) {
        console.error("Failed to fetch fresh stats:", err);
      }
    });

    eventSource.addEventListener("stats-refresh", async () => {
      // Server detected stats change, fetch fresh data
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
        }
      } catch (err) {
        console.error("Failed to fetch fresh stats:", err);
      }
    });

    eventSource.addEventListener("post-status-update", async (event) => {
      // Post status changed, refresh stats and broadcast to other tabs
      try {
        const payload = JSON.parse(event.data);
        console.log("[dashboard] Post status update:", payload);

        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const newData = await res.json();
          setData(newData);
          // Broadcast to other tabs
          channel.postMessage({
            type: "stats-updated",
            data: newData,
          });
        }
      } catch (err) {
        console.error("Failed to handle post-status-update:", err);
      }
    });

    eventSource.addEventListener("error", () => {
      console.error("SSE connection error");
      eventSource.close();
    });

    // Listen for updates from other tabs
    channel.onmessage = (event) => {
      if (event.data.type === "stats-updated") {
        console.log("[dashboard] Received stats update from another tab");
        setData(event.data.data);
      }
    };

    return () => {
      eventSource.close();
      channel.close();
    };
  }, []);

  return <DashboardContent data={data} />;
}
