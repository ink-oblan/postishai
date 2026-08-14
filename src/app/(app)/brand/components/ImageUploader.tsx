"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";

interface ImageUploaderProps {
  label: string;
  values?: string[];
  onChange: (base64Array: string[]) => void;
  accept?: string;
  required?: boolean;
  maxFiles?: number;
}

export function ImageUploader({
  label,
  values = [],
  onChange,
  accept = ".png",
  required = false,
  maxFiles = 5,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalFiles = values.length + files.length;
    if (totalFiles > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. You can add ${maxFiles - values.length} more.`);
      return;
    }

    setIsLoading(true);
    const newBase64Array: string[] = [];
    let filesProcessed = 0;
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image file`);
        filesProcessed++;
        if (filesProcessed === fileArray.length) {
          if (newBase64Array.length > 0) {
            onChange([...values, ...newBase64Array]);
          }
          setIsLoading(false);
        }
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          newBase64Array.push(event.target.result as string);
        }
        filesProcessed++;

        if (filesProcessed === fileArray.length) {
          if (newBase64Array.length > 0) {
            onChange([...values, ...newBase64Array]);
          }
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        alert(`Failed to read ${file.name}`);
        filesProcessed++;

        if (filesProcessed === fileArray.length) {
          if (newBase64Array.length > 0) {
            onChange([...values, ...newBase64Array]);
          }
          setIsLoading(false);
        }
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>

      {values.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {values.map((preview, index) => (
            <div
              key={index}
              className="group relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 rounded bg-background/80 p-1 opacity-0 transition-colors hover:bg-destructive hover:text-white group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {values.length < maxFiles && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-border border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="font-medium text-sm">Click to upload</p>
          <p className="text-muted-foreground text-xs">PNG files only</p>
        </div>
      )}

      {/* Info hint */}
      <div className="space-y-1 pt-2 text-center text-muted-foreground text-xs">
        <p>
          Add{" "}
          {maxFiles - Math.min(values.length, maxFiles) > 0
            ? `up to ${maxFiles - Math.min(values.length, maxFiles)} more image${maxFiles - Math.min(values.length, maxFiles) > 1 ? "s" : ""}`
            : `you have ${values.length} image${values.length > 1 ? "s" : ""}`}{" "}
          (0–{maxFiles} total)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={isLoading || values.length >= maxFiles}
        multiple
      />
    </div>
  );
}
