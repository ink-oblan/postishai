import { getImageAdapter } from "@/lib/image-models/registry";
import { readFile, writeFile } from "@/lib/storage";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
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
    const { variationId, prompt, imageModel } = payload;
    const t = Date.now();
    const elapsed = () => `${((Date.now() - t) / 1000).toFixed(1)}s`;
    ctx.log(`[variation.generate] start variationId=${variationId} model=${imageModel}`);

    const variation = await ctx.db.avatarVariation.findUnique({
      where: { id: variationId },
      include: { avatar: true },
    });
    if (!variation) throw new Error(`AvatarVariation ${variationId} not found`);

    ctx.log(`[variation.generate] reading source image (${elapsed()})`);
    const sourceImageBuffer = await readFile(variation.avatar.imagePath);
    const sourceMimeType: "image/png" | "image/jpeg" = variation.avatar.imagePath.endsWith(".jpg")
      ? "image/jpeg"
      : "image/png";
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

    const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
    const imagePath = `avatars/variations/${variationId}.${ext}`;

    if (variation.imagePath) {
      const archivedExt = variation.imagePath.match(/\.\w+$/)?.[0] ?? ".png";
      const archivePath = `avatars/archive/variation_${variationId}_${Date.now()}${archivedExt}`;
      const oldData = await readFile(variation.imagePath).catch(() => null);
      if (oldData) {
        await writeFile(archivePath, oldData).catch(() => {});
      }
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
