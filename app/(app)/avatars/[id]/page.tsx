import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AvatarPageContent } from "@/components/avatars/AvatarPageContent";

export default async function AvatarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avatar = await prisma.avatar.findUnique({
    where: { id },
    include: {
      posts: { orderBy: { createdAt: "desc" } },
      variations: { where: { archivedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!avatar) notFound();

  return (
    <div className="px-6 py-8 sm:px-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/avatars" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Link>
      </div>

      <AvatarPageContent
        avatar={{
          id: avatar.id,
          name: avatar.name,
          status: avatar.status,
          updatedAt: avatar.updatedAt.toISOString(),
          prompt: avatar.prompt,
          imageModel: avatar.imageModel,
          voiceId: avatar.voiceId,
          gender: avatar.gender,
          age: avatar.age,
          ethnicity: avatar.ethnicity,
          origin: avatar.origin,
          occupation: avatar.occupation,
          createdAt: avatar.createdAt.toISOString(),
        }}
        initialVariations={avatar.variations.map((v) => ({
          id: v.id,
          label: v.label,
          clothes: v.clothes,
          background: v.background,
          pose: v.pose,
          status: v.status,
          errorMessage: v.errorMessage,
          imagePath: v.imagePath,
          updatedAt: v.updatedAt.toISOString(),
        }))}
        posts={avatar.posts.map((p) => ({
          id: p.id,
          title: p.title,
          platform: p.platform,
          status: p.status,
        }))}
      />
    </div>
  );
}
