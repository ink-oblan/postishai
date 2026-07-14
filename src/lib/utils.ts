import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE_SHORTS: "YT Shorts",
};

export const PLATFORM_FULL_NAMES: Record<string, string> = {
  INSTAGRAM: "Instagram Reels",
  TIKTOK: "TikTok",
  YOUTUBE_SHORTS: "YouTube Shorts",
};

import { CONTENT_STATUS, STATUS_LABELS } from "@/lib/sse-constants";

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [CONTENT_STATUS.DRAFT]: {
    label: STATUS_LABELS[CONTENT_STATUS.DRAFT],
    className: "bg-muted text-muted-foreground",
  },
  [CONTENT_STATUS.GENERATING]: {
    label: STATUS_LABELS[CONTENT_STATUS.GENERATING],
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  [CONTENT_STATUS.COMPLETED]: {
    label: STATUS_LABELS[CONTENT_STATUS.COMPLETED],
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  [CONTENT_STATUS.FAILED]: {
    label: STATUS_LABELS[CONTENT_STATUS.FAILED],
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};
