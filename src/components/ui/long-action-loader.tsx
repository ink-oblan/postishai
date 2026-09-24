"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { BrandLogoMark } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import styles from "./long-action-loader.module.css";

const LOOP_DURATION = 2.2;
const ORBIT_LAUNCH = 0.04 / 3;
const ORBIT_MIN_SPEED = 0.08;
// Solve the integrated speed curve so braking starts at exactly 270 degrees.
const ORBIT_BRAKE_START =
  (3 * (1 + ORBIT_MIN_SPEED) + ORBIT_LAUNCH * (1 - ORBIT_MIN_SPEED)) / (5 + 3 * ORBIT_MIN_SPEED);
const ORBIT_DURATION = LOOP_DURATION * (1 - ORBIT_BRAKE_START / 2);
// The sweep starts where braking begins and repeats every SWEEP_ORBITS orbits, so it must end
// before SWEEP_ORBITS * ORBIT_DURATION has passed.
const SWEEP_START = ORBIT_BRAKE_START / 2 / (1 - ORBIT_BRAKE_START / 2);
const SWEEP_DURATION = 1.8;
const SWEEP_ORBITS = 2;
const SWEEP_CYCLE_DURATION = ORBIT_DURATION * SWEEP_ORBITS;
// [cycle progress, relative speed]: quick launch, steady travel, gradual braking.
const ORBIT_SPEED_STAGES = [
  [ORBIT_LAUNCH, 1],
  [ORBIT_BRAKE_START, 1],
  [1, ORBIT_MIN_SPEED],
] as const;
const EASING_RESOLUTION_MS = 10;
const LOGO_VIEWBOX_SIZE = 591;
const LOGO_OPTICAL_SHIFT = 35;

// Integrate a cosine speed ramp so velocity and acceleration join smoothly.
function rampDistance(time: number, duration: number, from: number, to: number): number {
  return (
    ((from + to) * time) / 2 -
    (((to - from) * duration) / (2 * Math.PI)) * Math.sin((Math.PI * time) / duration)
  );
}

function baseOrbitEase(progress: number): number {
  let distance = 0;
  let totalArea = 0;
  let start = 0;
  let fromSpeed = ORBIT_MIN_SPEED;
  for (const [end, toSpeed] of ORBIT_SPEED_STAGES) {
    const duration = end - start;
    const elapsed = Math.max(0, Math.min(progress - start, duration));
    distance += rampDistance(elapsed, duration, fromSpeed, toSpeed);
    totalArea += (duration * (fromSpeed + toSpeed)) / 2;
    start = end;
    fromSpeed = toSpeed;
  }

  // Keep a small, identical speed at either end instead of stopping at the top.
  return distance / totalArea;
}

function orbitEase(progress: number): number {
  const elapsed = (progress * ORBIT_DURATION) / LOOP_DURATION;
  const brakeStart = ORBIT_BRAKE_START / 2;
  if (elapsed <= brakeStart) return baseOrbitEase(elapsed * 2);

  const time = Math.min(1, (elapsed - brakeStart) / (1 - ORBIT_BRAKE_START));
  // Match the doubled entry speed, but retain the full braking duration and
  // 90-degree distance. This speed curve joins the cruise with zero acceleration.
  const power = (8 * (1 - ORBIT_MIN_SPEED)) / (1 - 3 * ORBIT_MIN_SPEED) - 2;
  const remaining = 1 - time;
  const area = 2 / (power + 2);
  const distance =
    area - remaining ** (power + 1) + (power / (power + 2)) * remaining ** (power + 2);
  const brakingProgress =
    (ORBIT_MIN_SPEED * time + (1 - ORBIT_MIN_SPEED) * distance) /
    (ORBIT_MIN_SPEED + (1 - ORBIT_MIN_SPEED) * area);
  return 0.75 + 0.25 * brakingProgress;
}

function pulseEase(progress: number): number {
  return (1 - Math.cos(Math.PI * progress)) / 2;
}

function sweepWindow(progress: number): number {
  const start = SWEEP_START / SWEEP_ORBITS;
  const window = ((((progress - start) % 1) + 1) % 1) / (SWEEP_DURATION / SWEEP_CYCLE_DURATION);
  return window > 1 ? 0 : window;
}

function sweepMoveEase(progress: number): number {
  return pulseEase(sweepWindow(progress));
}

function sweepFadeEase(progress: number): number {
  return (1 - Math.cos(2 * Math.PI * sweepWindow(progress))) / 2;
}

function toLinearEasing(easing: (progress: number) => number, durationSeconds: number): string {
  const count = Math.max(Math.round((durationSeconds * 1000) / EASING_RESOLUTION_MS), 2);
  const points: number[] = [];
  for (let index = 0; index < count; index++) {
    points.push(Math.round(easing(index / (count - 1)) * 10000) / 10000);
  }

  return `linear(${points.join(", ")})`;
}

const ORBIT_EASING = toLinearEasing(orbitEase, ORBIT_DURATION);
const PULSE_EASING = toLinearEasing(pulseEase, LOOP_DURATION);
const SWEEP_MOVE_EASING = toLinearEasing(sweepMoveEase, SWEEP_CYCLE_DURATION);
const SWEEP_FADE_EASING = toLinearEasing(sweepFadeEase, SWEEP_CYCLE_DURATION);

type LogoLoaderSize = number | string;

type LongActionLoaderSize = "default" | "large";

const SIZE_STYLES: Record<
  LongActionLoaderSize,
  { visual: number; body: string; title: string; description: string }
> = {
  default: { visual: 96, body: "", title: "text-base", description: "" },
  large: {
    visual: 256,
    body: "mt-8 space-y-2",
    title: "text-4xl",
    description: "max-w-xl text-lg",
  },
};

interface LogoLoaderProps extends Omit<ComponentProps<"div">, "children" | "role"> {
  /** Pixel value or any valid CSS length. */
  size?: LogoLoaderSize;
  /** Removes status semantics when another element supplies the loading announcement. */
  decorative?: boolean;
}

interface LongActionLoaderProps extends Omit<ComponentProps<"div">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  elapsedSeconds?: number;
  estimate?: ReactNode;
  size?: LongActionLoaderSize;
}

type LoaderStyle = CSSProperties & {
  "--logo-loader-size": string;
  "--logo-loader-loop-duration": string;
  "--logo-loader-orbit-duration": string;
  "--logo-loader-orbit-ease": string;
  "--logo-loader-pulse-ease": string;
  "--logo-loader-sweep-duration": string;
  "--logo-loader-sweep-move-ease": string;
  "--logo-loader-sweep-fade-ease": string;
  "--logo-loader-optical-shift": string;
};

function toCssSize(size: LogoLoaderSize): string {
  return typeof size === "number" ? `${size}px` : size;
}

function formatElapsedTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return minutes > 0 ? `${minutes}m ${remainder.toString().padStart(2, "0")}s` : `${remainder}s`;
}

function LogoLoader({
  size = 96,
  decorative = false,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: LogoLoaderProps) {
  const loaderStyle = {
    "--logo-loader-size": toCssSize(size),
    "--logo-loader-loop-duration": `${LOOP_DURATION}s`,
    "--logo-loader-orbit-duration": `${ORBIT_DURATION}s`,
    "--logo-loader-orbit-ease": ORBIT_EASING,
    "--logo-loader-pulse-ease": PULSE_EASING,
    "--logo-loader-sweep-duration": `${SWEEP_CYCLE_DURATION}s`,
    "--logo-loader-sweep-move-ease": SWEEP_MOVE_EASING,
    "--logo-loader-sweep-fade-ease": SWEEP_FADE_EASING,
    "--logo-loader-optical-shift": `${(LOGO_OPTICAL_SHIFT / LOGO_VIEWBOX_SIZE) * 100}%`,
    ...style,
  } as LoaderStyle;

  return (
    <div
      role={decorative ? undefined : "status"}
      aria-live={decorative ? undefined : "polite"}
      aria-busy={decorative ? undefined : "true"}
      aria-hidden={decorative || undefined}
      data-slot="logo-loader"
      className={cn(styles.visual, className)}
      style={loaderStyle}
      {...props}
    >
      {decorative ? null : <span className="sr-only">{ariaLabel ?? "Loading"}</span>}

      <div className={styles.halo} aria-hidden />

      <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100">
        <title>Loading progress track</title>
        <circle className={styles.track} cx="50" cy="50" r="43.5" />
      </svg>

      <div className={styles.orbitLayer} aria-hidden>
        <svg className={styles.orbitSvg} viewBox="0 0 100 100">
          <title>Loading progress orbit</title>
          <circle className={styles.orbit} cx="50" cy="50" r="43.5" pathLength="100" />
        </svg>
      </div>

      <div className={styles.logoLayer} aria-hidden>
        <BrandLogoMark
          className={styles.logoMark}
          style={{ height: "100%", width: "100%" }}
          viewBox={`${-LOGO_OPTICAL_SHIFT} 0 ${LOGO_VIEWBOX_SIZE} ${LOGO_VIEWBOX_SIZE}`}
        />
      </div>

      <div className={styles.sweepMask} aria-hidden>
        <div className={styles.sweep} />
      </div>
    </div>
  );
}

function LongActionLoader({
  title = "Working on it…",
  description,
  elapsedSeconds,
  estimate,
  size = "default",
  className,
  ...props
}: LongActionLoaderProps) {
  const sizeStyles = SIZE_STYLES[size];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-slot="long-action-loader"
      data-size={size}
      className={cn("flex flex-col items-center justify-center text-center", className)}
      {...props}
    >
      <LogoLoader decorative size={sizeStyles.visual} />

      <div className={cn("mt-4 space-y-1", sizeStyles.body)}>
        <p className={cn("font-medium text-sm", sizeStyles.title)}>{title}</p>
        {description ? (
          <p
            className={cn(
              "mx-auto max-w-sm text-muted-foreground text-xs leading-relaxed",
              sizeStyles.description,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {elapsedSeconds !== undefined || estimate ? (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted-foreground text-xs",
            size === "large" && "mt-5 text-base",
          )}
        >
          {elapsedSeconds !== undefined ? (
            <span aria-hidden="true" suppressHydrationWarning>
              {formatElapsedTime(elapsedSeconds)} elapsed
            </span>
          ) : null}
          {elapsedSeconds !== undefined && estimate ? <span aria-hidden="true">·</span> : null}
          {estimate ? <span>{estimate}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export { formatElapsedTime, LogoLoader, LongActionLoader };
