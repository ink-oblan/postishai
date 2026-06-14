import convert from "heic-convert";
import sharp from "sharp";

export async function convertToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  } catch {
    // sharp may lack HEIC/HEIF support depending on the libheif build;
    // fall back to heic-convert for that case.
    const output = await convert({ buffer, format: "JPEG", quality: 0.9 });
    return Buffer.from(output);
  }
}
