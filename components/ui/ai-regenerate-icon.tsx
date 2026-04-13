import { Loader2, RotateCcw, Sparkles } from "lucide-react";

export function AiRegenerateIcon({ spinning = false }: { spinning?: boolean }) {
  if (spinning) {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }

  return (
    <span className="relative block h-4 w-4">
      <RotateCcw className="!h-5 !w-5 text-rosy-taupe-500 transition-colors group-hover/button:text-rosy-taupe-400" />
      <Sparkles
        className="absolute -right-2.5 -top-2.5 !h-3 !w-3 rounded-full bg-card drop-shadow-[0_0_6px_rgba(158,204,51,0.35)] transition-colors group-hover/button:text-rosy-taupe-600"
        size={13}
      />
    </span>
  );
}
