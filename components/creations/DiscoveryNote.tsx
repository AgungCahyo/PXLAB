import type { ReactNode } from "react"

/** Quiet, section-local message — never a full-page empty state. */
export function DiscoveryNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-none border border-dashed border-line bg-soft px-4 py-5 text-[13px] text-muted">
      {children}
    </p>
  )
}
