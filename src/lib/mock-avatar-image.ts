import sharp from "sharp";

// Generate a simple placeholder avatar image (1080x1920 JPEG)
export async function generatePlaceholderAvatar(seed: string): Promise<Buffer> {
  const width = 1080;
  const height = 1920;

  // Generate a simple solid color based on seed
  const hue = parseInt(seed.slice(0, 8), 16) % 360;
  const saturation = 70;
  const lightness = 55;

  // Convert HSL to RGB
  const c = ((100 - Math.abs(2 * lightness - 100)) * saturation) / 100;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness / 100 - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (hue >= 0 && hue < 60) {
    [r, g, b] = [c, x, 0];
  } else if (hue >= 60 && hue < 120) {
    [r, g, b] = [x, c, 0];
  } else if (hue >= 120 && hue < 180) {
    [r, g, b] = [0, c, x];
  } else if (hue >= 180 && hue < 240) {
    [r, g, b] = [0, x, c];
  } else if (hue >= 240 && hue < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b + m) * 255);

  // Create a solid color image
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: red, g: green, b: blue },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  return buffer;
}
