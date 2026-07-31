// Root loading fallback. Deliberately generic — a page-level skeleton
// that promises a specific layout would flash the wrong shape on routes
// that have their own loading.tsx. Route skeletons live next to their route.
export default function Loading() {
  return (
    <main
      className="min-h-screen px-6 py-24 flex flex-col items-center"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-2xl">
        <span className="sr-only">Loading</span>

        <div className="flex items-center gap-3 mb-10">
          <span className="ed-marker" aria-hidden="true" />
          <span className="mono-label text-[color:var(--muted)]">Loading</span>
        </div>

        <div className="skeleton h-14 w-3/4" aria-hidden="true" />
        <div className="skeleton h-14 w-1/2 mt-3" aria-hidden="true" />

        <div className="mt-10 space-y-3" aria-hidden="true">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-2/3" />
        </div>

        <div className="mt-12 hairline-t pt-6 space-y-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
