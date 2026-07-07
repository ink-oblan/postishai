// Avatar upload constraints
export const MAX_AVATAR_SIZE_MB = 10;
export const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

// Caption generation media upload constraints
export const MAX_CAPTION_MEDIA_FILES = 20;
export const MAX_CAPTION_FILE_SIZE_MB = 100;
export const MAX_CAPTION_FILE_SIZE_BYTES = MAX_CAPTION_FILE_SIZE_MB * 1024 * 1024;

// Video aspect ratios
export const ASPECT_RATIO_SINGLE_VIDEO = { width: 9, height: 16 } as const;
export const ASPECT_RATIO_MULTI_MEDIA = { width: 4, height: 5 } as const;
