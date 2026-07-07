"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-utils";
import { addEventListener, onTabMessage } from "@/lib/sse-client";
import { DashboardContent } from "./DashboardContent";

interface Props {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);

  useEffect(() => {
    const handleUpdate = async (payload: unknown) => {
      const update = payload as { stats?: DashboardData };
      if (update.stats) {
        setData(update.stats);
      } else {
        try {
          const res = await fetch("/api/dashboard/stats");
          if (res.ok) {
            const newData = await res.json();
            setData(newData);
          }
        } catch (err) {
          console.error("[dashboard] Fetch error:", err);
        }
      }
    };

    const unsubscribeInit = addEventListener("init", handleUpdate);
    const unsubscribeStatsRefresh = addEventListener("stats-refresh", handleUpdate);
    const unsubscribePostUpdate = addEventListener("post-status-update", handleUpdate);
    const unsubscribeTab = onTabMessage("post-status-update", handleUpdate);

    return () => {
      unsubscribeInit();
      unsubscribeStatsRefresh();
      unsubscribePostUpdate();
      unsubscribeTab();
    };
  }, []);

  return <DashboardContent data={data} />;
}
