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

export function containBox(sourceWidth: number, sourceHeight: number, box: Box): Box {
  const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
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
