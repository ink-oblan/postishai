import { readFile as readFileFs, unlink, writeFile as writeFileFs } from "node:fs/promises";
import sharp from "sharp";
import { runFfmpeg } from "./ffmpeg";
import { MOCK_TIMINGS } from "./mock-config";

// Generate placeholder avatar image (1080x1920 JPEG)
export async function generateMockAvatarImage(seed: string): Promise<Buffer> {
  const width = 1080;
  const height = 1920;

  // Generate deterministic color from seed
  const hue = parseInt(seed.slice(0, 8), 16) % 360;
  const saturation = 70;
  const lightness = 55;

  // HSL to RGB conversion
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

  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: red, g: green, b: blue },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Generate mock video with text overlay (15s, valid H.264 MP4)
export async function generateMockVideo(): Promise<Buffer> {
  const width = 1080;
  const height = 1920;
  const duration = 15; // 15 seconds

  // Create SVG with text overlay
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <text x="${width / 2}" y="${height / 2}" font-size="72" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">
        Your Content Here
      </text>
      <text x="${width / 2}" y="${height / 2 + 120}" font-size="48" fill="white" text-anchor="middle" font-family="Arial">
        ${duration}s Video
      </text>
    </svg>
  `.trim();

  // Create frame image from SVG
  const frameBuffer = await sharp(Buffer.from(svg))
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Use ffmpeg to create a proper video from the static frame
  // This creates a valid H.264 encoded MP4 that can be played
  const tmpFrame = `/tmp/mock_frame_${Date.now()}.jpg`;
  const tmpVideo = `/tmp/mock_video_${Date.now()}.mp4`;

  try {
    await writeFileFs(tmpFrame, frameBuffer);

    // Generate video: repeat frame for duration seconds at 30fps
    await runFfmpeg([
      "-loop",
      "1",
      "-i",
      tmpFrame,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-t",
      String(duration),
      "-pix_fmt",
      "yuv420p",
      "-y",
      tmpVideo,
    ]);

    const videoBuffer = await readFileFs(tmpVideo);
    return videoBuffer;
  } finally {
    await unlink(tmpFrame).catch(() => {});
    await unlink(tmpVideo).catch(() => {});
  }
}

// Generate rich mock caption with multiple paragraphs
export async function generateMockCaption(
  mediaType: "image" | "video",
  seed: string,
): Promise<string> {
  const captions = [
    `This is a beautiful moment captured in perfect detail. The composition flows naturally, drawing the viewer's eye across the frame with intention and grace. Every element works together to create a compelling visual narrative that resonates with authenticity and creativity.\n\nThe lighting is exceptional, highlighting the key subjects while maintaining depth and dimension. The color palette is vibrant yet harmonious, creating an aesthetic that's both modern and timeless. This content stands out in any feed.\n\n#CreativeContent #VisualStory #MustWatch`,

    `A stunning visual representation of modern creativity and expression. This piece showcases exceptional attention to detail and professional craftsmanship. The production quality is top-tier, with careful consideration given to every frame.\n\nThe narrative arc is compelling, keeping viewers engaged from beginning to end. The transitions are smooth, the pacing is perfect, and the message is clear. This is content that inspires and entertains simultaneously.\n\n#ProQuality #CreativeVision #ArtisticExpression`,

    `Innovative content that pushes boundaries and challenges conventional thinking. This is more than just media—it's a statement. The approach is fresh, the execution is flawless, and the impact is undeniable.\n\nEvery scene is carefully constructed to deliver maximum impact. The sound design complements the visuals perfectly, creating an immersive experience. This is the kind of content that audiences remember and share.\n\n#Innovation #NextLevel #GameChanger`,

    `Engaging media that tells a powerful story with depth and nuance. Watch how each frame contributes to the larger narrative. The cinematography is stunning, capturing moments that might otherwise go unnoticed.\n\nThis production demonstrates mastery of the craft. The attention to detail is remarkable, from color grading to sound mixing. Every technical aspect serves the creative vision perfectly.\n\n#Storytelling #Cinematography #VisualArt`,

    `Professional quality content created with passion and expertise. This is the result of careful planning, skilled execution, and artistic vision coming together seamlessly. Every moment has been optimized for maximum engagement and impact.\n\nThe audience connection is immediate and visceral. Whether it's the compelling narrative, the stunning visuals, or the emotional resonance, this content delivers on every level. This is what excellence looks like.\n\n#Professional #Excellence #ContentCreation`,
  ];

  // Deterministic selection based on seed
  const index = parseInt(seed.slice(0, 8), 16) % captions.length;
  const suffix =
    mediaType === "video" ? "\n[Generated from Video Content]" : "\n[Generated from Image Content]";

  return captions[index] + suffix;
}

// Get mock generation time for display/testing
export function getMockTimingMs(type: "avatar" | "video" | "caption"): number {
  switch (type) {
    case "avatar":
      return MOCK_TIMINGS.AVATAR_IMAGE;
    case "video":
      return MOCK_TIMINGS.POST_VIDEO;
    case "caption":
      return MOCK_TIMINGS.POST_CAPTION;
    default:
      return 5000;
  }
}
