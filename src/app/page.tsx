"use client";

import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Megaphone, Rocket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const scrollReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.9 },
  viewport: { once: true },
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
          <Link href="/" className="flex min-w-0 items-end">
            <Image
              src="/logo.svg"
              alt="Postishai"
              width={40}
              height={40}
              className="h-8 w-8 sm:h-10 sm:w-10"
              loading="eager"
            />
            <span className="-mb-0.2 truncate font-bold text-gray-900 text-lg sm:text-xl">
              ostishAI
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-8">
            <Link
              href="/login"
              className="text-gray-600 text-sm transition hover:text-gray-900 sm:text-base"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-center font-semibold text-sm text-white leading-tight transition hover:bg-primary hover:shadow-lg sm:px-6 sm:text-base"
            >
              Start for free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-background px-6">
        {/* Refined background with subtle depth */}
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
            className="mx-auto mb-12 max-w-2xl text-gray-600 text-lg leading-relaxed sm:text-xl"
          >
            Transform your content workflow. Generate product videos, testimonials, and marketing
            materials in minutes—powered by AI that feels human.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-4 font-semibold text-lg text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-primary/30 hover:shadow-xl"
            >
              Start for free
              <motion.div className="transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </motion.div>
            </Link>
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
            Made for founders.
            <br />
            <span className="text-primary">Made for creators.</span>
          </motion.h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                Icon: Megaphone,
                label: "Social Sellers",
                title: "Turn products into scroll-stopping videos",
                desc: "Go from product idea to polished video in minutes — ready to post on Instagram, TikTok, and LinkedIn without a studio or crew.",
                iconBg: "bg-orange-100",
                iconColor: "text-orange-500",
                labelColor: "text-orange-500",
              },
              {
                Icon: Rocket,
                label: "Bootstrap Teams",
                title: "Marketing muscle without the headcount",
                desc: "Small teams move fast. PostishAI moves faster — generate a week's worth of content in an afternoon, without hiring a single contractor.",
                iconBg: "bg-blue-100",
                iconColor: "text-blue-500",
                labelColor: "text-blue-500",
              },
              {
                Icon: Briefcase,
                label: "Solopreneurs",
                title: "Professional content on a founder's budget",
                desc: "You wear every hat. Let AI handle the marketing hat. Create polished video content without an agency, a studio, or a big budget.",
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
                labelColor: "text-emerald-600",
              },
            ].map(({ Icon, label, title, desc, iconBg, iconColor, labelColor }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: idx * 0.15 }}
                className="group relative rounded-2xl border border-orange-100 bg-background p-8 transition-all duration-300 hover:shadow-lg"
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
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative flex min-h-screen items-center bg-background px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...scrollReveal} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              Three Steps to Success
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600 text-lg">
              Streamlined process from concept to publication
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Define Your Content",
                desc: "Specify your product, script, and target audience. Our AI understands your vision.",
              },
              {
                number: "02",
                title: "Generate & Customize",
                desc: "Watch as AI creates variations instantly. Edit avatars, voices, and scripts easily.",
              },
              {
                number: "03",
                title: "Publish & Measure",
                desc: "Share across channels. Track performance and iterate based on real data.",
              },
            ].map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: idx * 0.15 }}
                className="relative"
              >
                <div className="text-center">
                  <div className="mb-4 font-black text-6xl text-primary">{step.number}</div>
                  <h3 className="mb-3 font-bold text-gray-900 text-xl">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-primary to-primary/90 px-6 py-24">
        <div className="absolute inset-0 overflow-hidden opacity-5">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center text-white">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="mb-6 font-black text-5xl leading-tight sm:text-6xl"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Ready to Transform Your Content?
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="flex flex-col justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="group flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 font-semibold text-lg text-primary transition-all duration-300 hover:shadow-black/20 hover:shadow-xl"
            >
              Start for free
              <motion.div className="transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 px-6 py-12 text-gray-400">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-end gap-0">
                <Image src="/logo.svg" alt="Postishai" width={24} height={24} loading="eager" />
                <span className="-mb-0.5 font-bold text-lg text-white">ostishAI</span>
              </div>
              <p className="text-sm">AI-powered content automation for the modern marketer.</p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "Security"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers"],
              },
              {
                title: "Resources",
                links: ["Docs", "API", "Community"],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="mb-4 font-semibold text-white">{section.title}</h4>
                <ul className="space-y-2 text-sm">
                  {section.links.map((link) => (
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
            ))}
          </div>

          <div className="flex flex-col items-center justify-between border-gray-800 border-t pt-8 text-sm sm:flex-row">
            <p>&copy; 2026 Postishai. All rights reserved.</p>
            <div className="mt-4 flex gap-6 sm:mt-0">
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
