export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasSpec {
  width: number;
  height: number;
  safeZone: SafeZone;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function safeArea(spec: CanvasSpec): Box {
  const { safeZone } = spec;
  return {
    x: safeZone.left,
    y: safeZone.top,
    width: spec.width - safeZone.left - safeZone.right,
    height: spec.height - safeZone.top - safeZone.bottom,
  };
}

export function coverCrop(sourceWidth: number, sourceHeight: number, spec: CanvasSpec): Box {
  const scale = Math.max(spec.width / sourceWidth, spec.height / sourceHeight);
  const width = spec.width / scale;
  const height = spec.height / scale;

  return {
    x: (sourceWidth - width) / 2,
    y: (sourceHeight - height) / 2,
    width,
    height,
  };
}
