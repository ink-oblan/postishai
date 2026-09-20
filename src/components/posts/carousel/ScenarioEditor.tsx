"use client";

import type { Platform } from "@prisma/client";
import { Loader2, Plus, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { resolveFontFamily } from "@/components/design/font-catalogue";
import { ScenarioInspector } from "@/components/posts/carousel/ScenarioInspector";
import {
  ScenarioStoryboard,
  type StoryboardSlide,
} from "@/components/posts/carousel/ScenarioStoryboard";
import { Button } from "@/components/ui/button";
import { carouselCanvas, carouselSpec } from "@/lib/carousel/platform-spec";
import type { CarouselLayoutTheme } from "@/lib/carousel/theme";
import { safeArea } from "@/lib/design/canvas-spec";
import type { DesignDocument } from "@/lib/design/document";
import { type FitReport, fitReport } from "@/lib/design/fit";
import { ensureFontsLoaded, facesUsedBy, registerUploadedFont } from "@/lib/design/fonts";
import {
  DEFAULT_LAYOUT,
  expandLayout,
  isLayoutName,
  type LayoutName,
  layoutAutoLayout,
} from "@/lib/design/layouts";
import { PLACEHOLDER_BACKGROUND_COLOR } from "@/lib/design/placeholder";
import type { MeasureText } from "@/lib/design/reflow";
import { reflowAutoLayout } from "@/lib/design/reflow";
import { responseError } from "@/lib/utils";

export interface ScenarioSlideRow {
  key: string;
  id: string | null;
  headline: string;
  body: string;
  visualPrompt: string;
  layout: string;
}

export interface ScenarioSlideInput {
  id: string;
  headline: string;
  body: string;
  visualPrompt: string;
  layout: string;
}

interface ScenarioEditorProps {
  postId: string;
  platform: Platform;
  initialSlides: ScenarioSlideInput[];
  theme: CarouselLayoutTheme;
  uploadedFonts: { assetId: string; name: string }[];
}

interface SlidePreview {
  document: DesignDocument;
  fit: FitReport | null;
}

function newKey(): string {
  return uuidv4();
}

function emptySlide(): ScenarioSlideRow {
  return {
    key: newKey(),
    id: null,
    headline: "",
    body: "",
    visualPrompt: "",
    layout: DEFAULT_LAYOUT,
  };
}

export function toRows(saved: ScenarioSlideInput[], keys: string[] = []): ScenarioSlideRow[] {
  return saved.map((slide, index) => ({
    key: keys[index] ?? newKey(),
    id: slide.id,
    headline: slide.headline ?? "",
    body: slide.body ?? "",
    visualPrompt: slide.visualPrompt ?? "",
    layout: slide.layout,
  }));
}

function layoutOf(row: ScenarioSlideRow): LayoutName {
  return isLayoutName(row.layout) ? row.layout : DEFAULT_LAYOUT;
}

export function ScenarioEditor({
  postId,
  platform,
  initialSlides,
  theme,
  uploadedFonts,
}: ScenarioEditorProps) {
  const router = useRouter();
  const { minSlides, maxSlides } = carouselSpec(platform);
  const spec = useMemo(() => carouselCanvas(platform), [platform]);
  const [slides, setSlides] = useState<ScenarioSlideRow[]>(() => toRows(initialSlides));
  const [selectedKey, setSelectedKey] = useState<string | null>(slides[0]?.key ?? null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [measured, setMeasured] = useState(0);
  const measureRef = useRef<MeasureText | null>(null);
  const previewCache = useRef(new Map<string, SlidePreview>());

  const complete = slides.every((slide) => slide.headline.trim() && slide.visualPrompt.trim());
  const countOk = slides.length >= minSlides && slides.length <= maxSlides;

  const previews = useMemo(() => {
    const measure = measureRef.current;
    const area = safeArea(spec);
    const cache = previewCache.current;
    const retained = new Map<string, SlidePreview>();
    const byKey = new Map<string, SlidePreview>();

    for (const row of slides) {
      const layout = layoutOf(row);
      const signature = `${measured}|${layout}|${row.headline}|${row.body}`;
      const hit = cache.get(signature);
      if (hit) {
        retained.set(signature, hit);
        byKey.set(row.key, hit);
        continue;
      }

      const expanded: DesignDocument = {
        background: { kind: "solid", color: PLACEHOLDER_BACKGROUND_COLOR },
        autoLayout: layoutAutoLayout(layout),
        layers: expandLayout(layout, {
          spec,
          headline: row.headline,
          body: row.body,
          fonts: theme.fonts,
          colors: theme.colors,
        }),
      };
      const document = measure ? (reflowAutoLayout(expanded, area, measure) ?? expanded) : expanded;
      const preview: SlidePreview = {
        document,
        fit: measure ? fitReport({ document, layout, spec, measure }) : null,
      };

      retained.set(signature, preview);
      byKey.set(row.key, preview);
    }

    previewCache.current = retained;
    return byKey;
  }, [slides, spec, theme, measured]);

  const faces = useMemo(
    () =>
      [...previews.values()].flatMap(({ document }) => facesUsedBy(document, resolveFontFamily)),
    [previews],
  );
  const facesRef = useRef(faces);
  facesRef.current = faces;
  const facesKey = useMemo(
    () =>
      faces
        .map((face) => `${face.family}|${face.weight}|${face.italic}`)
        .sort()
        .join(","),
    [faces],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the face list, whose array identity changes every render
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.all(uploadedFonts.map((font) => registerUploadedFont(font.assetId)));
      await ensureFontsLoaded(facesRef.current);
      const { textMeasurer } = await import("@/lib/design/measure-text");
      if (cancelled) return;

      measureRef.current = textMeasurer(resolveFontFamily);
      setMeasured((generation) => generation + 1);
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [facesKey, uploadedFonts]);

  const storyboard: StoryboardSlide[] = slides.map((row, index) => {
    const preview = previews.get(row.key);
    return {
      key: row.key,
      document: preview?.document ?? {
        background: { kind: "solid", color: "#111111" },
        layers: [],
      },
      role: index === 0 ? "hook" : index === slides.length - 1 ? "cta" : null,
      fit: preview?.fit ?? null,
      incomplete: !row.headline.trim() || !row.visualPrompt.trim(),
    };
  });

  const selectedIndex = slides.findIndex((row) => row.key === selectedKey);
  const selected = selectedIndex >= 0 ? slides[selectedIndex] : null;

  useEffect(() => {
    if (slides.length === 0) return;
    if (!slides.some((row) => row.key === selectedKey)) setSelectedKey(slides[0].key);
  }, [slides, selectedKey]);

  function patch(key: string, changes: Partial<ScenarioSlideRow>) {
    setSlides((current) =>
      current.map((slide) => (slide.key === key ? { ...slide, ...changes } : slide)),
    );
  }

  function reorder(next: StoryboardSlide[]) {
    setSlides((current) =>
      next.flatMap((entry) => {
        const row = current.find((slide) => slide.key === entry.key);
        return row ? [row] : [];
      }),
    );
  }

  function addSlide() {
    const slide = emptySlide();
    setSlides((current) => [...current, slide]);
    setSelectedKey(slide.key);
  }

  function deleteSlide(key: string) {
    setSlides((current) => current.filter((slide) => slide.key !== key));
  }

  async function save(): Promise<ScenarioSlideRow[] | null> {
    setSaving(true);
    const keys = slides.map((slide) => slide.key);
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
      if (!res.ok) throw await responseError(res, "Failed to save");

      const { slides: saved } = await res.json();
      const rows = toRows(saved, keys);
      setSlides(rows);
      return rows;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(key: string) {
    // A slide the user just added has no id yet, and the server rewrites by id.
    let slideId = slides.find((row) => row.key === key)?.id ?? null;
    if (!slideId) {
      const saved = await save();
      slideId = saved?.find((row) => row.key === key)?.id ?? null;
      if (!slideId) return;
    }

    setRegenerating(slideId);
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/scenario/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideId }),
      });
      if (!res.ok) throw await responseError(res, "Failed to regenerate");

      const { slides: fresh } = await res.json();
      setSlides((current) =>
        toRows(
          fresh,
          current.map((slide) => slide.key),
        ),
      );
      toast.success("Slide rewritten");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setRegenerating(null);
    }
  }

  /** Rewriting every slide is the planning job again, so it runs on the worker and the page
   *  swaps to the planning spinner rather than holding the editor open for a minute. */
  async function rewriteAll() {
    // The rewrite asks for as many slides as the saved plan has, so the edits land first.
    if (!(await save())) return;

    setRegenerating("all");
    try {
      const res = await fetch(`/api/posts/${postId}/carousel/scenario/plan`, { method: "POST" });
      if (!res.ok) throw await responseError(res, "Failed to start the rewrite");

      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start the rewrite");
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
      if (!res.ok) throw await responseError(res, "Failed to start generation");

      toast.success("Generating slide backgrounds");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start generation");
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            {slides.length} slide{slides.length === 1 ? "" : "s"} · drag to reorder, click to edit
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={rewriteAll}
            disabled={regenerating !== null || generating || saving || !countOk}
          >
            {regenerating === "all" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Rewrite all
          </Button>
        </div>

        <ScenarioStoryboard
          slides={storyboard}
          selectedKey={selectedKey}
          spec={spec}
          onSelect={setSelectedKey}
          onReorder={reorder}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSlide}
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
              `Approve · generate ${slides.length} background${slides.length === 1 ? "" : "s"}`
            )}
          </Button>
        </div>
      </div>

      <div className="w-full lg:w-80 lg:flex-none lg:border-l lg:pl-6">
        {selected ? (
          <ScenarioInspector
            key={selected.key}
            slide={selected}
            position={selectedIndex + 1}
            total={slides.length}
            fit={previews.get(selected.key)?.fit ?? null}
            regenerating={regenerating === selected.id}
            deletable={slides.length > minSlides}
            onChange={(changes) => patch(selected.key, changes)}
            onRegenerate={() => regenerate(selected.key)}
            onDelete={() => deleteSlide(selected.key)}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Add a slide to start planning.</p>
        )}
      </div>
    </div>
  );
}
