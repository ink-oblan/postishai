"use client";

import {
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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BOLD_WEIGHT,
  isBold,
  type Layer,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  REGULAR_WEIGHT,
  type TextLayer,
} from "@/lib/design/document";
import { cn } from "@/lib/utils";

const STYLE_MENU_WIDTH = 176;
const OPACITY_STEP = 0.125;

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
  visible?: boolean;
  zoom: number;
  canAddLogo: boolean;
  /** The noun for a page — "slide" in a carousel. */
  pageLabel: string;
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
  onOpenDetails: () => void;
  onOpenFonts: () => void;
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
  visible = true,
  zoom,
  canAddLogo,
  pageLabel,
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
  onOpenDetails,
  onOpenFonts,
}: MobileEditorToolbarProps) {
  return (
    <div
      inert={!visible}
      className={cn(
        "pointer-events-none absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 transition-opacity duration-200 lg:hidden",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="mb-2 flex pl-14">
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
          aria-label={layer ? `${layer.type} tools` : `Add and ${pageLabel} tools`}
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
              onOpenDetails={onOpenDetails}
              onOpenFonts={onOpenFonts}
            />
          ) : (
            <>
              <ToolButton icon={Type} label="Text" onClick={onAddText} disabled={busy} />
              <ToolButton icon={Shapes} label="Shape" onClick={onAddShape} disabled={busy} />
              {canAddLogo && (
                <ToolButton icon={ImageIcon} label="Logo" onClick={onAddLogo} disabled={busy} />
              )}
              <ToolButton
                icon={Settings2}
                label={pageLabel}
                onClick={onOpenDetails}
                disabled={busy}
              />
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
  onOpenDetails,
  onOpenFonts,
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
  | "onOpenDetails"
  | "onOpenFonts"
> & { layer: Layer }) {
  const alignments = ["left", "center", "right"] as const;

  return (
    <>
      {layer.type === "text" && (
        <>
          <ToolButton icon={Type} label="Font" onClick={onOpenFonts} disabled={busy} />
          <TextStyleMenu layer={layer} busy={busy} onChange={onChange} />
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
          />
          <ToolButton
            icon={Highlighter}
            label="Highlight"
            onClick={() => onToggleHighlight(!layer.background)}
            disabled={busy}
            active={Boolean(layer.background)}
          />
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
            icon={Minus}
            label="Fade"
            onClick={() => onChange({ opacity: Math.max(0, layer.opacity - OPACITY_STEP) })}
            disabled={busy || layer.opacity <= 0}
          />
          <ToolButton
            icon={Plus}
            label="Solid"
            onClick={() => onChange({ opacity: Math.min(1, layer.opacity + OPACITY_STEP) })}
            disabled={busy || layer.opacity >= 1}
          />
        </>
      )}
      <ToolButton icon={Copy} label="Duplicate" onClick={onDuplicate} disabled={busy} />
      <ToolButton icon={BringToFront} label="Forward" onClick={onRaise} disabled={busy} />
      <ToolButton icon={SendToBack} label="Backward" onClick={onLower} disabled={busy} />
      <ToolButton icon={Trash2} label="Delete" onClick={onDelete} disabled={busy} destructive />
      {(layer.type === "logo" || (layer.type === "text" && Boolean(layer.background))) && (
        <ToolButton icon={Settings2} label="More" onClick={onOpenDetails} disabled={busy} />
      )}
    </>
  );
}

function TextStyleMenu({
  layer,
  busy,
  onChange,
}: {
  layer: TextLayer;
  busy: boolean;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggle = (style: TextStyle) => {
    if (style === "bold") {
      onChange({ fontWeight: isBold(layer.fontWeight) ? REGULAR_WEIGHT : BOLD_WEIGHT });
    } else {
      onChange({ [style]: !layer[style] });
    }
    setOpen(false);
  };

  return (
    <div className="relative flex min-w-[4.25rem] shrink-0">
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ left: position.left, bottom: position.bottom, width: STYLE_MENU_WIDTH }}
            className="fixed z-[70] flex flex-col gap-0.5 rounded-2xl border border-primary-foreground/20 bg-primary/95 p-1.5 text-primary-foreground shadow-2xl backdrop-blur-xl"
          >
            {TEXT_STYLES.map(({ key, label, icon: Icon }) => {
              const active = styleIsActive(layer, key);
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={active}
                  onClick={() => toggle(key)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-primary-foreground/10 [&_svg]:size-4",
                    active && "bg-primary-foreground/20",
                  )}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
      <button
        ref={buttonRef}
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = buttonRef.current?.getBoundingClientRect();
          if (!rect) return;
          setPosition({
            left: Math.min(
              Math.max(rect.left + rect.width / 2 - STYLE_MENU_WIDTH / 2, 8),
              Math.max(window.innerWidth - STYLE_MENU_WIDTH - 8, 8),
            ),
            bottom: window.innerHeight - rect.top + 8,
          });
          setOpen(true);
        }}
        className={cn(
          "flex min-w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] transition-colors hover:bg-primary-foreground/10 disabled:opacity-35 [&_svg]:size-5",
          (open || TEXT_STYLES.some(({ key }) => styleIsActive(layer, key))) &&
            "bg-primary-foreground/15",
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
        destructive && "my-1.5 bg-destructive text-white hover:bg-destructive/90",
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
