import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { BLOCKED_VOICE_IDS } from "@/lib/heygen/voice-blocklist";
import { listCachedHeyGenVoices } from "@/lib/heygen/voices-cache";

export const GET = withAuth(async function GET() {
  try {
    const voices = await listCachedHeyGenVoices();
    const english = voices
      .filter((v) => v.language === "English" && !BLOCKED_VOICE_IDS.has(v.voice_id))
      .sort((a, b) => a.name.trim().localeCompare(b.name.trim()));

    return NextResponse.json(english, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  } catch (error) {
    console.error("[GET /api/heygen/voices]", error);

    return NextResponse.json(
      { error: "Unable to load HeyGen voices right now. Try again in a moment." },
      { status: 503 },
    );
  }
});
