import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingFooter } from "@/components/layout/landing-footer";
import { GithubIcon } from "@/components/ui/github-icon";

export const metadata: Metadata = {
  title: "Terms of Service — PostishAI",
  description: "Terms governing your use of PostishAI.",
};

export default function TermsPage() {
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
        <div className="mb-12">
          <p className="mb-3 font-semibold text-primary text-xs uppercase tracking-widest">Legal</p>
          <h1
            className="mb-4 font-black text-4xl text-gray-900 leading-tight sm:text-5xl"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "-0.02em" }}
          >
            Terms of Service
          </h1>
          <p className="text-gray-500 text-sm">Effective date: July 10, 2026</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <p className="mb-10 text-gray-600 text-lg leading-relaxed">
            These terms govern your use of PostishAI. By creating an account, you agree to them. If
            you do not agree, do not use the service.
          </p>

          <Section title="1. Overview">
            <p>
              PostishAI is an AI-powered social media content creation platform. It lets you
              generate avatar videos, write scripts, produce captions, and manage social media
              content using AI — all from one place.
            </p>
            <p>
              PostishAI is currently in early access. Features, pricing, and availability may change
              as the product evolves.
            </p>
          </Section>

          <Section title="2. Accounts">
            <p>
              You must create an account to use PostishAI. You sign in via Google OAuth — we receive
              your email, name, and profile photo from Google.
            </p>
            <p>
              You are responsible for all activity that occurs under your account. Do not share your
              credentials or allow others to access your account.
            </p>
            <p>
              Access is currently invite-only and subject to approval. We reserve the right to deny
              or revoke access at our discretion.
            </p>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You agree not to use PostishAI to:</p>
            <ul>
              <li>Generate content that is illegal, abusive, defamatory, or harassing</li>
              <li>Impersonate individuals or organizations without authorization</li>
              <li>Violate the intellectual property rights of others</li>
              <li>Attempt to reverse-engineer, scrape, or disrupt the service</li>
              <li>
                Violate the terms of any third-party service used to generate your content (e.g.
                HeyGen, Google AI)
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these rules without
              notice.
            </p>
          </Section>

          <Section title="4. Your Content">
            <p>
              You retain ownership of all content you upload and create on PostishAI. By using the
              service, you grant us a limited license to store and process your content solely to
              provide the service to you.
            </p>
            <p>
              You are solely responsible for the content you create and distribute. You represent
              that you have the rights to use any materials you upload (photos, videos, scripts).
            </p>
          </Section>

          <Section title="5. AI-Generated Content">
            <p>
              PostishAI uses third-party AI services to generate videos, scripts, and captions.
              AI-generated content may occasionally be inaccurate, inappropriate, or inconsistent.
              You are responsible for reviewing content before publishing it.
            </p>
            <p>
              We make no guarantees about the accuracy, quality, or fitness for purpose of
              AI-generated output.
            </p>
          </Section>

          <Section title="6. Subscriptions and Billing">
            <p>
              PostishAI is currently invite-only. When paid plans are introduced, we will notify you
              in advance with pricing details.
            </p>
            <p>
              Subscription terms, refund policies, and plan limits will be described at the time
              paid plans are launched.
            </p>
          </Section>

          <Section title="7. Service Availability">
            <p>
              We aim to keep PostishAI available at all times, but we do not guarantee uninterrupted
              access. We may temporarily suspend the service for maintenance, updates, or
              circumstances beyond our control.
            </p>
            <p>
              We are not liable for any loss or inconvenience caused by downtime or service
              interruptions.
            </p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              PostishAI (the platform) and its underlying code are owned by us and are made
              available under the{" "}
              <a
                href="https://github.com/ink-oblan/postishai/blob/main/LICENSE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sustainable Use License
              </a>
              . This license permits personal and non-commercial use only — it does not permit
              commercial use, sublicensing, or redistribution for commercial purposes. It does not
              grant you any rights to use our name, branding, or trademarks.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, PostishAI is provided &quot;as is&quot;
              without warranties of any kind. We are not liable for indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>
              We may update these terms from time to time. We will notify you of material changes by
              email. Continued use of the service after changes take effect constitutes acceptance
              of the updated terms.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              If you have questions about these terms, contact us at{" "}
              <a href="mailto:support@postishai.com" className="text-primary hover:underline">
                support@postishai.com
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-bold text-gray-900 text-xl">{title}</h2>
      <div className="space-y-3 text-base text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}
