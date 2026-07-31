// Admin dashboard skeleton: platform tiles, then the user/audit table.
export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl">
        <span className="sr-only">Loading admin dashboard</span>

        <div className="flex items-center gap-3">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">
            Admin / Loading
          </span>
        </div>

        <div className="skeleton h-12 w-64 mt-8" aria-hidden="true" />

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

          <section className="hairline p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="skeleton h-2.5 w-32" />
              <div className="skeleton h-8 w-40" />
            </div>
            <div className="mt-6 hairline-t">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-4 py-4 hairline-b"
                >
                  <div className="skeleton h-3 w-full max-w-[200px]" />
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-3 w-14" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
