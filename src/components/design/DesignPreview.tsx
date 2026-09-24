import type { CanvasSpec } from "@/lib/design/canvas-spec";
import {
  type DesignDocument,
  type Layer,
  type LogoLayer,
  type ShapeLayer,
  type TextLayer,
  textDecorationOf,
} from "@/lib/design/document";
import { PLACEHOLDER_BASE, PLACEHOLDER_BLOBS } from "@/lib/design/placeholder";

interface DesignPreviewProps {
  document: DesignDocument;
  spec: CanvasSpec;
  width: number;
  showPlaceholder?: boolean;
  backgroundUrl?: string | null;
  logoUrl?: (assetId: string) => string;
  resolveFontFamily?: (name: string) => string;
  className?: string;
}

const identityFontFamily = (name: string) => name;

export function DesignPreview({
  document,
  spec,
  width,
  showPlaceholder = false,
  backgroundUrl = null,
  logoUrl,
  resolveFontFamily = identityFontFamily,
  className,
}: DesignPreviewProps) {
  const scale = width / spec.width;

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        width,
        height: Math.round(spec.height * scale),
        backgroundColor:
          document.background.kind === "solid" ? document.background.color : PLACEHOLDER_BASE,
      }}
    >
      {showPlaceholder && <PlaceholderBackground />}
      {backgroundUrl && (
        // biome-ignore lint/performance/noImgElement: API-served bytes, not a static asset
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}
      <div
        className="absolute top-0 left-0"
        style={{
          width: spec.width,
          height: spec.height,
          transform: `scale(${scale})`,
          transformOrigin: "left top",
        }}
      >
        {document.layers.map((layer) => (
          <LayerPreview
            key={layer.id}
            layer={layer}
            logoUrl={logoUrl}
            resolveFontFamily={resolveFontFamily}
          />
        ))}
      </div>
    </div>
  );
}

function PlaceholderBackground() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: PLACEHOLDER_BLOBS.map(
          (blob) =>
            `radial-gradient(circle ${blob.radius * 100}% at ${blob.x * 100}% ${blob.y * 100}%, ${blob.color} 0%, transparent 100%)`,
        ).join(", "),
      }}
    />
  );
}

function LayerPreview({
  layer,
  logoUrl,
  resolveFontFamily,
}: {
  layer: Layer;
  logoUrl?: (assetId: string) => string;
  resolveFontFamily: (name: string) => string;
}) {
  if (layer.type === "text") {
    return <TextPreview layer={layer} resolveFontFamily={resolveFontFamily} />;
  }
  if (layer.type === "shape") return <ShapePreview layer={layer} />;

  return <LogoPreview layer={layer} logoUrl={logoUrl} />;
}

function TextPreview({
  layer,
  resolveFontFamily,
}: {
  layer: TextLayer;
  resolveFontFamily: (name: string) => string;
}) {
  const decoration = textDecorationOf(layer);
  const plate = layer.background;

  return (
    <div
      data-testid="preview-text"
      data-layer-id={layer.id}
      style={{
        position: "absolute",
        left: layer.x,
        top: layer.y,
        width: layer.width,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        transformOrigin: "left top",
      }}
    >
      {plate && (
        <div
          data-testid="preview-plate"
          style={{
            position: "absolute",
            inset: -plate.padding,
            backgroundColor: plate.color,
            opacity: plate.opacity,
            borderRadius: plate.cornerRadius,
          }}
        />
      )}
      <div
        data-testid="preview-copy"
        style={{
          position: "relative",
          margin: 0,
          padding: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: resolveFontFamily(layer.fontFamily),
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          fontStyle: layer.italic ? "italic" : "normal",
          textDecoration: decoration || "none",
          lineHeight: layer.lineHeight,
          textAlign: layer.align,
          color: layer.color,
        }}
      >
        {layer.text}
      </div>
    </div>
  );
}

function ShapePreview({ layer }: { layer: ShapeLayer }) {
  return (
    <div
      style={{
        position: "absolute",
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        transformOrigin: "left top",
        backgroundColor: layer.fill,
        borderRadius: layer.cornerRadius,
        opacity: layer.opacity,
      }}
    />
  );
}

function LogoPreview({
  layer,
  logoUrl,
}: {
  layer: LogoLayer;
  logoUrl?: (assetId: string) => string;
}) {
  const url = logoUrl?.(layer.assetId) ?? null;
  const style: React.CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    transformOrigin: "left top",
  };

  if (!url) {
    return <div style={{ ...style, backgroundColor: "#ffffff", opacity: 0.15 }} />;
  }

  return (
    // biome-ignore lint/performance/noImgElement: API-served bytes, not a static asset
    <img src={url} alt="" style={{ ...style, objectFit: "contain" }} draggable={false} />
  );
}
