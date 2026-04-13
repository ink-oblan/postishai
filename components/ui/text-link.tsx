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
        "text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition-all duration-150",
        className
      )}
    >
      {children}
    </Link>
  );
}
