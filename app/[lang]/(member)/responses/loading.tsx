import { Skeleton } from "@/components/social/Skeleton"

export default function ResponsesLoading() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-0 sm:py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
