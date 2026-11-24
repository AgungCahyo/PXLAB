import { Skeleton } from "@/components/social/Skeleton"

export default function ResponsesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy="true" aria-label="Loading">
      <div className="rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="mt-3 h-8 w-48 rounded" />
        <Skeleton className="mt-2 h-4 w-full max-w-md rounded" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 last:border-b-0">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-3 w-2/5 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
