"use client";

import { Loader2, Sparkles, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ALL_BACKGROUND_OPTIONS } from "@/components/avatars/avatar-background-options";
import { type AvatarVoice, AvatarVoiceField } from "@/components/avatars/AvatarVoiceField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
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

type Mode = "generate" | "upload";
type Gender = "man" | "woman" | "neutral";
type GenderSelection = Gender | "";

function voiceGenderForAvatarGender(gender: GenderSelection): string | null {
  if (gender === "man") return "male";
  if (gender === "woman") return "female";
  return null;
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

export function NewAvatarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("generate");
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
  const fileRef = useRef<HTMLInputElement>(null);

  const backgroundOptions = origin.trim()
    ? ALL_BACKGROUND_OPTIONS.filter((opt) => opt.display.toLowerCase().includes(origin.toLowerCase()))
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

    const recommendedVoice = mode === "upload" ? voices[0] : findRecommendedVoice(voices, gender);
    setVoiceId(recommendedVoice?.voice_id ?? "");
  }, [gender, mode, voiceManuallySelected, voices]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImageBase64(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  }

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

    setLoading(true);
    try {
      const body =
        mode === "upload"
          ? { name, voiceId, imageBase64 }
          : {
              name,
              voiceId,
              gender,
              age: Number(age),
              origin: origin.trim(),
              occupation,
              imageModel,
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
          onClick={() => setMode("generate")}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Generate with AI
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("upload")}
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
              allowClear={voiceManuallySelected}
              onClear={() => {
                setVoiceManuallySelected(false);
                const recommendedVoice = findRecommendedVoice(voices, gender);
                setVoiceId(recommendedVoice?.voice_id ?? "");
              }}
              clearTitle="Use recommended voice"
            />
          </div>

          {/* Image model */}
          <div className="space-y-2">
            <Label>Image Model</Label>
            <Select value={imageModel} onValueChange={(v: string | null) => v && setImageModel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">{m.description}</span>
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
            <Card
              className="cursor-pointer border-dashed transition-colors hover:border-primary/50"
              onClick={() => fileRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
                {previewUrl ? (
                  // biome-ignore lint/performance/noImgElement: blob preview URL, not suited for next/image
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 rounded-md object-contain"
                  />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      Click to select an image (PNG or JPEG)
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            <AvatarVoiceField
              voices={voices}
              value={voiceId}
              onValueChange={(nextVoiceId) => {
                setVoiceManuallySelected(true);
                setVoiceId(nextVoiceId);
              }}
              allowClear={voiceManuallySelected}
              onClear={() => {
                setVoiceManuallySelected(false);
                setVoiceId(voices[0]?.voice_id ?? "");
              }}
              clearTitle="Use recommended voice"
            />
          </div>
        </>
      )}

      <Button type="submit" disabled={loading} className="w-full">
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
