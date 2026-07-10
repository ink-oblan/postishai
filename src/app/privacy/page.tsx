import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingFooter } from "@/components/layout/landing-footer";
import { GithubIcon } from "@/components/ui/github-icon";

export const metadata: Metadata = {
  title: "Privacy Policy — PostishAI",
  description: "How PostishAI collects, uses, and protects your information.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm">Effective date: July 10, 2026</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <p className="mb-10 text-gray-600 text-lg leading-relaxed">
            PostishAI values your privacy. This policy explains what information we collect, how we
            use it, and how we keep it safe.
          </p>

          <Section title="1. Information We Collect">
            <p>
              <strong>Account data.</strong> When you sign in with Google, we receive your email
              address, name, and profile photo from Google OAuth. We store this to create and manage
              your account.
            </p>
            <p>
              <strong>Content you create.</strong> We store the posts, scripts, captions, avatar
              configurations, and generated videos you create on PostishAI so you can access them
              later.
            </p>
            <p>
              <strong>Usage data.</strong> We collect basic information about how you use the
              platform (pages visited, features used, errors encountered) to improve the service.
            </p>
            <p>
              <strong>Communications.</strong> If you contact us by email or join our waitlist, we
              store your email address and the content of your message.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>Provide, operate, and maintain your PostishAI account</li>
              <li>Generate AI-powered content on your behalf using third-party AI services</li>
              <li>Send you account-related emails (approval, billing, important updates)</li>
              <li>Send waitlist notifications if you signed up for early access</li>
              <li>Improve and debug the platform based on usage patterns</li>
              <li>Respond to your support requests</li>
            </ul>
            <p>We do not use your data for advertising or sell it to third parties.</p>
          </Section>

          <Section title="3. Third-Party AI Services">
            <p>
              PostishAI sends content to third-party AI providers to fulfill your requests. This
              includes:
            </p>
            <ul>
              <li>
                <strong>HeyGen</strong> — for avatar video generation. Your scripts and avatar
                configurations are transmitted to HeyGen to produce videos.
              </li>
              <li>
                <strong>Google AI (Gemini)</strong> — for script and caption generation, and for
                AI-powered image generation used in avatar variations. Text prompts, context, and
                uploaded images you provide may be transmitted to Google&apos;s AI models.
              </li>
            </ul>
            <p>
              These providers process data under their own privacy policies and terms. We do not
              control how they handle data once transmitted. We recommend reviewing their policies
              if you have concerns about sensitive content.
            </p>
          </Section>

          <Section title="4. Content Ownership">
            <p>
              You retain ownership of the content you upload and create on PostishAI. We do not
              claim any intellectual property rights over your content. We do not use your generated
              content to train AI models.
            </p>
          </Section>

          <Section title="5. Data Sharing">
            <p>
              We do not sell, trade, or share your personal data with third parties except in the
              following cases:
            </p>
            <ul>
              <li>
                <strong>Service providers</strong> — infrastructure, hosting, and analytics tools
                necessary to operate the platform
              </li>
              <li>
                <strong>Legal compliance</strong> — when required by law or to protect the rights,
                property, or safety of PostishAI or its users
              </li>
            </ul>
          </Section>

          <Section title="6. Cookies">
            <p>
              We use a session cookie to keep you logged in. This cookie is essential for the
              service to function and does not track you across other websites. We do not use
              third-party tracking or advertising cookies.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We use industry-standard measures to protect your data, including encrypted
              connections (HTTPS) and secure session management.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>You can at any time:</p>
            <ul>
              <li>Request a copy of the data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@postishai.com" className="text-primary hover:underline">
                support@postishai.com
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you request
              deletion, we will remove your personal data within 30 days. Generated content (videos,
              scripts, captions) is deleted along with your account. Backups may retain data for up
              to 90 days after deletion.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this policy from time to time. We will notify you of material changes by
              email. Continued use of the service after changes take effect constitutes acceptance
              of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              If you have questions about this privacy policy, contact us at{" "}
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
