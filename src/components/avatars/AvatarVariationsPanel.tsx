"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Archive,
  Layers,
  Mountain,
  PersonStanding,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { generateAvatarVariationLabel } from "@/lib/avatar-variation-label";
import { cn } from "@/lib/utils";

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

type VariationScope = "clothes" | "background" | "pose" | "all";

interface Props {
  avatarId: string;
  initialVariations: AvatarVariation[];
  defaultImageModel: string | null;
  selectedVariationId?: string | null;
  onVariationClick?: (variation: AvatarVariation) => void;
  onVariationDelete?: (variationId: string) => void;
}

export function AvatarVariationsPanel({
  avatarId,
  initialVariations,
  defaultImageModel,
  selectedVariationId,
  onVariationClick,
  onVariationDelete,
}: Props) {
  const router = useRouter();
  const [variations, setVariations] = useState<AvatarVariation[]>(initialVariations);
  const [showForm, setShowForm] = useState(false);
  const [scope, setScope] = useState<VariationScope | null>(null);
  const [clothes, setClothes] = useState("");
  const [background, setBackground] = useState("");
  const [pose, setPose] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const editingInputRef = useRef<HTMLInputElement>(null);
  const [sourceVariationId, setSourceVariationId] = useState<string | null>(null);
  const [replaceVariationId, setReplaceVariationId] = useState<string | null>(null);
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

  const scopeConfig: Record<
    Exclude<VariationScope, "all">,
    {
      title: string;
      description: string;
      placeholder: string;
      value: string;
      setValue: (value: string) => void;
      iconClassName: string;
    }
  > = {
    clothes: {
      title: "Clothes",
      description: "Update the outfit while keeping the rest of the look intact.",
      placeholder: "e.g. Navy blue blazer over white shirt",
      value: clothes,
      setValue: setClothes,
      iconClassName: "bg-amber-100 text-amber-700",
    },
    background: {
      title: "Background",
      description: "Change the scene or location around the avatar.",
      placeholder: "e.g. Modern office with bookshelves",
      value: background,
      setValue: setBackground,
      iconClassName: "bg-emerald-100 text-emerald-700",
    },
    pose: {
      title: "Pose",
      description: "Adjust posture, gesture, or body positioning.",
      placeholder: "e.g. Standing with arms crossed, confident",
      value: pose,
      setValue: setPose,
      iconClassName: "bg-sky-100 text-sky-700",
    },
  };

  const activeValues =
    scope === "clothes"
      ? { clothes: clothes.trim() || undefined }
      : scope === "background"
        ? { background: background.trim() || undefined }
        : scope === "pose"
          ? { pose: pose.trim() || undefined }
          : {
              clothes: clothes.trim() || undefined,
              background: background.trim() || undefined,
              pose: pose.trim() || undefined,
            };

  const generatedLabel = generateAvatarVariationLabel(activeValues);
  const canGenerate = !!(activeValues.clothes || activeValues.background || activeValues.pose);
  const selectedVariation = variations.find((v) => v.id === selectedVariationId) ?? null;
  const canUseSelectedVariation = selectedVariation?.status === "COMPLETED";
  const optionMeta: Record<
    VariationScope,
    { icon: typeof Shirt; iconClassName: string; title: string; description: string }
  > = {
    clothes: {
      icon: Shirt,
      iconClassName: scopeConfig.clothes.iconClassName,
      title: scopeConfig.clothes.title,
      description: scopeConfig.clothes.description,
    },
    background: {
      icon: Mountain,
      iconClassName: scopeConfig.background.iconClassName,
      title: scopeConfig.background.title,
      description: scopeConfig.background.description,
    },
    pose: {
      icon: PersonStanding,
      iconClassName: scopeConfig.pose.iconClassName,
      title: scopeConfig.pose.title,
      description: scopeConfig.pose.description,
    },
    all: {
      icon: Layers,
      iconClassName: "bg-primary/10 text-primary",
      title: "Everything listed",
      description: "Open the full form and update clothes, background, and pose together.",
    },
  };

  function openForm(options?: {
    replaceVariationId?: string | null;
    sourceVariationId?: string | null;
  }) {
    setShowForm(true);
    setScope(null);
    setSourceVariationId(options?.sourceVariationId ?? null);
    setReplaceVariationId(options?.replaceVariationId ?? null);
  }

  function resetForm() {
    setScope(null);
    setClothes("");
    setBackground("");
    setPose("");
    setSourceVariationId(null);
    setReplaceVariationId(null);
    setShowForm(false);
  }

  async function handleSuggest() {
    setSuggesting(true);
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations/suggest`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to get suggestion");
      const data = (await res.json()) as { clothes: string; background: string; pose: string };
      if (scope === "clothes") {
        setClothes(data.clothes);
      } else if (scope === "background") {
        setBackground(data.background);
      } else if (scope === "pose") {
        setPose(data.pose);
      } else {
        setClothes(data.clothes);
        setBackground(data.background);
        setPose(data.pose);
      }
    } catch {
      toast.error("Failed to get AI suggestion");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setSubmitting(true);
    let variationLabel = generatedLabel;
    try {
      const nameRes = await fetch(`/api/avatars/${avatarId}/variations/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeValues),
      });
      if (nameRes.ok) {
        const nameData = (await nameRes.json()) as { name: string };
        if (nameData.name) variationLabel = nameData.name;
      }
    } catch {
      // fall back to generated label
    }
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: variationLabel,
          ...activeValues,
          sourceVariationId: sourceVariationId ?? undefined,
          replaceVariationId: replaceVariationId ?? undefined,
          imageModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create variation");
      }
      const created = (await res.json()) as AvatarVariation;
      setVariations((prev) => [...prev.filter((v) => v.id !== replaceVariationId), created]);
      if (replaceVariationId) onVariationDelete?.(replaceVariationId);
      resetForm();
      toast.success(
        replaceVariationId ? "Variation update started" : "Variation generation started",
      );
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

  useEffect(() => {
    if (editingLabelId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingLabelId]);

  async function handleLabelSave(variationId: string) {
    const trimmed = editingLabelValue.trim();
    setEditingLabelId(null);
    if (!trimmed) return;
    setVariations((prev) => prev.map((v) => (v.id === variationId ? { ...v, label: trimmed } : v)));
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations/${variationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to update name");
    } catch {
      toast.error("Failed to update name");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-medium text-sm">Variations ({variations.length})</CardTitle>
            {!showForm && variations.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {canUseSelectedVariation ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 px-2.5 text-[0.8rem]"
                      onClick={() =>
                        openForm({
                          sourceVariationId: selectedVariation.id,
                          replaceVariationId: selectedVariation.id,
                        })
                      }
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Update selected
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 px-2.5 text-[0.8rem]"
                      onClick={() => openForm({ sourceVariationId: selectedVariation.id })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New from selected
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1 px-2.5 text-[0.8rem]"
                    onClick={() => openForm()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add variation
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {variations.length === 0 && !showForm && (
            <div className="flex min-h-28 flex-col items-center justify-center gap-3 py-4 text-center">
              <>
                <Button type="button" variant="secondary" onClick={() => openForm()}>
                  <Plus className="h-4 w-4" />
                  Add variation
                </Button>
                <p className="text-muted-foreground text-sm">
                  No variations yet. Add one to explore different looks.
                </p>
              </>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {variations.length > 0 && !showForm && (
              <motion.div
                key="variation-selector"
                initial={{ opacity: 0, height: 0, y: 8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {variations.map((variation) => {
                    const isSelected = selectedVariationId === variation.id;
                    const isClickable = variation.status === "COMPLETED" && !!onVariationClick;
                    return (
                      <div key={variation.id} className="w-24 flex-none">
                        {/* biome-ignore lint/a11y/noStaticElementInteractions: contains nested buttons, can't be a <button> */}
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: click-only thumbnail selector */}
                        <div
                          className={`relative aspect-[9/16] overflow-hidden rounded-lg border-2 bg-muted transition-colors ${
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
                            {variation.status !== "PENDING" &&
                              variation.status !== "GENERATING" && (
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
                        </div>
                        {variation.status === "COMPLETED" && editingLabelId === variation.id ? (
                          <input
                            ref={editingInputRef}
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            onBlur={() => void handleLabelSave(variation.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleLabelSave(variation.id);
                              if (e.key === "Escape") setEditingLabelId(null);
                            }}
                            className="mt-1 w-full border-0 border-border border-b bg-transparent text-center text-[0.7rem] focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            disabled={variation.status !== "COMPLETED"}
                            className={`mt-1 w-full truncate bg-transparent text-center text-[0.7rem] text-muted-foreground ${
                              variation.status === "COMPLETED"
                                ? "cursor-text hover:text-foreground"
                                : ""
                            }`}
                            title={
                              variation.status === "COMPLETED"
                                ? `${variation.label} — click to rename`
                                : variation.label
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLabelId(variation.id);
                              setEditingLabelValue(variation.label);
                            }}
                          >
                            {variation.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {showForm && (
              <motion.div
                key="variation-form"
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden px-0.5"
              >
                <div className="space-y-3 pt-1">
                  {!scope ? (
                    <>
                      <div>
                        <h3 className="font-medium text-sm">What do you want to change?</h3>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {(["clothes", "background", "pose", "all"] as const).map((option) => {
                          const {
                            title,
                            description,
                            icon: Icon,
                            iconClassName,
                          } = optionMeta[option];
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setScope(option)}
                              className="rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/60"
                            >
                              <div
                                className={cn(
                                  "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                                  iconClassName,
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <p className="font-medium text-sm">{title}</p>
                              <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                                {description}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-sm">
                            {scope === "all"
                              ? "Customize the full variation"
                              : `Update ${scopeConfig[scope].title.toLowerCase()}`}
                          </h3>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 gap-1 px-2 text-xs"
                          onClick={handleSuggest}
                          disabled={suggesting}
                        >
                          {suggesting ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Suggest with AI
                        </Button>
                      </div>

                      {scope === "all" ? (
                        <>
                          <div>
                            <p className="mb-1 text-muted-foreground text-xs">Clothes</p>
                            <Input
                              value={clothes}
                              onChange={(e) => setClothes(e.target.value)}
                              placeholder={scopeConfig.clothes.placeholder}
                              className="h-8 text-sm"
                            />
                          </div>

                          <div>
                            <p className="mb-1 text-muted-foreground text-xs">Background</p>
                            <Input
                              value={background}
                              onChange={(e) => setBackground(e.target.value)}
                              placeholder={scopeConfig.background.placeholder}
                              className="h-8 text-sm"
                            />
                          </div>

                          <div>
                            <p className="mb-1 text-muted-foreground text-xs">Pose</p>
                            <Input
                              value={pose}
                              onChange={(e) => setPose(e.target.value)}
                              placeholder={scopeConfig.pose.placeholder}
                              className="h-8 text-sm"
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <Input
                            value={scopeConfig[scope].value}
                            onChange={(e) => scopeConfig[scope].setValue(e.target.value)}
                            placeholder={scopeConfig[scope].placeholder}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}

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
                          disabled={submitting || !canGenerate}
                        >
                          {submitting && <Spinner className="mr-1.5 h-3.5 w-3.5" />}
                          Generate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setScope(null)}
                        >
                          Back
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Archive variation?"
        description={
          <>&ldquo;{deleteTarget?.label}&rdquo; will be archived and hidden from this avatar.</>
        }
        icon={<Archive className="h-4 w-4" />}
        confirmLabel="Archive"
        onConfirm={() => void handleDeleteConfirm()}
        loading={deleting}
      />
    </>
  );
}
