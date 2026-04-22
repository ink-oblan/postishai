import { Plus } from "lucide-react";
import Link from "next/link";
import { AvatarGrid } from "@/components/avatars/AvatarGrid";
import { prisma } from "@/lib/db";

export default async function AvatarsPage() {
  const avatars = await prisma.avatar.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="space-y-8 px-6 py-8 sm:px-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">Avatars</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {avatars.length} avatar{avatars.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link
          href="/avatars/new"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Avatar
        </Link>
      </div>
      <AvatarGrid avatars={avatars} />
    </div>
  );
}
