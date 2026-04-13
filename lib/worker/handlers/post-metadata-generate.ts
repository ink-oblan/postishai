import { prisma } from "@/lib/db";
import { generateMetadata } from "@/lib/metadata/generator";
import type { PostMetadataGeneratePayload } from "../jobs";

const log = (...args: unknown[]) =>
  console.log(`[${new Date().toISOString()}] [post-metadata]`, ...args);
const logError = (...args: unknown[]) =>
  console.error(`[${new Date().toISOString()}] [post-metadata]`, ...args);

export async function handlePostMetadataGenerate(
  payload: PostMetadataGeneratePayload
): Promise<void> {
  const { postId } = payload;
  log(`start postId=${postId}`);

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error(`Post ${postId} not found`);

  log(`generating metadata (model=${post.llmModelId})...`);
  try {
    const metadata = await generateMetadata(post.platform, post.script, post.title, post.llmModelId);
    await prisma.post.update({
      where: { id: postId },
      data: {
        metadata: JSON.stringify(metadata),
        errorMessage: null,
      },
    });
    log(`done postId=${postId}`);
  } catch (err) {
    logError(`metadata generation failed:`, err instanceof Error ? err.message : err);
    throw err;
  }
}
