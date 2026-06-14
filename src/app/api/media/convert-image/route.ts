import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { convertToJpeg } from "@/lib/image-convert";

export const POST = withAuth(async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const jpeg = await convertToJpeg(buffer);

  return new NextResponse(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
});
