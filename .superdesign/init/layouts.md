# Layout Components — ScholarAI

Three shell patterns: marketing pages use `Navbar` (fixed glass top nav), app pages use `DashboardShell` (fixed sidebar + sticky topbar), auth pages use `AuthShell` (centered glass card). Root layout wires Google fonts + globals.css. `SmoothScroll` (Lenis) wraps only the landing page.

## Root Layout
- Path: `src/app/layout.tsx`
- Loads Inter (`--font-inter`), Space Grotesk (`--font-space-grotesk`), Geist Mono (`--font-geist-mono`); sets metadata; dark background comes from globals.css on `body`.

```tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScholarAI — AI-Powered Scholarship Intelligence",
  description:
    "ScholarAI matches deserving students with the right scholarships using explainable AI — eligibility prediction, document verification, and fair candidate ranking for institutions.",
  keywords: [
    "scholarship",
    "AI recommendation",
    "explainable AI",
    "student funding",
    "education",
  ],
  openGraph: {
    title: "ScholarAI — AI-Powered Scholarship Intelligence",
    description:
      "Fair, explainable, AI-driven scholarship matching for students and institutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

## Navbar (marketing top nav)
- Path: `src/components/layout/Navbar.tsx`
- Fixed floating pill nav; transparent → `glass-strong` after 24px scroll; desktop links + Sign in / Get started CTAs; mobile hamburger drawer.

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300",
          scrolled ? "glass-strong shadow-2xl shadow-black/40" : "bg-transparent"
        )}
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent/70 glow-primary">
            <GraduationCap className="h-5 w-5 text-white" />
          </span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold tracking-tight">
            Scholar<span className="text-gradient">AI</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/register" className="btn-primary !px-5 !py-2 text-sm">
            Get started
          </Link>
        </div>

        <button
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="glass-strong mx-auto mt-2 max-w-6xl rounded-2xl p-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm text-muted hover:bg-white/5 hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex gap-2">
              <Link href="/login" className="btn-ghost flex-1 text-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary flex-1 text-sm">
                Get started
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
```

## DashboardShell (app shell: sidebar + topbar)
- Path: `src/components/layout/DashboardShell.tsx`
- Fixed 256px sidebar (logo, 5 nav items with pathname-based active state, user card) + sticky header (title/subtitle, bell with dot, "Browse scholarships" CTA) + mobile drawer. Props: `{children, title, subtitle?}`.

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
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
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent/70">
          <GraduationCap className="h-5 w-5 text-white" />
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
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary-bright"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="glass mt-4 flex items-center gap-3 rounded-xl p-3">
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/8 bg-surface/60 p-5 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/8 bg-background/70 px-6 py-4 backdrop-blur-xl">
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
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger" />
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
```

## AuthShell (auth card shell)
- Path: `src/components/auth/AuthShell.tsx`
- Full-screen grid background + violet glow; centered `glass-strong` rounded-3xl card (Framer Motion entrance) with logo, title, subtitle, form slot, footer slot. Also exports `PasswordInput` and `useFakeAuth` demo hook.

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, GraduationCap } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(ellipse, #6d5cff 0%, transparent 60%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative w-full max-w-md rounded-3xl p-8 sm:p-10"
      >
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent/70">
            <GraduationCap className="h-5 w-5 text-white" />
          </span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
            Scholar<span className="text-gradient">AI</span>
          </span>
        </Link>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      </motion.div>
    </div>
  );
}

export function PasswordInput({
  id,
  placeholder = "••••••••",
}: {
  id: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required
        minLength={8}
        className="input-premium pr-12"
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted transition-colors hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function useFakeAuth(redirect: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // demo auth — no backend, just a premium-feeling transition
    setTimeout(() => router.push(redirect), 900);
  };

  return { loading, submit };
}
```

## SmoothScroll (Lenis provider)
- Path: `src/components/providers/SmoothScroll.tsx`
- Wraps children; initializes Lenis smooth scrolling synced with GSAP ScrollTrigger; respects prefers-reduced-motion. Used only on the landing page.

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // keep ScrollTrigger in sync with Lenis
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

## Footer
- Path: `src/components/landing/Social.tsx` (named export `Footer`, lines ~295-366)
- Landing-page footer: logo, tagline, link columns, copyright. Only used on `/` (see pages.md).
