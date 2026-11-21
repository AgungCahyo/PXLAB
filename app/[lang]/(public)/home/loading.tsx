import { FeedSkeleton, Skeleton } from "@/components/social/Skeleton"

export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-2 sm:px-0 sm:pt-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-11 w-full" />
      <FeedSkeleton count={2} />
    </div>
  )
}
