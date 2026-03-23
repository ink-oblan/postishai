import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/utils";

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
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No avatars yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {avatars.map((avatar) => (
        <Link key={avatar.id} href={`/avatars/${avatar.id}`}>
          <Card className="overflow-hidden hover:ring-2 ring-primary/30 transition-all cursor-pointer">
            <div className="aspect-square relative bg-muted">
              <Image
                src={`/api/avatars/${avatar.id}/image`}
                alt={avatar.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <CardContent className="p-3">
              <p className="font-medium text-sm truncate">{avatar.name}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{avatar._count.posts} post{avatar._count.posts !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(avatar.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
