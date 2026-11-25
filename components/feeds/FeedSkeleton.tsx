/** Shared loading fallback for the viewer-scoped feed destinations. */
export function FeedSkeleton() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10" aria-hidden="true">
      <div className="mb-6 h-8 w-48 rounded-lg bg-slate-200/80" />
      <div className="mb-6 h-4 w-72 max-w-full rounded bg-slate-200/70" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card">
            <div className="aspect-square bg-slate-200/70" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-3/4 rounded bg-slate-200/70" />
              <div className="h-3 w-1/2 rounded bg-slate-200/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
