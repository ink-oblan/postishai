import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AvatarGrid } from "@/components/avatars/AvatarGrid";

export default async function AvatarsPage() {
  const avatars = await prisma.avatar.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Avatars</h1>
          <p className="text-sm text-muted-foreground mt-1">{avatars.length} avatar{avatars.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/avatars/new" className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 gap-1.5 transition-all hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New Avatar
        </Link>
      </div>
      <AvatarGrid avatars={avatars} />
    </div>
  );
}
