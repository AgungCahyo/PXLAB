import { CreatorGridSkeleton, Skeleton } from "@/components/social/Skeleton"

/** Matches the creators grid geometry so navigation does not jump. */
export default function CreatorsLoading() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-11 w-32" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="mt-6">
        <CreatorGridSkeleton />
      </div>
    </div>
  )
}
