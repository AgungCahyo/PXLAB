import { MosaicGrid } from "@/components/social/MosaicGrid"
import { mosaicSlot, mosaicTileClass } from "@/lib/social-mosaic"
import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("soc-skeleton", className)} aria-hidden="true" />
}

/** Placeholder matching FeedPost layout so the page does not jump when data lands. */
export function FeedPostSkeleton() {
  return (
    <div className="border-b border-line py-6 first:pt-4" aria-hidden="true">
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full border border-line" />
      <div className="space-y-2 pt-3.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <div className="mt-3 flex gap-2 pt-1">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  )
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="grid gap-1">
      {Array.from({ length: count }, (_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  )
}

/** Same mosaic as the Explore feed so the page does not jump when tiles arrive. */
export function TileGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <MosaicGrid>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className={mosaicTileClass(i, mosaicSlot(i).large)}>
            <Skeleton className="h-full w-full" />
          </li>
        ))}
      </MosaicGrid>
    </div>
  )
}

/** Fluid creator grid placeholder matching Search Creators and /creators. */
export function CreatorGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mt-1 grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-full min-w-0 overflow-hidden rounded-none border border-line bg-card p-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-[4.75rem] shrink-0 rounded-[2px]" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="aspect-square w-full border border-line" />
            <Skeleton className="aspect-square w-full border border-line" />
            <Skeleton className="aspect-square w-full border border-line" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Compact creator rail placeholder: header + one row of three square previews. */
export function CreatorRailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mt-2 flex w-full min-w-0 max-w-full gap-3 overflow-hidden"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-64 shrink-0 rounded-none border border-line bg-card p-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-[4.75rem] shrink-0 rounded-[2px]" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="aspect-square w-full border border-line" />
            <Skeleton className="aspect-square w-full border border-line" />
            <Skeleton className="aspect-square w-full border border-line" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Square-tile rail placeholder for quiet works. */
export function QuietRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="-mx-3 mt-2 flex min-w-0 gap-2 overflow-hidden px-3 sm:mx-0 sm:px-0"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square w-40 shrink-0 border border-line sm:w-44" />
      ))}
    </div>
  )
}

/** 3-column square grid placeholder for the profile. */
export function ProfileGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-1.5" role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square border border-line" />
      ))}
    </div>
  )
}

/** Profile header + tile grid placeholder (matches the social profile layout). */
export function ProfileLoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="border-b border-line pb-6">
        <div className="flex items-start gap-4 sm:gap-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-44 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-9 w-24 shrink-0 rounded-[2px] sm:block" />
        </div>
      </div>
      <section className="mt-8 min-w-0">
        <div className="flex border-b border-line pb-3">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mt-4">
          <ProfileGridSkeleton />
        </div>
      </section>
    </div>
  )
}
