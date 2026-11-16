import type { ReactNode } from "react"
import { ViewTransition } from "react"

/** Soft enter/exit for route changes. Use transitionTypes on Links for direction. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "fade",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "fade",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
