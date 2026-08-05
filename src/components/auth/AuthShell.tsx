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
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      {/* Grid sits on its own layer: .grid-bg carries a mask-image, which would
          otherwise fade out the card along with the grid lines. */}
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative w-full max-w-md p-8 sm:p-10"
      >
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center bg-foreground">
            <GraduationCap className="h-5 w-5 text-background" />
          </span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
            Scholar<span className="text-gradient">AI</span>
          </span>
        </Link>
        <div className="mono-label mb-3 text-muted">
          SCHOLARAI — EDITION 2026
        </div>
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

/** @deprecated Kept for reference only — real auth lives in
 *  src/lib/auth/actions.ts. Remove once no callers remain. */
export function useFakeAuth(redirect: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push(redirect), 900);
  };

  return { loading, submit };
}
