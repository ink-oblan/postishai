"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-utils";
import { addEventListener } from "@/lib/sse-client";
import { DashboardContent } from "./DashboardContent";

function createDebounce<T>(callback: (value: T) => void, delay: number) {
  let timeoutId: NodeJS.Timeout | null = null;
  return (value: T) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(value);
      timeoutId = null;
    }, delay);
  };
}

interface Props {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);

  const debouncedSetData = useMemo(() => createDebounce(setData, 300), []);

  useEffect(() => {
    const handleUpdate = (payload: unknown) => {
      const update = payload as { stats: DashboardData };
      debouncedSetData(update.stats);
    };

    const unsubscribeInit = addEventListener("init", handleUpdate);
    const unsubscribeStatsRefresh = addEventListener("stats-refresh", handleUpdate);
    const unsubscribePostUpdate = addEventListener("post-status-update", handleUpdate);

    return () => {
      unsubscribeInit();
      unsubscribeStatsRefresh();
      unsubscribePostUpdate();
    };
  }, [debouncedSetData]);

  return <DashboardContent data={data} />;
}
