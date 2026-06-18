"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RobotState = "idle" | "hover" | "typing" | "loading" | "success" | "error";
export type ViewportPoint = { x: number; y: number; maxX?: number; minX?: number };

const ORANGE = "#E88A24";
const VIEW_BOX = { x: 60, y: 0, width: 420, height: 560 };
const GLASSES_CENTER = { x: 335, y: 138 };
const TYPING_GLASSES_OFFSET_Y = 100;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampOptionalRange(value: number, min: number | undefined, max: number | undefined) {
  if (min == null || max == null) return value;
  if (min > max) return (min + max) / 2;
  return clamp(value, min, max);
}

// ─── Confetti ────────────────────────────────────────────────────────────────

export function SuccessParticles() {
  const particles = useMemo(() => {
    const colors = [
      ORANGE,
      "#ef4444",
      "#10b981",
      "#3b82f6",
      "#f59e0b",
      "#8b5cf6",
      "#f97316",
      "#06b6d4",
      "#ec4899",
    ];
    return Array.from({ length: 48 }, (_, i) => ({
      id: `success-particle-${i}`,
      angle: (i * 360) / 48 + (Math.random() * 14 - 7),
      color: colors[i % colors.length],
      size: 6 + Math.random() * 10,
      distance: 250 + Math.random() * 1000,
      delay: Math.random() * 0.15,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 10 }}>
      {particles.map((p, _i) => {
        const rad = (p.angle * Math.PI) / 180;
        return (
          <motion.div
            key={p.id}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * p.distance,
              y: Math.sin(rad) * p.distance,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 1.4, ease: "easeOut", delay: p.delay }}
          />
        );
      })}
    </div>
  );
}

// ─── Glasses image (public/static/glasses.png, 1024×228, aspect ≈ 4.49:1) ───
//
// Positioned in viewBox "60 0 420 560" coordinate space.
// mix-blend-mode: multiply makes the white PNG background transparent against
// the orange P body, leaving only the black pixel glasses visible.
//
// Reference position (matches the supplied logo mockup):
//   x=150, y=112 → right lens extends past the viewBox edge (overflow:visible).
//   width=340, height=76 preserves the 4.49:1 aspect ratio.

// ─── Main character ───────────────────────────────────────────────────────────

export function WaitlistRobot({
  state,
  nudgeKey = 0,
  errorKey = 0,
  typingCursorPoint = null,
}: {
  state: RobotState;
  nudgeKey?: number;
  errorKey?: number;
  typingCursorPoint?: ViewportPoint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClickNudging, setIsClickNudging] = useState(false);
  const [isErrorReacting, setIsErrorReacting] = useState(false);

  const glassesBaseTargetX = useMotionValue(0);
  const glassesBaseTargetY = useMotionValue(0);
  const glassesLookTargetX = useMotionValue(0);
  const glassesLookTargetY = useMotionValue(0);
  const glassesLookTargetRotate = useMotionValue(0);
  const springGlassesBaseX = useSpring(glassesBaseTargetX, { stiffness: 55, damping: 18 });
  const springGlassesBaseY = useSpring(glassesBaseTargetY, { stiffness: 55, damping: 18 });
  const springGlassesLookX = useSpring(glassesLookTargetX, { stiffness: 45, damping: 18 });
  const springGlassesLookY = useSpring(glassesLookTargetY, { stiffness: 45, damping: 18 });
  const springGlassesLookRotate = useSpring(glassesLookTargetRotate, {
    stiffness: 45,
    damping: 18,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (nudgeKey === 0) return;
    setIsClickNudging(true);
    const timeout = window.setTimeout(() => setIsClickNudging(false), 360);
    return () => window.clearTimeout(timeout);
  }, [nudgeKey]);

  useEffect(() => {
    if (errorKey === 0) return;
    setIsErrorReacting(true);
    const timeout = window.setTimeout(() => setIsErrorReacting(false), 520);
    return () => window.clearTimeout(timeout);
  }, [errorKey]);

  const aimGlassesAt = useCallback(
    (point: ViewportPoint, strength: number, maxX: number, maxY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const restX = rect.left + ((GLASSES_CENTER.x - VIEW_BOX.x) / VIEW_BOX.width) * rect.width;
      const restY = rect.top + ((GLASSES_CENTER.y - VIEW_BOX.y) / VIEW_BOX.height) * rect.height;
      const dx = point.x - restX;
      const dy = point.y - restY;
      const svgDx = dx * (VIEW_BOX.width / rect.width);
      const svgDy = dy * (VIEW_BOX.height / rect.height);

      glassesLookTargetX.set(clamp(svgDx * strength, -maxX, maxX));
      glassesLookTargetY.set(clamp(svgDy * strength, -maxY, maxY));
      glassesLookTargetRotate.set(clamp(dx / 28, -10, 10));
    },
    [glassesLookTargetX, glassesLookTargetY, glassesLookTargetRotate],
  );

  const placeGlassesAboveCaret = useCallback(
    (point: ViewportPoint) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const restX = rect.left + ((GLASSES_CENTER.x - VIEW_BOX.x) / VIEW_BOX.width) * rect.width;
      const restY = rect.top + ((GLASSES_CENTER.y - VIEW_BOX.y) / VIEW_BOX.height) * rect.height;
      const targetX = clampOptionalRange(point.x, point.minX, point.maxX);
      const targetY = point.y - TYPING_GLASSES_OFFSET_Y;
      const svgDx = (targetX - restX) * (VIEW_BOX.width / rect.width);
      const svgDy = (targetY - restY) * (VIEW_BOX.height / rect.height);

      glassesLookTargetX.set(clamp(svgDx, -820, 200));
      glassesLookTargetY.set(clamp(svgDy, -80, 360));
      glassesLookTargetRotate.set(clamp((targetX - restX) / 36, -10, 10));
    },
    [glassesLookTargetX, glassesLookTargetY, glassesLookTargetRotate],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (stateRef.current === "typing" || stateRef.current === "error" || !containerRef.current) {
        return;
      }
      aimGlassesAt({ x: e.clientX, y: e.clientY }, 0.1, 28, 18);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [aimGlassesAt]);

  // Drive glasses to their state-appropriate rest position
  useEffect(() => {
    if (state === "hover") {
      glassesBaseTargetX.set(0);
      glassesBaseTargetY.set(-22);
    } else if (state === "typing") {
      glassesBaseTargetX.set(0);
      glassesBaseTargetY.set(0);
    } else {
      glassesBaseTargetX.set(0);
      glassesBaseTargetY.set(0);
    }
  }, [state, glassesBaseTargetX, glassesBaseTargetY]);

  // Track the text-insertion cursor position while typing
  useEffect(() => {
    if (
      (state !== "typing" && state !== "error") ||
      typingCursorPoint == null ||
      !containerRef.current
    ) {
      return;
    }
    placeGlassesAboveCaret(typingCursorPoint);
  }, [typingCursorPoint, state, placeGlassesAboveCaret]);

  useEffect(() => {
    if ((state === "typing" || state === "error") && typingCursorPoint != null) return;
    glassesLookTargetX.set(0);
    glassesLookTargetY.set(0);
    glassesLookTargetRotate.set(0);
  }, [state, typingCursorPoint, glassesLookTargetX, glassesLookTargetY, glassesLookTargetRotate]);

  const isSuccess = state === "success";
  const isHover = state === "hover";
  const isError = state === "error";
  const showErrorCue = isError || isErrorReacting;

  // Main body Y motion (idle keeps the body still — glasses float independently)
  const bodyY = isSuccess ? [0, -42, -12, -28, 0] : isHover ? [0, -12, 0] : 0;

  const bodyYTransition = isSuccess
    ? { duration: 0.65, times: [0, 0.28, 0.52, 0.74, 1] }
    : isHover
      ? { duration: 0.35 }
      : {};

  // SVG viewBox "60 0 420 560" → aspect = 420:560 = 3:4
  // Display at width=175 → height = 175 * (560/420) ≈ 233
  const W = 175;
  const H = Math.round(W * (560 / 420));

  const sharedSvgProps = {
    viewBox: "60 0 420 560",
    width: W,
    height: H,
    overflow: "visible" as const,
    role: "presentation",
    "aria-hidden": true,
  };

  return (
    <div ref={containerRef} style={{ width: W, height: H, position: "relative" }}>
      {/* Layer 1: click nudge — independent of state, so it works after success too */}
      <motion.div
        animate={{
          y: isClickNudging ? [0, -12, 0] : 0,
          scale: isClickNudging ? [1, 1.03, 1] : 1,
        }}
        transition={{ duration: 0.35 }}
      >
        {/* Layer 2: y float/jump + scale — shared by body AND glasses */}
        <motion.div
          animate={{
            y: isError ? 0 : bodyY,
            scale: isSuccess ? [1, 1.07, 0.96, 1.04, 1] : isHover ? 1.03 : 1,
          }}
          transition={{
            y: bodyYTransition,
            scale: isSuccess
              ? { duration: 0.65, times: [0, 0.28, 0.52, 0.74, 1] }
              : isHover
                ? { duration: 0.2 }
                : {},
          }}
          style={{ originX: "50%", originY: "50%", position: "relative", width: W, height: H }}
        >
          {/* Layer 3a: body x shake on error */}
          <motion.div
            animate={{ x: isErrorReacting ? [0, -8, 8, -6, 6, 0] : 0 }}
            transition={{ x: isErrorReacting ? { duration: 0.45 } : {} }}
            style={{ position: "absolute", inset: 0 }}
          >
            <svg {...sharedSvgProps}>
              <title>PostishAI waitlist robot body</title>
              <g transform="translate(0,591) scale(0.1,-0.1)">
                <path
                  fill={ORANGE}
                  d="M1081 4790 c1 -326 5 -368 44 -506 50 -173 128 -304 260 -440 143
-146 317 -240 540 -290 17 -4 205 -9 419 -11 l389 -5 -216 214 c-202 200 -217
216 -231 267 -59 205 71 381 282 384 66 1 145 -23 191 -57 29 -22 488 -465
798 -771 119 -117 122 -122 143 -193 16 -54 21 -86 16 -120 -13 -98 -43 -137
-274 -358 -119 -115 -271 -261 -337 -324 -66 -64 -149 -143 -185 -175 -36 -33
-99 -92 -140 -132 -137 -131 -255 -160 -390 -97 -122 58 -175 139 -175 270 0
118 25 159 195 317 74 70 180 169 235 221 l100 95 -368 1 c-379 0 -457 -6
-582 -42 -349 -101 -595 -369 -688 -748 -20 -81 -21 -116 -24 -787 l-4 -703
651 0 650 0 0 330 0 330 358 0 c367 0 462 6 641 41 695 137 1232 636 1406
1307 41 155 68 397 60 537 -29 537 -234 963 -623 1297 -243 209 -541 350 -872
413 -47 9 -94 19 -105 22 -11 4 -503 9 -1093 12 l-1073 6 2 -305z"
                />
                <path
                  fill="#242323"
                  d="M2473 4386 c-142 -47 -222 -180 -193 -323 7 -32 18 -69 25 -83 7 -14
149 -160 315 -325 166 -165 308 -312 316 -327 9 -18 11 -34 5 -50 -10 -25
-134 -148 -464 -458 -236 -222 -260 -256 -261 -364 -1 -128 52 -213 166 -270
82 -41 151 -47 236 -20 62 20 99 50 327 267 338 321 600 572 658 630 106 105
135 218 89 337 -25 64 -109 150 -862 878 -36 34 -87 73 -115 87 -63 31 -180
42 -242 21z"
                />
              </g>
            </svg>
          </motion.div>

          {/* Layer 3b: glasses — sibling to shake layer, so no horizontal tremor */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <svg {...sharedSvgProps}>
              <title>PostishAI waitlist robot glasses</title>
              <motion.g style={{ x: springGlassesBaseX, y: springGlassesBaseY }}>
                <motion.g
                  style={{
                    x: springGlassesLookX,
                    y: springGlassesLookY,
                    rotate: springGlassesLookRotate,
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                >
                  <motion.g
                    animate={{
                      y: showErrorCue ? [0, 10, 6] : state === "idle" ? [0, -12, 0] : 0,
                    }}
                    transition={
                      showErrorCue
                        ? { duration: 0.35, ease: "easeOut" as const }
                        : state === "idle"
                          ? { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const }
                          : { duration: 0.3, ease: "easeOut" as const }
                    }
                  >
                    <image
                      href="/static/glasses.png"
                      x="165"
                      y="100"
                      width="340"
                      height="76"
                      style={{ mixBlendMode: "multiply" }}
                    />
                  </motion.g>
                </motion.g>
              </motion.g>

              <AnimatePresence>
                {showErrorCue && (
                  <motion.g
                    key="error-cue"
                    initial={{ opacity: 0, scale: 0.7, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7, y: 8 }}
                    transition={{ duration: 0.18 }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  >
                    <motion.circle
                      cx="118"
                      cy="118"
                      r="24"
                      fill="#ef4444"
                      animate={{ scale: isErrorReacting ? [1, 1.12, 1] : 1 }}
                      transition={{ duration: 0.35 }}
                    />
                    <path d="M118 103v20" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
                    <circle cx="118" cy="133" r="4" fill="#fff" />
                  </motion.g>
                )}
                {isSuccess && (
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.circle
                      cx="115"
                      cy="105"
                      r="6"
                      fill={ORANGE}
                      animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
                      style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    />
                    <motion.circle
                      cx="430"
                      cy="90"
                      r="6"
                      fill={ORANGE}
                      animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
                      transition={{
                        duration: 0.8,
                        delay: 0.25,
                        repeat: Infinity,
                        repeatDelay: 0.5,
                      }}
                      style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    />
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
