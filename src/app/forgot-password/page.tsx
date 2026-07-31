"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { resetPasswordAction } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");

  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const result = await resetPasswordAction(email);
    if (result.ok) {
      setState("sent");
    } else {
      setError(result.error);
      setState("idle");
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {state === "sent" ? (
        <div className="hairline bg-[rgba(21,21,21,0.03)] p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="mt-3 font-medium">Reset link sent</p>
          <p className="mt-1 text-sm text-muted">
            Check your inbox — the link expires in 30 minutes.
          </p>
        </div>
      ) : (
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
          {error && (
            <div
              role="alert"
              className="hairline flex items-center gap-3 border-primary px-4 py-3"
            >
              <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
              <span className="mono-label text-primary">{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={state === "loading"}
            className="btn-primary w-full"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
