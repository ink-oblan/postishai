import { getImageAdapter } from "@/lib/image-models/registry";
import { archiveFile, readFile, writeFile } from "@/lib/storage";
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
      data: { status: "GENERATING", errorMessage: null },
    });
  },
  async onStart(db, payload) {
    await db.avatarVariation.update({
      where: { id: payload.variationId },
      data: { status: "GENERATING", errorMessage: null },
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
    await db.avatarVariation.update({
      where: { id: payload.variationId },
      data: {
        imagePath: result.imagePath,
        status: "COMPLETED",
        errorMessage: null,
        heygenAssetId: null,
        heygenAssetUrl: null,
      },
    });
  },
  async onFailure(db, payload, error) {
    await db.avatarVariation
      .update({
        where: { id: payload.variationId },
        data: { status: "FAILED", errorMessage: error },
      })
      .catch(() => {});
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
