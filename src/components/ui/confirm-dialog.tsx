"use client";

import { AlertDialog } from "@base-ui/react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  icon: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel,
  onConfirm,
  loading = false,
  destructive = false,
}: Props) {
  return (
    <DialogShell open={open} onOpenChange={onOpenChange}>
      <div className="mb-2 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${destructive ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
        >
          {icon}
        </div>
        <AlertDialog.Title className="font-semibold text-base">{title}</AlertDialog.Title>
      </div>
      <AlertDialog.Description className="mb-6 pl-12 text-muted-foreground text-sm">
        {description}
      </AlertDialog.Description>
      <div className="flex justify-end gap-2">
        <AlertDialog.Close render={<Button variant="outline" size="sm" />}>
          Cancel
        </AlertDialog.Close>
        <Button
          size="sm"
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </div>
    </DialogShell>
  );
}
