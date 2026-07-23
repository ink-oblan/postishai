import { POST_STATUS, STATUS_LABELS } from "@/lib/constants";

export const STATUS_PIP_CONFIG: Record<string, { dot: string; label: string }> = {
  [POST_STATUS.DRAFT]: {
    dot: "bg-muted-foreground/40",
    label: STATUS_LABELS[POST_STATUS.DRAFT],
  },
  [POST_STATUS.GENERATING]: {
    dot: "bg-yellow-400 animate-pulse",
    label: STATUS_LABELS[POST_STATUS.GENERATING],
  },
  [POST_STATUS.COMPLETED]: { dot: "bg-primary", label: STATUS_LABELS[POST_STATUS.COMPLETED] },
  [POST_STATUS.FAILED]: { dot: "bg-destructive", label: STATUS_LABELS[POST_STATUS.FAILED] },
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
