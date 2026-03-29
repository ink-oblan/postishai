import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, ArrowUpRight } from "lucide-react";
import { PLATFORM_LABELS, STATUS_CONFIG, formatDistanceToNow } from "@/lib/utils";

export default async function PostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true } } },
  });

  return (
    <div className="px-6 py-8 sm:px-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1.5">
            Content Pipeline
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/posts/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-4">No posts yet</p>
          <Link
            href="/posts/new"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create your first post
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Title</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Avatar</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Platform</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Created</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={post.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/posts/${post.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group/link"
                        >
                          {post.title}
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <Link href={`/avatars/${post.avatar.id}`} className="hover:text-primary transition-colors text-sm">
                          {post.avatar.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {PLATFORM_LABELS[post.platform]}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {formatDistanceToNow(post.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        {post.status === "COMPLETED" && (
                          <a href={`/api/posts/${post.id}/download`} download>
                            <Button variant="ghost" size="sm">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {posts.map((post) => {
              const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block bg-card rounded-2xl border border-border px-4 py-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-semibold text-sm text-foreground leading-snug">{post.title}</p>
                    <span className={`shrink-0 inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{post.avatar.name}</span>
                    <span>·</span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {PLATFORM_LABELS[post.platform]}
                    </Badge>
                    <span className="ml-auto">{formatDistanceToNow(post.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
