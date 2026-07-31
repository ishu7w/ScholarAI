"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell, PasswordInput } from "@/components/auth/AuthShell";
import { signInAction } from "@/lib/auth/actions";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your latest matches and deadlines."
      footer={
        <>
          New to ScholarAI?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* useSearchParams() must sit inside a Suspense boundary. */}
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await signInAction({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (result.ok) {
      router.push(searchParams.get("next") ?? result.redirectTo);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
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
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" />
        </div>
        {error && (
          <div
            role="alert"
            className="hairline flex items-center gap-3 border-primary px-4 py-3"
          >
            <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
            <span className="mono-label text-primary">{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
        <p className="text-center text-xs text-muted">
          Demo accounts: student@demo.scholarai.app · institution@… · admin@…
          (password: scholarai-demo)
        </p>
    </form>
  );
}
