import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CONTENT_STATUS } from "@/lib/constants";
import { formatDistanceToNow } from "@/lib/utils";
import { AvatarStatusPoller } from "./AvatarStatusPoller";

interface AvatarWithCount {
  id: string;
  name: string;
  status: string;
  imagePath: string;
  imageModel: string | null;
  createdAt: Date;
  updatedAt?: Date;
  _count: { posts: number };
}

export function AvatarGrid({ avatars }: { avatars: AvatarWithCount[] }) {
  if (avatars.length === 0) {
    return (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="mb-4 font-medium text-muted-foreground text-sm">No avatars yet</p>
        <Link
          href="/avatars/new"
          className="inline-flex items-center gap-1.5 font-semibold text-primary text-sm transition-opacity hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          Create your first avatar
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {avatars.map((avatar) => (
        <Link key={avatar.id} href={`/avatars/${avatar.id}`} className="group block">
          <div className="overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md">
            <div className="relative aspect-[9/16] bg-muted">
              {avatar.status === CONTENT_STATUS.GENERATING ? (
                <AvatarStatusPoller
                  avatarId={avatar.id}
                  initialStatus={avatar.status}
                  generatedAt={avatar.updatedAt?.toISOString() || new Date().toISOString()}
                />
              ) : avatar.status === CONTENT_STATUS.FAILED ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center">
                  <p className="font-medium text-destructive text-xs">Failed</p>
                </div>
              ) : (
                <Image
                  src={`/api/avatars/${avatar.id}/image?t=${new Date(avatar.updatedAt || avatar.createdAt).getTime()}`}
                  alt={avatar.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  unoptimized
                />
              )}
            </div>
            <div className="px-4 py-3">
              <p className="truncate font-semibold text-foreground text-sm transition-colors group-hover:text-primary">
                {avatar.name}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  {avatar._count.posts} post{avatar._count.posts !== 1 ? "s" : ""}
                </p>
                <p className="text-muted-foreground text-xs" suppressHydrationWarning>
                  {formatDistanceToNow(avatar.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
