import { GallerySkeleton } from "@/components/creations/GallerySkeleton"

function Bone({ className }: { className?: string }) {
  return <div className={`bg-soft ${className ?? ""}`} />
}

/** Route loading shell for artwork detail — structure matches the real page. */
export function ArtworkDetailSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Bone className="mb-4 h-4 w-24" />
      <div className="detail-art-stage">
        <div className="pixel-present">
          <Bone className="aspect-square w-full" />
        </div>
      </div>
      <Bone className="mt-4 h-5 w-2/3 max-w-md" />
      <div className="mt-3 flex items-center gap-2.5">
        <Bone className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Bone className="h-3.5 w-32 max-w-full" />
          <Bone className="h-3 w-24 max-w-full" />
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-[color:var(--soc-hairline)] pt-3">
        <Bone className="h-9 w-24" />
        <Bone className="h-9 w-20" />
      </div>
      <div className="mt-8 border-t border-[color:var(--soc-hairline)] pt-6">
        <Bone className="h-4 w-32" />
        <Bone className="mt-4 h-20 w-full" />
      </div>
    </div>
  )
}
/** Route loading shell for creator profile. */
export function ProfileSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="h-20 w-20 shrink-0 border-[3px] border-earth bg-soft sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-24 bg-soft" />
          <div className="h-8 w-48 max-w-full bg-soft" />
          <div className="h-3 w-40 bg-soft" />
          <div className="h-4 w-full max-w-md bg-soft" />
        </div>
      </div>
      <div className="mt-10 border-t-[3px] border-earth pt-8">
        <div className="mb-5 h-4 w-28 bg-soft" />
        <GallerySkeleton />
      </div>
    </div>
  )
}

/** Route loading shell for My Works. */
export function WorksSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16"
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-8 w-40 bg-soft" />
          <div className="mt-3 h-4 w-64 max-w-xl bg-soft" />
        </div>
        <div className="h-9 w-28 bg-soft" />
      </div>
      <ul className="mt-10 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="pixel-frame min-w-0 bg-card">
            <div className="aspect-square bg-soft" />
            <div className="space-y-2 px-2.5 py-2">
              <div className="h-4 w-2/3 bg-soft" />
              <div className="h-3 w-1/2 bg-soft" />
              <div className="h-8 w-24 bg-soft" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Route loading shell for size picker / create entry. */
export function CreateSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-5 w-40 bg-soft" />
      <div className="mt-2 h-4 w-full max-w-lg bg-soft" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="border border-[color:var(--soc-hairline)] bg-card p-3">
          <div className="aspect-square bg-soft" />
          <div className="mt-3 h-4 w-2/3 bg-soft" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid gap-2 bg-soft p-3">
              <div className="h-4 w-2/3 bg-card" />
              <div className="h-3 w-1/2 bg-card" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 h-11 w-full bg-soft" />
    </div>
  )
}

/** Route loading shell for pixel studio / playground. */
export function StudioSkeleton() {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-bg"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="playground-header flex shrink-0 items-center gap-2 border-b-[3px] border-earth bg-bg px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="h-11 w-11 bg-soft" />
        <div className="min-w-0 flex-1">
          <div className="h-5 w-40 bg-soft" />
          <div className="mt-1 h-3 w-16 bg-soft" />
        </div>
        <div className="hidden md:flex gap-1.5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={`view-${index}`} className="h-11 w-11 shrink-0 bg-soft" />
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <div className="h-11 w-11 bg-soft" />
          <div className="h-11 w-11 bg-soft" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="playground-tool-rail hidden min-h-0 w-16 shrink-0 flex-col items-center gap-1.5 overflow-x-hidden overflow-y-auto border-r-[3px] border-earth p-1 md:flex">
          {Array.from({ length: 17 }, (_, index) => (
            <div key={`rail-${index}`} className="h-11 w-11 shrink-0 bg-soft" />
          ))}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 bg-soft/60" />
          <div className="editor-status hidden h-7 border-t-[3px] border-earth md:block" />
        </div>
        <div className="studio-inspector hidden w-[17.5rem] shrink-0 border-l-[3px] border-earth md:block" />
      </div>
      <div className="editor-status h-7 border-t-[3px] border-earth md:hidden" />
      <div className="playground-toolbar shrink-0 border-t-[3px] border-earth px-2 pt-2 md:hidden">
        <div className="editor-mobile-view mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={`view-${index}`} className="h-11 w-11 shrink-0 bg-soft" />
          ))}
        </div>
        <div className="flex w-full gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 17 }, (_, index) => (
            <div key={`tool-${index}`} className="h-11 w-11 shrink-0 bg-soft" />
          ))}
        </div>
        <div className="mt-2 flex w-full flex-wrap gap-1.5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={`action-${index}`} className="h-11 w-11 bg-soft" />
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={`swatch-${index}`} className="h-11 w-11 shrink-0 bg-soft" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function EngagementSkeleton() {
  return (
    <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
      <div className="h-9 w-28 bg-soft" />
      <div className="h-9 w-24 bg-soft" />
    </div>
  )
}

export function ConversationSkeleton() {
  return (
    <div
      className="mt-8 border-t border-[color:var(--soc-hairline)] pt-6"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-6 w-40 bg-soft" />
      <div className="mt-8 space-y-5">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="border-b border-line py-5">
            <div className="h-4 w-32 bg-soft" />
            <div className="mt-3 h-16 w-full bg-soft" />
          </div>
        ))}
      </div>
    </div>
  )
}
