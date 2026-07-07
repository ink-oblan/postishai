import { PostsClient } from "@/components/posts/PostsClient";
import { requireSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

export default async function PostsPage() {
  const { userId } = await requireSession();
  const posts = await prisma.post.findMany({
    where: { archivedAt: null, userId },
    orderBy: { createdAt: "desc" },
    include: { avatar: { select: { id: true, name: true } } },
  });

  return <PostsClient initialPosts={posts} />;
}
