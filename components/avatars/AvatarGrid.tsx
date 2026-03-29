import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "@/lib/utils";
import { Plus } from "lucide-react";

interface AvatarWithCount {
  id: string;
  name: string;
  imagePath: string;
  imageModel: string | null;
  createdAt: Date;
  _count: { posts: number };
}

export function AvatarGrid({ avatars }: { avatars: AvatarWithCount[] }) {
  if (avatars.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border py-20 text-center">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <svg className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-4">No avatars yet</p>
        <Link
          href="/avatars/new"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Create your first avatar
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {avatars.map((avatar) => (
        <Link key={avatar.id} href={`/avatars/${avatar.id}`} className="group block">
          <div className="bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200">
            <div className="aspect-[9/16] relative bg-muted">
              <Image
                src={`/api/avatars/${avatar.id}/image`}
                alt={avatar.name}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                unoptimized
              />
            </div>
            <div className="px-4 py-3">
              <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                {avatar.name}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-muted-foreground">
                  {avatar._count.posts} post{avatar._count.posts !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(avatar.createdAt)}</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
