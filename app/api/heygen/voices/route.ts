import { NextResponse } from "next/server";
import { listVoices } from "@/lib/heygen/client";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET() {
  try {
    const voices = await listVoices();
    const english = voices
      .filter((v) => v.language === "English")
      .sort((a, b) => a.name.trim().localeCompare(b.name.trim()));

    return NextResponse.json(english, {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    });
  } catch (error) {
    console.error("[GET /api/heygen/voices]", error);

    return NextResponse.json(
      { error: "Unable to load HeyGen voices right now. Try again in a moment." },
      { status: 503 }
    );
  }
});
