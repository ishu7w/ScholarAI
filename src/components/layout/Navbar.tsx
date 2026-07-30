"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/catalogue", label: "Catalogue" },
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
          scrolled ? "glass-strong" : "bg-transparent"
        )}
        aria-label="Main navigation"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center bg-foreground">
            <GraduationCap className="h-5 w-5 text-background" />
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
                className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:bg-[rgba(21,21,21,0.05)] hover:text-foreground"
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
                  className="block rounded-lg px-4 py-3 text-sm text-muted hover:bg-[rgba(21,21,21,0.05)] hover:text-foreground"
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
