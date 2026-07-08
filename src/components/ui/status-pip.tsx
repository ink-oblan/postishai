export const STATUS_PIP_CONFIG: Record<string, { dot: string; label: string }> = {
  DRAFT: { dot: "bg-muted-foreground/40", label: "Draft" },
  GENERATING: { dot: "bg-yellow-400 animate-pulse", label: "Generating" },
  COMPLETED: { dot: "bg-primary", label: "Done" },
  FAILED: { dot: "bg-destructive", label: "Failed" },
};

export function StatusPip({ status }: { status: string }) {
  const cfg = STATUS_PIP_CONFIG[status] ?? STATUS_PIP_CONFIG.DRAFT;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
      <span className="hidden text-muted-foreground text-xs sm:inline">{cfg.label}</span>
    </div>
  );
}
