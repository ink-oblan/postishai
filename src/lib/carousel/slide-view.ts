/**
 * How a slide row tells the client whether it has a background and whether that background has
 * changed. The initial render and the status poll both project it, so it lives in one place —
 * a disagreement between the two shows up as a stale image the editor never refreshes.
 */
export function slideImageState(slide: { imagePath: string | null; updatedAt: Date }): {
  hasImage: boolean;
  imageVersion: number;
} {
  return { hasImage: slide.imagePath !== null, imageVersion: slide.updatedAt.getTime() };
}
