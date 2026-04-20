"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileVideo, Menu, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/avatars", label: "Avatars", icon: Users },
  { href: "/posts", label: "Posts", icon: FileVideo },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3.5 rounded-xl px-5 py-4 text-[20px] font-semibold transition-all duration-150",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-[22px] w-[22px] shrink-0", active ? "text-primary" : "")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileFooter({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const active = pathname.startsWith("/settings");
  return (
    <div className="p-3 border-t border-border">
      <Link
        href="/settings"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Settings className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "")} />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-tight truncate">Settings</p>
          <p className="text-[13px] text-muted-foreground leading-tight">Profile &amp; preferences</p>
        </div>
      </Link>
    </div>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="flex items-center gap-2.5 group">
      <div className="h-12 w-12 shrink-0 group-hover:opacity-90 transition-opacity">
        <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-full w-full object-contain" />
      </div>
      <span className="font-bold text-[21px] tracking-tight">PostishAI</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobile top header ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-4 gap-3 bg-background/95 backdrop-blur-md border-b border-border">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col border-r border-sidebar-border",
          "transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-sidebar-border">
          <Logo onClick={() => setOpen(false)} />
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        <ProfileFooter pathname={pathname} onNavigate={() => setOpen(false)} />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border flex-col h-full bg-sidebar">
        <div className="px-4 py-4 border-b border-border">
          <Logo />
        </div>
        <NavLinks pathname={pathname} />
        <ProfileFooter pathname={pathname} />
      </aside>
    </>
  );
}
