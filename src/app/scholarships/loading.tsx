// Explorer skeleton: filter rail on the left, scholarship cards on the
// right — the shape ExplorerView settles into, so the swap does not jump.
export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl">
        <span className="sr-only">Loading scholarships</span>

        <div className="flex items-center gap-3">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">
            Catalogue / Loading
          </span>
        </div>

        <div className="skeleton h-12 w-80 mt-8" aria-hidden="true" />

        <div className="mt-12 grid gap-10 lg:grid-cols-[240px_1fr]" aria-hidden="true">
          <aside className="space-y-8">
            {[0, 1, 2].map((group) => (
              <div key={group} className="hairline-t pt-5 space-y-3">
                <div className="skeleton h-3 w-24" />
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="skeleton h-3 w-full" />
                ))}
              </div>
            ))}
          </aside>

          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <article key={i} className="hairline p-5">
                <div className="skeleton h-2.5 w-20" />
                <div className="skeleton h-5 w-full mt-4" />
                <div className="skeleton h-5 w-3/5 mt-2" />
                <div className="skeleton h-3 w-full mt-5" />
                <div className="skeleton h-3 w-4/5 mt-2" />
                <div className="mt-6 hairline-t pt-4 flex items-center justify-between gap-4">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-8 w-8" />
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
