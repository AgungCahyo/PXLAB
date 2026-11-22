import { Skeleton } from "@/components/social/Skeleton"

/**
 * Shared fallback for routes that await identity or page data before their
 * own Suspense boundaries can render. Keeps `main` non-blank during navigation
 * without inventing a bespoke skeleton for every secondary page.
 */
export function RouteSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-4xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 h-9 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Fallback matching the single-column AuthShell form area. */
export function AuthRouteSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-md px-5 py-10 sm:px-8 sm:py-12 lg:mx-0 lg:max-w-6xl lg:px-16"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-7 w-28" />
      <Skeleton className="mt-8 h-9 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-sm" />
      <div className="mt-8 grid gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  )
}
