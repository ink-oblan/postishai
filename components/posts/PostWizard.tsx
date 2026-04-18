"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Loader2, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_LLM_MODEL_ID } from "@/lib/llm-models/registry";
import { PLATFORM_LABELS } from "@/lib/utils";

interface Avatar {
  id: string;
  name: string;
  imagePath: string;
  voiceId: string;
}

interface AvatarVariation {
  id: string;
  label: string;
  status: string;
}

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS"] as const;

interface WizardData {
  avatarId: string;
  avatarVariationId: string | null;
  title: string;
  platform: string;
  script: string;
  llmModelId: string;
}

export function PostWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAvatarId = searchParams.get("avatarId") ?? "";
  const preselectedVariationId = searchParams.get("variationId") ?? null;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    avatarId: "",
    avatarVariationId: null,
    title: "",
    platform: "INSTAGRAM",
    script: "",
    llmModelId: DEFAULT_LLM_MODEL_ID,
  });
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avatarVariations, setAvatarVariations] = useState<AvatarVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedAvatarId) {
      setData((d) => ({ ...d, avatarId: preselectedAvatarId, avatarVariationId: preselectedVariationId }));
      setStep(2);
      // Fetch variations so the selection is visible if user navigates back to step 1
      fetch(`/api/avatars/${preselectedAvatarId}/variations`)
        .then((r) => r.json())
        .then((all: AvatarVariation[]) => setAvatarVariations(all.filter((v) => v.status === "COMPLETED")))
        .catch(() => {});
    }
    fetch("/api/avatars").then((r) => r.json()).then(setAvatars);
    fetch("/api/llm-models").then((r) => r.json()).then(setLLMModels);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<WizardData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function canSubmit(): boolean {
    return !!(title && script && data.platform);
  }

  async function handleAvatarSelect(avatarId: string) {
    update({ avatarId, avatarVariationId: null });
    setAvatarVariations([]);
    setLoadingVariations(true);
    try {
      const res = await fetch(`/api/avatars/${avatarId}/variations`);
      const all: AvatarVariation[] = await res.json();
      setAvatarVariations(all.filter((v) => v.status === "COMPLETED"));
    } finally {
      setLoadingVariations(false);
    }
  }

  async function handleSubmit() {
    const submitData = { ...data, title, script };
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create post");
      }
      const post = await res.json();
      toast.success("Post created! Metadata generation started.");
      router.push(`/posts/${post.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s < step ? "bg-primary text-primary-foreground" :
              s === step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {s < step ? <Check className="h-3.5 w-3.5" /> : s}
            </div>
            <span className={`text-sm ${s === step ? "font-medium" : "text-muted-foreground"}`}>
              {s === 1 ? "Avatar" : "Script"}
            </span>
            {s < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Avatar selection */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select the avatar for this post</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => router.push("/avatars/new")}
              className="rounded-lg overflow-hidden border-2 border-dashed border-border bg-muted/20 text-left transition-all hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="aspect-[9/16] flex items-center justify-center bg-[linear-gradient(180deg,hsl(var(--muted))/0.7,transparent)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Plus className="h-7 w-7" />
                </div>
              </div>
              <p className="text-xs font-medium p-2 truncate">Add new avatar</p>
            </button>

            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => handleAvatarSelect(avatar.id)}
                className={`rounded-lg overflow-hidden border-2 transition-all text-left ${
                  data.avatarId === avatar.id ? "border-primary" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="aspect-[9/16] relative bg-muted">
                  <Image
                    src={
                      data.avatarId === avatar.id && data.avatarVariationId
                        ? `/api/avatars/${avatar.id}/variations/${data.avatarVariationId}/image`
                        : `/api/avatars/${avatar.id}/image`
                    }
                    alt={avatar.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="text-xs font-medium p-2 truncate">{avatar.name}</p>
              </button>
            ))}
          </div>

          {data.avatarId && (loadingVariations || avatarVariations.length > 0) && (
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Variation</p>
              {loadingVariations ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading variations…
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => update({ avatarVariationId: null })}
                    className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                      data.avatarVariationId === null
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    Base
                  </button>
                  {avatarVariations.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => update({ avatarVariationId: v.id })}
                      className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                        data.avatarVariationId === v.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Script & platform */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Post Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale Announcement"
            />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={data.platform === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => update({ platform: p })}
                >
                  {PLATFORM_LABELS[p]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="script">Script (spoken text)</Label>
            <Textarea
              id="script"
              value={script}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScript(e.target.value)}
              placeholder="What should the avatar say in the video?"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{script.length} characters</p>
          </div>

          <div className="space-y-2">
            <Label>AI Model for Metadata</Label>
            <Select value={data.llmModelId} onValueChange={(v: string | null) => v && update({ llmModelId: v })}>
              <SelectTrigger>
                <SelectValue>{llmModels.find((m) => m.id === data.llmModelId)?.name ?? data.llmModelId}</SelectValue>
              </SelectTrigger>
              <SelectContent className="w-max">
                {llmModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
        ) : <div />}
        {step === 1 ? (
          <Button onClick={() => setStep(2)} disabled={!data.avatarId}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit()}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
            ) : (
              "Create Post"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
