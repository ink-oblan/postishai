export interface HeyGenUploadResponse {
  code: number;
  data: {
    id: string;
    url: string;
  };
}

export interface HeyGenCreateVideoPayload {
  image_asset_id: string;
  script: string;
  voice_id: string;
  title?: string;
  resolution?: "1080p" | "720p";
  aspect_ratio?: "16:9" | "9:16";
}

export interface HeyGenCreateVideoResponse {
  error: null | string;
  data: {
    video_id: string;
    status: string;
  };
}

export type HeyGenVideoStatus = "waiting" | "pending" | "processing" | "completed" | "failed";

export interface HeyGenVideoStatusResponse {
  code: number;
  data: {
    video_id: string;
    status: HeyGenVideoStatus;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: string;
  };
}

export interface HeyGenVoice {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  preview_audio?: string;
}

export interface HeyGenVoicesResponse {
  error: null | string;
  data: {
    voices: HeyGenVoice[];
  };
}
