import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { convertAndCropToJpeg, convertToJpeg } from "@/lib/image-convert";

export const POST = withAuth(async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const cropRatio = formData.get("cropRatio")?.toString();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let jpeg: Buffer;
  if (cropRatio) {
    // Parse crop ratio as "width:height" (e.g., "4:5")
    const [w, h] = cropRatio.split(":").map(Number);
    if (Number.isNaN(w) || Number.isNaN(h) || w <= 0 || h <= 0) {
      return NextResponse.json(
        { error: "cropRatio must be 'width:height' with positive numbers" },
        { status: 400 },
      );
    }
    jpeg = await convertAndCropToJpeg(buffer, w, h);
  } else {
    // Convert to JPEG without cropping (full resolution preserved).
    jpeg = await convertToJpeg(buffer);
  }

  return new NextResponse(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
});
