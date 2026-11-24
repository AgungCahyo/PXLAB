import { GallerySkeleton } from "@/components/creations/GallerySkeleton"

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className ?? ""}`} />
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
      <Bone className="mb-4 h-10 w-28 rounded-xl" />
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-5">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <Bone className="mt-6 h-7 w-2/3 max-w-md" />
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-32 max-w-full" />
            <Bone className="h-3 w-24 max-w-full" />
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2 border-y border-slate-200/80 py-3">
        <Bone className="h-10 w-24" />
        <Bone className="h-10 w-24" />
        <Bone className="h-10 w-24" />
      </div>
      <div className="mt-8 border-t border-slate-200/80 pt-6">
        <Bone className="h-5 w-32" />
        <Bone className="mt-4 h-24 w-full rounded-2xl" />
      </div>
    </div>
  )
}
/** Route loading shell for creator profile. */
export function ProfileSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-slate-100 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-8 w-48 max-w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-8 border-t border-slate-200/80 pt-6">
        <div className="mb-5 h-5 w-28 animate-pulse rounded bg-slate-100" />
        <GallerySkeleton />
      </div>
    </div>
  )
}

/** Route loading shell for My Works. */
export function WorksSkeleton() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-10"
      aria-hidden="true"
    >
      <div className="rounded-3xl border border-slate-200/80 bg-card p-6 sm:p-8">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-8 w-44 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-7 flex gap-2">
        {[88, 72, 96].map((w, i) => (
          <div key={i} className="h-10 animate-pulse rounded-full bg-slate-100" style={{ width: w }} />
        ))}
      </div>
      <ul className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-card p-3 shadow-sm">
            <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 flex gap-2">
                <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-8 w-16 animate-pulse rounded-xl bg-slate-100" />
              </div>
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
      <div className="rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-8 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-full max-w-lg animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200/80 bg-card p-4 shadow-sm">
          <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid gap-2 rounded-2xl border border-slate-200/80 bg-card p-3 shadow-sm">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-slate-100" />
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
      <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
    </div>
  )
}

export function ConversationSkeleton() {
  return (
    <div
      className="mt-8 border-t border-slate-200/80 pt-6"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="border-b border-slate-100 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-16 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
