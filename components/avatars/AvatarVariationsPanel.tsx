"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog } from "@base-ui/react";
import { Plus, Trash2, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AvatarVariation {
  id: string;
  label: string;
  clothes: string | null;
  background: string | null;
  pose: string | null;
  status: string;
  errorMessage: string | null;
  imagePath: string;
  updatedAt: string;
}

interface ImageModel {
  id: string;
  name: string;
}

interface Props {
  avatarId: string;
  initialVariations: AvatarVariation[];
  hasPrompt: boolean;
  defaultImageModel: string | null;
  selectedVariationId?: string | null;
  onVariationClick?: (variation: AvatarVariation) => void;
  onVariationDelete?: (variationId: string) => void;
}

export function AvatarVariationsPanel({ avatarId, initialVariations, hasPrompt, defaultImageModel, selectedVariationId, onVariationClick, onVariationDelete }: Props) {
  const router = useRouter();
  const [variations, setVariations] = useState<AvatarVariation[]>(initialVariations);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [clothes, setClothes] = useState("");
  const [background, setBackground] = useState("");
  const [pose, setPose] = useState("");
  const [imageModel, setImageModel] = useState(defaultImageModel ?? "nano-banana-2");
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AvatarVariation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pollingRef = useRef(false);

  // Poll while any variation is generating
  useEffect(() => {
    const isGenerating = variations.some((v) => v.status === "GENERATING" || v.status === "PENDING");
    if (!isGenerating) {
      pollingRef.current = false;
      return;
    }
    if (pollingRef.current) return;
    pollingRef.current = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/avatars/${avatarId}/variations`);
        if (!res.ok) return;
        const data = await res.json() as AvatarVariation[];
        setVariations(data);
        const stillGenerating = data.some((v) => v.status === "GENERATING" || v.status === "PENDING");
        if (!stillGenerating) {
          clearInterval(interval);
          pollingRef.current = false;
          router.refresh();
        }
      } catch {
        // ignore transient errors
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      pollingRef.current = false;
    };
  }, [variations, avatarId, router]);

  useEffect(() => {
    if (showForm && imageModels.length === 0) {
      fetch("/api/image-models")
        .then((r) => r.json())
        .then((data: ImageModel[]) => setImageModels(data))
        .catch(() => {});
    }
  }, [showForm, imageModels.length]);

  function resetForm() {
    setLabel("");
    setClothes("");
    setBackground("");
    setPose("");
    setShowForm(false);
  }

  async function handleSuggest() {
    setSuggesting(true);
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations/suggest`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to get suggestion");
      const data = await res.json() as { clothes: string; background: string; pose: string };
      setClothes(data.clothes);
      setBackground(data.background);
      setPose(data.pose);
    } catch {
      toast.error("Failed to get AI suggestion");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleGenerate() {
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          clothes: clothes.trim() || undefined,
          background: background.trim() || undefined,
          pose: pose.trim() || undefined,
          imageModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create variation");
      }
      const created = await res.json() as AvatarVariation;
      setVariations((prev) => [...prev, created]);
      resetForm();
      toast.success("Variation generation started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create variation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegenerate(variation: AvatarVariation) {
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations/${variation.id}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const updated = await res.json() as AvatarVariation;
      setVariations((prev) => prev.map((v) => (v.id === variation.id ? updated : v)));
      toast.success("Regeneration started");
    } catch {
      toast.error("Failed to regenerate variation");
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete");
      }
      setVariations((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      onVariationDelete?.(deleteTarget.id);
      toast.success("Variation archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete variation");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Variations ({variations.length})</CardTitle>
            {hasPrompt && !showForm && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[0.8rem] gap-1"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-3.5 w-3.5" />Add variation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {variations.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {hasPrompt ? "No variations yet. Add one to explore different looks." : "Variations are only available for AI-generated avatars."}
            </p>
          )}

          {variations.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
              {variations.map((variation) => {
                const isSelected = selectedVariationId === variation.id;
                const isClickable = variation.status === "COMPLETED" && !!onVariationClick;
                return (
                <div key={variation.id} className="flex-none w-24">
                  <div
                    className={`aspect-[9/16] relative rounded-lg overflow-hidden bg-muted border-2 transition-colors ${
                      isSelected ? "border-primary" : "border-transparent"
                    } ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={() => isClickable && onVariationClick(variation)}
                  >
                    {variation.status === "COMPLETED" && variation.imagePath ? (
                      <Image
                        src={`/api/avatars/${avatarId}/variations/${variation.id}/image?t=${new Date(variation.updatedAt).getTime()}`}
                        alt={variation.label}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : variation.status === "FAILED" ? (
                      <div className="flex flex-col items-center justify-center h-full gap-1 px-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <p className="text-[0.65rem] text-destructive text-center leading-tight">Failed</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Spinner className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1 flex flex-col gap-1">
                      {variation.status === "FAILED" && (
                        <button
                          type="button"
                          onClick={() => void handleRegenerate(variation)}
                          className="h-6 w-6 rounded-md bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          title="Retry"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      )}
                      {variation.status !== "PENDING" && variation.status !== "GENERATING" && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(variation)}
                          className="h-6 w-6 rounded-md bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                          title="Archive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground truncate mt-1 text-center" title={variation.label}>
                    {variation.label}
                  </p>
                </div>
              );
            })}
            </div>
          )}

          {showForm && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New variation</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={handleSuggest}
                  disabled={suggesting}
                >
                  {suggesting ? <Spinner className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  Suggest with AI
                </Button>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Label *</p>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Business casual"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Clothes</p>
                <Input
                  value={clothes}
                  onChange={(e) => setClothes(e.target.value)}
                  placeholder="e.g. Navy blue blazer over white shirt"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Background</p>
                <Input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="e.g. Modern office with bookshelves"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Pose</p>
                <Input
                  value={pose}
                  onChange={(e) => setPose(e.target.value)}
                  placeholder="e.g. Standing with arms crossed, confident"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Image Model</p>
                {imageModels.length > 0 ? (
                  <Select value={imageModel} onValueChange={(v: string | null) => v && setImageModel(v)}>
                    <SelectTrigger className="h-8 text-sm w-full">
                      <SelectValue>{imageModels.find((m) => m.id === imageModel)?.name ?? imageModel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {imageModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-8 flex items-center"><Spinner className="h-3.5 w-3.5 text-muted-foreground" /></div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleGenerate()}
                  disabled={submitting || !label.trim()}
                >
                  {submitting && <Spinner className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog.Root open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-200" />
          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <AlertDialog.Title className="text-base font-semibold">Archive variation?</AlertDialog.Title>
            </div>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-6 pl-12">
              &ldquo;{deleteTarget?.label}&rdquo; will be archived and hidden from this avatar.
            </AlertDialog.Description>
            <div className="flex gap-2 justify-end">
              <AlertDialog.Close render={<Button variant="outline" size="sm" />}>Cancel</AlertDialog.Close>
              <Button size="sm" variant="destructive" onClick={() => void handleDeleteConfirm()} disabled={deleting}>
                {deleting && <Spinner className="h-3.5 w-3.5 mr-1.5" />}
                Archive
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
