import type { DashboardData } from "@/lib/dashboard-utils";

export interface InitEvent {
  stats: DashboardData;
}

export interface StatsRefreshEvent {
  stats: DashboardData;
}

export interface PostStatusUpdateEvent {
  postId: string;
  status: string;
  stats: DashboardData;
}
