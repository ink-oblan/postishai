interface AvatarVariationLabelInput {
  clothes?: string | null;
  background?: string | null;
  pose?: string | null;
}

function normalizePhrase(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.]+$/, "");
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function upperFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncate(value: string, max = 60) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export function generateAvatarVariationLabel({
  clothes,
  background,
  pose,
}: AvatarVariationLabelInput) {
  const normalizedClothes = clothes ? normalizePhrase(clothes) : "";
  const normalizedBackground = background ? normalizePhrase(background) : "";
  const normalizedPose = pose ? normalizePhrase(pose) : "";

  const parts: string[] = [];

  if (normalizedClothes) parts.push(`in ${lowerFirst(normalizedClothes)}`);
  if (normalizedBackground) parts.push(`at ${lowerFirst(normalizedBackground)}`);
  if (normalizedPose) parts.push(lowerFirst(normalizedPose));

  if (parts.length === 0) return "Custom variation";

  return truncate(upperFirst(parts.join(", ")));
}
