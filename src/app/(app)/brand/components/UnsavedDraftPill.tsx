"use client";

import { FileWarning } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UnsavedDraftPillProps {
  label: string;
  discardDescription: string;
  onDiscard: () => void;
}

export function UnsavedDraftPill({ label, discardDescription, onDiscard }: UnsavedDraftPillProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  return (
    <div className="flex w-fit shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 py-1 pr-1 pl-3">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-yellow-400" />
      <span className="text-muted-foreground text-xs">{label}</span>
      <Button variant="ghost" size="xs" onClick={() => setConfirmDiscard(true)}>
        Discard
      </Button>

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
