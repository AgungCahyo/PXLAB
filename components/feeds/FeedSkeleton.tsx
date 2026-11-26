/** Shared loading fallback for the viewer-scoped feed destinations. */
export function FeedSkeleton() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10" aria-hidden="true">
      <div className="mb-6 h-8 w-48 bg-soft" />
      <div className="mb-6 h-4 w-72 max-w-full bg-soft" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-none border border-line bg-card">
            <div className="aspect-square border-b border-line bg-soft" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-3/4 bg-soft" />
              <div className="h-3 w-1/2 bg-soft" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
