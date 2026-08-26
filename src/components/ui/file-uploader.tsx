"use client";

import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

async function getMediaDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load video metadata"));
        };
        video.src = url;
      });
    } else {
      return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load image"));
        };
        img.src = url;
      });
    }
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export interface UploadedFile {
  id: string;
  name: string;
  file?: File;
  previewUrl?: string;
  storagePath?: string;
  width?: number;
  height?: number;
  willCrop?: boolean;
}

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  processingCount?: number;
  label?: string;
  description?: string;
  acceptedExtensions?: readonly string[]; // e.g., [".png", ".jpg", ".ttf"]
  maxFiles?: number;
  maxFileSizeBytes?: number;
  required?: boolean;
  computeCropFlags?: (files: UploadedFile[]) => UploadedFile[]; // Optional callback to compute willCrop flags
  fileType?: "logo" | "pattern" | "font"; // For server-side upload organization
}

export function FileUploader({
  files,
  onFilesChange,
  processingCount = 0,
  label = "Files",
  description,
  acceptedExtensions = [],
  maxFiles = 10,
  maxFileSizeBytes = 50 * 1024 * 1024,
  required = false,
  computeCropFlags,
  fileType,
}: FileUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<UploadedFile[]>(files);
  filesRef.current = files;
  const loadedStoragePathsRef = useRef<Set<string>>(new Set());
  const [localProcessingCount, setLocalProcessingCount] = useState(0);

  useEffect(() => {
    return () => {
      for (const f of filesRef.current) {
        if (f.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(f.previewUrl);
        }
      }
    };
  }, []);

  useEffect(() => {
    // Load preview URLs for files stored on server (those with storagePath but no previewUrl)
    const filesToLoad = files.filter(
      (f) => f.storagePath && !f.previewUrl && !loadedStoragePathsRef.current.has(f.storagePath),
    );
    if (filesToLoad.length === 0) return;

    // Mark as loading
    filesToLoad.forEach((f) => {
      if (f.storagePath) loadedStoragePathsRef.current.add(f.storagePath);
    });

    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        filesToLoad.map(async (f) => {
          try {
            if (!f.storagePath) return;
            const response = await fetch(
              `/api/brand-profile/file?path=${encodeURIComponent(f.storagePath)}`,
              { credentials: "include" },
            );
            if (response.ok) {
              updates[f.id] = URL.createObjectURL(await response.blob());
            } else {
              console.error(
                `[FileUploader] Failed to load preview for ${f.name}: ${response.status} ${response.statusText}`,
              );
            }
          } catch (error) {
            console.error(`[FileUploader] Error loading preview for ${f.name}:`, error);
          }
        }),
      );
      if (Object.keys(updates).length > 0) {
        onFilesChange(
          files.map((file) =>
            updates[file.id] ? { ...file, previewUrl: updates[file.id] } : file,
          ),
        );
      }
    })();
  }, [files, onFilesChange]);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    let selectedFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selectedFiles.length === 0) return;

    // Validate file types if extensions specified
    if (acceptedExtensions.length > 0) {
      const invalidFiles = selectedFiles.filter((f) => {
        const ext = `.${f.name.split(".").pop()?.toLowerCase()}`;
        return !acceptedExtensions.includes(ext);
      });

      if (invalidFiles.length > 0) {
        toast.error(`Invalid file type. Accepted: ${acceptedExtensions.join(", ")}`);
        selectedFiles = selectedFiles.filter((f) => {
          const ext = `.${f.name.split(".").pop()?.toLowerCase()}`;
          return acceptedExtensions.includes(ext);
        });
        if (selectedFiles.length === 0) return;
      }
    }

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter((f) => f.size > maxFileSizeBytes);
    if (oversizedFiles.length > 0) {
      toast.error(`File too large. Maximum: ${(maxFileSizeBytes / 1024 / 1024).toFixed(1)}MB`);
      selectedFiles = selectedFiles.filter((f) => f.size <= maxFileSizeBytes);
      if (selectedFiles.length === 0) return;
    }

    // Check if we can accept any more files
    const spotsAvailable = maxFiles - files.length;
    if (spotsAvailable <= 0) {
      toast.error(`Maximum ${maxFiles} files reached. Remove files to add more.`);
      return;
    }

    // Limit to available spots
    const selectedCount = selectedFiles.length;
    if (selectedFiles.length > spotsAvailable) {
      toast.warning(
        `Selecting only ${spotsAvailable} of ${selectedCount} files to reach the ${maxFiles}-file limit.`,
      );
      selectedFiles = selectedFiles.slice(0, spotsAvailable);
    }

    setLocalProcessingCount(selectedFiles.length);

    // First, create preview URLs and get dimensions for all files
    const filesWithPreviews = selectedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return { file, previewUrl };
    });

    // Then upload files in parallel
    const results = await Promise.allSettled(
      filesWithPreviews.map(async ({ file, previewUrl }) => {
        try {
          let dimensions: { width?: number; height?: number } = {};
          let storagePath: string | undefined;

          // Get dimensions for media files if computeCropFlags is provided
          if (
            computeCropFlags &&
            (file.type.startsWith("image/") || file.type.startsWith("video/"))
          ) {
            try {
              dimensions = await getMediaDimensions(file);
            } catch {
              // If we can't get dimensions, just continue without them
            }
          }

          // Upload file to server if fileType is specified
          if (fileType) {
            const formData = new FormData();
            formData.append("files", file);
            formData.append("fileType", fileType);

            const uploadResponse = await fetch("/api/brand-profile/upload", {
              method: "POST",
              body: formData,
            });

            if (!uploadResponse.ok) {
              const { error } = await uploadResponse.json().catch(() => ({ error: null }));
              throw new Error(error || `Failed to upload ${file.name}`);
            }

            const uploadedData = await uploadResponse.json();
            if (uploadedData.files?.[0]?.storagePath) {
              storagePath = uploadedData.files[0].storagePath;
            }
          }

          return {
            id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            file,
            previewUrl,
            storagePath,
            ...dimensions,
          };
        } catch (error) {
          throw error instanceof Error ? error : new Error("Failed to add file");
        }
      }),
    );

    const newFiles: UploadedFile[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        newFiles.push(result.value);
      } else {
        toast.error(result.reason instanceof Error ? result.reason.message : "Failed to add file");
      }
    }

    if (newFiles.length > 0) {
      const allFiles = [...files, ...newFiles];
      const finalFiles = computeCropFlags ? computeCropFlags(allFiles) : allFiles;
      onFilesChange(finalFiles);
      const totalNow = files.length + newFiles.length;
      toast.success(`${newFiles.length} file(s) added (${totalNow}/${maxFiles})`);
    }
    setLocalProcessingCount(0);
  }

  function handleRemoveFile(id: string) {
    const filtered = files
      .map((f) => {
        if (f.id === id && f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        return f;
      })
      .filter((f) => f.id !== id);
    const finalFiles = computeCropFlags ? computeCropFlags(filtered) : filtered;
    onFilesChange(finalFiles);
  }

  const effectiveProcessingCount = localProcessingCount || processingCount;
  const canUploadMore = files.length < maxFiles;
  const spotsRemaining = maxFiles - files.length;

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {description && (
        <p className="text-muted-foreground text-xs">
          {description} Maximum {maxFiles} files. ({files.length}/{maxFiles})
        </p>
      )}
      {!canUploadMore && (
        <p className="font-medium text-destructive text-xs">
          Maximum {maxFiles} files reached. Remove files to upload more.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {files.map((f) => {
          const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(f.name);
          const isVideo = /\.(mp4|webm|mov)$/i.test(f.name);
          return (
            <div
              key={f.id}
              className="group relative h-20 w-20 overflow-hidden rounded-md border bg-muted/40"
            >
              {isImage && f.previewUrl ? (
                <Image src={f.previewUrl} alt={f.name} fill className="object-cover" />
              ) : isVideo && f.previewUrl ? (
                <video
                  src={f.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2">
                  <span className="truncate text-center text-[10px] text-muted-foreground">
                    {f.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
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
          );
        })}
        <button
          type="button"
          onClick={() => canUploadMore && fileRef.current?.click()}
          disabled={!canUploadMore || effectiveProcessingCount > 0}
          className={`inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs transition-colors ${
            canUploadMore && processingCount === 0
              ? "cursor-pointer text-muted-foreground hover:border-primary/40 hover:text-foreground"
              : "cursor-not-allowed text-muted-foreground/50 opacity-50"
          }`}
        >
          {effectiveProcessingCount > 0 ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing…
            </>
          ) : canUploadMore ? (
            <>
              <Upload className="h-3.5 w-3.5" />
              Upload ({spotsRemaining} remaining)
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Limit reached
            </>
          )}
        </button>
        <input
          id="file-upload"
          ref={fileRef}
          type="file"
          accept={acceptedExtensions.join(",")}
          multiple
          className="sr-only"
          onChange={handleFilesSelected}
        />
      </div>
    </div>
  );
}
