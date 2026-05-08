"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Rocket, Users, Video, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const scrollReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.9 },
  viewport: { once: true, margin: "-80px" },
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  viewport: { once: true, margin: "-80px" },
};

const itemReveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8 },
};

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-white">
      {/* Navigation */}
      <motion.nav
        className="fixed top-0 right-0 left-0 z-50 border-orange-100 border-b bg-white/80 backdrop-blur-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-end">
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
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-8">
            <Link
              href="/login"
              className="text-gray-600 text-sm transition hover:text-gray-900 sm:text-base"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-orange-500 px-4 py-2 text-center font-semibold text-sm text-white leading-tight transition hover:bg-orange-500 hover:shadow-lg sm:px-6 sm:text-base"
            >
              Start for free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white px-6 pt-32 pb-20">
        {/* Refined background with subtle depth */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-orange-100/40 blur-3xl opacity-40" style={{ animation: "float 20s ease-in-out infinite" }} />
          <div className="absolute bottom-20 left-10 h-72 w-72 rounded-full bg-amber-100/30 blur-3xl opacity-30" style={{ animation: "float 25s ease-in-out infinite reverse" }} />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mb-8 font-black leading-tight tracking-tight text-gray-900"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
          >
            <div className="text-4xl sm:text-5xl lg:text-6xl">Marketing content?</div>
            <span className="text-6xl sm:text-7xl lg:text-8xl text-orange-500 underline decoration-2 underline-offset-4">Easy.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
            className="mx-auto mb-12 max-w-2xl text-gray-600 text-lg leading-relaxed sm:text-xl"
          >
            Transform your content workflow. Generate product videos, testimonials, and marketing materials in minutes—powered by AI that feels human.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/app"
              className="group flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-4 font-semibold text-lg text-white transition-all duration-300 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/30"
            >
              Start for free
              <motion.div className="transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </motion.div>
            </Link>
            <button
              type="button"
              className="rounded-lg border-2 border-gray-300 px-8 py-4 font-semibold text-gray-700 text-lg transition-all hover:border-gray-400 hover:bg-gray-50"
            >
              Watch Demo
            </button>
          </motion.div>

          {/* Animated metrics */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35 }}
            className="mt-20 grid grid-cols-3 gap-4 border-gray-200 border-t pt-12 sm:gap-8"
          >
            {[
              { label: "Videos Generated", value: "50K+" },
              { label: "Faster Creation", value: "10x" },
              { label: "Cost Saved", value: "90%" },
            ].map((stat) => (
              <div key={stat.label} className="min-w-0">
                <div className="whitespace-nowrap font-black text-orange-500 text-[1.65rem] leading-none sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-gray-500 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...scrollReveal} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
            >
              Everything You Need
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600 text-lg">
              Production-grade tools designed to scale your content operation
            </p>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: "-80px" }}
          >
            {[
              {
                icon: <Video className="h-7 w-7" />,
                title: "AI Video Generation",
                desc: "Create stunning product videos with realistic avatars and voices in minutes",
              },
              {
                icon: <Users className="h-7 w-7" />,
                title: "User-Generated Content",
                desc: "Collect and amplify authentic testimonials from your customers",
              },
              {
                icon: <Zap className="h-7 w-7" />,
                title: "Lightning Fast",
                desc: "Generate content in minutes, not weeks. Iterate endlessly.",
              },
              {
                icon: <BarChart3 className="h-7 w-7" />,
                title: "Analytics Dashboard",
                desc: "Track performance metrics and optimize your content strategy",
              },
              {
                icon: <Rocket className="h-7 w-7" />,
                title: "Scalable Infrastructure",
                desc: "Generate hundreds of variations without limits",
              },
              {
                icon: <CheckCircle2 className="h-7 w-7" />,
                title: "Quality Control",
                desc: "Built-in approval workflows and content management",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemReveal}
                className="group rounded-2xl border border-gray-200 bg-gray-50 p-8 transition-all duration-300 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-500 transition-transform group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="mb-3 font-bold text-gray-900 text-lg">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...scrollReveal} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
            >
              Three Steps to Success
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600 text-lg">
              Streamlined process from concept to publication
            </p>
          </motion.div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connection lines */}
            <div className="absolute top-1/4 right-0 left-0 hidden h-1 bg-gradient-to-r from-transparent via-orange-300 to-transparent md:block" />

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
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, delay: idx * 0.15 }}
                className="relative"
              >
                <div className="text-center">
                  <div className="mb-4 font-black text-orange-500 text-6xl">
                    {step.number}
                  </div>
                  <h3 className="mb-3 font-bold text-xl text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...scrollReveal} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
            >
              Trusted by Creators
            </h2>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: "-80px" }}
          >
            {[
              {
                quote: "Postishai cut our video production time from weeks to days. Game changer.",
                author: "Sarah Chen",
                role: "Marketing Director",
              },
              {
                quote:
                  "The quality is indistinguishable from professional production. Our team loves it.",
                author: "Marcus Rodriguez",
                role: "Content Lead",
              },
              {
                quote:
                  "We increased our UGC output by 10x while reducing costs. Best investment ever.",
                author: "Emily Watson",
                role: "E-commerce Manager",
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.author}
                variants={itemReveal}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-1">
                  {["one", "two", "three", "four", "five"].map((star) => (
                    <span key={star} className="text-orange-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="mb-6 text-gray-700 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-24">
        <div className="absolute inset-0 overflow-hidden opacity-5">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center text-white">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9 }}
            className="mb-6 font-black text-5xl leading-tight sm:text-6xl"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}
          >
            Ready to Transform Your Content?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
            className="mb-10 text-lg opacity-95"
          >
            Join hundreds of brands creating production-grade content at scale. No credit card required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="flex flex-col justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/app"
              className="group flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 font-semibold text-lg text-orange-500 transition-all duration-300 hover:shadow-xl hover:shadow-black/20"
            >
              Start for free
              <motion.div className="transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </motion.div>
            </Link>
            <button
              type="button"
              className="rounded-lg border-2 border-white px-8 py-4 font-semibold text-lg text-white transition-all hover:bg-white/15"
            >
              Schedule Demo
            </button>
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
