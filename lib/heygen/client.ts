import type {
  HeyGenUploadResponse,
  HeyGenCreateVideoPayload,
  HeyGenCreateVideoResponse,
  HeyGenVideoStatusResponse,
  HeyGenVoicesResponse,
  HeyGenVoice,
} from "./types";

const API_BASE = "https://api.heygen.com";
const UPLOAD_BASE = "https://upload.heygen.com";

function apiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY not set");
  return key;
}

function headers(extra?: Record<string, string>) {
  return { "x-api-key": apiKey(), ...extra };
}

export async function uploadAvatarImage(
  imageBuffer: Buffer,
  mimeType = "image/png"
): Promise<{ assetId: string; assetUrl: string }> {
  const res = await fetch(`${UPLOAD_BASE}/v1/asset`, {
    method: "POST",
    headers: headers({ "Content-Type": mimeType }),
    body: new Uint8Array(imageBuffer),
  });
  if (!res.ok) throw new Error(`HeyGen upload failed (${res.status}): ${await res.text()}`);
  const json: HeyGenUploadResponse = await res.json();
  return { assetId: json.data.id, assetUrl: json.data.url };
}

export async function createVideo(payload: HeyGenCreateVideoPayload): Promise<string> {
  const res = await fetch(`${API_BASE}/v2/videos`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HeyGen create video failed (${res.status}): ${await res.text()}`);
  const json: HeyGenCreateVideoResponse = await res.json();
  if (json.error) throw new Error(`HeyGen error: ${json.error}`);
  return json.data.video_id;
}

export async function getVideoStatus(
  videoId: string
): Promise<HeyGenVideoStatusResponse["data"]> {
  const res = await fetch(
    `${API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`HeyGen status poll failed (${res.status}): ${await res.text()}`);
  const json: HeyGenVideoStatusResponse = await res.json();
  return json.data;
}

export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Failed to download HeyGen video (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function listVoices(): Promise<HeyGenVoice[]> {
  const res = await fetch(`${API_BASE}/v2/voices`, { headers: headers() });
  if (!res.ok) throw new Error(`HeyGen list voices failed (${res.status}): ${await res.text()}`);
  const json: HeyGenVoicesResponse = await res.json();
  return json.data.voices;
}
