import Image from "next/image";
import Link from "next/link";
import { GithubIcon } from "@/components/ui/github-icon";

export function LegalPageHeader() {
  return (
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
  );
}
