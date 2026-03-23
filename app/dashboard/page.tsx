import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils";
import { ArrowUpRight, Zap } from "lucide-react";

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
    <div className="min-h-full bg-background text-foreground relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative px-10 py-10 max-w-6xl mx-auto space-y-14">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-xs font-mono tracking-[0.2em] uppercase">
                Content Studio
              </span>
            </div>
            <h1 className="text-4xl font-light tracking-tight">
              Production
              <span className="ml-3 text-primary">Overview</span>
            </h1>
          </div>
          <Link
            href="/posts/new"
            className="group flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold tracking-widest uppercase px-5 py-2.5 hover:opacity-90 transition-opacity"
          >
            New Post
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 border border-border">
          {[
            { value: avatarCount,    label: "Avatars",     sub: "total created",      accent: false },
            { value: postCount,      label: "Posts",       sub: "all time",            accent: false },
            { value: completedCount, label: "Completed",   sub: "ready to publish",    accent: true  },
            { value: generatingCount,label: "In Progress", sub: "currently running",   accent: false },
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-8 py-8 border-r border-border last:border-r-0 relative hover:bg-muted/30 transition-colors duration-300"
            >
              {stat.accent && (
                <div className="absolute top-0 left-0 right-0 h-px bg-primary/60" />
              )}
              <div
                className="text-5xl font-light tabular-nums mb-3"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  color: stat.accent ? "var(--color-primary)" : undefined,
                  letterSpacing: "-0.02em",
                }}
              >
                {String(stat.value).padStart(2, "0")}
              </div>
              <div className="text-xs font-semibold tracking-[0.15em] uppercase mb-0.5">
                {stat.label}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">
              Completion Rate
            </span>
            <span className="text-[11px] font-mono text-primary">{completionRate}%</span>
          </div>
          <div className="h-px bg-border relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-primary/70 transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Recent posts */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
              Recent Activity
            </h2>
            <Link
              href="/posts"
              className="text-[11px] font-mono text-muted-foreground hover:text-primary tracking-widest uppercase transition-colors"
            >
              View all →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="border border-dashed border-border py-16 text-center">
              <Zap className="h-6 w-6 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No content yet</p>
              <Link
                href="/posts/new"
                className="text-xs text-primary font-mono tracking-widest uppercase hover:opacity-80 transition-opacity"
              >
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="border-t border-border">
              {recentPosts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group flex items-center justify-between py-4 border-b border-border hover:bg-muted/20 -mx-3 px-3 transition-colors duration-200"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <span className="text-[11px] font-mono text-muted-foreground/50 w-5 shrink-0 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {post.title}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {post.avatar.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 ml-6">
                    <PlatformChip platform={post.platform} />
                    <StatusPip status={post.status} />
                    <span className="text-[11px] font-mono text-muted-foreground/50 w-16 text-right">
                      {formatDistanceToNow(post.createdAt)}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-mono text-muted-foreground/40 tracking-widest uppercase">
            UGC AI Platform
          </span>
          <div className="h-px flex-1 bg-border" />
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
    <span className="text-[10px] font-mono tracking-widest border border-border text-muted-foreground px-2 py-0.5">
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  DRAFT:      { dot: "bg-muted-foreground/40",         label: "Draft"      },
  GENERATING: { dot: "bg-yellow-400 animate-pulse",    label: "Generating" },
  COMPLETED:  { dot: "bg-primary",                     label: "Done"       },
  FAILED:     { dot: "bg-destructive",                 label: "Failed"     },
};

function StatusPip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      <span className="text-[10px] font-mono text-muted-foreground tracking-wide">{cfg.label}</span>
    </div>
  );
}
