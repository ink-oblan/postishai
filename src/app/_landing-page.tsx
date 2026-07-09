"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Briefcase, Check, Clock, Megaphone, Rocket } from "lucide-react";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import { EmailSignupForm } from "@/components/email-signup-form";
import { GithubIcon } from "@/components/ui/github-icon";

const scrollReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.9 },
  viewport: { once: true },
};

const audienceCards: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const audienceCard: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-background">
      {/* Navigation */}
      <motion.nav
        className="fixed top-0 right-0 left-0 z-50 border-orange-100 border-b bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <Image
            src="/static/full-logo.svg"
            alt="PostishAI"
            width={188}
            height={63}
            className="h-9 w-auto sm:h-9"
          />
          <div className="flex shrink-0 items-center gap-3 sm:gap-8">
            <a
              href="https://github.com/ink-oblan/postishai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground text-sm transition hover:text-foreground"
            >
              <GithubIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Source available</span>
            </a>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-background px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-100/40 opacity-40 blur-3xl"
            style={{ animation: "float 20s ease-in-out infinite" }}
          />
          <div
            className="absolute bottom-20 left-10 h-72 w-72 rounded-full bg-amber-100/30 opacity-30 blur-3xl"
            style={{ animation: "float 25s ease-in-out infinite reverse" }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mb-8 font-black text-gray-900 leading-tight tracking-tight"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            <div className="text-4xl sm:text-5xl lg:text-6xl">Social media marketing?</div>
            <span className="text-6xl text-primary underline decoration-2 underline-offset-4 sm:text-7xl lg:text-8xl">
              Easy.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
            className="mx-auto mb-4 max-w-2xl font-semibold text-gray-900 text-xl leading-snug sm:text-2xl"
          >
            Create AI-powered social media content in minutes
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mx-auto mb-12 max-w-2xl text-gray-600 text-lg leading-relaxed sm:text-xl"
          >
            Generate posts, videos, captions for social networks — without hiring a marketing team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <p className="text-gray-500 text-sm">
              We&apos;re rolling out to early users. Get notified when it&apos;s your turn.
            </p>
            <EmailSignupForm variant="light" label="Notify me" />
          </motion.div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="relative flex min-h-screen items-center bg-sidebar px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...scrollReveal} className="mb-5 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-primary/40" />
            <span className="font-semibold text-primary text-xs uppercase tracking-widest">
              Who it&apos;s for
            </span>
            <span className="h-px w-12 bg-primary/40" />
          </motion.div>
          <motion.h2
            {...scrollReveal}
            className="mb-16 text-center font-black text-5xl text-gray-900 sm:text-6xl"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Built for small teams.
            <br />
            <span className="text-primary">Open for builders.</span>
          </motion.h2>

          <motion.div
            className="grid gap-6 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={audienceCards}
          >
            {[
              {
                Icon: Rocket,
                label: "Startups & Solo Founders",
                title: "Marketing output without the marketing team",
                desc: "Move fast and stay visible. Generate polished social content in minutes — without hiring an agency or a contractor.",
                iconBg: "bg-orange-100",
                iconColor: "text-orange-500",
                labelColor: "text-orange-500",
              },
              {
                Icon: Briefcase,
                label: "Small & Medium Businesses",
                title: "Consistent presence on every channel",
                desc: "Stay active on Instagram, TikTok, and LinkedIn without a dedicated team. Simplify your content workflow and cut production costs.",
                iconBg: "bg-blue-100",
                iconColor: "text-blue-500",
                labelColor: "text-blue-500",
              },
              {
                Icon: Megaphone,
                label: "Developers",
                title: "Self-host it, make it yours",
                desc: "PostishAI is source-available. Run it on your own infrastructure, customize it for your use case, and keep full control of your data.",
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
                labelColor: "text-emerald-600",
              },
            ].map(({ Icon, label, title, desc, iconBg, iconColor, labelColor }) => (
              <motion.div
                key={label}
                variants={audienceCard}
                className="group relative rounded-2xl border border-orange-100 bg-background p-8 transition-shadow duration-300 hover:shadow-lg"
              >
                <div
                  className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}
                >
                  <Icon className={`h-6 w-6 ${iconColor}`} strokeWidth={1.5} />
                </div>
                <p className={`mb-2 font-semibold text-xs uppercase tracking-widest ${labelColor}`}>
                  {label}
                </p>
                <h3 className="mb-3 font-bold text-gray-900 text-xl leading-tight">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="relative bg-sidebar px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div {...scrollReveal} className="mb-16 text-center">
            <h2
              className="font-black text-5xl text-gray-900 sm:text-6xl"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              What changes for you
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                headline: "Post every day without burning out",
                desc: "AI writes the script and generates captions. You just download and post.",
              },
              {
                headline: "Pro-looking content on a lean budget",
                desc: "Professional avatar videos and captions — no crew, no studio, no agency.",
              },
              {
                headline: "One workflow, every platform",
                desc: "From script to published post on Instagram, TikTok, and YouTube in minutes.",
              },
              {
                headline: "Content that actually looks like you",
                desc: "Upload your own avatar and generate videos in your likeness — not a generic AI face.",
              },
            ].map(({ headline, desc }, i) => (
              <motion.div
                key={headline}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.09 }}
                className="rounded-2xl border border-orange-100 bg-background p-8 transition-all duration-300 hover:border-orange-200 hover:shadow-md"
              >
                <div className="mb-2 h-1 w-8 rounded-full bg-primary" />
                <h3 className="mb-2 font-black text-gray-900 text-xl leading-snug">{headline}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-background px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div {...scrollReveal} className="mb-16 text-center">
            <h2
              className="font-black text-5xl text-gray-900 sm:text-6xl"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              What&apos;s on the platform
            </h2>
          </motion.div>

          {/* Live now */}
          <div className="mb-14">
            <motion.div {...scrollReveal} className="mb-7 flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-700 text-xs uppercase tracking-widest">
                  Live now
                </span>
              </div>
              <div className="h-px flex-1 bg-gray-100" />
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Avatar video",
                  desc: "Generate from your own transcript or let AI write the script for you",
                },
                {
                  title: "Avatar editor",
                  desc: "Create multiple variations of your avatar for different campaigns",
                },
                {
                  title: "Custom avatar upload",
                  desc: "Bring your own avatar and train the model on your likeness",
                },
                {
                  title: "Caption generation",
                  desc: "Auto-generate captions from any video or photo you upload",
                },
              ].map(({ title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.09 }}
                  className="rounded-2xl border border-orange-100 bg-white p-6 transition-all duration-300 hover:border-orange-200 hover:shadow-md"
                >
                  <Check className="mb-3 h-5 w-5 text-primary" strokeWidth={2.5} />
                  <h3 className="mb-1 font-bold text-gray-900 text-lg">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Coming soon */}
          <motion.div {...scrollReveal}>
            <div className="mb-7 flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                <Clock className="h-3 w-3 text-amber-600" />
                <span className="font-bold text-amber-700 text-xs uppercase tracking-widest">
                  Coming soon
                </span>
              </div>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Voiceover",
                  desc: "Natural-sounding voiceover in your brand's tone",
                },
                {
                  title: "Carousel",
                  desc: "Multi-slide carousel posts for Instagram and LinkedIn",
                },
                {
                  title: "Branding-aware AI",
                  desc: "Train the AI on your brand guidelines and tone of voice",
                },
                {
                  title: "Direct publishing",
                  desc: "Publish directly to Instagram, TikTok, and YouTube without leaving the app",
                },
                {
                  title: "Calendar scheduling",
                  desc: "Schedule posts in advance and manage your content calendar",
                },
              ].map(({ title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.09 }}
                  className="rounded-2xl border border-gray-200 border-dashed bg-gray-50/50 p-6"
                >
                  <Clock className="mb-3 h-5 w-5 text-amber-400" strokeWidth={1.5} />
                  <h3 className="mb-1 font-bold text-gray-400 text-lg">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-sidebar px-6 py-24">
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="mb-4 font-black text-5xl text-gray-900 leading-tight sm:text-6xl"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Be the first to know.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="mb-10 text-gray-600 text-lg"
          >
            We&apos;re opening up access gradually. Drop your email and we&apos;ll notify you when
            it&apos;s your turn.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="flex justify-center"
          >
            <EmailSignupForm variant="light" label="Get early access" />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 px-6 py-12 text-gray-400">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4">
                <BrandLogo className="text-lg text-white" />
              </div>
              <p className="text-sm">AI-powered content creation.</p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                {["About", "Blog", "Careers"].map((link) => (
                  <li key={link}>
                    <button
                      type="button"
                      className="transition hover:text-white"
                      onClick={() => {}}
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between border-gray-800 border-t pt-8 text-sm sm:flex-row">
            <p>&copy; 2026 Postishai. All rights reserved.</p>
            <div className="mt-4 flex gap-6 sm:mt-0">
              <a
                href="https://github.com/ink-oblan/postishai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <GithubIcon className="h-4 w-4" />
                Source available
              </a>
              <button type="button" className="transition hover:text-white" onClick={() => {}}>
                Privacy
              </button>
              <button type="button" className="transition hover:text-white" onClick={() => {}}>
                Terms
              </button>
              <button type="button" className="transition hover:text-white" onClick={() => {}}>
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
