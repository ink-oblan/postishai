import { avatarAnalyzeJob } from "@/workers/job_avatar_analyze";
import { avatarGenerateJob } from "@/workers/job_avatar_generate";
import { avatarVariationGenerateJob } from "@/workers/job_avatar_variation_generate";
import { carouselSlideImageJob } from "@/workers/job_carousel_slide_image";
import { postGenerateJob } from "@/workers/job_post_generate";
import { postMetadataGenerateJob } from "@/workers/job_post_metadata_generate";

export const jobRegistry = {
  "avatar.generate": avatarGenerateJob,
  "avatar.variation.generate": avatarVariationGenerateJob,
  "avatar.analyze": avatarAnalyzeJob,
  "post.metadata.generate": postMetadataGenerateJob,
  "post.generate": postGenerateJob,
  "carousel.slide.image.generate": carouselSlideImageJob,
};
