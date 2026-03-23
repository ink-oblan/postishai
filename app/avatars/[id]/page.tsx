import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { PLATFORM_LABELS, STATUS_CONFIG, formatDistanceToNow } from "@/lib/utils";
import { AvatarActions } from "@/components/avatars/AvatarActions";

export default async function AvatarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avatar = await prisma.avatar.findUnique({
    where: { id },
    include: { posts: { orderBy: { createdAt: "desc" } } },
  });
  if (!avatar) notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/avatars" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="aspect-square relative rounded-xl overflow-hidden bg-muted">
            <Image
              src={`/api/avatars/${avatar.id}/image`}
              alt={avatar.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <AvatarActions avatar={{ id: avatar.id, name: avatar.name, prompt: avatar.prompt, imageModel: avatar.imageModel }} />
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">{avatar.name}</h1>
            {avatar.prompt && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{avatar.prompt}</p>
            )}
            <div className="flex gap-2 mt-2">
              {avatar.imageModel && <Badge variant="outline" className="text-xs">{avatar.imageModel}</Badge>}
              <span className="text-xs text-muted-foreground">Created {formatDistanceToNow(avatar.createdAt)}</span>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Posts ({avatar.posts.length})</CardTitle>
                <Link href={`/posts/new?avatarId=${avatar.id}`} className="inline-flex items-center rounded-lg border border-border bg-background text-sm font-medium h-7 px-2.5 gap-1 hover:bg-muted transition-colors text-[0.8rem]">
                  <Plus className="h-3.5 w-3.5" />New Post
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {avatar.posts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No posts yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {avatar.posts.map((post) => {
                    const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="flex items-center justify-between py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                      >
                        <p className="text-sm truncate">{post.title}</p>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <Badge variant="outline" className="text-xs">{PLATFORM_LABELS[post.platform]}</Badge>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
