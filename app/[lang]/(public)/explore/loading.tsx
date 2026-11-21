import { Skeleton, TileGridSkeleton } from "@/components/social/Skeleton"

export default function ExploreLoading() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-12 w-full" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0" />
        ))}
      </div>
      <div className="mt-3 sm:mt-4">
        <TileGridSkeleton />
      </div>
    </div>
  )
}
