import { broadcastAvatarStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { getImageAdapter } from "@/lib/image-models/registry";
import { CONTENT_STATUS } from "@/lib/sse-constants";
import { archiveFile, readFile, writeFile } from "@/lib/storage";
import { safeDbUpdate } from "@/workers/db-utils";
import {
  isRetryableError,
  parseObjectPayload,
  readOptionalString,
  readRequiredString,
} from "@/workers/job-utils";
import type { JobDefinition } from "@/workers/types";

type AvatarVariationGenerateResult = {
  imagePath: string;
};

export const avatarVariationGenerateJob: JobDefinition<
  "avatar.variation.generate",
  AvatarVariationGenerateResult
> = {
  type: "avatar.variation.generate",
  timeoutMs: 10 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ variationId }) => `avatar.variation.generate:${variationId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      variationId: readRequiredString(payload, "variationId"),
      prompt: readRequiredString(payload, "prompt"),
      imageModel: readRequiredString(payload, "imageModel"),
      sourceImagePath: readOptionalString(payload, "sourceImagePath"),
    };
  },
  async onEnqueue(db, payload) {
    await db.avatarVariation.update({
      where: { id: payload.variationId },
      data: { status: CONTENT_STATUS.GENERATING, errorMessage: null },
    });
  },
  async onStart(db, payload) {
    await db.avatarVariation.update({
      where: { id: payload.variationId },
      data: { status: CONTENT_STATUS.GENERATING, errorMessage: null },
    });
  },
  async run(ctx, payload) {
    const { variationId, prompt, imageModel, sourceImagePath } = payload;
    const t = Date.now();
    const elapsed = () => `${((Date.now() - t) / 1000).toFixed(1)}s`;
    ctx.log(`[variation.generate] start variationId=${variationId} model=${imageModel}`);

    const variation = await ctx.db.avatarVariation.findUnique({
      where: { id: variationId },
      include: { avatar: true },
    });
    if (!variation) throw new Error(`AvatarVariation ${variationId} not found`);

    ctx.log(`[variation.generate] reading source image (${elapsed()})`);
    const sourcePath = sourceImagePath ?? variation.avatar.imagePath;
    const sourceImageBuffer = await readFile(sourcePath);
    const sourceMimeType = "image/jpeg" as const;
    const sourceBase64 = sourceImageBuffer.toString("base64");
    ctx.log(
      `[variation.generate] source image loaded ${(sourceImageBuffer.length / 1024).toFixed(0)}KB (${elapsed()})`,
    );

    const adapter = getImageAdapter(imageModel);
    ctx.log(`[variation.generate] calling image model... (${elapsed()})`);
    const result = await adapter.generate({
      prompt,
      aspectRatio: "9:16",
      sourceImage: { base64: sourceBase64, mimeType: sourceMimeType },
    });
    ctx.log(`[variation.generate] image model returned ${result.mimeType} (${elapsed()})`);

    const imagePath = `avatars/variations/${variationId}.jpg`;

    if (variation.imagePath) {
      await archiveFile(variation.imagePath).catch(() => null);
    }

    await writeFile(imagePath, Buffer.from(result.base64, "base64"));
    ctx.log(`[variation.generate] done, saved to ${imagePath} (${elapsed()})`);

    return { imagePath };
  },
  async onSuccess(db, payload, result) {
    const variation = await safeDbUpdate(
      () =>
        db.avatarVariation.update({
          where: { id: payload.variationId },
          data: {
            imagePath: result.imagePath,
            status: CONTENT_STATUS.COMPLETED,
            errorMessage: null,
            heygenAssetId: null,
            heygenAssetUrl: null,
          },
          include: { avatar: true },
        }),
      "avatar-variation-generate-success",
      payload.variationId,
    );
    if (variation?.avatar?.userId) {
      const userId = variation.avatar.userId;
      await broadcastWithContext("avatar-status-update", () =>
        broadcastAvatarStatusUpdate(userId, variation.avatarId, CONTENT_STATUS.COMPLETED),
      ).catch(() => {});
    }
  },
  async onFailure(db, payload, error) {
    const variation = await safeDbUpdate(
      () =>
        db.avatarVariation.update({
          where: { id: payload.variationId },
          data: { status: CONTENT_STATUS.FAILED, errorMessage: error },
          include: { avatar: true },
        }),
      "avatar-variation-generate-failure",
      payload.variationId,
    );
    if (variation?.avatar?.userId) {
      const userId = variation.avatar.userId;
      await broadcastWithContext("avatar-status-update", () =>
        broadcastAvatarStatusUpdate(userId, variation.avatarId, CONTENT_STATUS.FAILED),
      ).catch(() => {});
    }
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
