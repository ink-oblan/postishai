import Link from "next/link";
import { cn } from "@/lib/utils";

interface TextLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function TextLink({ href, children, className }: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "text-primary underline decoration-primary/40 underline-offset-2 transition-all duration-150 hover:decoration-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}
