import { avatarGenerateJob } from "@/workers/job_avatar_generate";
import { avatarVariationGenerateJob } from "@/workers/job_avatar_variation_generate";
import { postGenerateJob } from "@/workers/job_post_generate";
import { postMetadataJob } from "@/workers/job_post_metadata";

export const jobRegistry = {
  "avatar.generate": avatarGenerateJob,
  "avatar.variation.generate": avatarVariationGenerateJob,
  "post.metadata": postMetadataJob,
  "post.generate": postGenerateJob,
};
