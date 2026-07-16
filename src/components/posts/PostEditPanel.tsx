"use client";

import { AlertDialog } from "@base-ui/react";
import { AlertTriangle, Download, Loader2, Pencil, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { startTransition, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AvatarPickerField, type AvatarPickerOption } from "@/components/posts/AvatarPickerField";
import { MetadataSection } from "@/components/posts/MetadataSection";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_STATUS, STATUS_LABELS } from "@/lib/constants";
import { fetchHeyGenVoices } from "@/lib/heygen/fetch-voices";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { POLLING } from "@/lib/polling-config";

interface LLMModel {
  id: string;
  name: string;
  description: string;
}

type SaveAction = "save" | "regenerate";

interface VoiceOption {
  voice_id: string;
  name: string;
}

interface PendingPostSync {
  title: string;
  script: string;
  llmModelId: string;
  avatarId: string;
  avatarName: string;
  voiceName: string | null;
  metadata: PlatformMetadata | null;
  metadataStatus: string;
  statusLabel: string;
}

interface AvatarVariationOption {
  id: string;
  label: string;
  status: string;
  updatedAt: string;
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
  avatarVariationId: string | null;
  avatarVariationImageUrl: string | null;
  createdAtLabel: string;
  status: string;
  downloadUrl: string | null;
  metadata: PlatformMetadata | null;
  metadataStatus: string;
  metadataErrorMessage: string | null;
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

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
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
  const [avatarVariations, setAvatarVariations] = useState<AvatarVariationOption[]>([]);
  const [avatarVariationId, setAvatarVariationId] = useState<string | null>(post.avatarVariationId);
  const [savedAvatarVariationId, setSavedAvatarVariationId] = useState<string | null>(
    post.avatarVariationId,
  );
  const router = useRouter();
  const [savedTitle, setSavedTitle] = useState(post.title);
  const [savedScript, setSavedScript] = useState(post.script);
  const [savedLlmModelId, setSavedLlmModelId] = useState(post.llmModelId);
  const [savedLlmModelName, setSavedLlmModelName] = useState(post.llmModelName);
  const [savedStatusLabel, setSavedStatusLabel] = useState(post.statusLabel);
  const [savedAvatarId, setSavedAvatarId] = useState(post.avatarId);
  const [savedAvatarName, setSavedAvatarName] = useState(post.avatarName);
  const [savedVoiceName, setSavedVoiceName] = useState(post.voiceName);
  const [savedMetadata, setSavedMetadata] = useState(post.metadata);
  const [savedMetadataStatus, setSavedMetadataStatus] = useState(post.metadataStatus);
  const [savedMetadataErrorMessage, setSavedMetadataErrorMessage] = useState(
    post.metadataErrorMessage,
  );
  const [editing, setEditing] = useState(initialEditing);
  const [title, setTitle] = useState(post.title);
  const [script, setScript] = useState(post.script);
  const [llmModelId, setLLMModelId] = useState(post.llmModelId);
  const [avatarId, setAvatarId] = useState(initialAvatarId ?? post.avatarId);
  const [metadata, setMetadata] = useState(post.metadata);
  const [llmModels, setLLMModels] = useState<LLMModel[]>([]);
  const [avatars, setAvatars] = useState<AvatarPickerOption[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [pendingSaveAction, setPendingSaveAction] = useState<SaveAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const loading = pendingSaveAction !== null;
  const selectedAvatar = avatars.find((avatar) => avatar.id === avatarId);
  const currentAvatarName = selectedAvatar?.name ?? savedAvatarName;
  const currentVoiceName = selectedAvatar
    ? (voices.find((voice) => voice.voice_id === selectedAvatar.voiceId)?.name.trim() ??
      savedVoiceName)
    : savedVoiceName;
  const scriptRef = useRef<HTMLTextAreaElement | null>(null);
  const prevInitialEditingRef = useRef(initialEditing);
  const pendingPostSyncRef = useRef<PendingPostSync | null>(null);
  const savedMetadataStatusRef = useRef(post.metadataStatus);
  savedMetadataStatusRef.current = savedMetadataStatus;
  const editingRef = useRef(editing);
  editingRef.current = editing;

  // Poll metadata status while generating so the spinner resolves without a manual refresh
  useEffect(() => {
    if (savedMetadataStatus !== CONTENT_STATUS.GENERATING) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          metadataStatus: string;
          metadataErrorMessage: string | null;
          metadata: string | null;
        };
        if (savedMetadataStatusRef.current !== CONTENT_STATUS.GENERATING) return;
        if (data.metadataStatus === CONTENT_STATUS.GENERATING) return;

        setSavedMetadataStatus(data.metadataStatus);
        setSavedMetadataErrorMessage(data.metadataErrorMessage ?? null);

        if (data.metadataStatus === CONTENT_STATUS.COMPLETED && data.metadata) {
          const parsed = JSON.parse(data.metadata) as PlatformMetadata;
          setSavedMetadata(parsed);
          if (!editingRef.current) setMetadata(parsed);
        }

        startTransition(() => router.refresh());
      } catch {
        // ignore transient errors
      }
    }, POLLING.METADATA);

    return () => clearInterval(interval);
  }, [savedMetadataStatus, post.id, router]);

  useEffect(() => {
    const pendingPostSync = pendingPostSyncRef.current;
    if (pendingPostSync) {
      const coreFieldsMatch =
        post.title === pendingPostSync.title &&
        post.script === pendingPostSync.script &&
        post.llmModelId === pendingPostSync.llmModelId &&
        post.avatarId === pendingPostSync.avatarId &&
        post.avatarName === pendingPostSync.avatarName &&
        post.voiceName === pendingPostSync.voiceName &&
        post.statusLabel === pendingPostSync.statusLabel;
      // Allow the server to be ahead: if we expected GENERATING, accept any
      // resulting state (COMPLETED/FAILED) so the sync isn't permanently blocked
      // when the job finishes before the first router.refresh() round-trip.
      const metadataMatch =
        pendingPostSync.metadataStatus === CONTENT_STATUS.GENERATING ||
        (post.metadataStatus === pendingPostSync.metadataStatus &&
          JSON.stringify(post.metadata) === JSON.stringify(pendingPostSync.metadata));
      const postMatchesPendingSync = coreFieldsMatch && metadataMatch;

      if (!postMatchesPendingSync) {
        return;
      }

      pendingPostSyncRef.current = null;
    }

    setSavedTitle(post.title);
    setSavedScript(post.script);
    setSavedLlmModelId(post.llmModelId);
    setSavedLlmModelName(post.llmModelName);
    setSavedStatusLabel(post.statusLabel);
    setSavedAvatarId(post.avatarId);
    setSavedAvatarName(post.avatarName);
    setSavedVoiceName(post.voiceName);
    setSavedMetadata(post.metadata);
    setSavedMetadataStatus(post.metadataStatus);
    setSavedMetadataErrorMessage(post.metadataErrorMessage);
    if (!editing) {
      setTitle(post.title);
      setScript(post.script);
      setLLMModelId(post.llmModelId);
      setAvatarId(initialAvatarId ?? post.avatarId);
      setMetadata(post.metadata);
    }
  }, [editing, initialAvatarId, post]);

  useEffect(() => {
    if (!prevInitialEditingRef.current && initialEditing) {
      setEditing(true);
    }
    prevInitialEditingRef.current = initialEditing;
  }, [initialEditing]);

  // Fetch variations when editing and an avatar is selected
  useEffect(() => {
    if (!editing || !avatarId) {
      setAvatarVariations([]);
      return;
    }
    fetch(`/api/avatars/${avatarId}/variations`)
      .then((r) => r.json())
      .then((data: AvatarVariationOption[]) => {
        setAvatarVariations(data.filter((v) => v.status === CONTENT_STATUS.COMPLETED));
      })
      .catch(() => setAvatarVariations([]));
  }, [editing, avatarId]);

  useEffect(() => {
    if (editing) {
      fetch("/api/llm-models")
        .then((r) => r.json())
        .then(setLLMModels);
      fetch("/api/avatars")
        .then((r) => r.json())
        .then(setAvatars);

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
    }
  }, [editing]);

  useEffect(() => {
    const element = scriptRef.current;
    if (!element) return;
    resizeTextarea(element);
  }, []);

  const hasChanges =
    title.trim() !== savedTitle ||
    script.trim() !== savedScript ||
    llmModelId !== savedLlmModelId ||
    avatarId !== savedAvatarId ||
    avatarVariationId !== savedAvatarVariationId ||
    JSON.stringify(metadata) !== JSON.stringify(savedMetadata);
  const metadataChanges =
    script.trim() !== savedScript || llmModelId !== savedLlmModelId || avatarId !== savedAvatarId;

  function handleCancel() {
    setTitle(savedTitle);
    setScript(savedScript);
    setLLMModelId(savedLlmModelId);
    setAvatarId(savedAvatarId);
    setAvatarVariationId(savedAvatarVariationId);
    setMetadata(savedMetadata);
    setEditing(false);
  }

  function handleAvatarSelect(nextAvatar: AvatarPickerOption) {
    setAvatarId(nextAvatar.id);
    setAvatarVariationId(null); // reset variation when avatar changes
  }

  async function handleSave(regenerateMetadata = false) {
    const saveAction: SaveAction = regenerateMetadata ? "regenerate" : "save";
    setPendingSaveAction(saveAction);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          script,
          llmModelId,
          avatarId,
          avatarVariationId,
          metadata,
          regenerateMetadata,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update");
      }
      const updated = (await res.json()) as {
        status?: string;
        llmModelId?: string;
        metadata?: PlatformMetadata | null;
        metadataRegenerated?: boolean;
      };
      const selectedModel = llmModels.find((m) => m.id === llmModelId);
      const nextMetadata = updated.metadata ?? (updated.metadataRegenerated ? null : metadata);
      const nextMetadataStatus = updated.metadataRegenerated
        ? CONTENT_STATUS.GENERATING
        : nextMetadata
          ? CONTENT_STATUS.COMPLETED
          : savedMetadataStatus;
      const nextStatusLabel =
        updated.status === CONTENT_STATUS.DRAFT
          ? STATUS_LABELS[CONTENT_STATUS.DRAFT]
          : savedStatusLabel;
      const nextVoiceName = currentVoiceName;
      const nextAvatarName = currentAvatarName;

      setSavedTitle(title.trim());
      setSavedScript(script.trim());
      setSavedLlmModelId(llmModelId);
      setSavedLlmModelName(selectedModel?.name ?? llmModelId);
      setSavedAvatarId(avatarId);
      setSavedAvatarVariationId(avatarVariationId);
      setSavedAvatarName(nextAvatarName);
      setSavedVoiceName(nextVoiceName);
      setSavedMetadata(nextMetadata);
      setSavedMetadataStatus(nextMetadataStatus);
      setSavedMetadataErrorMessage(null);
      setMetadata(nextMetadata);
      setSavedStatusLabel(nextStatusLabel);
      pendingPostSyncRef.current = {
        title: title.trim(),
        script: script.trim(),
        llmModelId,
        avatarId,
        avatarName: nextAvatarName,
        voiceName: nextVoiceName,
        metadata: nextMetadata,
        metadataStatus: nextMetadataStatus,
        statusLabel: nextStatusLabel,
      };

      toast.success(
        updated.metadataRegenerated
          ? post.status === CONTENT_STATUS.FAILED
            ? "Post updated, reset to draft, and metadata regeneration started"
            : "Post updated and metadata regeneration started"
          : "Post updated",
      );
      setConfirmOpen(false);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setPendingSaveAction(null);
    }
  }

  function handleSaveClick() {
    if (metadataChanges) {
      setConfirmOpen(true);
      return;
    }
    void handleSave(false);
  }

  const content = (
    <>
      <div className="mb-6">
        <PropLabel>Title</PropLabel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-8 text-sm"
              />
            ) : (
              <h1 className="truncate font-semibold text-xl">{savedTitle}</h1>
            )}
          </div>
          <div className="shrink-0">
            {editing ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveClick}
                  disabled={
                    loading || !title.trim() || !script.trim() || !llmModelId || !hasChanges
                  }
                >
                  {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {post.downloadUrl && (
                  <a href={post.downloadUrl} download>
                    <Button type="button" size="sm">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && post.status === CONTENT_STATUS.FAILED && metadataChanges && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Saving changes will reset this failed post back to draft and start metadata regeneration
          in the worker.
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <AvatarPickerField
                avatars={avatars}
                value={avatarId}
                fallbackName={savedAvatarName}
                fallbackImageUrl={post.avatarImageUrl}
                variationImageUrl={
                  avatarVariationId
                    ? `/api/avatars/${avatarId}/variations/${avatarVariationId}/image`
                    : null
                }
                newAvatarHref={`/avatars/new?redirectTo=/posts/${post.id}`}
                onChange={handleAvatarSelect}
              />
              {avatarVariations.length > 0 && (
                <div>
                  <p className="mb-1.5 text-muted-foreground text-xs">Variation</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAvatarVariationId(null)}
                      className={`h-7 rounded-md border px-2.5 font-medium text-xs transition-colors ${
                        avatarVariationId === null
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      Base
                    </button>
                    {avatarVariations.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setAvatarVariationId(v.id)}
                        className={`h-7 rounded-md border px-2.5 font-medium text-xs transition-colors ${
                          avatarVariationId === v.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/avatars/${savedAvatarId}`}
              className="group inline-flex items-center gap-3 rounded-lg transition-opacity hover:opacity-90"
            >
              <span className="relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={
                    savedAvatarVariationId
                      ? `/api/avatars/${savedAvatarId}/variations/${savedAvatarVariationId}/image`
                      : selectedAvatar
                        ? `/api/avatars/${savedAvatarId}/image`
                        : (post.avatarVariationImageUrl ?? post.avatarImageUrl)
                  }
                  alt={currentAvatarName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
              <span className="font-medium text-primary text-sm underline decoration-primary/40 underline-offset-2 transition-all duration-150 group-hover:decoration-primary">
                {currentAvatarName}
              </span>
            </Link>
          )}
        </div>

        <div>
          <PropLabel>Voice</PropLabel>
          <PropValue>{currentVoiceName}</PropValue>
        </div>

        <div>
          <PropLabel>Metadata Model</PropLabel>
          {editing ? (
            llmModels.length > 0 ? (
              <Select
                value={llmModelId}
                onValueChange={(v: string | null) => v && setLLMModelId(v)}
              >
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue>
                    {llmModels.find((m) => m.id === llmModelId)?.name ?? llmModelId}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64 w-max">
                  {llmModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} description={m.description}>
                      <span className="font-medium">{m.name}</span>
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
            <PropValue>{savedLlmModelName}</PropValue>
          )}
        </div>

        <div suppressHydrationWarning>
          <PropLabel>Created</PropLabel>
          <PropValue>{post.createdAtLabel}</PropValue>
        </div>

        <div className="sm:col-span-2">
          <PropLabel>Script</PropLabel>
          {editing ? (
            <div className="space-y-2">
              <Textarea
                ref={scriptRef}
                value={script}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setScript(e.target.value);
                  resizeTextarea(e.currentTarget);
                }}
                rows={8}
                required
                className="min-h-40 resize-y text-sm leading-relaxed"
                style={{ height: "auto", overflow: "hidden" }}
              />
              <p className="text-muted-foreground text-xs">{script.length} characters</p>
            </div>
          ) : (
            <PropValue>
              <span className="whitespace-pre-wrap">{savedScript}</span>
            </PropValue>
          )}
        </div>
      </div>

      <div className="pt-8">
        <MetadataSection
          postId={post.id}
          platformLabel={post.platformLabel}
          metadata={metadata}
          metadataStatus={savedMetadataStatus}
          metadataErrorMessage={savedMetadataErrorMessage}
          editing={editing}
          onChange={setMetadata}
          canRegenerate={post.status !== CONTENT_STATUS.COMPLETED}
        />
      </div>
    </>
  );

  return (
    <>
      <div>{content}</div>

      <DialogShell open={confirmOpen} onOpenChange={setConfirmOpen}>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </div>
          <AlertDialog.Title className="font-semibold text-base">
            Regenerate metadata?
          </AlertDialog.Title>
        </div>
        <AlertDialog.Description className="mb-6 text-muted-foreground text-sm sm:pl-12">
          Save to keep the current metadata, or save and regenerate to wipe it and generate new
          metadata.
        </AlertDialog.Description>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialog.Close render={<Button variant="outline" size="sm" />}>
            Cancel
          </AlertDialog.Close>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSave(false)}
            disabled={loading}
          >
            {pendingSaveAction === "save" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Save
          </Button>
          <Button size="sm" onClick={() => void handleSave(true)} disabled={loading}>
            {pendingSaveAction === "regenerate" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Save and regenerate
          </Button>
        </div>
      </DialogShell>
    </>
  );
}
