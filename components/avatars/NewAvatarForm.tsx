"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ETHNICITIES = [
  "Eastern European",
  "Western European",
  "Mediterranean",
  "Scandinavian",
  "Middle Eastern",
  "South Asian",
  "East Asian",
  "Southeast Asian",
  "Central Asian",
  "Sub-Saharan African",
  "North African",
  "Latin American",
  "Caribbean",
  "North American",
  "Pacific Islander",
];

interface ImageModel {
  id: string;
  name: string;
  description: string;
}

type Mode = "generate" | "upload";
type Gender = "man" | "woman" | "neutral";

export function NewAvatarForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("generate");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("man");
  const [age, setAge] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [origin, setOrigin] = useState("");
  const [occupation, setOccupation] = useState("");
  const [imageModel, setImageModel] = useState("nano-banana-2");
  const [models, setModels] = useState<ImageModel[]>([]);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/image-models").then((r) => r.json()).then(setModels);
  }, []);

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
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (mode === "generate") {
      if (!age || isNaN(Number(age))) { toast.error("Valid age is required"); return; }
      if (!ethnicity) { toast.error("Ethnicity is required"); return; }
      if (!occupation.trim()) { toast.error("Occupation is required"); return; }
    }
    if (mode === "upload" && !imageBase64) { toast.error("Please select an image"); return; }

    setLoading(true);
    try {
      const body = mode === "upload"
        ? { name, imageBase64 }
        : { name, gender, age: Number(age), ethnicity, origin: origin.trim() || undefined, occupation, imageModel };

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
      router.push(`/avatars/${avatar.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button type="button" variant={mode === "generate" ? "default" : "outline"} size="sm" onClick={() => setMode("generate")}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate with AI
        </Button>
        <Button type="button" variant={mode === "upload" ? "default" : "outline"} size="sm" onClick={() => setMode("upload")}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Image
        </Button>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. James" required />
      </div>

      {mode === "generate" ? (
        <>
          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex gap-2">
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

          {/* Ethnicity */}
          <div className="space-y-2">
            <Label>Ethnicity</Label>
            <Select value={ethnicity} onValueChange={(v: string | null) => v && setEthnicity(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select ethnicity…" />
              </SelectTrigger>
              <SelectContent>
                {ETHNICITIES.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origin (optional) */}
          <div className="space-y-2">
            <Label htmlFor="origin">
              Origin <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Germany, Brazil, Japan"
            />
          </div>

          {/* Occupation */}
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Doctor, Retired teacher, Software engineer"
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
                    <span className="text-muted-foreground ml-2 text-xs">{m.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label>Image</Label>
          <Card
            className="border-dashed cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="max-h-48 rounded-md object-contain" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select an image (PNG or JPEG)</p>
                </>
              )}
            </CardContent>
          </Card>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{mode === "generate" ? "Submitting…" : "Creating…"}</>
        ) : (
          "Create Avatar"
        )}
      </Button>
    </form>
  );
}
