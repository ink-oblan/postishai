import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const plusJakarta = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PostishAI",
  description: "AI-powered social media content creation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="h-full flex bg-background text-foreground">
        <ThemeProvider>
          <Sidebar />
          {/* pt-14 on mobile to clear the fixed top header; md:pt-0 on desktop */}
          <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
