"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export interface MediaFile {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  willCrop: boolean;
}

interface MediaUploaderProps {
  mediaFiles: MediaFile[];
  onMediaChange: (files: MediaFile[]) => void;
  processingCount: number;
}

function getMediaDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not read dimensions of ${file.name}`));
      };
      video.src = url;
    } else {
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not read dimensions of ${file.name}`));
      };
      img.src = url;
    }
  });
}

function needsCrop(width: number, height: number, targetW: number, targetH: number): boolean {
  return Math.abs(width / height - targetW / targetH) > 0.02;
}

async function convertImageForPreview(file: File): Promise<File> {
  if (file.type === "image/jpeg" || file.type.startsWith("video/")) {
    return file;
  }
  const formData = new FormData();
  formData.append("file", file, file.name);
  const res = await fetch("/api/media/convert-to-jpeg", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Failed to convert ${file.name} to JPEG`);
  const jpegBlob = await res.blob();
  const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  return new File([jpegBlob], name, { type: "image/jpeg" });
}

export function MediaUploader({ mediaFiles, onMediaChange, processingCount }: MediaUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaFilesRef = useRef<MediaFile[]>(mediaFiles);
  mediaFilesRef.current = mediaFiles;

  const updateVideoCropFlags = useCallback(() => {
    onMediaChange(
      mediaFiles.map((f) => {
        if (!f.file.type.startsWith("video/")) return f;
        const [targetW, targetH] = mediaFiles.length === 1 ? [9, 16] : [4, 5];
        const willCrop = needsCrop(f.width, f.height, targetW, targetH);
        if (f.willCrop === willCrop) return f;
        return { ...f, willCrop };
      }),
    );
  }, [mediaFiles, onMediaChange]);

  useEffect(() => {
    updateVideoCropFlags();
  }, [updateVideoCropFlags]);

  useEffect(() => {
    return () => {
      for (const f of mediaFilesRef.current) URL.revokeObjectURL(f.previewUrl);
    };
  }, []);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const isVideo = file.type.startsWith("video/");
        const resolved = await convertImageForPreview(file);
        const { width, height } = await getMediaDimensions(resolved);
        const totalMedia = mediaFilesRef.current.length + files.length;
        const [targetW, targetH] = isVideo && totalMedia === 1 ? [9, 16] : [4, 5];
        return {
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          name: resolved.name,
          file: resolved,
          previewUrl: URL.createObjectURL(resolved),
          width,
          height,
          willCrop: needsCrop(width, height, targetW, targetH),
        };
      }),
    );

    const newFiles: MediaFile[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        newFiles.push(result.value);
      } else {
        toast.error(result.reason instanceof Error ? result.reason.message : "Failed to add file");
      }
    }
    if (newFiles.length > 0) {
      onMediaChange([...mediaFiles, ...newFiles]);
      updateVideoCropFlags();
    }
  }

  function handleRemoveFile(id: string) {
    onMediaChange(
      mediaFiles
        .map((f) => {
          if (f.id === id) URL.revokeObjectURL(f.previewUrl);
          return f;
        })
        .filter((f) => f.id !== id),
    );
    updateVideoCropFlags();
  }

  return (
    <div className="space-y-2">
      <Label>
        Media <span className="text-destructive">*</span>
      </Label>
      <p className="text-muted-foreground text-xs">
        Upload your finished media so the AI can describe what&apos;s shown and write a caption that
        fits.
      </p>
      <div className="flex flex-wrap gap-2">
        {mediaFiles.map((f) => (
          <div
            key={f.id}
            className="group relative h-20 w-20 overflow-hidden rounded-md border bg-muted/40"
          >
            {f.file.type.startsWith("video/") ? (
              <video src={f.previewUrl} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // biome-ignore lint/performance/noImgElement: blob preview URL, not suited for next/image
              <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => handleRemoveFile(f.id)}
              className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              aria-label={`Remove ${f.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {f.willCrop && (
              <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                Will crop
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 truncate bg-background/70 px-1 text-[10px]">
              {f.name}
            </span>
          </div>
        ))}
        <Label
          htmlFor="media-upload"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
        >
          {processingCount > 0 ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Upload media
            </>
          )}
        </Label>
        <input
          id="media-upload"
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={handleFilesSelected}
          disabled={processingCount > 0}
        />
      </div>
    </div>
  );
}
