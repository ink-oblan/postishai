"use client";

import { motion } from "framer-motion";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useSyncExternalStore,
} from "react";
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
// [cycle progress, relative speed]: quick launch, steady travel, gradual braking.
const ORBIT_SPEED_STAGES = [
  [ORBIT_LAUNCH, 1],
  [ORBIT_BRAKE_START, 1],
  [1, ORBIT_MIN_SPEED],
] as const;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

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

type LogoLoaderSize = number | string;

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
  size?: "default" | "compact";
  visualSize?: LogoLoaderSize;
}

type LoaderStyle = CSSProperties & { "--logo-loader-size": string };

function toCssSize(size: LogoLoaderSize): string {
  return typeof size === "number" ? `${size}px` : size;
}

function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionPreference(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionPreference, () => true);
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
  const reduceMotion = usePrefersReducedMotion();
  const loaderStyle = {
    "--logo-loader-size": toCssSize(size),
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

      <motion.div
        className={styles.halo}
        initial={false}
        animate={
          reduceMotion
            ? { opacity: 0.2, scale: 0.94 }
            : { opacity: [0.16, 0.28, 0.16], scale: [0.88, 1.04, 0.88] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: LOOP_DURATION, ease: pulseEase, repeat: Infinity }
        }
      />

      <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100">
        <title>Loading progress orbit</title>
        <circle className={styles.track} cx="50" cy="50" r="43.5" />
      </svg>

      <motion.svg
        // Restart when tuning the launch: changing easing alone can leave an
        // existing infinite animation running with its previous transition.
        key={`orbit-${JSON.stringify(ORBIT_SPEED_STAGES)}-${ORBIT_DURATION}`}
        aria-hidden
        className={styles.orbitLayer}
        viewBox="0 0 100 100"
        initial={false}
        // The 54-degree arc's midpoint sits at twelve o'clock at each loop boundary.
        animate={reduceMotion ? { rotate: -117 } : { rotate: [-117, 243] }}
        transition={{
          duration: reduceMotion ? 0 : ORBIT_DURATION,
          ease: reduceMotion ? undefined : orbitEase,
          repeat: reduceMotion ? 0 : Infinity,
        }}
      >
        <circle className={styles.orbit} cx="50" cy="50" r="43.5" pathLength="100" />
      </motion.svg>

      <motion.div
        className={styles.logoLayer}
        initial={false}
        animate={reduceMotion ? { scale: 1 } : { scale: [0.96, 1.02, 0.96] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: LOOP_DURATION, ease: pulseEase, repeat: Infinity }
        }
      >
        <BrandLogoMark
          className={styles.logoMark}
          style={{ height: "100%", width: "100%" }}
          viewBox="0 0 591 591"
        />
      </motion.div>

      <div className={styles.sweepMask} aria-hidden>
        <motion.div
          className={styles.sweep}
          animate={
            reduceMotion
              ? { opacity: 0, x: "-105%" }
              : {
                  opacity: [0, 0, 0.5, 0, 0],
                  x: ["-105%", "-105%", "5%", "105%", "105%"],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: LOOP_DURATION,
                  ease: [0.4, 0, 0.2, 1],
                  repeat: Infinity,
                  times: [0, 0.14, 0.42, 0.68, 1],
                }
          }
        />
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
  visualSize,
  className,
  ...props
}: LongActionLoaderProps) {
  const resolvedVisualSize = visualSize ?? (size === "compact" ? 72 : 96);

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
      <LogoLoader decorative size={resolvedVisualSize} />

      <div className={cn("mt-4 space-y-1", size === "compact" && "mt-3")}>
        <p className={cn("font-medium text-sm", size === "default" && "text-base")}>{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {elapsedSeconds !== undefined || estimate ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
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
