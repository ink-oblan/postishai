import { ArrowUpRight, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { PlatformChip } from "@/components/ui/platform-chip";
import { StatusPip } from "@/components/ui/status-pip";
import type { DashboardData } from "@/lib/dashboard-utils";
import { CONTENT_STATUS, STATUS_LABELS } from "@/lib/sse-constants";

export function DashboardContent({ data }: { data: DashboardData }) {
  const { avatarCount, postCount, completedCount, generatingCount, completionRate, recentPosts } =
    data;

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="space-y-10 px-6 py-8 sm:px-10">
        {/* ── Header ── */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="font-bold text-3xl text-foreground tracking-tight sm:text-4xl">
              Dashboard
            </h1>
          </div>
          <Link
            href="/posts/new"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Post
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            {
              value: avatarCount,
              label: "Avatars",
              sub: "Total created",
              accent: false,
            },
            {
              value: postCount,
              label: "Posts",
              sub: "All time",
              accent: false,
            },
            {
              value: completedCount,
              label: STATUS_LABELS[CONTENT_STATUS.COMPLETED],
              sub: "Ready to publish",
              accent: true,
            },
            {
              value: generatingCount,
              label: "In Progress",
              sub: "Currently running",
              accent: false,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="relative rounded-2xl border border-border bg-card px-5 py-5 transition-colors duration-200 hover:border-primary/30"
            >
              {stat.accent && (
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-primary" />
              )}
              <div
                className="mb-3 font-bold text-4xl tabular-nums tracking-tight sm:text-5xl"
                style={{
                  color: stat.accent ? "var(--color-primary)" : undefined,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(stat.value).padStart(2, "0")}
              </div>
              <div className="mb-0.5 font-semibold text-foreground text-sm">{stat.label}</div>
              <div className="text-muted-foreground text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Completion progress ── */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-foreground text-sm">Completion Rate</span>
            <span className="font-bold text-primary text-sm">{completionRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="mt-2 text-muted-foreground text-xs">
            {completedCount} of {postCount} posts completed
          </p>
        </div>

        {/* ── Recent posts ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-base text-foreground">Recent Activity</h2>
            <Link
              href="/posts"
              className="flex items-center gap-1 font-medium text-primary text-xs transition-colors hover:text-primary/80"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="rounded-2xl border border-border border-dashed bg-card py-16 text-center">
              <Zap className="mx-auto mb-4 h-8 w-8 text-muted-foreground/30" />
              <p className="mb-4 font-medium text-muted-foreground text-sm">No content yet</p>
              <Link
                href="/posts/new"
                className="inline-flex items-center gap-1.5 font-semibold text-primary text-sm transition-opacity hover:opacity-80"
              >
                <Plus className="h-4 w-4" />
                Create your first post
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group flex items-center justify-between border-border border-b px-5 py-4 transition-colors duration-150 last:border-b-0 hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-sm transition-colors group-hover:text-primary">
                        {post.title}
                      </p>
                      <PlatformChip platform={post.type} />
                    </div>
                    <p className="text-muted-foreground text-xs">{post.avatar?.name}</p>
                  </div>
                  <StatusPip status={post.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/avatars/new"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm transition-colors group-hover:text-primary">
                New Avatar
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">Create a new AI persona</p>
            </div>
            <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
          </Link>

          <Link
            href="/posts/new"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm transition-colors group-hover:text-primary">
                New Post
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">Generate video content</p>
            </div>
            <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
          </Link>
        </div>
      </div>
    </div>
  );
}
