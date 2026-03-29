import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AvatarGrid } from "@/components/avatars/AvatarGrid";

export default async function AvatarsPage() {
  const avatars = await prisma.avatar.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="px-6 py-8 sm:px-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1.5">
            Creator Library
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Avatars</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {avatars.length} avatar{avatars.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link
          href="/avatars/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Avatar
        </Link>
      </div>
      <AvatarGrid avatars={avatars} />
    </div>
  );
}
