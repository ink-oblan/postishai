import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { Suspense } from "react";
import "./globals.css";
import { PostHogInit, PostHogPageView } from "@/components/PostHogProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { AppConfigProvider } from "@/lib/app-config-context";
import { config } from "@/lib/config";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PostishAI",
  description: "AI-powered social media content creation",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();

  return (
    <html lang="en" className={`${plusJakarta.variable} h-full`} suppressHydrationWarning>
      <body className="h-full bg-background text-foreground">
        <AppConfigProvider
          config={{
            selfDeployment: config.selfDeployment,
            posthogProjectToken: config.posthog.projectToken,
            posthogHost: config.posthog.host,
          }}
        >
          <ThemeProvider>
            <PostHogInit />
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            {children}
            <Toaster />
          </ThemeProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}
