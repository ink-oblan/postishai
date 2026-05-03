"use client";

import { FileVideo, LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type UserInfo = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/avatars", label: "Avatars", icon: Users },
  { href: "/posts", label: "Posts", icon: FileVideo },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3.5 rounded-xl px-5 py-4 font-semibold text-[20px] transition-all duration-150",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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

function ProfileFooter({
  pathname,
  onNavigate,
  user,
}: {
  pathname: string;
  onNavigate?: () => void;
  user: UserInfo;
}) {
  const router = useRouter();
  const active = pathname.startsWith("/settings");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="space-y-1 border-border border-t p-3">
      <Link
        href="/settings"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Settings className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "")} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[17px] leading-tight">
            {user.name || "Settings"}
          </p>
          <p className="truncate text-[13px] text-muted-foreground leading-tight">{user.email}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:text-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span className="font-medium text-[15px]">Sign out</span>
      </button>
    </div>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="group flex items-center gap-2.5">
      <div className="h-12 w-12 shrink-0 transition-opacity group-hover:opacity-90">
        <Image
          src="/logo.svg"
          alt="Logo"
          width={32}
          height={32}
          className="h-full w-full object-contain"
        />
      </div>
      <span className="font-bold text-[21px] tracking-tight">PostishAI</span>
    </Link>
  );
}

export function Sidebar({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobile top header ── */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-border border-b bg-background/95 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-ml-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo />
      </header>

      {/* ── Mobile backdrop ── */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-sidebar-border border-r bg-sidebar md:hidden",
          "transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-sidebar-border border-b px-4 py-3.5">
          <Logo onClick={() => setOpen(false)} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        <ProfileFooter pathname={pathname} user={user} onNavigate={() => setOpen(false)} />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-border border-r bg-sidebar md:flex">
        <div className="border-border border-b px-4 py-4">
          <Logo />
        </div>
        <NavLinks pathname={pathname} />
        <ProfileFooter pathname={pathname} user={user} />
      </aside>
    </>
  );
}
