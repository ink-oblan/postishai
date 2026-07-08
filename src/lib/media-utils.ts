export function getMediaDimensions(file: File): Promise<{ width: number; height: number }> {
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

export function needsCrop(
  width: number,
  height: number,
  targetW: number,
  targetH: number,
): boolean {
  return Math.abs(width / height - targetW / targetH) > 0.02;
}
