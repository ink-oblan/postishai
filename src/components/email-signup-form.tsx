"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { normalizeWaitlistEmail, waitlistEmailPattern } from "@/lib/waitlist";
import type { RobotState, ViewportPoint } from "./waitlist-robot";
import { SuccessParticles, WaitlistRobot } from "./waitlist-robot";

type EmailSignupFormProps = {
  variant?: "light" | "dark";
  label?: string;
};

type SignupStatus = "idle" | "loading" | "success" | "already" | "invalid" | "error";

export function EmailSignupForm({ variant = "light", label = "Notify me" }: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SignupStatus>("idle");
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [robotNudgeKey, setRobotNudgeKey] = useState(0);
  const [robotErrorKey, setRobotErrorKey] = useState(0);
  const [typingCursorPoint, setTypingCursorPoint] = useState<ViewportPoint | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current || email.length === 0) {
      setTypingCursorPoint(null);
      return;
    }

    const el = inputRef.current;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    const textWidth = ctx.measureText(email).width;
    const cursorX = rect.left + (parseFloat(style.paddingLeft) || 0) + textWidth;
    const glassesHalfWidth = 72;

    setTypingCursorPoint({
      x: cursorX,
      y: rect.top + rect.height / 2,
      minX: rect.left + glassesHalfWidth,
      maxX: rect.right - glassesHalfWidth,
    });
  }, [email]);

  const robotState: RobotState =
    status === "success" || status === "already"
      ? "success"
      : status === "error" || status === "invalid"
        ? "error"
        : status === "loading"
          ? "loading"
          : email.length > 0
            ? "typing"
            : isHovered || isInputFocused
              ? "hover"
              : "idle";

  const normalizedEmail = normalizeWaitlistEmail(email);
  const showInvalidEmail = status === "invalid";
  const inputErrorId = `${variant}-waitlist-email-error`;
  const inputStatusId = `${variant}-waitlist-email-status`;
  const isComplete = status === "success" || status === "already";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!waitlistEmailPattern.test(normalizedEmail)) {
      setStatus("invalid");
      setRobotErrorKey((key) => key + 1);
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (res.ok) {
        const data = (await res.json()) as { alreadyRegistered?: boolean };
        setStatus(data.alreadyRegistered ? "already" : "success");
        setEmail("");
      } else {
        setStatus("error");
        setRobotErrorKey((key) => key + 1);
      }
    } catch {
      setStatus("error");
      setRobotErrorKey((key) => key + 1);
    }
  }

  function handleEmailChange(nextEmail: string) {
    setEmail(nextEmail);

    if (status === "invalid" || status === "error") {
      setStatus("idle");
    }
  }

  function handleInputBlur() {
    setIsInputFocused(false);

    if (normalizedEmail.length > 0 && !waitlistEmailPattern.test(normalizedEmail)) {
      setStatus("invalid");
      setRobotErrorKey((key) => key + 1);
    }
  }

  function handleRobotClick() {
    setRobotNudgeKey((key) => key + 1);

    if (!isComplete) {
      inputRef.current?.focus();
    }
  }

  const inputClass =
    variant === "dark"
      ? "w-full rounded-lg border border-white/30 bg-white/10 px-4 py-4 text-white placeholder-white/50 outline-none backdrop-blur-sm focus:border-white/60 focus:ring-2 focus:ring-white/20 sm:w-72"
      : "w-full rounded-lg border border-orange-200 bg-white px-4 py-4 text-gray-900 placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-72";

  const invalidInputClass =
    variant === "dark"
      ? "border-red-300/80 bg-red-500/10 focus:border-red-200 focus:ring-red-200/30"
      : "border-red-400 bg-red-50/80 focus:border-red-500 focus:ring-red-200";

  const buttonClass =
    variant === "dark"
      ? "group flex shrink-0 items-center gap-2 rounded-lg bg-white px-6 py-4 font-semibold text-lg text-primary transition-all duration-300 hover:shadow-black/20 hover:shadow-xl disabled:opacity-60"
      : "group flex shrink-0 items-center gap-2 rounded-lg bg-primary px-6 py-4 font-semibold text-lg text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-primary/30 hover:shadow-xl disabled:opacity-60";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <button
        type="button"
        aria-label={isComplete ? "Animate waitlist robot" : "Focus email field"}
        className="relative cursor-pointer border-0 bg-transparent p-0"
        style={{ width: 175, height: 233 }}
        onClick={handleRobotClick}
      >
        <WaitlistRobot
          state={robotState}
          nudgeKey={robotNudgeKey}
          errorKey={robotErrorKey}
          typingCursorPoint={typingCursorPoint}
        />
        {isComplete && <SuccessParticles key={status} />}
      </button>

      <div className="flex min-h-[80px] w-full items-center justify-center">
        {isComplete ? (
          <motion.p
            key="success"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`text-center font-semibold text-lg ${variant === "dark" ? "text-white/90" : "text-primary"}`}
          >
            {status === "already"
              ? "You're already on the list - we'll be in touch!"
              : "You're on the list! We'll notify you when we launch."}
          </motion.p>
        ) : (
          <div className="w-full">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row"
              noValidate
            >
              <input
                ref={inputRef}
                type="email"
                required
                value={email}
                aria-invalid={showInvalidEmail}
                aria-describedby={
                  showInvalidEmail ? inputErrorId : status === "error" ? inputStatusId : undefined
                }
                onChange={(e) => handleEmailChange(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={handleInputBlur}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                placeholder="Enter your email"
                className={`${inputClass} ${showInvalidEmail ? invalidInputClass : ""}`}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={buttonClass}
              >
                {status === "loading" ? "Sending..." : label}
                {status !== "loading" && (
                  <motion.div className="transition-transform group-hover:translate-x-1">
                    <ArrowRight size={20} />
                  </motion.div>
                )}
              </button>
            </form>
            <div className="mt-2 h-5">
              <AnimatePresence mode="wait">
                {showInvalidEmail ? (
                  <motion.p
                    id={inputErrorId}
                    key="invalid-email"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`text-center font-medium text-sm ${variant === "dark" ? "text-red-200" : "text-red-600"}`}
                  >
                    Please enter a valid email address.
                  </motion.p>
                ) : status === "error" ? (
                  <motion.p
                    id={inputStatusId}
                    key="submit-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`text-center text-sm ${variant === "dark" ? "text-red-300" : "text-red-500"}`}
                  >
                    Something went wrong. Please try again.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
