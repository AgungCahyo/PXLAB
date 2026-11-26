import { FeedSkeleton, Skeleton } from "@/components/social/Skeleton"

export default function HomeLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 pb-10 pt-2 sm:px-6 sm:pt-6 lg:px-8 xl:px-10"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
        <div className="min-w-0">
          <Skeleton className="h-11 w-full" />
          <FeedSkeleton count={2} />
        </div>
        <aside className="hidden lg:block" aria-hidden="true">
          <div className="grid gap-6">
            <div className="grid gap-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-11 w-full rounded-[2px]" />
            </div>
            <div className="grid gap-2.5 border-t border-line pt-5">
              <Skeleton className="h-3 w-24" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
