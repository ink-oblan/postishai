"use client";

import { AlertTriangle, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ALL_BACKGROUND_OPTIONS } from "@/components/avatars/avatar-background-options";
import { type AvatarVoice, AvatarVoiceField } from "@/components/avatars/AvatarVoiceField";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchHeyGenVoices } from "@/lib/heygen/fetch-voices";
import { formatDistanceToNow } from "@/lib/utils";

type Gender = "man" | "woman" | "neutral";

function voiceGenderForAvatarGender(gender: Gender): string | null {
  if (gender === "man") return "male";
  if (gender === "woman") return "female";
  return null;
}

interface ImageModel {
  id: string;
  name: string;
  description: string;
}

interface AvatarData {
  id: string;
  name: string;
  voiceId: string;
  gender: string | null;
  age: number | null;
  origin: string | null;
  occupation: string | null;
  imageModel: string | null;
  createdAt: string;
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-muted-foreground text-xs">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-medium text-sm">
      {children || <span className="text-muted-foreground">—</span>}
    </p>
  );
}

function backgroundInitialValue(avatar: AvatarData): string {
  return avatar.origin ?? "";
}

export function AvatarEditPanel({ avatar }: { avatar: AvatarData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(avatar.name);
  const [gender, setGender] = useState<Gender>((avatar.gender as Gender) ?? "man");
  const [age, setAge] = useState(avatar.age?.toString() ?? "");
  const [origin, setOrigin] = useState(backgroundInitialValue(avatar));
  const [occupation, setOccupation] = useState(avatar.occupation ?? "");
  const [imageModel, setImageModel] = useState(avatar.imageModel ?? "");
  const [voiceId, setVoiceId] = useState(avatar.voiceId);
  const [models, setModels] = useState<ImageModel[]>([]);
  const [voices, setVoices] = useState<AvatarVoice[]>([]);
  const [loading, setLoading] = useState(false);

  const backgroundOptions = origin.trim()
    ? ALL_BACKGROUND_OPTIONS.filter((opt) => opt.display.toLowerCase().includes(origin.toLowerCase()))
    : ALL_BACKGROUND_OPTIONS;

  useEffect(() => {
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
    if (editing)
      fetch("/api/image-models")
        .then((r) => r.json())
        .then(setModels);
  }, [editing]);

  const visualChanged =
    gender !== (avatar.gender ?? "man") ||
    age !== (avatar.age?.toString() ?? "") ||
    origin !== backgroundInitialValue(avatar) ||
    occupation !== (avatar.occupation ?? "") ||
    imageModel !== (avatar.imageModel ?? "");

  const voiceChanged = voiceId !== avatar.voiceId;

  function handleCancel() {
    setName(avatar.name);
    setGender((avatar.gender as Gender) ?? "man");
    setAge(avatar.age?.toString() ?? "");
    setOrigin(backgroundInitialValue(avatar));
    setOccupation(avatar.occupation ?? "");
    setImageModel(avatar.imageModel ?? "");
    setVoiceId(avatar.voiceId);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (visualChanged) {
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
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name };
      if (voiceChanged) body.voiceId = voiceId;
      if (visualChanged) {
        body.gender = gender;
        body.age = Number(age);
        body.origin = origin.trim();
        body.occupation = occupation;
        if (imageModel) body.imageModel = imageModel;
        body.regenerate = true;
      }
      const res = await fetch(`/api/avatars/${avatar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(visualChanged ? "Regeneration started" : "Updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <>
      {/* Name row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PropLabel>Name</PropLabel>
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-8 text-sm"
            />
          ) : (
            <h1 className="truncate font-semibold text-xl">{avatar.name}</h1>
          )}
        </div>
        <div className="shrink-0 sm:mt-5">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {visualChanged ? "Save & Regenerate" : voiceChanged ? "Save" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Warning */}
      {editing && visualChanged && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Avatar image will be regenerated
        </div>
      )}

      {/* Properties grid */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {/* Gender */}
        <div className="min-w-0">
          <PropLabel>Gender</PropLabel>
          {editing ? (
            <div className="flex flex-wrap gap-1.5">
              {(["man", "woman", "neutral"] as Gender[]).map((g) => (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  className="h-7 px-2.5 text-xs capitalize"
                  variant={gender === g ? "default" : "outline"}
                  onClick={() => setGender(g)}
                >
                  {g}
                </Button>
              ))}
            </div>
          ) : (
            <PropValue>
              {avatar.gender && <span className="capitalize">{avatar.gender}</span>}
            </PropValue>
          )}
        </div>

        {/* Age */}
        <div className="min-w-0">
          <PropLabel>Age</PropLabel>
          {editing ? (
            <Input
              type="number"
              min={18}
              max={90}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-8 w-full text-sm sm:w-24"
              placeholder="35"
            />
          ) : (
            <PropValue>{avatar.age ? `${avatar.age} yrs` : null}</PropValue>
          )}
        </div>

        {/* Origin */}
        <div className="col-span-1 min-w-0 sm:col-span-2">
          <PropLabel>Origin</PropLabel>
          {editing ? (
            <Combobox
              inputValue={origin}
              onInputValueChange={(val, details) => {
                if (details.reason === "input-change" || details.reason === "item-press") {
                  setOrigin(val);
                }
              }}
            >
              <ComboboxInputGroup>
                <ComboboxInput
                  className="text-sm"
                  placeholder="Eastern European, German, South Asian…"
                />
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
          ) : (
            <PropValue>{backgroundInitialValue(avatar)}</PropValue>
          )}
        </div>

        {/* Occupation */}
        <div className="min-w-0">
          <PropLabel>Occupation</PropLabel>
          {editing ? (
            <Input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="h-8 text-sm"
              placeholder="Doctor"
            />
          ) : (
            <PropValue>{avatar.occupation}</PropValue>
          )}
        </div>

        {/* Image Model */}
        <div className="min-w-0">
          <PropLabel>Image Model</PropLabel>
          {editing ? (
            models.length > 0 ? (
              <Select value={imageModel} onValueChange={(v) => v && setImageModel(v)}>
                <SelectTrigger className="h-8 w-full text-sm">
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
            ) : (
              <div className="flex h-8 items-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )
          ) : (
            <PropValue>{avatar.imageModel}</PropValue>
          )}
        </div>

        {/* Voice */}
        <div>
          <PropLabel>Voice</PropLabel>
          {editing ? (
            <AvatarVoiceField
              voices={voices}
              value={voiceId}
              onValueChange={setVoiceId}
              genderFilter={voiceGenderForAvatarGender(gender)}
              loading={voices.length === 0}
              size="sm"
              triggerClassName="h-8 text-sm"
            />
          ) : (
            <AvatarVoiceField
              voices={voices}
              value={avatar.voiceId}
              loading={voices.length === 0}
              readOnly
            />
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Created {formatDistanceToNow(new Date(avatar.createdAt))}
      </p>
    </>
  );

  if (editing) {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        {content}
      </form>
    );
  }

  return <div className="space-y-4">{content}</div>;
}
