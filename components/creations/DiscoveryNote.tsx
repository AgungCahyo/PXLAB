import type { ReactNode } from "react"

/** Quiet, section-local message — never a full-page empty state. */
export function DiscoveryNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 px-4 py-5 text-[13px] text-muted">
      {children}
    </p>
  )
}
