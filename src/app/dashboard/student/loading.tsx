// Student dashboard skeleton: score ring + component breakdown, then the
// ranked match list. Mirrors StudentDashboardView's two-column split.
export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl">
        <span className="sr-only">Loading your dashboard</span>

        <div className="flex items-center gap-3">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">
            Student / Loading
          </span>
        </div>

        <div className="skeleton h-12 w-72 mt-8" aria-hidden="true" />

        <div className="mt-12 grid gap-6 lg:grid-cols-[320px_1fr]" aria-hidden="true">
          <section className="hairline p-6">
            <div className="skeleton h-2.5 w-24" />
            <div className="skeleton h-40 w-40 mx-auto mt-8" />
            <div className="skeleton h-3 w-32 mx-auto mt-6" />
            <div className="mt-8 hairline-t pt-5 space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="skeleton h-2.5 w-28" />
                    <div className="skeleton h-2.5 w-8" />
                  </div>
                  <div className="skeleton h-1.5 w-full" />
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="hairline p-5">
                  <div className="skeleton h-2.5 w-20" />
                  <div className="skeleton h-8 w-16 mt-4" />
                  <div className="skeleton h-2.5 w-24 mt-3" />
                </div>
              ))}
            </section>

            <section className="hairline p-6">
              <div className="skeleton h-2.5 w-32" />
              <div className="mt-6 space-y-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="hairline-b pb-5 flex items-start justify-between gap-6"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-2/3" />
                      <div className="skeleton h-2.5 w-1/3" />
                    </div>
                    <div className="skeleton h-10 w-14" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
