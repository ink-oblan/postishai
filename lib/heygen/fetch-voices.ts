import type { HeyGenVoice } from "./types";

interface VoiceErrorResponse {
  error?: string;
}

export async function fetchHeyGenVoices(): Promise<HeyGenVoice[]> {
  const res = await fetch("/api/heygen/voices");
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : null;

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as VoiceErrorResponse).error
        : null;
    throw new Error(message ?? "Failed to load HeyGen voices");
  }

  if (!Array.isArray(payload)) {
    throw new Error("Unexpected HeyGen voices response");
  }

  return payload as HeyGenVoice[];
}
