"use client";

import { AlertDialog } from "@base-ui/react";
import { Archive, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  avatar: {
    id: string;
    prompt: string | null;
    imageModel: string | null;
  };
}

export function AvatarActions({ avatar }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/avatars/${avatar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      toast.success("Regeneration started");
      router.refresh();
    } catch {
      toast.error("Failed to regenerate");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveConfirm() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/avatars/${avatar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to archive");
      }
      toast.success("Avatar archived");
      router.push("/avatars");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive");
      setArchiving(false);
      setDialogOpen(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        {avatar.prompt && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRegenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Regenerate
          </Button>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setDialogOpen(true)}>
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          Archive
        </Button>
      </div>

      <AlertDialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl transition-all duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </div>
              <AlertDialog.Title className="font-semibold text-base">
                Archive avatar?
              </AlertDialog.Title>
            </div>
            <AlertDialog.Description className="mb-6 pl-12 text-muted-foreground text-sm">
              This avatar will be hidden from your library. You can restore it later.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Close render={<Button variant="outline" size="sm" />}>
                Cancel
              </AlertDialog.Close>
              <Button size="sm" onClick={handleArchiveConfirm} disabled={archiving}>
                {archiving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Archive
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
