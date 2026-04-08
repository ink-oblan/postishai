"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, AlertTriangle, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/utils";

const ETHNICITIES = [
  "Eastern European", "Western European", "Mediterranean", "Scandinavian",
  "Middle Eastern", "South Asian", "East Asian", "Southeast Asian",
  "Central Asian", "Sub-Saharan African", "North African",
  "Latin American", "Caribbean", "North American", "Pacific Islander",
];

type Gender = "man" | "woman" | "neutral";
interface ImageModel { id: string; name: string; description: string }
interface Voice { voice_id: string; name: string; gender: string; preview_audio?: string }

interface AvatarData {
  id: string;
  name: string;
  voiceId: string;
  gender: string | null;
  age: number | null;
  ethnicity: string | null;
  origin: string | null;
  occupation: string | null;
  imageModel: string | null;
  createdAt: string;
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children || <span className="text-muted-foreground">—</span>}</p>;
}

export function AvatarEditPanel({ avatar }: { avatar: AvatarData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(avatar.name);
  const [gender, setGender] = useState<Gender>((avatar.gender as Gender) ?? "man");
  const [age, setAge] = useState(avatar.age?.toString() ?? "");
  const [ethnicity, setEthnicity] = useState(avatar.ethnicity ?? "");
  const [origin, setOrigin] = useState(avatar.origin ?? "");
  const [occupation, setOccupation] = useState(avatar.occupation ?? "");
  const [imageModel, setImageModel] = useState(avatar.imageModel ?? "");
  const [voiceId, setVoiceId] = useState(avatar.voiceId);
  const [models, setModels] = useState<ImageModel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingVoiceId(null);
  }, []);

  function toggleVoicePreview(voice: Voice) {
    if (!voice.preview_audio) return;
    if (playingVoiceId === voice.voice_id) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(voice.preview_audio);
    audio.onended = () => setPlayingVoiceId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingVoiceId(voice.voice_id);
  }

  useEffect(() => stopAudio, [stopAudio]);

  useEffect(() => {
    fetch("/api/heygen/voices").then((r) => r.json()).then(setVoices);
  }, []);

  useEffect(() => {
    if (editing) fetch("/api/image-models").then((r) => r.json()).then(setModels);
  }, [editing]);

  const visualChanged =
    gender !== (avatar.gender ?? "man") ||
    age !== (avatar.age?.toString() ?? "") ||
    ethnicity !== (avatar.ethnicity ?? "") ||
    origin !== (avatar.origin ?? "") ||
    occupation !== (avatar.occupation ?? "") ||
    imageModel !== (avatar.imageModel ?? "");

  const voiceChanged = voiceId !== avatar.voiceId;

  function handleCancel() {
    setName(avatar.name);
    setGender((avatar.gender as Gender) ?? "man");
    setAge(avatar.age?.toString() ?? "");
    setEthnicity(avatar.ethnicity ?? "");
    setOrigin(avatar.origin ?? "");
    setOccupation(avatar.occupation ?? "");
    setImageModel(avatar.imageModel ?? "");
    setVoiceId(avatar.voiceId);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (visualChanged) {
      if (!age || isNaN(Number(age))) { toast.error("Valid age is required"); return; }
      if (!ethnicity) { toast.error("Ethnicity is required"); return; }
      if (!occupation.trim()) { toast.error("Occupation is required"); return; }
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name };
      if (voiceChanged) body.voiceId = voiceId;
      if (visualChanged) {
        body.gender = gender;
        body.age = Number(age);
        body.ethnicity = ethnicity;
        body.origin = origin.trim() || undefined;
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <PropLabel>Name</PropLabel>
          {editing
            ? <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-8 text-sm" />
            : <h1 className="text-xl font-semibold truncate">{avatar.name}</h1>
          }
        </div>
        <div className="shrink-0 mt-5">
          {editing ? (
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {visualChanged ? "Save & Regenerate" : (voiceChanged ? "Save" : "Save")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
            </Button>
          )}
        </div>
      </div>

      {/* Warning */}
      {editing && visualChanged && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Avatar image will be regenerated
        </div>
      )}

      {/* Properties grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">

        {/* Gender */}
        <div>
          <PropLabel>Gender</PropLabel>
          {editing ? (
            <div className="flex gap-1.5">
              {(["man", "woman", "neutral"] as Gender[]).map((g) => (
                <Button key={g} type="button" size="sm" className="capitalize h-7 px-2.5 text-xs"
                  variant={gender === g ? "default" : "outline"}
                  onClick={() => setGender(g)}>{g}</Button>
              ))}
            </div>
          ) : (
            <PropValue>{avatar.gender && <span className="capitalize">{avatar.gender}</span>}</PropValue>
          )}
        </div>

        {/* Age */}
        <div>
          <PropLabel>Age</PropLabel>
          {editing
            ? <Input type="number" min={18} max={90} value={age} onChange={(e) => setAge(e.target.value)} className="h-8 text-sm w-24" placeholder="35" />
            : <PropValue>{avatar.age ? `${avatar.age} yrs` : null}</PropValue>
          }
        </div>

        {/* Ethnicity */}
        <div>
          <PropLabel>Ethnicity</PropLabel>
          {editing ? (
            <Select value={ethnicity} onValueChange={(v) => v && setEthnicity(v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {ETHNICITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <PropValue>{avatar.ethnicity}</PropValue>
          )}
        </div>

        {/* Origin */}
        <div>
          <PropLabel>Origin{editing && <span className="text-muted-foreground/70"> (optional)</span>}</PropLabel>
          {editing
            ? <Input value={origin} onChange={(e) => setOrigin(e.target.value)} className="h-8 text-sm" placeholder="e.g. Germany" />
            : <PropValue>{avatar.origin}</PropValue>
          }
        </div>

        {/* Occupation */}
        <div>
          <PropLabel>Occupation</PropLabel>
          {editing
            ? <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} className="h-8 text-sm" placeholder="e.g. Doctor" />
            : <PropValue>{avatar.occupation}</PropValue>
          }
        </div>

        {/* Image Model */}
        <div>
          <PropLabel>Image Model</PropLabel>
          {editing ? (
            models.length > 0 ? (
              <Select value={imageModel} onValueChange={(v) => v && setImageModel(v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{m.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-8 flex items-center"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
            )
          ) : (
            <PropValue>{avatar.imageModel}</PropValue>
          )}
        </div>

        {/* Voice — spans full row */}
        <div className="col-span-2">
          <PropLabel>Voice</PropLabel>
          {editing ? (
            voices.length > 0 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => { const v = voices.find((v) => v.voice_id === voiceId); if (v) toggleVoicePreview(v); }}
                  disabled={!voices.find((v) => v.voice_id === voiceId)?.preview_audio}
                  title="Preview voice"
                >
                  {playingVoiceId === voiceId
                    ? <Square className="h-3 w-3 fill-current" />
                    : <Play className="h-3 w-3 fill-current" />}
                </Button>
                <Select value={voiceId} onValueChange={(v) => { if (v) { stopAudio(); setVoiceId(v); } }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {voices.map((v) => (
                      <SelectItem key={v.voice_id} value={v.voice_id}>
                        {v.name.trim()} ({v.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="h-8 flex items-center"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
            )
          ) : (
            <div className="flex items-center gap-2">
              {(() => { const v = voices.find((v) => v.voice_id === avatar.voiceId); return v?.preview_audio ? (
                <button
                  type="button"
                  onClick={() => toggleVoicePreview(v)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Preview voice"
                >
                  {playingVoiceId === avatar.voiceId
                    ? <Square className="h-3 w-3 fill-current" />
                    : <Play className="h-3 w-3 fill-current" />}
                </button>
              ) : null; })()}
              <PropValue>{voices.find((v) => v.voice_id === avatar.voiceId)?.name.trim() ?? avatar.voiceId}</PropValue>
            </div>
          )}
        </div>

      </div>

      <p className="text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(avatar.createdAt))}</p>
    </>
  );

  if (editing) {
    return <form onSubmit={handleSave} className="space-y-4">{content}</form>;
  }

  return <div className="space-y-4">{content}</div>;
}
