"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  avatar: {
    id: string;
    name: string;
    prompt: string | null;
    imageModel: string | null;
  };
}

export function AvatarActions({ avatar }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(avatar.name);
  const [prompt, setPrompt] = useState(avatar.prompt ?? "");
  const [loading, setLoading] = useState(false);

  async function handleRename(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/avatars/${avatar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Name updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/avatars/${avatar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageModel: avatar.imageModel, regenerate: true }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      toast.success("Avatar regenerated!");
      router.refresh();
    } catch {
      toast.error("Failed to regenerate");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this avatar? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/avatars/${avatar.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete");
      }
      toast.success("Avatar deleted");
      router.push("/avatars");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleRename} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit Name
      </Button>
      {avatar.prompt && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleRegenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Regenerate
        </Button>
      )}
      <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
      </Button>
    </div>
  );
}
