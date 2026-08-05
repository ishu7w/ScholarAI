"use client";

import { useEffect } from "react";
import Link from "next/link";

// Root error boundary. Client component by contract — Next passes `reset`
// to re-run the failed render without a full page load.
//
// The digest is the only thing we surface about the failure: server error
// messages can carry query fragments, ids or env detail, so the visible copy
// stays generic and the digest is the handle for correlating with logs.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-10">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">
            Error / Unrecoverable
          </span>
        </div>

        <h1
          className="font-[family-name:var(--font-familjen)] font-bold uppercase leading-[1.02] tracking-[-0.035em] text-5xl sm:text-6xl pb-[0.05em]"
          style={{ color: "var(--foreground)" }}
        >
          Something{" "}
          <span
            className="ed-outline"
            style={{ WebkitTextStroke: "1px var(--foreground)", color: "transparent" }}
          >
            broke
          </span>
        </h1>

        <p className="mt-8 max-w-lg text-[13px] leading-[1.8] tracking-[0.04em] text-[color:var(--ink-2)]">
          The page failed to render. Nothing you submitted has been lost — this
          is a rendering failure, not a data failure. Retrying re-runs the same
          request; if it fails again the fault is server-side.
        </p>

        {error.digest ? (
          <div className="mt-8 hairline p-4">
            <span className="mono-label text-[color:var(--muted)]">
              Reference
            </span>
            <p className="mt-2 font-mono text-[12px] tracking-[0.08em] break-all text-[color:var(--foreground)]">
              {error.digest}
            </p>
            <p className="mt-2 text-[11px] leading-[1.7] tracking-[0.04em] text-[color:var(--muted)]">
              Quote this reference in a bug report — it identifies the exact
              failure in the server logs.
            </p>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>

        <div className="mt-16 hairline-t pt-6">
          <span className="mono-label text-[color:var(--muted)]">
            ScholarAI / Explainable scholarship matching
          </span>
        </div>
      </div>
    </main>
  );
}
