import { useCallback } from "react";

export function useMediaConverter() {
  return useCallback(async (file: File): Promise<File> => {
    // Convert non-JPEG images to JPEG. Videos and JPEG files pass through unchanged.
    if (file.type === "image/jpeg" || file.type.startsWith("video/")) {
      return file;
    }

    const formData = new FormData();
    formData.append("file", file, file.name);

    const res = await fetch("/api/media/convert-to-jpeg", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData.error || `Failed to convert ${file.name} to JPEG`;
      throw new Error(errorMessage);
    }

    const jpegBlob = await res.blob();
    const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([jpegBlob], name, { type: "image/jpeg" });
  }, []);
}
