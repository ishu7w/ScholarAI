import Link from "next/link";

// 404. Server component — no interactivity beyond navigation. Offers the
// three routes a lost visitor actually wants rather than a bare apology.
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-10">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">
            404 / Not found
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-familjen)] font-bold uppercase leading-[1.02] tracking-[-0.035em] text-5xl sm:text-6xl pb-[0.05em]">
          Nothing{" "}
          <span
            style={{ WebkitTextStroke: "1px var(--foreground)", color: "transparent" }}
          >
            filed
          </span>{" "}
          here
        </h1>

        <p className="mt-8 max-w-lg text-[13px] leading-[1.8] tracking-[0.04em] text-[color:var(--ink-2)]">
          This address does not match a page, a scholarship, or an application.
          It may have been renamed, or the record may have closed.
        </p>

        <nav aria-label="Suggested pages" className="mt-10 hairline-t">
          {[
            { href: "/scholarships", label: "Browse scholarships", note: "Open catalogue, no account needed" },
            { href: "/dashboard/student", label: "Student dashboard", note: "Your scores, matches and applications" },
            { href: "/", label: "Home", note: "Start over" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-baseline justify-between gap-6 py-5 hairline-b transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <span className="mono-label">{item.label}</span>
              <span className="text-[11px] tracking-[0.06em] text-[color:var(--muted)] text-right">
                {item.note}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-16">
          <span className="mono-label text-[color:var(--muted)]">
            ScholarAI / Explainable scholarship matching
          </span>
        </div>
      </div>
    </main>
  );
}
