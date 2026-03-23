"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageModel {
  id: string;
  name: string;
  description: string;
}

type Mode = "generate" | "upload";

export function NewAvatarForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("generate");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
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
    if (mode === "generate" && !prompt.trim()) { toast.error("Prompt is required"); return; }
    if (mode === "upload" && !imageBase64) { toast.error("Please select an image"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          prompt: mode === "generate" ? prompt : undefined,
          imageModel: mode === "generate" ? imageModel : undefined,
          imageBase64: mode === "upload" ? imageBase64 : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create avatar");
      }
      const avatar = await res.json();
      toast.success("Avatar created!");
      router.push(`/avatars/${avatar.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "generate" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("generate")}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Generate with AI
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("upload")}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload Image
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr. James" required />
      </div>

      {mode === "generate" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A professional doctor in a white coat, smiling, neutral background..."
              rows={3}
            />
          </div>
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
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {mode === "generate" ? "Generating..." : "Creating..."}
          </>
        ) : (
          "Create Avatar"
        )}
      </Button>
    </form>
  );
}
