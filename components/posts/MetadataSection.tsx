"use client";

import type React from "react";
import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { PlatformMetadata } from "@/lib/metadata/types";
import { Badge } from "@/components/ui/badge";
import { AiRegenerateIcon } from "@/components/ui/ai-regenerate-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";

interface MetadataSectionProps {
  postId: string;
  platformLabel: string;
  metadata: PlatformMetadata;
  canRegenerate?: boolean;
  editing?: boolean;
  onChange?: (metadata: PlatformMetadata) => void;
}

export function MetadataSection({
  postId,
  platformLabel,
  metadata,
  canRegenerate = true,
  editing = false,
  onChange,
}: MetadataSectionProps) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const regenerateHint = "It will wipe and regenerate metadata of the post.";

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/posts/${postId}/metadata`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to queue metadata regeneration");
      }
      toast.success("Metadata regeneration started.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue metadata regeneration");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{platformLabel} Metadata</CardTitle>
        {canRegenerate && (
          <CardAction>
            <Tooltip
              content={
                <span className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-golden-earth-600 dark:text-golden-earth-400" />
                  <span>{regenerateHint}</span>
                </span>
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                aria-label={regenerateHint}
              >
                <AiRegenerateIcon spinning={regenerating} />
              </Button>
            </Tooltip>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <MetadataDisplay editing={editing} metadata={metadata} onChange={onChange} />
      </CardContent>
    </Card>
  );
}

function useAutosizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return ref;
}

function normalizeTags(value: string) {
  return value
    .split(/[\s,\n,]+/)
    .map((item) => item.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function normalizeToken(value: string) {
  return value.trim().replace(/^#/, "");
}

function TokenEditor({
  tokens,
  onChange,
  label,
  placeholder,
  splitOnWhitespace = false,
  prefix = "",
}: {
  tokens: string[];
  onChange: (tokens: string[]) => void;
  label: string;
  placeholder: string;
  splitOnWhitespace?: boolean;
  prefix?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setInputValue("");
  }, [tokens]);

  function addTokens(rawValue: string) {
    const values = splitOnWhitespace ? normalizeTags(rawValue) : rawValue
      .split(/[\n,]+/)
      .map(normalizeToken)
      .filter(Boolean);

    if (values.length === 0) return false;

    const nextTokens = [...tokens];
    for (const value of values) {
      if (!nextTokens.includes(value)) {
        nextTokens.push(value);
      }
    }

    onChange(nextTokens);
    return true;
  }

  function handleAdd() {
    if (addTokens(inputValue)) {
      setInputValue("");
    }
  }

  function handleInputChange(nextValue: string) {
    if (splitOnWhitespace && /[\s\n,]/.test(nextValue)) {
      const added = addTokens(nextValue);
      if (added) {
        setInputValue("");
        return;
      }
    }

    setInputValue(nextValue);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleAdd();
      return;
    }

    if (event.key === "Backspace" && inputValue.length === 0 && tokens.length > 0) {
      onChange(tokens.slice(0, -1));
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    const shouldSplit = splitOnWhitespace ? /[\s\n,]/.test(pasted) : /[\n,]/.test(pasted);
    if (!shouldSplit) return;

    event.preventDefault();
    if (addTokens(pasted)) {
      setInputValue("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onChange(tokens.filter((value) => value !== token))}
            aria-label={`Remove ${label} ${token}`}
          >
            <Badge
              variant="secondary"
              className="h-auto cursor-pointer gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
            >
              <span>{prefix}{token}</span>
              <X className="h-3 w-3 text-muted-foreground" />
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

function AutosizeTextarea({
  value,
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  const ref = useAutosizeTextarea(typeof value === "string" ? value : "");

  return (
    <Textarea
      {...props}
      ref={ref}
      value={value}
      rows={1}
      className={className}
      style={{ height: "auto", overflow: "hidden", ...props.style }}
    />
  );
}

function MetadataDisplay({
  metadata,
  editing,
  onChange,
}: {
  metadata: PlatformMetadata;
  editing: boolean;
  onChange?: (metadata: PlatformMetadata) => void;
}) {
  if (metadata.platform === "INSTAGRAM" || metadata.platform === "TIKTOK") {
    return (
      <>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Caption</p>
          {editing ? (
            <AutosizeTextarea
              value={metadata.caption}
              onChange={(e) => onChange?.({ ...metadata, caption: e.target.value })}
              className="min-h-9 resize-none text-sm"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{metadata.caption}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Hashtags</p>
          {editing ? (
            <TokenEditor
              tokens={metadata.hashtags}
              onChange={(hashtags) => onChange?.({ ...metadata, hashtags })}
              label="hashtag"
              placeholder="Type a hashtag or paste many hashtags"
              splitOnWhitespace
              prefix="#"
            />
          ) : (
            metadata.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {metadata.hashtags.map((h) => (
                  <span key={h} className="text-xs bg-muted px-1.5 py-0.5 rounded">#{h}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hashtags.</p>
            )
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Title</p>
        {editing ? (
          <Input
            value={metadata.title}
            onChange={(e) => onChange?.({ ...metadata, title: e.target.value })}
            className="h-9 text-sm"
          />
        ) : (
          <p className="font-medium">{metadata.title}</p>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Description</p>
        {editing ? (
          <AutosizeTextarea
            value={metadata.description}
            onChange={(e) => onChange?.({ ...metadata, description: e.target.value })}
            className="min-h-9 resize-none text-sm"
          />
        ) : (
          <p className="whitespace-pre-wrap">{metadata.description}</p>
        )}
      </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tags</p>
          {editing ? (
            <TokenEditor
              tokens={metadata.tags}
              onChange={(tags) => onChange?.({ ...metadata, tags })}
              label="tag"
              placeholder="Type a tag or paste comma/newline separated tags"
            />
        ) : (
          metadata.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {metadata.tags.map((t) => (
                <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags.</p>
          )
        )}
      </div>
    </>
  );
}
