import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { GithubIcon } from "@/components/ui/github-icon";

export function LandingFooter() {
  return (
    <footer className="bg-gray-950 px-6 py-12 text-gray-400">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4">
              <BrandLogo className="text-lg text-white" />
            </div>
            <p className="text-sm">AI-powered content creation.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <a
              href="https://github.com/ink-oblan/postishai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition hover:text-white"
            >
              <GithubIcon className="h-4 w-4" />
              Source available
            </a>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <a href="mailto:support@postishai.com" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </div>

        <div className="border-gray-800 border-t pt-8 text-sm">
          <p>&copy; 2026 Postishai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
