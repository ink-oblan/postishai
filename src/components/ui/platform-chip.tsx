const PLATFORM_TYPE_LABELS: Record<string, string> = {
  AVATAR_VIDEO: "Video",
  CAPTION: "Caption",
};

export function PlatformChip({ platform }: { platform: string }) {
  return (
    <span className="hidden rounded-md border border-border px-2 py-0.5 font-semibold text-[11px] text-muted-foreground tracking-wide sm:inline-flex">
      {PLATFORM_TYPE_LABELS[platform] ?? platform}
    </span>
  );
}
