"use client";

import { AlertTriangle, Loader2, Sparkles, Upload, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type AvatarVoice, AvatarVoiceField } from "@/components/avatars/AvatarVoiceField";
import { ALL_BACKGROUND_OPTIONS } from "@/components/avatars/avatar-background-options";
import { UploadImageGuide } from "@/components/avatars/UploadImageGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
import { RemoveButton } from "@/components/ui/cross-remove-button";
import { ImageCropper } from "@/components/ui/image-cropper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchHeyGenVoices } from "@/lib/heygen/fetch-voices";

interface ImageModel {
  id: string;
  name: string;
  description: string;
}

export type Mode = "generate" | "upload";
type Gender = "man" | "woman" | "neutral";
type GenderSelection = Gender | "";

function voiceGenderForAvatarGender(gender: GenderSelection): string | null {
  if (gender === "man") return "male";
  if (gender === "woman") return "female";
  return null;
}

const WARNING_LABELS: Record<string, string> = {
  blurry: "blurry photo",
  low_resolution: "low resolution — the image may look pixelated",
  harsh_lighting: "harsh lighting — strong highlights or shadows",
  multiple_people: "more than one person in the frame",
  heavy_filter: "a strong filter or beautification effect altering the subject",
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

interface InspectionResult {
  decision: "accept" | "reject";
  rejectionReason: string | null;
  rejectionMessage: string | null;
  warnings: string[];
  gender: "man" | "woman" | "neutral" | null;
}

function findRecommendedVoice(
  voices: AvatarVoice[],
  gender: GenderSelection,
): AvatarVoice | undefined {
  const voiceGender = voiceGenderForAvatarGender(gender);
  if (!voiceGender) return undefined;

  const matchingVoices = voices.filter(
    (voice) => voice.gender.trim().toLowerCase() === voiceGender,
  );
  if (matchingVoices.length === 0) return undefined;

  return matchingVoices[Math.floor(Math.random() * matchingVoices.length)];
}

interface NewAvatarFormProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function NewAvatarForm({ mode, onModeChange }: NewAvatarFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [gender, setGender] = useState<GenderSelection>("");
  const [age, setAge] = useState("");
  const [origin, setOrigin] = useState("");
  const [occupation, setOccupation] = useState("");
  const [imageModel, setImageModel] = useState("nano-banana-2");
  const [models, setModels] = useState<ImageModel[]>([]);
  const [voices, setVoices] = useState<AvatarVoice[]>([]);
  const [voiceManuallySelected, setVoiceManuallySelected] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const backgroundOptions = origin.trim()
    ? ALL_BACKGROUND_OPTIONS.filter((opt) =>
        opt.display.toLowerCase().includes(origin.toLowerCase()),
      )
    : ALL_BACKGROUND_OPTIONS;

  useEffect(() => {
    fetch("/api/image-models")
      .then((r) => r.json())
      .then(setModels);

    let cancelled = false;

    fetchHeyGenVoices()
      .then((nextVoices) => {
        if (cancelled) return;
        setVoices(nextVoices);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "Failed to load HeyGen voices");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (voiceManuallySelected || voices.length === 0) return;

    const matched = gender ? findRecommendedVoice(voices, gender) : undefined;
    const fallback = mode === "upload" ? voices[0] : undefined;
    setVoiceId(matched?.voice_id ?? fallback?.voice_id ?? "");
  }, [gender, mode, voiceManuallySelected, voices]);

  const processFile = useCallback((file: File): void => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Photo is too large. Maximum size is 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setOriginalSrc(result);
      setCropperSrc(result);
    };
    reader.readAsDataURL(file);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  const inspectImage = useCallback(
    async (dataUrl: string): Promise<void> => {
      setInspecting(true);
      setInspection(null);
      try {
        const res = await fetch("/api/avatars/inspect-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Inspection failed");
        }
        const result = (await res.json()) as InspectionResult;
        setInspection(result);
        if (result.decision === "accept" && result.gender) {
          if (result.gender !== gender) {
            setGender(result.gender);
            setVoiceManuallySelected(false);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Inspection failed");
      } finally {
        setInspecting(false);
      }
    },
    [gender],
  );

  function handleCropConfirm(croppedDataUrl: string): void {
    setCropperSrc(null);
    setImageBase64(croppedDataUrl);
    setPreviewUrl(croppedDataUrl);
    void inspectImage(croppedDataUrl);
  }

  function clearImage(): void {
    setImageBase64(null);
    setPreviewUrl(null);
    setOriginalSrc(null);
    setInspection(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  useEffect(() => {
    if (mode !== "upload") return;

    let counter = 0;

    function onDragEnter() {
      counter++;
      setIsDragging(true);
    }
    function onDragLeave() {
      counter--;
      if (counter === 0) setIsDragging(false);
    }
    function onDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      counter = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file || !["image/png", "image/jpeg"].includes(file.type)) return;
      processFile(file);
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [mode, processFile]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (mode === "generate") {
      if (!gender) {
        toast.error("Gender is required");
        return;
      }
      if (!age || Number.isNaN(Number(age))) {
        toast.error("Valid age is required");
        return;
      }
      if (!origin.trim()) {
        toast.error("Please enter where your avatar is from");
        return;
      }
      if (!occupation.trim()) {
        toast.error("Occupation is required");
        return;
      }
    }
    if (!voiceId) {
      toast.error("Voice is required");
      return;
    }
    if (mode === "upload" && !imageBase64) {
      toast.error("Please select an image");
      return;
    }
    if (mode === "upload" && inspecting) {
      toast.error("Please wait for photo analysis to finish");
      return;
    }
    if (mode === "upload" && inspection?.decision === "reject") {
      toast.error("This photo can't be used — try another");
      return;
    }

    setLoading(true);
    try {
      const body =
        mode === "upload"
          ? { name, voiceId, imageBase64, source: "UPLOADED" as const }
          : {
              name,
              voiceId,
              gender,
              age: Number(age),
              origin: origin.trim(),
              occupation,
              imageModel,
              source: "GENERATED" as const,
            };

      const res = await fetch("/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create avatar");
      }
      const avatar = await res.json();
      toast.success(mode === "upload" ? "Avatar created!" : "Generating image…");
      const redirectTo = searchParams.get("redirectTo");
      if (redirectTo) {
        const separator = redirectTo.includes("?") ? "&" : "?";
        router.push(`${redirectTo}${separator}edit=1&avatarId=${avatar.id}`);
      } else {
        router.push(`/avatars/${avatar.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode toggle */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant={mode === "generate" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("generate")}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Generate with AI
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("upload")}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload Image
        </Button>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dr. James"
          required
        />
      </div>

      {mode === "upload" && (
        <div className="mx-auto max-w-xs lg:hidden">
          <UploadImageGuide />
        </div>
      )}

      {mode === "generate" ? (
        <>
          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex flex-wrap gap-2">
              {(["man", "woman", "neutral"] as Gender[]).map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={gender === g ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGender(g)}
                  className="capitalize"
                >
                  {g}
                </Button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={18}
              max={90}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="35"
              className="w-32"
            />
          </div>

          {/* Where is your avatar from? */}
          <div className="space-y-2">
            <Label>Where is your avatar from?</Label>
            <Combobox
              inputValue={origin}
              onInputValueChange={(val, details) => {
                if (details.reason === "input-change" || details.reason === "item-press") {
                  setOrigin(val);
                }
              }}
            >
              <ComboboxInputGroup>
                <ComboboxInput placeholder="Eastern European, German, South Asian…" />
              </ComboboxInputGroup>
              {backgroundOptions.length > 0 && (
                <ComboboxContent>
                  {backgroundOptions.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt.value}>
                      {opt.display}
                    </ComboboxItem>
                  ))}
                </ComboboxContent>
              )}
            </Combobox>
          </div>

          {/* Occupation */}
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Doctor, Retired teacher, Software engineer"
            />
          </div>

          {/* Voice */}
          <div className="space-y-2">
            <Label>Voice</Label>
            <AvatarVoiceField
              voices={voices}
              value={voiceId}
              genderFilter={voiceGenderForAvatarGender(gender)}
              onValueChange={(nextVoiceId) => {
                setVoiceManuallySelected(true);
                setVoiceId(nextVoiceId);
              }}
            />
          </div>

          {/* Image model */}
          <div className="space-y-2">
            <Label>Image Model</Label>
            <Select value={imageModel} onValueChange={(v: string | null) => v && setImageModel(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {models.find((m) => m.id === imageModel)?.name ?? imageModel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id} description={m.description}>
                    <span className="font-medium">{m.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex justify-center">
              <Card
                className={`relative aspect-[9/16] w-2/5 cursor-pointer overflow-hidden border-dashed transition-colors hover:border-primary/50 ${isDragging ? "border-primary bg-primary/5" : ""}`}
                onClick={() => {
                  if (previewUrl && originalSrc) {
                    setCropperSrc(originalSrc);
                  } else if (!previewUrl) {
                    fileRef.current?.click();
                  }
                }}
              >
                <CardContent
                  className={`flex h-full flex-col items-center justify-center gap-3 ${previewUrl ? "p-0" : "p-4"}`}
                >
                  {previewUrl ? (
                    // biome-ignore lint/performance/noImgElement: blob preview URL, not suited for next/image
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">
                        {isDragging
                          ? "Drop image here"
                          : "Click or drag & drop an image (PNG or JPEG)"}
                      </p>
                    </>
                  )}
                </CardContent>
                {previewUrl && !inspecting && (
                  <RemoveButton
                    aria-label="Remove photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    className="absolute top-2 right-2"
                  />
                )}
                {inspecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm shadow">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing photo…
                    </div>
                  </div>
                )}
              </Card>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFile}
            />

            {inspection?.decision === "reject" && inspection.rejectionMessage && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{inspection.rejectionMessage}</span>
              </div>
            )}

            {inspection?.decision === "accept" && inspection.warnings.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 text-sm dark:text-amber-300">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Heads up
                </div>
                <p>We detected:</p>
                <ul className="ml-6 list-disc space-y-0.5">
                  {inspection.warnings.map((w) => (
                    <li key={w}>{WARNING_LABELS[w] ?? w}</li>
                  ))}
                </ul>
                <p className="pt-1">
                  You may get poor results working with this avatar later. If it looks crispy and
                  clear for you, then ignore warning.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            <AvatarVoiceField
              voices={voices}
              value={voiceId}
              genderFilter={voiceGenderForAvatarGender(gender)}
              onValueChange={(nextVoiceId) => {
                setVoiceManuallySelected(true);
                setVoiceId(nextVoiceId);
              }}
            />
          </div>
        </>
      )}

      <ImageCropper
        open={cropperSrc !== null}
        src={cropperSrc}
        aspect={9 / 16}
        onCancel={() => setCropperSrc(null)}
        onConfirm={handleCropConfirm}
      />

      <Button
        type="submit"
        disabled={
          loading || (mode === "upload" && (inspecting || inspection?.decision === "reject"))
        }
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {mode === "generate" ? "Submitting…" : "Creating…"}
          </>
        ) : (
          "Create Avatar"
        )}
      </Button>
    </form>
  );
}
