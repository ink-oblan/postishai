"use client";

import { ChevronDown, Loader2, Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AvatarVoice {
  voice_id: string;
  name: string;
  gender: string;
  preview_audio?: string;
}

interface AvatarVoiceFieldProps {
  voices: AvatarVoice[];
  value: string;
  onValueChange?: (voiceId: string) => void;
  genderFilter?: string | null;
  loading?: boolean;
  readOnly?: boolean;
  size?: "sm" | "default";
  className?: string;
  triggerClassName?: string;
  allowClear?: boolean;
  onClear?: () => void;
  clearTitle?: string;
}

// Animated waveform shown while audio plays
function VoiceWave({ className }: { className?: string }) {
  const scales = [0.3, 0.9, 1, 0.65, 1, 0.5, 0.8];
  return (
    <span className={cn("flex shrink-0 items-end gap-[1.5px]", className)} aria-hidden="true">
      {scales.map((scale, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
          key={i}
          className="voice-wave-bar w-[2px] rounded-full bg-primary"
          style={{ "--wave-scale": scale, animationDelay: `${i * 75}ms` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

export function AvatarVoiceField({
  voices,
  value,
  onValueChange,
  genderFilter,
  loading = false,
  readOnly = false,
  size = "default",
  className,
  triggerClassName,
  allowClear = false,
  onClear,
  clearTitle = "Clear voice selection",
}: AvatarVoiceFieldProps) {
  const [open, setOpen] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredVoices = genderFilter
    ? voices.filter((voice) => voice.gender.trim().toLowerCase() === genderFilter)
    : voices;
  const selectedVoice = voices.find((v) => v.voice_id === value);
  const isSelectedPlaying = playingVoiceId === value;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  }, []);

  function toggleVoicePreview(voice: AvatarVoice, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!voice.preview_audio) return;
    if (playingVoiceId === voice.voice_id) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(voice.preview_audio);
    audio.onended = () => setPlayingVoiceId(null);
    audio.play().catch((err: unknown) => {
      if (err instanceof Error && err.name !== "AbortError") throw err;
    });
    audioRef.current = audio;
    setPlayingVoiceId(voice.voice_id);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => stopAudio, [stopAudio]);

  if (loading || voices.length === 0) {
    return (
      <div className={cn("flex h-8 items-center", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {selectedVoice?.preview_audio && (
          <button
            type="button"
            onClick={() => toggleVoicePreview(selectedVoice)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary"
            title="Preview voice"
          >
            {isSelectedPlaying ? (
              <Pause className="h-2.5 w-2.5 fill-current" />
            ) : (
              <Play className="h-2.5 w-2.5 fill-current" />
            )}
          </button>
        )}
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-sm">
            {selectedVoice?.name.trim() || value || (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
          {isSelectedPlaying && <VoiceWave />}
        </div>
      </div>
    );
  }

  const btnH = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const triggerH = size === "sm" ? "h-8" : "h-9";

  return (
    <div ref={containerRef} className={cn("flex items-center gap-2", className)}>
      {/* Trigger + dropdown wrapper */}
      <div ref={triggerWrapRef} className="relative flex-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm transition-all",
            "hover:border-ring/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            open && "border-ring/60 ring-1 ring-ring",
            triggerH,
            triggerClassName,
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selectedVoice ? (
            <>
              <span className="flex-1 truncate text-left font-medium">
                {selectedVoice.name.trim()}
              </span>
              {isSelectedPlaying && <VoiceWave />}
            </>
          ) : (
            <span className="flex-1 text-left text-muted-foreground">Select voice…</span>
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            role="listbox"
            className={cn(
              "absolute top-full left-0 z-50 mt-1.5 max-h-64 w-full min-w-56 overflow-y-auto",
              "rounded-lg border border-border bg-popover shadow-foreground/[0.06] shadow-lg",
              "fade-in-0 slide-in-from-top-1 animate-in duration-150",
            )}
          >
            <div className="py-1">
              {filteredVoices.length === 0 ? (
                <div className="px-2.5 py-2 text-muted-foreground text-sm">No matching voices</div>
              ) : null}
              {filteredVoices.map((voice) => {
                const isSelected = voice.voice_id === value;
                const isVoicePlaying = playingVoiceId === voice.voice_id;
                return (
                  <div
                    key={voice.voice_id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={cn(
                      "group flex cursor-pointer items-center gap-2 px-2.5 py-1.5 transition-colors",
                      isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                    onClick={() => {
                      stopAudio();
                      onValueChange?.(voice.voice_id);
                      setOpen(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      stopAudio();
                      onValueChange?.(voice.voice_id);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={cn(
                        "flex-1 truncate text-sm",
                        isSelected ? "font-semibold" : "font-medium",
                      )}
                    >
                      {voice.name.trim()}
                    </span>
                    {isVoicePlaying && <VoiceWave />}
                    {voice.preview_audio && (
                      <button
                        type="button"
                        onClick={(e) => toggleVoicePreview(voice, e)}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          isVoicePlaying
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground opacity-0 hover:border-primary hover:text-primary group-hover:opacity-100",
                        )}
                        title="Preview"
                      >
                        {isVoicePlaying ? (
                          <Pause className="h-2 w-2 fill-current" />
                        ) : (
                          <Play className="h-2 w-2 fill-current" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preview button for the currently-selected voice */}
      {selectedVoice?.preview_audio && (
        <button
          type="button"
          onClick={(e) => toggleVoicePreview(selectedVoice, e)}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-all",
            "hover:border-primary/60 hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isSelectedPlaying && "border-primary/50 text-primary",
            btnH,
          )}
          title="Preview voice"
        >
          {isSelectedPlaying ? (
            <Pause className="h-3 w-3 fill-current" />
          ) : (
            <Play className="h-3 w-3 fill-current" />
          )}
        </button>
      )}

      {/* Clear button */}
      {allowClear && (
        <button
          type="button"
          onClick={() => {
            stopAudio();
            onClear?.();
          }}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-all",
            "hover:border-destructive/60 hover:text-destructive focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            btnH,
          )}
          title={clearTitle}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
