import convert from "heic-convert";
import sharp from "sharp";

// HEIC/HEIF files are ISO Base Media files: bytes 4–7 are "ftyp" and bytes 8–11
// are the brand. Brands used by HEIC/HEIF (not AVIF, which sharp already handles).
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12);
  return HEIC_BRANDS.has(brand);
}

export async function convertToJpeg(buffer: Buffer): Promise<Buffer> {
  if (isHeic(buffer)) {
    // Use heic-convert for HEIC files as sharp may lack HEIF support in some builds.
    const output = await convert({ buffer, format: "JPEG", quality: 0.9 });
    return Buffer.from(output);
  }
  return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
}

export async function convertAndCropToJpeg(
  buffer: Buffer,
  targetWidth: number,
  targetHeight: number,
): Promise<Buffer> {
  const jpeg = await convertToJpeg(buffer);
  const { width, height } = await sharp(jpeg).metadata();
  if (!width || !height) return jpeg;

  const srcRatio = width / height;
  const tgtRatio = targetWidth / targetHeight;
  if (Math.abs(srcRatio - tgtRatio) <= 0.02) return jpeg;

  let cropW: number;
  let cropH: number;
  if (srcRatio > tgtRatio) {
    // Too wide — crop sides
    cropH = height;
    cropW = Math.round(height * tgtRatio);
  } else {
    // Too tall — crop top/bottom
    cropW = width;
    cropH = Math.round(width / tgtRatio);
  }

  const left = Math.floor((width - cropW) / 2);
  const top = Math.floor((height - cropH) / 2);

  return sharp(jpeg)
    .extract({ left, top, width: cropW, height: cropH })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function decodeAndConvertImageBase64(imageBase64: string): Promise<Buffer> {
  // Decode base64 data URL and convert to JPEG if needed.
  // If image is already JPEG (detected from mime type), skip conversion.
  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const isMimeJpeg = imageBase64.startsWith("data:image/jpeg");
  return isMimeJpeg ? Buffer.from(base64, "base64") : convertToJpeg(Buffer.from(base64, "base64"));
}
