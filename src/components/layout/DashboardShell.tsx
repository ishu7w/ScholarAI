"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  FileCheck2,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanSearch,
  Shield,
  Trophy,
  UserCog,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import NotificationBell from "@/components/layout/NotificationBell";
import { useSession } from "@/components/providers/SessionProvider";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/student", label: "Student Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/student/profile", label: "My Profile", icon: UserCog },
  { href: "/dashboard/student/documents", label: "Documents", icon: FileCheck2 },
  { href: "/scholarships", label: "Scholarships", icon: Trophy },
  { href: "/financial-aid", label: "Financial Aid", icon: HandCoins },
  { href: "/catalogue", label: "Catalogue", icon: BookOpen },
  { href: "/resume-analyzer", label: "Resume Analyzer", icon: ScanSearch },
  { href: "/dashboard/institution", label: "Institution", icon: Building2 },
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
];

export default function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Real signed-in profile, injected by the segment layout.
  const user = useSession();

  // Role-scoped navigation: never advertise a dashboard the user can't open.
  const nav = NAV.filter((item) => {
    if (!user) return true;
    if (item.href === "/dashboard/institution") return user.role === "institution" || user.role === "admin";
    if (item.href === "/dashboard/admin") return user.role === "admin";
    if (item.href === "/dashboard/student") return user.role === "student" || user.role === "admin";
    if (item.href === "/dashboard/student/profile") return user.role === "student";
    if (item.href === "/dashboard/student/documents") return user.role === "student";
    return true;
  });

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center bg-foreground">
          <GraduationCap className="h-5 w-5 text-background" />
        </span>
        <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
          Scholar<span className="text-gradient">AI</span>
        </span>
      </Link>

      <nav className="mt-8 flex-1 space-y-1" aria-label="Dashboard navigation">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary-bright"
                  : "text-muted hover:bg-[rgba(21,21,21,0.05)] hover:text-foreground"
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 bg-primary"
                  aria-hidden
                />
              )}
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <div className="glass flex items-center gap-3 p-3">
          <Avatar
            name={user?.name ?? "Guest"}
            hue={user?.avatarHue ?? 258}
            size={36}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user?.name ?? "Guest"}</div>
            <div className="truncate text-xs text-muted">{user?.email ?? "not signed in"}</div>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="mono-label mt-2 flex w-full cursor-pointer items-center gap-2 border border-[rgba(21,21,21,0.16)] px-4 py-2.5 text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[rgba(21,21,21,0.16)] bg-surface p-5 lg:block">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(21,21,21,0.35)]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="glass-strong absolute inset-y-0 left-0 w-72 p-5">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 cursor-pointer text-muted hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[rgba(21,21,21,0.16)] bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="cursor-pointer text-muted hover:text-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold sm:text-xl">
                {title}
              </h1>
              {subtitle && <p className="text-xs text-muted sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/scholarships"
              className="btn-primary hidden !px-4 !py-2 text-sm sm:inline-flex"
            >
              <Trophy className="h-4 w-4" /> Browse scholarships
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
