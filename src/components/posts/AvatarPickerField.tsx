"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AvatarPickerOption {
  id: string;
  name: string;
  imagePath: string;
  voiceId: string;
}

interface AvatarPickerFieldProps {
  avatars: AvatarPickerOption[];
  value: string;
  fallbackName: string;
  fallbackImageUrl: string;
  variationImageUrl?: string | null;
  newAvatarHref: string;
  onChange: (avatar: AvatarPickerOption) => void;
}

export function AvatarPickerField({
  avatars,
  value,
  fallbackName,
  fallbackImageUrl,
  variationImageUrl,
  newAvatarHref,
  onChange,
}: AvatarPickerFieldProps) {
  const [search, setSearch] = useState(fallbackName);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const selectedAvatar = avatars.find((avatar) => avatar.id === value);
  const currentAvatarName = selectedAvatar?.name ?? fallbackName;
  const currentAvatarImageUrl =
    variationImageUrl ??
    (selectedAvatar ? `/api/avatars/${selectedAvatar.id}/image` : fallbackImageUrl);
  const filteredAvatars = avatars.filter((avatar) =>
    avatar.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    setSearch(currentAvatarName);
    setOpen(false);
  }, [currentAvatarName]);

  const closePicker = useCallback(() => {
    setOpen(false);
    setSearch(currentAvatarName);
  }, [currentAvatarName]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, closePicker]);

  function openPicker() {
    setSearch("");
    setOpen(true);
  }

  function handleSelect(avatar: AvatarPickerOption) {
    onChange(avatar);
    setSearch(avatar.name);
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <div ref={pickerRef} className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2">
          <span className="relative block h-6 w-6 overflow-hidden rounded-md border border-border bg-muted">
            <Image
              src={currentAvatarImageUrl}
              alt={currentAvatarName}
              fill
              className="object-cover"
              unoptimized
            />
          </span>
        </span>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!open) openPicker();
          }}
          onClick={() => {
            if (!open) openPicker();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closePicker();
            }
            if (e.key === "Enter" && filteredAvatars.length > 0) {
              e.preventDefault();
              handleSelect(filteredAvatars[0]);
            }
          }}
          className="h-10 pl-11"
          placeholder={open ? "Search avatars..." : currentAvatarName}
        />
        {open && (
          <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
            {filteredAvatars.length > 0 ? (
              filteredAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => handleSelect(avatar)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="relative h-8 w-8 overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={`/api/avatars/${avatar.id}/image`}
                      alt={avatar.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0 truncate font-medium">{avatar.name}</span>
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-muted-foreground text-sm">
                No avatars match that search.
              </p>
            )}
          </div>
        )}
      </div>
      <Link href={newAvatarHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New avatar
      </Link>
    </div>
  );
}
