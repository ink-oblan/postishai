"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

interface PostData {
  id: string;
  title: string;
  platformLabel: string;
  statusLabel: string;
  script: string;
  llmModelId: string;
  llmModelName: string;
  avatarId: string;
  avatarName: string;
  voiceName: string | null;
  createdAtLabel: string;
  status: string;
  downloadUrl: string | null;
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children || <span className="text-muted-foreground">—</span>}</p>;
}

export function PostEditPanel({ post, editable }: { post: PostData; editable: boolean }) {
  const router = useRouter();
  const [savedTitle, setSavedTitle] = useState(post.title);
  const [savedScript, setSavedScript] = useState(post.script);
  const [savedLlmModelId, setSavedLlmModelId] = useState(post.llmModelId);
  const [savedLlmModelName, setSavedLlmModelName] = useState(post.llmModelName);
  const [savedStatusLabel, setSavedStatusLabel] = useState(post.statusLabel);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [script, setScript] = useState(post.script);
  const [llmModelId, setLLMModelId] = useState(post.llmModelId);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSavedTitle(post.title);
    setSavedScript(post.script);
    setSavedLlmModelId(post.llmModelId);
    setSavedLlmModelName(post.llmModelName);
    setSavedStatusLabel(post.statusLabel);
    setTitle(post.title);
    setScript(post.script);
    setLLMModelId(post.llmModelId);
  }, [post]);

  useEffect(() => {
    if (editing) {
      fetch("/api/llm-models").then((r) => r.json()).then(setLLMModels);
    }
  }, [editing]);

  const hasChanges =
    title.trim() !== savedTitle ||
    script.trim() !== savedScript ||
    llmModelId !== savedLlmModelId;

  function handleCancel() {
    setTitle(savedTitle);
    setScript(savedScript);
    setLLMModelId(savedLlmModelId);
    setEditing(false);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script, llmModelId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      const updated = await res.json() as { status?: string; llmModelId?: string };
      const selectedModel = llmModels.find((m) => m.id === llmModelId);

      setSavedTitle(title.trim());
      setSavedScript(script.trim());
      setSavedLlmModelId(llmModelId);
      setSavedLlmModelName(selectedModel?.name ?? llmModelId);
      if (updated.status === "DRAFT") {
        setSavedStatusLabel("Draft");
      }

      toast.success(
        post.status === "FAILED"
          ? "Post updated, reset to draft, and metadata regeneration started"
          : "Post updated and metadata regeneration started"
      );
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <PropLabel>Title</PropLabel>
          {editing ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="h-8 text-sm" />
          ) : (
            <h1 className="text-xl font-semibold truncate">{savedTitle}</h1>
          )}
        </div>
        <div className="shrink-0 mt-5">
          {editing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={loading || !title.trim() || !script.trim() || !llmModelId || !hasChanges}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Save
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {editable && (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                </Button>
              )}
              {post.downloadUrl && (
                <a href={post.downloadUrl} download>
                  <Button type="button" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />Download
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {editing && post.status === "FAILED" && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Saving changes will reset this failed post back to draft and start metadata regeneration in the worker.
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <PropLabel>Platform</PropLabel>
          <PropValue>{post.platformLabel}</PropValue>
        </div>

        <div>
          <PropLabel>Status</PropLabel>
          <PropValue>{savedStatusLabel}</PropValue>
        </div>

        <div>
          <PropLabel>Avatar</PropLabel>
          <Link
            href={`/avatars/${post.avatarId}`}
            className="group inline-flex items-center gap-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            <span className="relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={`/api/avatars/${post.avatarId}/image`}
                alt={post.avatarName}
                fill
                className="object-cover"
                unoptimized
              />
            </span>
            <span className="text-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-all duration-150 group-hover:decoration-primary">
              {post.avatarName}
            </span>
          </Link>
        </div>

        <div>
          <PropLabel>Voice</PropLabel>
          <PropValue>{post.voiceName}</PropValue>
        </div>

        <div>
          <PropLabel>Metadata Model</PropLabel>
          {editing ? (
            llmModels.length > 0 ? (
              <Select value={llmModelId} onValueChange={(v: string | null) => v && setLLMModelId(v)}>
                <SelectTrigger className="h-8 text-sm w-full">
                  <SelectValue>{llmModels.find((m) => m.id === llmModelId)?.name ?? llmModelId}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64 w-max">
                  {llmModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex min-w-0 flex-1 items-baseline gap-3 pr-4">
                        <span className="shrink-0 font-medium whitespace-nowrap">{m.name}</span>
                        <span className="min-w-0 text-xs text-muted-foreground whitespace-normal break-words">
                          {m.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-8 flex items-center"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
            )
          ) : (
            <PropValue>{savedLlmModelName}</PropValue>
          )}
        </div>

        <div>
          <PropLabel>Created</PropLabel>
          <PropValue>{post.createdAtLabel}</PropValue>
        </div>

        <div className="col-span-2">
          <PropLabel>Script</PropLabel>
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={script}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScript(e.target.value)}
                rows={8}
                required
              />
              <p className="text-xs text-muted-foreground">{script.length} characters</p>
            </div>
          ) : (
            <PropValue>
              <span className="whitespace-pre-wrap">{savedScript}</span>
            </PropValue>
          )}
        </div>
      </div>
    </>
  );

  return <div>{content}</div>;
}
