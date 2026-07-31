// Institution dashboard skeleton: aggregate tiles, then the charts row,
// then the applicant queue table — the order InstitutionDashboardView renders.
export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl">
        <span className="sr-only">Loading institution dashboard</span>

        <div className="flex items-center gap-3">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">
            Institution / Loading
          </span>
        </div>

        <div className="skeleton h-12 w-80 mt-8" aria-hidden="true" />

        <div className="mt-12 space-y-6" aria-hidden="true">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="hairline p-5">
                <div className="skeleton h-2.5 w-24" />
                <div className="skeleton h-9 w-20 mt-4" />
                <div className="skeleton h-2.5 w-28 mt-3" />
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="hairline p-6">
              <div className="skeleton h-2.5 w-40" />
              <div className="skeleton h-56 w-full mt-6" />
            </div>
            <div className="hairline p-6">
              <div className="skeleton h-2.5 w-32" />
              <div className="skeleton h-56 w-full mt-6" />
            </div>
          </section>

          <section className="hairline p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="skeleton h-2.5 w-36" />
              <div className="skeleton h-8 w-28" />
            </div>
            <div className="mt-6 hairline-t">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 py-4 hairline-b"
                >
                  <div className="skeleton h-3 w-full max-w-[220px]" />
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-3 w-12" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
