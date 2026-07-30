"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setTimeout(() => setState("sent"), 900);
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
