"use client";

import {
  ALargeSmall,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  Copy,
  Focus,
  Highlighter,
  ImageIcon,
  Italic,
  type LucideIcon,
  Minus,
  Palette,
  Plus,
  Redo2,
  SendToBack,
  Settings2,
  Shapes,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BOLD_WEIGHT,
  isBold,
  type Layer,
  REGULAR_WEIGHT,
  type TextLayer,
} from "@/lib/design/document";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 280;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 400;

type TextStyle = "bold" | "italic" | "underline" | "lineThrough";

const TEXT_STYLES: { key: TextStyle; label: string; icon: LucideIcon }[] = [
  { key: "bold", label: "Bold", icon: Bold },
  { key: "italic", label: "Italic", icon: Italic },
  { key: "underline", label: "Underline", icon: Underline },
  { key: "lineThrough", label: "Strike", icon: Strikethrough },
];

interface MobileEditorToolbarProps {
  layer: Layer | null;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  canAddLogo: boolean;
  onAddText: () => void;
  onAddShape: () => void;
  onAddLogo: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetZoom: () => void;
  onChange: (patch: Partial<Layer>) => void;
  onToggleHighlight: (on: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRaise: () => void;
  onLower: () => void;
  onDeselect: () => void;
  onOpenDetails: () => void;
}

/**
 * The mobile editor gets one horizontally scrollable command surface. Its contents follow the
 * canvas selection, while undo/redo stay outside the rail so history never moves off-screen.
 */
export function MobileEditorToolbar({
  layer,
  busy,
  canUndo,
  canRedo,
  zoom,
  canAddLogo,
  onAddText,
  onAddShape,
  onAddLogo,
  onUndo,
  onRedo,
  onResetZoom,
  onChange,
  onToggleHighlight,
  onDuplicate,
  onDelete,
  onRaise,
  onLower,
  onDeselect,
  onOpenDetails,
}: MobileEditorToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 lg:hidden">
      <div className="mb-2 flex">
        {zoom !== 1 && (
          <div className="pointer-events-auto flex rounded-full border border-primary-foreground/15 bg-primary/90 p-1 text-primary-foreground shadow-lg backdrop-blur-xl">
            <HistoryButton
              label={`Return to original view, currently ${Math.round(zoom * 100)}%`}
              onClick={onResetZoom}
              disabled={busy}
            >
              <Focus />
            </HistoryButton>
          </div>
        )}
        <div className="pointer-events-auto ml-auto flex rounded-full border border-primary-foreground/15 bg-primary/90 p-1 text-primary-foreground shadow-lg backdrop-blur-xl">
          <HistoryButton label="Undo" onClick={onUndo} disabled={busy || !canUndo}>
            <Undo2 />
          </HistoryButton>
          <HistoryButton label="Redo" onClick={onRedo} disabled={busy || !canRedo}>
            <Redo2 />
          </HistoryButton>
        </div>
      </div>

      <div className="pointer-events-auto relative overflow-visible rounded-2xl border border-primary-foreground/20 bg-primary/95 text-primary-foreground shadow-2xl backdrop-blur-xl">
        <div
          className="flex h-[3.625rem] items-stretch gap-1 overflow-x-auto overscroll-x-contain px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="toolbar"
          aria-label={layer ? `${layer.type} tools` : "Add and slide tools"}
        >
          {layer ? (
            <SelectedLayerTools
              layer={layer}
              busy={busy}
              onChange={onChange}
              onToggleHighlight={onToggleHighlight}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onRaise={onRaise}
              onLower={onLower}
              onDeselect={onDeselect}
              onOpenDetails={onOpenDetails}
            />
          ) : (
            <>
              <ToolButton icon={Type} label="Text" onClick={onAddText} disabled={busy} />
              <ToolButton icon={Shapes} label="Shape" onClick={onAddShape} disabled={busy} />
              {canAddLogo && (
                <ToolButton icon={ImageIcon} label="Logo" onClick={onAddLogo} disabled={busy} />
              )}
              <ToolButton icon={Settings2} label="Slide" onClick={onOpenDetails} disabled={busy} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedLayerTools({
  layer,
  busy,
  onChange,
  onToggleHighlight,
  onDuplicate,
  onDelete,
  onRaise,
  onLower,
  onDeselect,
  onOpenDetails,
}: Pick<
  MobileEditorToolbarProps,
  | "layer"
  | "busy"
  | "onChange"
  | "onToggleHighlight"
  | "onDuplicate"
  | "onDelete"
  | "onRaise"
  | "onLower"
  | "onDeselect"
  | "onOpenDetails"
> & { layer: Layer }) {
  const alignments = ["left", "center", "right"] as const;

  return (
    <>
      <ToolButton icon={X} label="Close" onClick={onDeselect} disabled={busy} />
      {layer.type === "text" && (
        <>
          <TextStyleScrubber layer={layer} busy={busy} onChange={onChange} />
          <ToolButton
            icon={Minus}
            label="Smaller"
            onClick={() => onChange({ fontSize: Math.max(MIN_FONT_SIZE, layer.fontSize - 4) })}
            disabled={busy || layer.fontSize <= MIN_FONT_SIZE}
          />
          <ToolButton
            icon={Plus}
            label="Larger"
            onClick={() => onChange({ fontSize: Math.min(MAX_FONT_SIZE, layer.fontSize + 4) })}
            disabled={busy || layer.fontSize >= MAX_FONT_SIZE}
          />
          <ColourTool
            label="Colour"
            value={layer.color}
            onChange={(color) => onChange({ color })}
            disabled={busy}
          />
          <ToolButton
            icon={alignmentIcon(layer.align)}
            label="Align"
            onClick={() => {
              const index = alignments.indexOf(layer.align);
              onChange({ align: alignments[(index + 1) % alignments.length] });
            }}
            disabled={busy}
            active={layer.align === "center"}
          />
          <ToolButton
            icon={Highlighter}
            label="Highlight"
            onClick={() => onToggleHighlight(!layer.background)}
            disabled={busy}
            active={Boolean(layer.background)}
          />
          <ToolButton icon={ALargeSmall} label="Font" onClick={onOpenDetails} disabled={busy} />
        </>
      )}
      {layer.type === "shape" && (
        <>
          <ColourTool
            label="Fill"
            value={layer.fill}
            onChange={(fill) => onChange({ fill })}
            disabled={busy}
          />
          <ToolButton
            icon={Palette}
            label="Opacity"
            onClick={() => onChange({ opacity: layer.opacity <= 0.25 ? 1 : layer.opacity - 0.25 })}
            disabled={busy}
          />
          <ToolButton icon={Settings2} label="More" onClick={onOpenDetails} disabled={busy} />
        </>
      )}
      <ToolButton icon={Copy} label="Duplicate" onClick={onDuplicate} disabled={busy} />
      <ToolButton icon={BringToFront} label="Forward" onClick={onRaise} disabled={busy} />
      <ToolButton icon={SendToBack} label="Backward" onClick={onLower} disabled={busy} />
      {layer.type === "logo" && (
        <ToolButton icon={Settings2} label="More" onClick={onOpenDetails} disabled={busy} />
      )}
      <ToolButton icon={Trash2} label="Delete" onClick={onDelete} disabled={busy} destructive />
    </>
  );
}

function TextStyleScrubber({
  layer,
  busy,
  onChange,
}: {
  layer: TextLayer;
  busy: boolean;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<TextStyle | null>(null);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  const hoveredRef = useRef<TextStyle | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const toggle = (style: TextStyle) => {
    if (style === "bold") {
      onChange({ fontWeight: isBold(layer.fontWeight) ? REGULAR_WEIGHT : BOLD_WEIGHT });
      return;
    }
    onChange({ [style]: !layer[style] });
  };

  const finish = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (holdingRef.current) {
      if (hoveredRef.current) toggle(hoveredRef.current);
      suppressClickRef.current = true;
    }
    holdingRef.current = false;
    hoveredRef.current = null;
    setOpen(false);
    setHovered(null);
    setPosition(null);
  };

  return (
    <div className="relative flex min-w-[4.25rem] shrink-0">
      {open &&
        position &&
        createPortal(
          <div
            role="menu"
            style={{ left: position.left, bottom: position.bottom }}
            className="fixed z-[70] flex -translate-x-1/2 flex-col gap-1 rounded-2xl border border-primary-foreground/20 bg-primary/95 p-1.5 text-primary-foreground shadow-2xl backdrop-blur-xl"
          >
            {TEXT_STYLES.map(({ key, label, icon: Icon }) => {
              const active = styleIsActive(layer, key);
              return (
                <div
                  key={key}
                  data-style-option={key}
                  role="menuitemcheckbox"
                  tabIndex={-1}
                  aria-label={label}
                  aria-checked={active}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl transition-colors [&_svg]:size-5",
                    hovered === key && "bg-primary-foreground text-primary",
                    hovered !== key && active && "bg-primary-foreground/20",
                  )}
                >
                  <Icon />
                </div>
              );
            })}
          </div>,
          document.body,
        )}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Style. Tap for bold, hold and slide for more"
        aria-pressed={isBold(layer.fontWeight)}
        disabled={busy}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") event.currentTarget.setPointerCapture(event.pointerId);
          timerRef.current = setTimeout(() => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPosition({
              left: rect.left + rect.width / 2,
              bottom: window.innerHeight - rect.top + 8,
            });
            holdingRef.current = true;
            setOpen(true);
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(event) => {
          if (!holdingRef.current) return;
          const option = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>("[data-style-option]")?.dataset.styleOption as
            | TextStyle
            | undefined;
          hoveredRef.current = option ?? null;
          setHovered(hoveredRef.current);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          toggle("bold");
        }}
        className={cn(
          "flex min-w-[4.25rem] touch-none select-none flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] transition-colors disabled:opacity-35 [&_svg]:size-5",
          isBold(layer.fontWeight) && "bg-primary-foreground/15",
        )}
      >
        <Bold />
        <span>Style</span>
      </button>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  destructive,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] transition-colors hover:bg-primary-foreground/10 disabled:opacity-35 [&_svg]:size-5",
        active && "bg-primary-foreground/15",
        destructive && "text-red-200",
      )}
    >
      <Icon />
      <span>{label}</span>
    </button>
  );
}

function ColourTool({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] transition-colors hover:bg-primary-foreground/10",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      <span
        className="size-5 rounded-full border-2 border-primary-foreground shadow-sm"
        style={{ backgroundColor: value.slice(0, 7) }}
      />
      <span>{label}</span>
      <input
        type="color"
        value={value.slice(0, 7)}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function HistoryButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/10 disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

function styleIsActive(layer: TextLayer, style: TextStyle): boolean {
  return style === "bold" ? isBold(layer.fontWeight) : layer[style];
}

function alignmentIcon(align: TextLayer["align"]): LucideIcon {
  if (align === "center") return AlignCenter;
  if (align === "right") return AlignRight;
  return AlignLeft;
}
