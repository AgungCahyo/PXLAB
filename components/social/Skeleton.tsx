import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("soc-skeleton", className)} aria-hidden="true" />
}

/** Placeholder matching FeedPost layout (Phase 5) so the page does not jump when data lands. */
export function FeedPostSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-[color:var(--soc-hairline)]">
      {Array.from({ length: count }, (_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  )
}

/** Same grid as the Explore feed so the page does not jump when tiles arrive. */
export function TileGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1.5 lg:grid-cols-4"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square" />
      ))}
    </div>
  )
}

/** Profile header + tile grid placeholder (matches the social profile layout). */
export function ProfileLoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-start gap-4 sm:gap-10">
        <Skeleton className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="mt-10">
        <TileGridSkeleton count={9} />
      </div>
    </div>
  )
}
