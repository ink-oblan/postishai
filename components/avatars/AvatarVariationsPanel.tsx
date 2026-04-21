"use client";

import { AlertDialog } from "@base-ui/react";
import { AlertCircle, Archive, Plus, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

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

export function AvatarVariationsPanel({
  avatarId,
  initialVariations,
  hasPrompt,
  defaultImageModel,
  selectedVariationId,
  onVariationClick,
  onVariationDelete,
}: Props) {
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
    const isGenerating = variations.some(
      (v) => v.status === "GENERATING" || v.status === "PENDING",
    );
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
        const data = (await res.json()) as AvatarVariation[];
        setVariations(data);
        const stillGenerating = data.some(
          (v) => v.status === "GENERATING" || v.status === "PENDING",
        );
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
      const data = (await res.json()) as { clothes: string; background: string; pose: string };
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
      const created = (await res.json()) as AvatarVariation;
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
      const updated = (await res.json()) as AvatarVariation;
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
            <CardTitle className="font-medium text-sm">Variations ({variations.length})</CardTitle>
            {hasPrompt && !showForm && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-[0.8rem]"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add variation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {variations.length === 0 && !showForm && (
            <p className="py-4 text-center text-muted-foreground text-sm">
              {hasPrompt
                ? "No variations yet. Add one to explore different looks."
                : "Variations are only available for AI-generated avatars."}
            </p>
          )}

          {variations.length > 0 && (
            <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
              {variations.map((variation) => {
                const isSelected = selectedVariationId === variation.id;
                const isClickable = variation.status === "COMPLETED" && !!onVariationClick;
                return (
                  <div key={variation.id} className="w-24 flex-none">
                    <button
                      type="button"
                      className={`relative block aspect-[9/16] w-full overflow-hidden rounded-lg border-2 bg-muted transition-colors ${
                        isSelected ? "border-primary" : "border-transparent"
                      } ${isClickable ? "cursor-pointer" : ""}`}
                      onClick={() => isClickable && onVariationClick(variation)}
                    >
                      {variation.status === "COMPLETED" && variation.imagePath ? (
                        <Image
                          src={`/api/avatars/${avatarId}/variations/${variation.id}/image?t=${new Date(variation.updatedAt).getTime()}`}
                          alt={variation.label}
                          fill
                          className={`object-cover transition-[filter] duration-200 ${isSelected ? "blur-[2px] brightness-90" : ""}`}
                          unoptimized
                        />
                      ) : variation.status === "FAILED" ? (
                        <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <p className="text-center text-[0.65rem] text-destructive leading-tight">
                            Failed
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Spinner className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-1 right-1 flex flex-col gap-1">
                        {variation.status === "FAILED" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRegenerate(variation);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background/80 backdrop-blur-sm transition-colors hover:bg-muted"
                            title="Retry"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                        {variation.status !== "PENDING" && variation.status !== "GENERATING" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(variation);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background/80 backdrop-blur-sm transition-colors hover:border-destructive/30 hover:bg-destructive/10"
                            title="Archive"
                          >
                            <Archive className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </button>
                    <p
                      className="mt-1 truncate text-center text-[0.7rem] text-muted-foreground"
                      title={variation.label}
                    >
                      {variation.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <div className="space-y-3 pt-1">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  New variation
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={handleSuggest}
                  disabled={suggesting}
                >
                  {suggesting ? <Spinner className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  Suggest with AI
                </Button>
              </div>

              <div>
                <p className="mb-1 text-muted-foreground text-xs">Label *</p>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Business casual"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="mb-1 text-muted-foreground text-xs">Clothes</p>
                <Input
                  value={clothes}
                  onChange={(e) => setClothes(e.target.value)}
                  placeholder="e.g. Navy blue blazer over white shirt"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="mb-1 text-muted-foreground text-xs">Background</p>
                <Input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="e.g. Modern office with bookshelves"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="mb-1 text-muted-foreground text-xs">Pose</p>
                <Input
                  value={pose}
                  onChange={(e) => setPose(e.target.value)}
                  placeholder="e.g. Standing with arms crossed, confident"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="mb-1 text-muted-foreground text-xs">Image Model</p>
                {imageModels.length > 0 ? (
                  <Select
                    value={imageModel}
                    onValueChange={(v: string | null) => v && setImageModel(v)}
                  >
                    <SelectTrigger className="h-8 w-full text-sm">
                      <SelectValue>
                        {imageModels.find((m) => m.id === imageModel)?.name ?? imageModel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {imageModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-8 items-center">
                    <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleGenerate()}
                  disabled={submitting || !label.trim()}
                >
                  {submitting && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
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

      <AlertDialog.Root
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl transition-all duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </div>
              <AlertDialog.Title className="font-semibold text-base">
                Archive variation?
              </AlertDialog.Title>
            </div>
            <AlertDialog.Description className="mb-6 pl-12 text-muted-foreground text-sm">
              &ldquo;{deleteTarget?.label}&rdquo; will be archived and hidden from this avatar.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Close render={<Button variant="outline" size="sm" />}>
                Cancel
              </AlertDialog.Close>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
              >
                {deleting && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
                Archive
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
