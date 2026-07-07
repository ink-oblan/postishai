import type { Post } from "@prisma/client";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { DeletePostButton } from "@/components/posts/DeletePostButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, PLATFORM_LABELS, STATUS_CONFIG } from "@/lib/utils";

interface PostsContentProps {
  posts: Array<
    Post & {
      avatar: { id: string; name: string } | null;
    }
  >;
}

export function PostsContent({ posts }: PostsContentProps) {
  return (
    <div className="space-y-8 px-6 py-8 sm:px-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">Posts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {posts.length} post{posts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/posts/new"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-border border-dashed bg-card py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="mb-4 font-medium text-muted-foreground text-sm">No posts yet</p>
          <Link
            href="/posts/new"
            className="inline-flex items-center gap-1.5 font-semibold text-primary text-sm transition-opacity hover:opacity-80"
          >
            <Plus className="h-4 w-4" />
            Create your first post
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b bg-muted/30">
                  <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Title
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Avatar
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Platform
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={post.id} className="group transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <Link
                          href={`/posts/${post.id}`}
                          className="font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-sm">
                        {post.avatar?.name ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline">{PLATFORM_LABELS[post.platform]}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-lg px-2 py-0.5 font-semibold text-xs ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-sm">
                        {formatDistanceToNow(post.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          {post.videoPath && (
                            <a href={post.videoPath} download target="_blank" rel="noopener">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <DeletePostButton postId={post.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {posts.map((post) => {
              const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/30"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="font-semibold text-foreground text-sm leading-snug">
                      {post.title}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-lg px-2 py-0.5 font-semibold text-xs ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    <span>{post.avatar?.name ?? "—"}</span>
                    <span>·</span>
                    <Badge variant="outline" className="font-semibold text-xs">
                      {PLATFORM_LABELS[post.platform]}
                    </Badge>
                    <span className="ml-auto">{formatDistanceToNow(post.createdAt)}</span>
                    <DeletePostButton postId={post.id} />
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
