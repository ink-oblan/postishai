import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  // Only serve .mp4 files from the videos directory
  if (!filename.endsWith(".mp4")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buffer = await readFile(`videos/${filename}`);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
