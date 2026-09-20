/** Stands in for the photograph while the image job runs, behind the same plates and copy. */
export const PLACEHOLDER_BACKGROUND_COLOR = "#1a1a1a";

export const PLACEHOLDER_BASE = "#1a1d24";
export const PLACEHOLDER_FADE = "rgba(26,29,36,0)";

export interface PlaceholderBlob {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export const PLACEHOLDER_BLOBS: PlaceholderBlob[] = [
  { x: 0.28, y: 0.22, radius: 0.85, color: "rgba(124,136,163,0.5)" },
  { x: 0.82, y: 0.8, radius: 0.7, color: "rgba(70,79,102,0.65)" },
];
