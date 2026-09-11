"use client";

import { Loader2, SquareStack } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BlockingOverlay } from "@/components/ui/blocking-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { carouselSpec } from "@/lib/carousel/platform-spec";
import { DEFAULT_LLM_MODEL_ID } from "@/lib/llm-models/registry";
import { PLATFORM_LABELS } from "@/lib/utils";

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

interface BrandProfile {
  id: string;
  brandName: string;
}

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS"] as const;
type PlatformName = (typeof PLATFORMS)[number];

const NO_BRAND = "__none__";

export function CarouselWizard() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<PlatformName>("INSTAGRAM");
  const [details, setDetails] = useState("");
  const [brandProfileId, setBrandProfileId] = useState<string>(NO_BRAND);
  const [llmModelId, setLlmModelId] = useState(DEFAULT_LLM_MODEL_ID);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [slideCount, setSlideCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const spec = carouselSpec(platform);

  useEffect(() => {
    if (!submitting) return;

    const startedAt = Date.now();
    setElapsedSeconds(0);
    const timer = setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );

    return () => clearInterval(timer);
  }, [submitting]);

  useEffect(() => {
    fetch("/api/llm-models")
      .then((r) => r.json())
      .then(setLLMModels)
      .catch(() => {});
    fetch("/api/brand-profile")
      .then((r) => r.json())
      .then((all: BrandProfile[]) => {
        setBrands(all);
        if (all.length > 0) setBrandProfileId(all[0].id);
      })
      .catch(() => {});
  }, []);

  // Each platform allows a different range, so a count that was fine on one can be out of
  // bounds on the next — TikTok's floor of four is the one that bites.
  useEffect(() => {
    setSlideCount((count) => Math.min(spec.maxSlides, Math.max(spec.minSlides, count)));
  }, [spec.minSlides, spec.maxSlides]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          platform,
          slideCount,
          details: details.trim() || null,
          brandProfileId: brandProfileId === NO_BRAND ? null : brandProfileId,
          llmModelId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to plan the carousel");
      }
      const post = await res.json();
      posthog.capture("carousel_created", { platform, slide_count: slideCount });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to plan the carousel");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          Post Title<span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="e.g. Five habits that actually stuck"
        />
      </div>

      <div className="space-y-2">
        <Label>Platform</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Button
              key={p}
              type="button"
              variant={platform === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPlatform(p)}
            >
              {PLATFORM_LABELS[p]}
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Slides render at {spec.canvas.width}×{spec.canvas.height}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slide-count">Slides</Label>
        <Input
          id="slide-count"
          type="number"
          min={spec.minSlides}
          max={spec.maxSlides}
          value={slideCount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSlideCount(Number(e.target.value) || spec.minSlides)
          }
        />
        <p className="text-muted-foreground text-xs">
          {PLATFORM_LABELS[platform]} allows {spec.minSlides}–{spec.maxSlides} slides
        </p>
      </div>

      {brands.length > 0 && (
        <div className="space-y-2">
          <Label>Brand</Label>
          <Select
            value={brandProfileId}
            onValueChange={(v: string | null) => v && setBrandProfileId(v)}
          >
            <SelectTrigger>
              <SelectValue>
                {brandProfileId === NO_BRAND
                  ? "No brand"
                  : (brands.find((b) => b.id === brandProfileId)?.brandName ?? "No brand")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)]">
              <SelectItem value={NO_BRAND}>No brand</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.brandName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="details">What should it cover? (optional)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDetails(e.target.value)}
          placeholder="Anything the carousel should mention, the angle, the tone..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select value={llmModelId} onValueChange={(v: string | null) => v && setLlmModelId(v)}>
          <SelectTrigger>
            <SelectValue>
              {llmModels.find((m) => m.id === llmModelId)?.name ?? llmModelId}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {llmModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Planning slides...
          </>
        ) : (
          <>
            <SquareStack className="mr-2 h-4 w-4" />
            Plan the carousel
          </>
        )}
      </Button>

      <BlockingOverlay
        active={submitting}
        className="fixed z-50 rounded-none"
        title="Planning your carousel…"
        description={`Writing ${slideCount} slides for ${PLATFORM_LABELS[platform]}`}
        elapsedSeconds={elapsedSeconds}
        estimate="usually under a minute"
      />
    </div>
  );
}
