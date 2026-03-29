"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_LABELS } from "@/lib/utils";

interface Avatar {
  id: string;
  name: string;
  imagePath: string;
}

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  language: string;
}

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

const PLATFORMS = ["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS"] as const;

interface WizardData {
  avatarId: string;
  title: string;
  platform: string;
  script: string;
  voiceId: string;
  llmModelId: string;
}

export function PostWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAvatarId = searchParams.get("avatarId") ?? "";

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    avatarId: preselectedAvatarId,
    title: "",
    platform: "INSTAGRAM",
    script: "",
    voiceId: "",
    llmModelId: "gemini-3-flash-preview",
  });
  // Local text-field state — keeps typing fast by avoiding full-tree re-renders
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/avatars").then((r) => r.json()).then(setAvatars);
    fetch("/api/heygen/voices").then((r) => r.json()).then((v: Voice[]) => {
      setVoices(v);
      if (v.length > 0 && !data.voiceId) {
        setData((d) => ({ ...d, voiceId: v[0].voice_id }));
      }
    });
    fetch("/api/llm-models").then((r) => r.json()).then(setLLMModels);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<WizardData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function canNext(): boolean {
    if (step === 1) return !!data.avatarId;
    if (step === 2) return !!(title && script && data.voiceId && data.platform);
    return true;
  }

  function handleNext() {
    if (step === 2) {
      // Flush local text state into shared data before advancing
      setData((d) => ({ ...d, title, script }));
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    // Ensure latest text values are included (in case user submits from step 2 directly)
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
      toast.success("Post created! Metadata generated.");
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
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s < step ? "bg-primary text-primary-foreground" :
              s === step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {s < step ? <Check className="h-3.5 w-3.5" /> : s}
            </div>
            <span className={`text-sm ${s === step ? "font-medium" : "text-muted-foreground"}`}>
              {s === 1 ? "Avatar" : s === 2 ? "Script & Voice" : "Review"}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Avatar selection */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select the avatar for this post</p>
          {avatars.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No avatars yet. <a href="/avatars/new" className="underline">Create one first.</a>
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => update({ avatarId: avatar.id })}
                  className={`rounded-lg overflow-hidden border-2 transition-all text-left ${
                    data.avatarId === avatar.id ? "border-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="aspect-[9/16] relative bg-muted">
                    <Image
                      src={`/api/avatars/${avatar.id}/image`}
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
          )}
        </div>
      )}

      {/* Step 2: Script, voice, platform */}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={data.voiceId} onValueChange={(v: string | null) => v && update({ voiceId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice..." />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((v) => (
                    <SelectItem key={v.voice_id} value={v.voice_id}>
                      {v.name.trim()} ({v.gender})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>AI Model for Metadata</Label>
              <Select value={data.llmModelId} onValueChange={(v: string | null) => v && update({ llmModelId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {llmModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Review your post before creating</p>
          <Card>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Avatar</span>
                <span className="font-medium">{avatars.find((a) => a.id === data.avatarId)?.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Title</span>
                <span className="font-medium">{title}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Platform</span>
                <Badge variant="outline">{PLATFORM_LABELS[data.platform]}</Badge>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Script</span>
                <span className="line-clamp-3">{script}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Voice</span>
                <span>{voices.find((v) => v.voice_id === data.voiceId)?.name.trim()}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">AI Model</span>
                <span>{llmModels.find((m) => m.id === data.llmModelId)?.name}</span>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Platform metadata (captions, hashtags, etc.) will be generated automatically when you create the post.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" />Back
        </Button>
        {step < 3 ? (
          <Button onClick={handleNext} disabled={!canNext()}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canNext()}>
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
