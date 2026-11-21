import { Skeleton, TileGridSkeleton } from "@/components/social/Skeleton"

export default function ExploreLoading() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-11 w-full" />
      <Skeleton className="mt-3 h-11 w-full" />
      <div className="mt-4">
        <TileGridSkeleton />
      </div>
    </div>
  )
}
