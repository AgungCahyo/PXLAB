import { GallerySkeleton } from "@/components/creations/GallerySkeleton"

export default function ExploreLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-8 w-40 border-[3px] border-earth bg-soft" />
      <div className="mt-3 h-4 w-full max-w-xl border-[3px] border-earth bg-soft" />
      <div className="mt-8">
        <GallerySkeleton />
      </div>
    </div>
  )
}
