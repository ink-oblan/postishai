"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useImageConverter } from "@/lib/hooks/use-image-converter";
import {
  ASPECT_RATIO_MULTI_MEDIA,
  ASPECT_RATIO_SINGLE_VIDEO,
  MAX_FILE_SIZE_BYTES,
  MAX_MEDIA_FILES,
} from "@/lib/media-constants";
import { getMediaDimensions, needsCrop } from "@/lib/media-utils";
import type { MediaFile } from "@/lib/types/media";

interface MediaUploaderProps {
  mediaFiles: MediaFile[];
  onMediaChange: (files: MediaFile[]) => void;
  processingCount: number;
}

export function MediaUploader({ mediaFiles, onMediaChange, processingCount }: MediaUploaderProps) {
  const convertImageForPreview = useImageConverter();
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaFilesRef = useRef<MediaFile[]>(mediaFiles);
  mediaFilesRef.current = mediaFiles;

  const computeVideoCropFlags = (files: MediaFile[]): MediaFile[] => {
    return files.map((f) => {
      if (!f.file.type.startsWith("video/")) return f;
      const [targetW, targetH] = files.length === 1 ? [9, 16] : [4, 5];
      const willCrop = needsCrop(f.width, f.height, targetW, targetH);
      if (f.willCrop === willCrop) return f;
      return { ...f, willCrop };
    });
  };

  useEffect(() => {
    return () => {
      for (const f of mediaFilesRef.current) URL.revokeObjectURL(f.previewUrl);
    };
  }, []);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    let files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    // Check file sizes
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      toast.error(
        `${oversizedFiles.length} file(s) exceed ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB limit: ${oversizedFiles.map((f) => f.name).join(", ")}`,
      );
      files = files.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
      if (files.length === 0) return;
    }

    // Check if we can accept any more files
    if (mediaFiles.length >= MAX_MEDIA_FILES) {
      toast.error(`Maximum ${MAX_MEDIA_FILES} files reached. Remove files to add more.`);
      return;
    }

    // Limit files to available spots
    const spotsAvailable = MAX_MEDIA_FILES - mediaFiles.length;
    const selectedCount = files.length;
    if (files.length > spotsAvailable) {
      toast.warning(
        `Selecting only ${spotsAvailable} of ${selectedCount} files to reach the ${MAX_MEDIA_FILES}-file limit.`,
      );
      files = files.slice(0, spotsAvailable);
    }

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const isVideo = file.type.startsWith("video/");
        let resolved: File | null = null;
        try {
          resolved = await convertImageForPreview(file);
          const { width, height } = await getMediaDimensions(resolved);
          // Calculate total media including already uploaded and files being processed
          const totalMedia = mediaFiles.length + files.length;
          const ratio =
            isVideo && totalMedia === 1 ? ASPECT_RATIO_SINGLE_VIDEO : ASPECT_RATIO_MULTI_MEDIA;
          const [targetW, targetH] = [ratio.width, ratio.height];
          return {
            id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
            name: resolved.name,
            file: resolved,
            previewUrl: URL.createObjectURL(resolved),
            width,
            height,
            willCrop: needsCrop(width, height, targetW, targetH),
          };
        } catch (error) {
          // If conversion failed after getting resolved file, revoke its object URL to prevent memory leak
          if (resolved) {
            // Try to revoke the preview URL by creating a temporary one
            const tempUrl = URL.createObjectURL(resolved);
            URL.revokeObjectURL(tempUrl);
          }
          throw error;
        }
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

    // Enforce strict 20-file limit - reject excess files
    let acceptedFiles = newFiles;
    const finalSpotsAvailable = MAX_MEDIA_FILES - mediaFiles.length;
    if (acceptedFiles.length > finalSpotsAvailable) {
      // Revoke URLs for files that won't be accepted
      acceptedFiles.slice(finalSpotsAvailable).forEach((f) => {
        URL.revokeObjectURL(f.previewUrl);
      });
      toast.error(
        `Only ${finalSpotsAvailable} more file(s) can be added. You have ${mediaFiles.length}/${MAX_MEDIA_FILES} files.`,
      );
      acceptedFiles = acceptedFiles.slice(0, finalSpotsAvailable);
    }

    if (acceptedFiles.length > 0) {
      const newFiles = computeVideoCropFlags([...mediaFiles, ...acceptedFiles]);
      onMediaChange(newFiles);
      const totalNow = mediaFiles.length + acceptedFiles.length;
      toast.success(`${acceptedFiles.length} file(s) added (${totalNow}/${MAX_MEDIA_FILES})`);
    }
  }

  function handleRemoveFile(id: string) {
    const filtered = mediaFiles
      .map((f) => {
        if (f.id === id) URL.revokeObjectURL(f.previewUrl);
        return f;
      })
      .filter((f) => f.id !== id);
    const withFlags = computeVideoCropFlags(filtered);
    onMediaChange(withFlags);
  }

  const canUploadMore = mediaFiles.length < MAX_MEDIA_FILES;
  const spotsRemaining = MAX_MEDIA_FILES - mediaFiles.length;

  return (
    <div className="space-y-2">
      <Label>
        Media <span className="text-destructive">*</span>
      </Label>
      <p className="text-muted-foreground text-xs">
        Add images and videos for AI to analyze and generate captions. Maximum {MAX_MEDIA_FILES}{" "}
        files. ({mediaFiles.length}/{MAX_MEDIA_FILES})
      </p>
      {!canUploadMore && (
        <p className="font-medium text-destructive text-xs">
          Maximum {MAX_MEDIA_FILES} files reached. Remove files to upload more.
        </p>
      )}
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
        <button
          type="button"
          onClick={() => canUploadMore && fileRef.current?.click()}
          disabled={!canUploadMore || processingCount > 0}
          className={`inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs transition-colors ${
            canUploadMore && processingCount === 0
              ? "cursor-pointer text-muted-foreground hover:border-primary/40 hover:text-foreground"
              : "cursor-not-allowed text-muted-foreground/50 opacity-50"
          }`}
        >
          {processingCount > 0 ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing…
            </>
          ) : canUploadMore ? (
            <>
              <Upload className="h-3.5 w-3.5" />
              Upload media ({spotsRemaining} remaining)
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Limit reached
            </>
          )}
        </button>
        <input
          id="media-upload"
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={handleFilesSelected}
        />
      </div>
    </div>
  );
}
