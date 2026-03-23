import { NextResponse } from "next/server";
import { listVoices } from "@/lib/heygen/client";

export async function GET() {
  const voices = await listVoices();
  // Return English voices sorted by name
  const english = voices
    .filter((v) => v.language === "English")
    .sort((a, b) => a.name.trim().localeCompare(b.name.trim()));
  return NextResponse.json(english, {
    headers: { "Cache-Control": "public, s-maxage=3600" },
  });
}
