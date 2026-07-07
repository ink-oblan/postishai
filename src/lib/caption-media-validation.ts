import { MAX_CAPTION_FILE_SIZE_BYTES, MAX_CAPTION_MEDIA_FILES } from "@/lib/media-constants";

export interface CaptionMediaValidationError {
  type: "no_files" | "too_many_files" | "file_too_large" | "oversized_files";
  message: string;
  details?: {
    limit?: number;
    oversizedFiles?: Array<{ name: string; size: number }>;
  };
}

export function validateCaptionMedia(files: File[]): CaptionMediaValidationError | null {
  if (files.length === 0) {
    return {
      type: "no_files",
      message: "At least one media file is required",
    };
  }

  if (files.length > MAX_CAPTION_MEDIA_FILES) {
    return {
      type: "too_many_files",
      message: `Maximum ${MAX_CAPTION_MEDIA_FILES} files allowed`,
      details: { limit: MAX_CAPTION_MEDIA_FILES },
    };
  }

  const oversizedFiles = files.filter((f) => f.size > MAX_CAPTION_FILE_SIZE_BYTES);
  if (oversizedFiles.length > 0) {
    return {
      type: "oversized_files",
      message: `${oversizedFiles.length} file(s) exceed ${Math.round(MAX_CAPTION_FILE_SIZE_BYTES / 1024 / 1024)}MB limit`,
      details: {
        oversizedFiles: oversizedFiles.map((f) => ({ name: f.name, size: f.size })),
      },
    };
  }

  return null;
}
