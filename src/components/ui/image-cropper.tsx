"use client";

import { AlertDialog } from "@base-ui/react";
import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";

interface ImageCropperProps {
  open: boolean;
  src: string | null;
  aspect?: number;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string, mimeType: "image/jpeg") => void;
}

function renderCrop(img: HTMLImageElement, pixelCrop: PixelCrop, mimeType: "image/jpeg"): string {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(pixelCrop.width * scaleX);
  canvas.height = Math.round(pixelCrop.height * scaleY);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(
    img,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
}

export function ImageCropper({
  open,
  src,
  aspect = 3 / 4,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(src);
  const lastSrcRef = useRef<string | null>(src);

  useEffect(() => {
    if (!src) return;
    setDisplaySrc(src);
    if (src !== lastSrcRef.current) {
      lastSrcRef.current = src;
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, [src]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (crop) return;
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    const initial = centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, w, h), w, h);
    setCrop(initial);
  }

  function handleConfirm() {
    if (!imgRef.current || !completedCrop) return;
    setBusy(true);
    try {
      const mimeType = "image/jpeg" as const;
      const dataUrl = renderCrop(imgRef.current, completedCrop, mimeType);
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
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
            {displaySrc ? (
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                onComplete={setCompletedCrop}
                aspect={aspect}
                keepSelection
                ruleOfThirds
              >
                {/* biome-ignore lint/performance/noImgElement: react-image-crop requires a plain img child */}
                <img
                  ref={imgRef}
                  src={displaySrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: "100%", objectFit: "contain", display: "block" }}
                />
              </ReactCrop>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 px-5 pt-4 pb-5">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={busy || !completedCrop}>
              {busy ? "Cropping…" : "Use photo"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
