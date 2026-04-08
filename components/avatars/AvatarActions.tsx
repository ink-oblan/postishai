"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@base-ui/react";
import { RefreshCw, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
          <Button variant="outline" size="sm" className="w-full" onClick={handleRegenerate} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Regenerate
          </Button>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={() => setDialogOpen(true)}>
          <Archive className="h-3.5 w-3.5 mr-1.5" />Archive
        </Button>
      </div>

      <AlertDialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-200" />
          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </div>
              <AlertDialog.Title className="text-base font-semibold">Archive avatar?</AlertDialog.Title>
            </div>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-6 pl-12">
              This avatar will be hidden from your library. You can restore it later.
            </AlertDialog.Description>
            <div className="flex gap-2 justify-end">
              <AlertDialog.Close render={<Button variant="outline" size="sm" />}>Cancel</AlertDialog.Close>
              <Button size="sm" onClick={handleArchiveConfirm} disabled={archiving}>
                {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Archive
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
