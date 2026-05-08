"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Rocket, Users, Video, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8 },
  viewport: { once: true, margin: "-100px" },
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  transition: { staggerChildren: 0.1 },
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-end gap-0.5">
            <Image src="/logo.svg" alt="Postishai" width={40} height={40} />
            <span className="-mb-0.2 font-bold text-gray-900 text-xl">ostishAI</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/login" className="text-gray-600 transition hover:text-gray-900">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-2 font-semibold text-white transition hover:shadow-amber-400/30 hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-white px-6 pt-32 pb-20">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute h-96 w-96 rounded-full bg-gradient-to-br from-amber-200/30 to-orange-200/20 blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            style={{ top: "10%", left: "-10%" }}
          />
          <motion.div
            className="absolute h-80 w-80 rounded-full bg-gradient-to-br from-orange-200/20 to-yellow-200/20 blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            style={{ top: "40%", right: "-5%" }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8 inline-block"
          >
            <span className="inline-block rounded-full bg-amber-100 px-4 py-2 font-semibold text-amber-700 text-sm">
              ✨ The Future of Content Creation
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6 font-black text-6xl leading-tight tracking-tight sm:text-7xl lg:text-8xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <span className="block text-gray-900">Generate</span>
            <span className="block bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Content At Scale
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl font-light text-gray-600 text-xl leading-relaxed sm:text-2xl"
          >
            Create authentic product videos, testimonials, and marketing materials powered by AI.
            From concept to delivery in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/app"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-4 font-bold text-lg text-white transition-all duration-300 hover:shadow-2xl hover:shadow-amber-400/40"
            >
              Start Building Free
              <motion.div className="transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </motion.div>
            </Link>
            <button
              type="button"
              className="rounded-xl border-2 border-amber-300 px-8 py-4 font-bold text-amber-700 text-lg transition-all hover:bg-amber-50"
            >
              Watch Demo
            </button>
          </motion.div>

          {/* Animated metrics */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-16 grid grid-cols-3 gap-8 border-amber-200 border-t pt-12"
          >
            {[
              { label: "Videos Generated", value: "50K+" },
              { label: "Faster Creation", value: "10x" },
              { label: "Cost Saved", value: "90%" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text font-bold text-3xl text-transparent sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Everything You Need
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600 text-xl">
              Powerful tools designed to transform your content workflow
            </p>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              {
                icon: <Video className="h-8 w-8" />,
                title: "AI Video Generation",
                desc: "Create stunning product videos with realistic avatars and voices in minutes",
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: "User-Generated Content",
                desc: "Collect and amplify authentic testimonials from your customers",
              },
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Lightning Fast",
                desc: "Generate content in minutes, not weeks. Iterate endlessly.",
              },
              {
                icon: <BarChart3 className="h-8 w-8" />,
                title: "Analytics Dashboard",
                desc: "Track performance metrics and optimize your content strategy",
              },
              {
                icon: <Rocket className="h-8 w-8" />,
                title: "Scalable Infrastructure",
                desc: "Generate hundreds of variations without limits",
              },
              {
                icon: <CheckCircle2 className="h-8 w-8" />,
                title: "Quality Control",
                desc: "Built-in approval workflows and content management",
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="group rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-8 transition-all duration-300 hover:border-amber-300 hover:shadow-amber-200/20 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white transition-transform group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="mb-3 font-bold text-gray-900 text-xl">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative bg-gradient-to-b from-white via-amber-50/30 to-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Three Steps to Success
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600 text-xl">
              Streamlined process from concept to publication
            </p>
          </motion.div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connection lines */}
            <div className="absolute top-1/4 right-0 left-0 hidden h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent md:block" />

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
            ].map((step) => (
              <motion.div
                key={step.number}
                variants={fadeInUp}
                viewport={{ once: true }}
                initial="initial"
                whileInView="whileInView"
                className="relative"
              >
                <div className="text-center">
                  <div className="mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text font-black text-6xl text-transparent">
                    {step.number}
                  </div>
                  <h3 className="mb-3 font-bold text-2xl text-gray-900">{step.title}</h3>
                  <p className="text-gray-600">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeInUp} className="mb-16 text-center">
            <h2
              className="mb-6 font-black text-5xl text-gray-900 sm:text-6xl"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Trusted by Creators
            </h2>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
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
                variants={fadeInUp}
                className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-8"
              >
                <div className="mb-4 flex items-center gap-1">
                  {["one", "two", "three", "four", "five"].map((star) => (
                    <span key={star} className="text-amber-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="mb-6 text-gray-700 italic leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 px-6 py-20">
        <div className="absolute inset-0 opacity-10">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"
            style={{
              backgroundImage:
                'url(\'data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.1"><path d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/></g></g></svg>\')',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-3xl text-center text-white">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-6 font-black text-5xl leading-tight sm:text-6xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Ready to Transform Your Content?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-10 text-xl opacity-95"
          >
            Join hundreds of brands creating content at scale. No credit card required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/app"
              className="group flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-lg text-orange-600 transition-all duration-300 hover:shadow-2xl hover:shadow-black/30"
            >
              Start Free Trial
              <motion.div className="transition-transform group-hover:translate-x-1">
                <ArrowRight size={20} />
              </motion.div>
            </Link>
            <button
              type="button"
              className="rounded-xl border-2 border-white px-8 py-4 font-bold text-lg text-white transition-all hover:bg-white/10"
            >
              Schedule Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-12 text-gray-400">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-end gap-0.5">
                <Image src="/logo.svg" alt="Postishai" width={24} height={24} />
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
