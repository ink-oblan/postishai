"use client";

import { AlertDialog } from "@base-ui/react";
import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Pencil, AlertTriangle, RefreshCw } from "lucide-react";
import { AvatarPickerField, type AvatarPickerOption } from "@/components/posts/AvatarPickerField";
import { MetadataSection } from "@/components/posts/MetadataSection";
import type { PlatformMetadata } from "@/lib/metadata/types";
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
  avatarImageUrl: string;
  createdAtLabel: string;
  status: string;
  downloadUrl: string | null;
  metadata: PlatformMetadata | null;
}

function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1">{children}</p>;
}

function PropValue({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children || <span className="text-muted-foreground">—</span>}</p>;
}

export function PostEditPanel({
  post,
  editable,
  initialEditing = false,
  initialAvatarId = null,
}: {
  post: PostData;
  editable: boolean;
  initialEditing?: boolean;
  initialAvatarId?: string | null;
}) {
  const router = useRouter();
  const [savedTitle, setSavedTitle] = useState(post.title);
  const [savedScript, setSavedScript] = useState(post.script);
  const [savedLlmModelId, setSavedLlmModelId] = useState(post.llmModelId);
  const [savedLlmModelName, setSavedLlmModelName] = useState(post.llmModelName);
  const [savedStatusLabel, setSavedStatusLabel] = useState(post.statusLabel);
  const [savedAvatarId, setSavedAvatarId] = useState(post.avatarId);
  const [savedAvatarName, setSavedAvatarName] = useState(post.avatarName);
  const [savedMetadata, setSavedMetadata] = useState(post.metadata);
  const [editing, setEditing] = useState(initialEditing);
  const [title, setTitle] = useState(post.title);
  const [script, setScript] = useState(post.script);
  const [llmModelId, setLLMModelId] = useState(post.llmModelId);
  const [avatarId, setAvatarId] = useState(initialAvatarId ?? post.avatarId);
  const [metadata, setMetadata] = useState(post.metadata);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [avatars, setAvatars] = useState<AvatarPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectedAvatar = avatars.find((avatar) => avatar.id === avatarId);
  const currentAvatarName = selectedAvatar?.name ?? savedAvatarName;
  const scriptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSavedTitle(post.title);
    setSavedScript(post.script);
    setSavedLlmModelId(post.llmModelId);
    setSavedLlmModelName(post.llmModelName);
    setSavedStatusLabel(post.statusLabel);
    setSavedAvatarId(post.avatarId);
    setSavedAvatarName(post.avatarName);
    setSavedMetadata(post.metadata);
    setTitle(post.title);
    setScript(post.script);
    setLLMModelId(post.llmModelId);
    setAvatarId(initialAvatarId ?? post.avatarId);
    setMetadata(post.metadata);
    setEditing(initialEditing);
  }, [initialAvatarId, initialEditing, post]);

  useEffect(() => {
    if (editing) {
      fetch("/api/llm-models").then((r) => r.json()).then(setLLMModels);
      fetch("/api/avatars").then((r) => r.json()).then(setAvatars);
    }
  }, [editing]);

  useEffect(() => {
    const element = scriptRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [script, editing]);

  const hasChanges =
    title.trim() !== savedTitle ||
    script.trim() !== savedScript ||
    llmModelId !== savedLlmModelId ||
    avatarId !== savedAvatarId ||
    JSON.stringify(metadata) !== JSON.stringify(savedMetadata);
  const metadataChanges =
    script.trim() !== savedScript ||
    llmModelId !== savedLlmModelId ||
    avatarId !== savedAvatarId;

  function handleCancel() {
    setTitle(savedTitle);
    setScript(savedScript);
    setLLMModelId(savedLlmModelId);
    setAvatarId(savedAvatarId);
    setMetadata(savedMetadata);
    setEditing(false);
  }

  function handleAvatarSelect(nextAvatar: AvatarPickerOption) {
    setAvatarId(nextAvatar.id);
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script, llmModelId, avatarId, metadata }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      const updated = await res.json() as {
        status?: string;
        llmModelId?: string;
        metadata?: PlatformMetadata | null;
        metadataRegenerated?: boolean;
      };
      const selectedModel = llmModels.find((m) => m.id === llmModelId);

      setSavedTitle(title.trim());
      setSavedScript(script.trim());
      setSavedLlmModelId(llmModelId);
      setSavedLlmModelName(selectedModel?.name ?? llmModelId);
      setSavedAvatarId(avatarId);
      setSavedAvatarName(currentAvatarName);
      setSavedMetadata(updated.metadata ?? (updated.metadataRegenerated ? null : metadata));
      setMetadata(updated.metadata ?? (updated.metadataRegenerated ? null : metadata));
      if (updated.status === "DRAFT") {
        setSavedStatusLabel("Draft");
      }

      toast.success(
        updated.metadataRegenerated
          ? post.status === "FAILED"
            ? "Post updated, reset to draft, and metadata regeneration started"
            : "Post updated and metadata regeneration started"
          : "Post updated"
      );
      setConfirmOpen(false);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  function handleSaveClick() {
    if (metadataChanges) {
      setConfirmOpen(true);
      return;
    }
    void handleSave();
  }

  const content = (
    <>
      <div className="mb-6">
        <PropLabel>Title</PropLabel>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="h-8 text-sm" />
            ) : (
              <h1 className="text-xl font-semibold truncate">{savedTitle}</h1>
            )}
          </div>
          <div className="shrink-0">
            {editing ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveClick}
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
      </div>

      {editing && post.status === "FAILED" && metadataChanges && (
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
          {editing ? (
            <AvatarPickerField
              avatars={avatars}
              value={avatarId}
              fallbackName={savedAvatarName}
              fallbackImageUrl={post.avatarImageUrl}
              newAvatarHref={`/avatars/new?redirectTo=/posts/${post.id}`}
              onChange={handleAvatarSelect}
            />
          ) : (
            <Link
              href={`/avatars/${savedAvatarId}`}
              className="group inline-flex items-center gap-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              <span className="relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={selectedAvatar ? `/api/avatars/${savedAvatarId}/image` : post.avatarImageUrl}
                  alt={currentAvatarName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
              <span className="text-sm font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-all duration-150 group-hover:decoration-primary">
                {currentAvatarName}
              </span>
            </Link>
          )}
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
                ref={scriptRef}
                value={script}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScript(e.target.value)}
                rows={1}
                required
                className="min-h-9 resize-none text-sm"
                style={{ height: "auto", overflow: "hidden" }}
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

      {metadata && (
        <div className="pt-8">
          <MetadataSection
            postId={post.id}
            platformLabel={post.platformLabel}
            metadata={metadata}
            editing={editing}
            onChange={setMetadata}
            canRegenerate={post.status !== "COMPLETED"}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      <div>{content}</div>

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-200" />
          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </div>
              <AlertDialog.Title className="text-base font-semibold">Regenerate caption and hashtags?</AlertDialog.Title>
            </div>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-6 pl-12">
              Saving these changes will wipe the current caption and hashtags and generate new ones.
            </AlertDialog.Description>
            <div className="flex gap-2 justify-end">
              <AlertDialog.Close render={<Button variant="outline" size="sm" />}>Cancel</AlertDialog.Close>
              <Button size="sm" onClick={() => void handleSave()} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Save and regenerate
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
