"use client";

import { AlertDialog } from "@base-ui/react";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";

interface ImageCropperProps {
  open: boolean;
  src: string | null;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string, mimeType: "image/png" | "image/jpeg") => void;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function renderCrop(
  src: string,
  area: Area,
  mimeType: "image/png" | "image/jpeg",
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
}

export function ImageCropper({
  open,
  src,
  aspect = 3 / 4,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!src) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPixels(null);
  }, [src]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!src || !pixels) return;
    setBusy(true);
    try {
      const mimeType: "image/png" | "image/jpeg" = src.startsWith("data:image/jpeg")
        ? "image/jpeg"
        : "image/png";
      const dataUrl = await renderCrop(src, pixels, mimeType);
      onConfirm(dataUrl, mimeType);
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) onCancel();
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-all duration-200 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          <AlertDialog.Title className="px-5 pt-5 pb-3 font-semibold text-base">
            Crop photo
          </AlertDialog.Title>
          <div className="relative h-[55vh] w-full bg-black">
            {src ? (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                objectFit="cover"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={true}
              />
            ) : null}
          </div>
          <div className="space-y-3 px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={busy || !pixels}>
                {busy ? "Cropping…" : "Use photo"}
              </Button>
            </div>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
