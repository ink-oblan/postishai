import { avatarAnalyzeJob } from "@/workers/job_avatar_analyze";
import { avatarGenerateJob } from "@/workers/job_avatar_generate";
import { avatarVariationGenerateJob } from "@/workers/job_avatar_variation_generate";
import { postCaptionGenerateJob } from "@/workers/job_post_caption_generate";
import { postGenerateJob } from "@/workers/job_post_generate";
import { postMetadataJob } from "@/workers/job_post_metadata";

export const jobRegistry = {
  "avatar.generate": avatarGenerateJob,
  "avatar.variation.generate": avatarVariationGenerateJob,
  "avatar.analyze": avatarAnalyzeJob,
  "post.metadata": postMetadataJob,
  "post.caption.generate": postCaptionGenerateJob,
  "post.generate": postGenerateJob,
};
