import sharp from "sharp";
import { broadcastAvatarStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { getImageAdapter } from "@/lib/image-models/registry";
import { isMockEnabled, MOCK_TIMINGS } from "@/lib/mock-config";
import { generateMockAvatarImage } from "@/lib/mock-generators";
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

    let buffer: Buffer;

    if (isMockEnabled()) {
      // Mock mode: simulate generation with a placeholder image
      ctx.log(`[avatar.generate] MOCK MODE: waiting ${MOCK_TIMINGS.AVATAR_IMAGE}ms`);
      await new Promise((resolve) => setTimeout(resolve, MOCK_TIMINGS.AVATAR_IMAGE));
      buffer = await generateMockAvatarImage(avatarId);
      ctx.log(`[avatar.generate] MOCK MODE: generated placeholder`);
    } else {
      // Real generation
      const adapter = getImageAdapter(imageModel);
      const result = await adapter.generate({ prompt, aspectRatio: "9:16" });

      buffer = Buffer.from(result.base64, "base64");
      if (result.mimeType !== "image/jpeg") {
        buffer = (await sharp(buffer).jpeg({ quality: 90 }).toBuffer()) as Buffer;
      }
    }

    const imagePath = `avatars/${avatarId}.jpg`;

    const avatar = await ctx.db.avatar.findUnique({ where: { id: avatarId } });
    if (!avatar) {
      throw new Error(`Avatar ${avatarId} not found`);
    }

    if (avatar.imagePath) {
      await archiveFile(avatar.imagePath).catch(() => null);
    }

    await writeFile(imagePath, buffer);

    return { imagePath };
  },
  async onSuccess(db, payload, result) {
    const avatar = await db.avatar.update({
      where: { id: payload.avatarId },
      data: {
        imagePath: result.imagePath,
        status: "COMPLETED",
        errorMessage: null,
      },
    });
    if (avatar.userId) {
      const userId = avatar.userId;
      try {
        await broadcastWithContext("avatar-generate-success", () =>
          broadcastAvatarStatusUpdate(userId, payload.avatarId, "COMPLETED"),
        );
      } catch (broadcastErr) {
        console.error(
          `[avatar-generate-success] Broadcast failed for avatarId=${payload.avatarId}:`,
          broadcastErr,
        );
      }
    }
  },
  async onFailure(db, payload, error) {
    const avatar = await db.avatar
      .update({
        where: { id: payload.avatarId },
        data: {
          status: "FAILED",
          errorMessage: error,
        },
      })
      .catch((dbErr) => {
        console.error(
          `[avatar-generate-failure] DB update failed for avatarId=${payload.avatarId}:`,
          dbErr,
        );
        return null;
      });
    if (avatar?.userId) {
      const userId = avatar.userId;
      try {
        await broadcastWithContext("avatar-generate-failure", () =>
          broadcastAvatarStatusUpdate(userId, payload.avatarId, "FAILED"),
        );
      } catch (broadcastErr) {
        console.error(
          `[avatar-generate-failure] Broadcast failed for avatarId=${payload.avatarId}:`,
          broadcastErr,
        );
      }
    }
  },
  classifyError(error) {
    return isRetryableError(error) ? "retryable" : "permanent";
  },
};
