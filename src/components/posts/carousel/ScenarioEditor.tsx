"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { LAYOUT_NAMES } from "@/lib/design/layouts";

export interface ScenarioSlideRow {
  id: string | null;
  headline: string;
  body: string;
  visualPrompt: string;
  layout: string;
}

interface ScenarioEditorProps {
  postId: string;
  initialSlides: ScenarioSlideRow[];
  minSlides: number;
  maxSlides: number;
}

const LAYOUT_LABELS: Record<string, string> = {
  cover: "Cover",
  statement: "Statement",
  list: "List",
  quote: "Quote",
  cta: "Call to action",
};

function emptySlide(): ScenarioSlideRow {
  return { id: null, headline: "", body: "", visualPrompt: "", layout: "statement" };
}

export function ScenarioEditor({
  postId,
  initialSlides,
  minSlides,
  maxSlides,
}: ScenarioEditorProps) {
  const router = useRouter();
  const [slides, setSlides] = useState<ScenarioSlideRow[]>(initialSlides);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const complete = slides.every((slide) => slide.headline.trim() && slide.visualPrompt.trim());
  const countOk = slides.length >= minSlides && slides.length <= maxSlides;

  function patch(index: number, changes: Partial<ScenarioSlideRow>) {
    setSlides((current) =>
      current.map((slide, i) => (i === index ? { ...slide, ...changes } : slide)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/scenario`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: slides.map((slide) => ({
            ...(slide.id ? { id: slide.id } : {}),
            headline: slide.headline,
            body: slide.body,
            visualPrompt: slide.visualPrompt,
            layout: slide.layout,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      const { slides: saved } = await res.json();
      setSlides(
        saved.map((slide: Record<string, unknown>) => ({
          id: slide.id as string,
          headline: (slide.headline as string) ?? "",
          body: (slide.body as string) ?? "",
          visualPrompt: slide.visualPrompt as string,
          layout: slide.layout as string,
        })),
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(slideId: string | null) {
    setRegenerating(slideId ?? "all");
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/scenario/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slideId ? { slideId } : {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to regenerate");
      }
      const { slides: fresh } = await res.json();
      setSlides(
        fresh.map((slide: Record<string, unknown>) => ({
          id: slide.id as string,
          headline: (slide.headline as string) ?? "",
          body: (slide.body as string) ?? "",
          visualPrompt: slide.visualPrompt as string,
          layout: slide.layout as string,
        })),
      );
      toast.success(slideId ? "Slide rewritten" : "Carousel rewritten");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setRegenerating(null);
    }
  }

  async function approve() {
    // Unsaved edits would otherwise be designed over by the version still on the server.
    if (!(await save())) return;

    setGenerating(true);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to start generation");
      }
      toast.success("Generating slide backgrounds");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start generation");
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {slides.length} slide{slides.length === 1 ? "" : "s"} · edit the plan before generating
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => regenerate(null)}
          disabled={regenerating !== null || generating}
        >
          {regenerating === "all" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Rewrite all
        </Button>
      </div>

      <div className="space-y-3">
        {slides.map((slide, index) => (
          <div
            key={slide.id ?? `new-${index}`}
            className="space-y-3 rounded-lg border border-border p-4"
            data-testid="scenario-slide"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-muted-foreground text-xs">Slide {index + 1}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Move up"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Move down"
                  onClick={() => move(index, 1)}
                  disabled={index === slides.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {slide.id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Rewrite this slide"
                    onClick={() => regenerate(slide.id)}
                    disabled={regenerating !== null}
                  >
                    {regenerating === slide.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Delete slide"
                  onClick={() => setSlides((current) => current.filter((_, i) => i !== index))}
                  disabled={slides.length <= minSlides}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`headline-${index}`}>Headline</Label>
              <Input
                id={`headline-${index}`}
                value={slide.headline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  patch(index, { headline: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`body-${index}`}>Body</Label>
              <Textarea
                id={`body-${index}`}
                value={slide.body}
                rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  patch(index, { body: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor={`visual-${index}`}>Visual</Label>
                <Textarea
                  id={`visual-${index}`}
                  value={slide.visualPrompt}
                  rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    patch(index, { visualPrompt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select
                  value={slide.layout}
                  onValueChange={(value: string | null) => value && patch(index, { layout: value })}
                >
                  <SelectTrigger>
                    <SelectValue>{LAYOUT_LABELS[slide.layout] ?? slide.layout}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {LAYOUT_LABELS[name]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSlides((current) => [...current, emptySlide()])}
          disabled={slides.length >= maxSlides}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add slide
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save plan
        </Button>
      </div>

      {!countOk && (
        <p className="text-destructive text-xs">
          This platform needs between {minSlides} and {maxSlides} slides.
        </p>
      )}

      <div className="border-t pt-4">
        <Button onClick={approve} disabled={generating || saving || !complete || !countOk}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            "Approve and generate slides"
          )}
        </Button>
        <p className="mt-2 text-muted-foreground text-xs">
          Generates a background for every slide. The plan is locked once this starts.
        </p>
      </div>
    </div>
  );
}
