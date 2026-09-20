"use client";

import { type Box, type CanvasSpec, coverCrop } from "@/lib/design/canvas-spec";
import type { Rgb } from "@/lib/design/color";

/** Enough pixels to average a region fairly, few enough that a whole carousel stays instant. */
const SAMPLE_SIZE = 24;

const cache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = cache.get(url);
  if (cached) return cached;

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    // Slide backgrounds are served as bytes from our own API, so this keeps the canvas readable.
    element.crossOrigin = "anonymous";
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("The slide background could not be read"));
    element.src = url;
  });

  cache.set(url, pending);
  return pending;
}

/**
 * Averages the photograph behind one region of the slide. The stage draws its background
 * cover-cropped, so the region is mapped through that same crop rather than through the image's
 * own dimensions — otherwise a tall photo is sampled somewhere the viewer never sees.
 */
export async function sampleBackgroundRegion(
  url: string,
  spec: CanvasSpec,
  box: Box,
): Promise<Rgb | null> {
  const image = await loadImage(url);
  const crop = coverCrop(image.naturalWidth, image.naturalHeight, spec);

  const sx = crop.x + (box.x / spec.width) * crop.width;
  const sy = crop.y + (box.y / spec.height) * crop.height;
  const sw = Math.max(1, (box.width / spec.width) * crop.width);
  const sh = Math.max(1, (box.height / spec.height) * crop.height);

  const canvas = window.document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, sx, sy, sw, sh, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let total: Rgb = { r: 0, g: 0, b: 0 };
  let counted = 0;
  const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  for (let i = 0; i < data.length; i += 4) {
    // A transparent pixel contributes nothing the viewer can see.
    if (data[i + 3] === 0) continue;
    total = { r: total.r + data[i], g: total.g + data[i + 1], b: total.b + data[i + 2] };
    counted++;
  }

  if (counted === 0) return null;
  return { r: total.r / counted, g: total.g / counted, b: total.b / counted };
}
