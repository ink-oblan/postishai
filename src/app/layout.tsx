import type { Metadata } from "next";
import {
  DM_Sans,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Lora,
  Montserrat,
  Nunito,
  Open_Sans,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Roboto,
  Space_Mono,
} from "next/font/google";
import { connection } from "next/server";
import { Suspense } from "react";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { PostHogInit, PostHogPageView } from "@/components/PostHogProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsConsentProvider } from "@/lib/analytics-consent";
import { AppConfigProvider } from "@/lib/app-config-context";
import { config } from "@/lib/config";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], display: "swap" });
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], display: "swap" });
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});
const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});
const raleway = Raleway({ variable: "--font-raleway", subsets: ["latin"], display: "swap" });
const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
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
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${ibmPlexSans.variable} ${inter.variable} ${jetbrainsMono.variable} ${lora.variable} ${montserrat.variable} ${nunito.variable} ${openSans.variable} ${playfairDisplay.variable} ${poppins.variable} ${raleway.variable} ${roboto.variable} ${spaceMono.variable} h-full overflow-hidden`}
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden bg-background text-foreground">
        <AppConfigProvider
          config={{
            selfDeployment: config.selfDeployment,
            posthogProjectToken: config.posthog.projectToken,
            posthogHost: config.posthog.host,
          }}
        >
          <ThemeProvider>
            <AnalyticsConsentProvider>
              <PostHogInit />
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              {children}
              <CookieConsent />
              <Toaster />
            </AnalyticsConsentProvider>
          </ThemeProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}
