import { Skeleton } from "@/components/social/Skeleton"

export default function ResponsesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true" aria-label="Loading">
      <div className="border-b border-line pb-5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-3 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="overflow-hidden rounded-none border border-line bg-card">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
