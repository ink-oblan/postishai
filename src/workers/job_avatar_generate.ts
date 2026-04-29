import { getImageAdapter } from "@/lib/image-models/registry";
import { archiveFile, writeFile } from "@/lib/storage";
import { isRetryableError, parseObjectPayload, readRequiredString } from "@/workers/job-utils";
import type { JobDefinition } from "@/workers/types";

type AvatarGenerateResult = {
  imagePath: string;
};

export const avatarGenerateJob: JobDefinition<"avatar.generate", AvatarGenerateResult> = {
  type: "avatar.generate",
  timeoutMs: 6 * 60 * 1000,
  maxAttempts: 3,
  dedupeKey: ({ avatarId }) => `avatar.generate:${avatarId}`,
  parse(rawPayload) {
    const payload = parseObjectPayload(rawPayload);
    return {
      avatarId: readRequiredString(payload, "avatarId"),
      prompt: readRequiredString(payload, "prompt"),
      imageModel: readRequiredString(payload, "imageModel"),
    };
  },
  async onEnqueue(db, payload) {
    await db.avatar.update({
      where: { id: payload.avatarId },
      data: {
        status: "GENERATING",
        errorMessage: null,
      },
    });
  },
  async onStart(db, payload) {
    await db.avatar.update({
      where: { id: payload.avatarId },
      data: {
        status: "GENERATING",
        errorMessage: null,
      },
    });
  },
  async run(ctx, payload) {
    const { avatarId, prompt, imageModel } = payload;
    ctx.log(`[avatar.generate] start avatarId=${avatarId} model=${imageModel}`);

    const adapter = getImageAdapter(imageModel);
    const result = await adapter.generate({ prompt, aspectRatio: "9:16" });
    const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
    const imagePath = `avatars/${avatarId}.${ext}`;

    const avatar = await ctx.db.avatar.findUnique({ where: { id: avatarId } });
    if (!avatar) {
      throw new Error(`Avatar ${avatarId} not found`);
    }

    if (avatar.imagePath) {
      await archiveFile(avatar.imagePath).catch(() => null);
    }

    await writeFile(imagePath, Buffer.from(result.base64, "base64"));

    return { imagePath };
  },
  async onSuccess(db, payload, result) {
    await db.avatar.update({
      where: { id: payload.avatarId },
      data: {
        imagePath: result.imagePath,
        status: "COMPLETED",
        errorMessage: null,
      },
    });
  },
  async onFailure(db, payload, error) {
    await db.avatar
      .update({
        where: { id: payload.avatarId },
        data: {
          status: "FAILED",
          errorMessage: error,
        },
      })
      .catch(() => {});
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
