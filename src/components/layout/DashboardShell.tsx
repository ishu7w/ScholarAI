"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ScanSearch,
  Shield,
  Trophy,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/student", label: "Student Dashboard", icon: LayoutDashboard },
  { href: "/scholarships", label: "Scholarships", icon: Trophy },
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
        {NAV.map((item) => {
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

      <div className="glass mt-4 flex items-center gap-3 p-3">
        <Avatar name="Aarya Sharma" hue={258} size={36} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Aarya Sharma</div>
          <div className="truncate text-xs text-muted">aarya@university.edu</div>
        </div>
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
            <button
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-[rgba(21,21,21,0.05)] hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 bg-primary" />
            </button>
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
