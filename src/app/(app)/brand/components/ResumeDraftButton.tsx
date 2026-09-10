"use client";

import { FileWarning, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface ResumeDraftButtonProps {
  href: string;
  label: string;
  discardDescription: string;
  onDiscard: () => void;
}

const SEGMENT_CLASS =
  "flex cursor-pointer items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";

export function ResumeDraftButton({
  href,
  label,
  discardDescription,
  onDiscard,
}: ResumeDraftButtonProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  return (
    <div className="inline-flex h-8 shrink-0 items-stretch overflow-hidden rounded-lg">
      <Link href={href} className={cn(SEGMENT_CLASS, "gap-2 px-3 hover:bg-primary/80")}>
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-foreground/70" />
        {label}
      </Link>
      <button
        type="button"
        onClick={() => setConfirmDiscard(true)}
        className={cn(
          SEGMENT_CLASS,
          "border-primary-foreground/25 border-l px-2.5 text-primary-foreground/85 hover:bg-destructive hover:text-white",
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Discard
      </button>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard draft?"
        description={discardDescription}
        icon={<FileWarning className="h-4 w-4" />}
        confirmLabel="Discard"
        onConfirm={() => {
          onDiscard();
          setConfirmDiscard(false);
        }}
        destructive
      />
    </div>
  );
}
