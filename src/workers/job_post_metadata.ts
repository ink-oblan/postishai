import { generateMetadata } from "@/lib/metadata/generator";
import { CONTENT_STATUS } from "@/lib/sse-constants";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { JobDefinition, PostMetadataGeneratePayload } from "@/workers/types";

type PostMetadataResult = {
  metadataJson: string;
};

export const postMetadataJob: JobDefinition<"post.metadata", PostMetadataResult> = {
  type: "post.metadata",
  timeoutMs: 3 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ postId }) => `post.metadata:${postId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      postId: readRequiredString(payload, "postId"),
    } satisfies PostMetadataGeneratePayload;
  },
  async onEnqueue(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        metadataStatus: CONTENT_STATUS.GENERATING,
        metadataErrorMessage: null,
      },
    });
  },
  async onStart(db, payload) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        metadataStatus: CONTENT_STATUS.GENERATING,
        metadataErrorMessage: null,
      },
    });
  },
  async run(ctx, payload) {
    ctx.log(`[post.metadata] start postId=${payload.postId}`);

    const post = await ctx.db.post.findUnique({ where: { id: payload.postId } });
    if (!post) {
      throw new Error(`Post ${payload.postId} not found`);
    }
    if (post.script === null) {
      throw new Error(`Post ${payload.postId} is missing a script`);
    }

    const metadata = await generateMetadata(
      post.platform,
      post.script,
      post.title,
      post.llmModelId,
    );
    return { metadataJson: JSON.stringify(metadata) };
  },
  async onSuccess(db, payload, result) {
    await db.post.update({
      where: { id: payload.postId },
      data: {
        metadata: result.metadataJson,
        metadataStatus: CONTENT_STATUS.COMPLETED,
        metadataErrorMessage: null,
        metadataUpdatedAt: new Date(),
      },
    });
  },
  async onFailure(db, payload, error) {
    await db.post
      .update({
        where: { id: payload.postId },
        data: {
          metadataStatus: CONTENT_STATUS.FAILED,
          metadataErrorMessage: error,
        },
      })
      .catch(() => {});
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
