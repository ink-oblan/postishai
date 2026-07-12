import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingFooter } from "@/components/layout/landing-footer";
import { GithubIcon } from "@/components/ui/github-icon";

export const metadata: Metadata = {
  title: "About — PostishAI",
  description: "Meet the team behind PostishAI and learn about our values.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-orange-100 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <Link href="/">
            <Image
              src="/static/full-logo.svg"
              alt="PostishAI"
              width={188}
              height={63}
              className="h-9 w-auto"
            />
          </Link>
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
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <div className="mb-16">
          <p className="mb-3 font-semibold text-primary text-xs uppercase tracking-widest">About</p>
          <h1
            className="mb-4 font-black text-4xl text-gray-900 leading-tight sm:text-5xl"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "-0.02em" }}
          >
            PostishAI
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            PostishAI is an AI-powered platform for content creation — built with one conviction:
            the tools behind great marketing should be simple and open.
          </p>
        </div>

        {/* Team */}
        <section className="mb-16">
          <h2 className="mb-8 font-bold text-2xl text-gray-900">The team</h2>
          <div className="grid items-start gap-6 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <div className="aspect-[3/4] overflow-hidden">
                {/* biome-ignore lint/performance/noImgElement: Direct asset avoids stale optimized image cache and preserves photo quality. */}
                <img
                  src="/static/team-nikita.webp"
                  alt="Nikita Holban"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="p-5">
                <p className="mb-1 font-semibold text-gray-900 text-lg">Nikita Holban</p>
                <p className="text-gray-500 text-sm">Founder</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <div className="aspect-[3/4] overflow-hidden">
                {/* biome-ignore lint/performance/noImgElement: Direct asset avoids stale optimized image cache and preserves photo quality. */}
                <img
                  src="/static/team-julia.webp"
                  alt="Julia Tarasenko"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="p-5">
                <p className="mb-1 font-semibold text-gray-900 text-lg">Julia Tarasenko</p>
                <p className="text-gray-500 text-sm">Founding team member</p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="mb-8 font-bold text-2xl text-gray-900">Our values</h2>
          <div className="space-y-8">
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">Free to learn</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Our platform has open code. Anyone can read it, study it, and apply the ideas to
                their own projects — contributing back to the broader AI industry in the process. We
                believe transparency makes the whole ecosystem stronger.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">Simplify marketing</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Marketing shouldn&apos;t require a team of specialists or hours of production work.
                We&apos;re building tools that let anyone create compelling content quickly — so
                great ideas can reach the right audiences without friction.
              </p>
            </div>
          </div>
        </section>

        <div className="border-gray-100 border-t pt-10 text-gray-500 text-sm">
          Questions?{" "}
          <a href="mailto:support@postishai.com" className="text-primary hover:underline">
            Get in touch
          </a>
          .
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
