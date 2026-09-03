"use client";

import { Check, Copy, Plus, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function useAutosizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: value drives the resize but isn't read directly
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return ref;
}

function AutosizeTextarea({ value, className, ...props }: React.ComponentProps<typeof Textarea>) {
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

function normalizeTags(value: string) {
  return value
    .split(/[\s,]+/)
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
  }, []);

  function addTokens(rawValue: string) {
    const values = splitOnWhitespace
      ? normalizeTags(rawValue)
      : rawValue
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
            className="min-w-0 max-w-full"
          >
            <Badge
              variant="secondary"
              className="h-auto max-w-full cursor-pointer gap-1 rounded-full px-2.5 py-1 font-medium text-xs transition-colors hover:bg-muted"
            >
              <span className="min-w-0 truncate">
                {prefix}
                {token}
              </span>
              <X className="h-3 w-3 text-muted-foreground" />
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          className="w-full sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-medium text-primary text-xs transition-colors hover:text-primary/80"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

/** Standard caption-posting convention: hashtags/tags trail the caption text, separated by a blank line. */
export function combineCaptionAndTags(caption: string, tags: string[], tagPrefix = "") {
  const tagText = tags.map((tag) => `${tagPrefix}${tag}`).join(" ");
  return [caption.trim(), tagText].filter(Boolean).join("\n\n");
}

export interface CaptionTagsFieldProps {
  label?: string;
  caption: string;
  onCaptionChange?: (value: string) => void;
  captionPlaceholder?: string;
  emptyText?: string;
  tags: string[];
  onTagsChange?: (tags: string[]) => void;
  tagPrefix?: string;
  tagLabel: string;
  tagPlaceholder: string;
  tagSplitOnWhitespace?: boolean;
  editing: boolean;
  showCopy?: boolean;
  actions?: React.ReactNode;
}

/**
 * Caption and its hashtags/tags are one posting unit (the hashtags get pasted
 * right along with the caption), so they render and copy as a single field
 * instead of two visually separate sections.
 */
export function CaptionTagsField({
  label = "Caption",
  caption,
  onCaptionChange,
  captionPlaceholder,
  emptyText = "No caption yet.",
  tags,
  onTagsChange,
  tagPrefix = "",
  tagLabel,
  tagPlaceholder,
  tagSplitOnWhitespace = false,
  editing,
  showCopy = true,
  actions,
}: CaptionTagsFieldProps) {
  const copyText = combineCaptionAndTags(caption, tags, tagPrefix);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{label}</p>
        {!editing && (showCopy || actions) && (
          <div className="flex items-center gap-2">
            {showCopy && copyText && <CopyButton text={copyText} />}
            {actions}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <AutosizeTextarea
            value={caption}
            onChange={(e) => onCaptionChange?.(e.target.value)}
            placeholder={captionPlaceholder}
            className="min-h-9 resize-none text-sm"
          />
          <TokenEditor
            tokens={tags}
            onChange={(next) => onTagsChange?.(next)}
            label={tagLabel}
            placeholder={tagPlaceholder}
            splitOnWhitespace={tagSplitOnWhitespace}
            prefix={tagPrefix}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {caption ? (
            <p className="whitespace-pre-wrap break-words text-sm">{caption}</p>
          ) : (
            <p className="text-muted-foreground text-sm">{emptyText}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full break-all rounded bg-muted px-1.5 py-0.5 text-xs"
                >
                  {tagPrefix}
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
