"use client";

import { Archive, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

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
            onClick={() => setRegenerateDialogOpen(true)}
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

      <ConfirmDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        title="Regenerate avatar?"
        description="A new image will be generated. The current image will be replaced."
        icon={<RefreshCw className="h-4 w-4" />}
        confirmLabel="Regenerate"
        onConfirm={() => {
          setRegenerateDialogOpen(false);
          handleRegenerate();
        }}
        loading={loading}
        destructive
      />

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Archive avatar?"
        description="This avatar will be hidden from your library. You can restore it later."
        icon={<Archive className="h-4 w-4" />}
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
        loading={archiving}
      />
    </>
  );
}
