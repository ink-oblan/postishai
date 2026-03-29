import { prisma } from "@/lib/db";

export type AvatarGeneratePayload = {
  avatarId: string;
  prompt: string;
  imageModel: string;
};

export type PostGeneratePayload = {
  postId: string;
};

export type JobPayload = {
  "avatar.generate": AvatarGeneratePayload;
  "post.generate": PostGeneratePayload;
};

export async function enqueueJob<T extends keyof JobPayload>(
  type: T,
  payload: JobPayload[T]
): Promise<void> {
  await prisma.job.create({
    data: { type, payload: JSON.stringify(payload) },
  });
}
