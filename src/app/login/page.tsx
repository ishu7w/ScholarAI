"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthShell, PasswordInput, useFakeAuth } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const { loading, submit } = useFakeAuth("/dashboard/student");

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
          Demo build — any credentials open the student dashboard.
        </p>
      </form>
    </AuthShell>
  );
}
