import type { ReactNode } from "react"

/** Quiet, section-local message — never a full-page empty state. */
export function DiscoveryNote({ children }: { children: ReactNode }) {
  return <p className="px-1 py-4 text-[13px] text-muted">{children}</p>
}
