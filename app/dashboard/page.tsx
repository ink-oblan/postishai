import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";
import { ArrowUpRight, Zap, Plus } from "lucide-react";

export default async function DashboardPage() {
  const [avatarCount, postCount, recentPosts] = await Promise.all([
    prisma.avatar.count(),
    prisma.post.count(),
    prisma.post.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { avatar: { select: { name: true } } },
    }),
  ]);

  const statusCounts = await prisma.post.groupBy({ by: ["status"], _count: true });
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));

  const completedCount = byStatus["COMPLETED"] ?? 0;
  const generatingCount = byStatus["GENERATING"] ?? 0;
  const completionRate = postCount > 0 ? Math.round((completedCount / postCount) * 100) : 0;

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="px-6 py-8 sm:px-10 space-y-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
          </div>
          <Link
            href="/posts/new"
            className="group inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Post
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              label: "Completed",
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
              className="relative bg-card rounded-2xl border border-border px-5 py-5 hover:border-primary/30 transition-colors duration-200"
            >
              {stat.accent && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary rounded-t-2xl" />
              )}
              <div
                className="text-4xl sm:text-5xl font-bold tabular-nums mb-3 tracking-tight"
                style={{
                  color: stat.accent ? "var(--color-primary)" : undefined,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(stat.value).padStart(2, "0")}
              </div>
              <div className="text-sm font-semibold text-foreground mb-0.5">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Completion progress ── */}
        <div className="bg-card rounded-2xl border border-border px-5 py-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground">Completion Rate</span>
            <span className="text-sm font-bold text-primary">{completionRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {completedCount} of {postCount} posts completed
          </p>
        </div>

        {/* ── Recent posts ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
            <Link
              href="/posts"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border py-16 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-4">No content yet</p>
              <Link
                href="/posts/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Create your first post
              </Link>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {recentPosts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group flex items-center justify-between px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors duration-150"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{post.avatar.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-4">
                    <PlatformChip platform={post.platform} />
                    <StatusPip status={post.status} />
                    <span className="hidden sm:block text-xs text-muted-foreground/60 w-16 text-right font-mono">
                      {formatDistanceToNow(post.createdAt)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/avatars/new"
            className="group flex items-center gap-4 bg-card rounded-2xl border border-border px-5 py-4 hover:border-primary/30 transition-all duration-200"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">New Avatar</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create a new AI persona</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary ml-auto transition-colors" />
          </Link>

          <Link
            href="/posts/new"
            className="group flex items-center gap-4 bg-card rounded-2xl border border-border px-5 py-4 hover:border-primary/30 transition-all duration-200"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">New Post</p>
              <p className="text-xs text-muted-foreground mt-0.5">Generate video content</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary ml-auto transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "IG",
  TIKTOK: "TK",
  YOUTUBE_SHORTS: "YT",
};

function PlatformChip({ platform }: { platform: string }) {
  return (
    <span className="hidden sm:inline-flex text-[11px] font-semibold tracking-wide border border-border text-muted-foreground px-2 py-0.5 rounded-md">
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  DRAFT:      { dot: "bg-muted-foreground/40",          label: "Draft"      },
  GENERATING: { dot: "bg-yellow-400 animate-pulse",     label: "Generating" },
  COMPLETED:  { dot: "bg-primary",                      label: "Done"       },
  FAILED:     { dot: "bg-destructive",                  label: "Failed"     },
};

function StatusPip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span className="text-xs text-muted-foreground hidden sm:inline">{cfg.label}</span>
    </div>
  );
}
