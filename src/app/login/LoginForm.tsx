"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/AuthShell";
import { enterDemoAction, signInAction } from "@/lib/auth/actions";

const DEMO_ROLES = [
  { id: "student", label: "Student demo", email: "student@demo.scholarai.app" },
  { id: "institution", label: "Institution demo", email: "institution@demo.scholarai.app" },
  { id: "admin", label: "Admin demo", email: "admin@demo.scholarai.app" },
] as const;

export default function LoginForm({ allowDemo }: { allowDemo: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (redirectTo: string) => {
    const requestedPath = searchParams.get("next");
    const safeNext =
      requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : redirectTo;
    router.push(safeNext);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await signInAction({
        email: fd.get("email"),
        password: fd.get("password"),
      });
      if (result.ok) goTo(result.redirectTo);
      else {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError("We could not sign you in. Please try again.");
      setLoading(false);
    }
  };

  const openDemo = async (role: (typeof DEMO_ROLES)[number]["id"]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await enterDemoAction(role);
      if (result.ok) goTo(result.redirectTo);
      else {
        setError(result.error);
        setLoading(false);
      }
    } catch {
      setError("We could not open the demo account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@university.edu"
            className="input-premium"
            autoComplete="email"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" />
        </div>
        {error && (
          <div role="alert" className="hairline flex items-center gap-3 border-primary px-4 py-3">
            <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
            <span className="mono-label text-primary">{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
        </button>
        <p className="text-center text-xs text-muted">
          Real accounts always sign in through Supabase and open the role attached to their profile.
        </p>
      </form>

      {allowDemo && (
        <section className="space-y-3 border-t border-border pt-5" aria-label="Demo accounts">
          <p className="text-center text-xs text-muted">
            Explore with a sample account. Demo data is separate from real accounts.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {DEMO_ROLES.map((demo) => (
              <button
                key={demo.id}
                type="button"
                disabled={loading}
                onClick={() => openDemo(demo.id)}
                className="btn-ghost w-full text-xs disabled:opacity-50"
                title={demo.email}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : demo.label}
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-muted">
            Live deployments use the seeded email and password shown in the README.
          </p>
        </section>
      )}
    </div>
  );
}
