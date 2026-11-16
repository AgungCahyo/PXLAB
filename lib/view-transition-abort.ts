/**
 * Chrome 153+ / Firefox / Safari abort in-flight view transitions when the
 * viewport resizes or the document hides. Benign — layout still commits.
 * React 19.3.1 only suppresses the unsuffixed Chrome message, so Next still
 * surfaces these via onRecoverableError → reportError.
 */
const BENIGN_MESSAGES = new Set([
  "Transition was aborted because of invalid state",
  "Transition was aborted because of invalid state.",
  "Transition was aborted because of invalid state. Document hidden",
  "Transition was aborted because of invalid state. Viewport size changed",
  "Skipped ViewTransition due to document being hidden",
  "Skipped view transition due to viewport resize",
  "View transition was skipped because document visibility state is hidden.",
  "Skipping view transition because document visibility state has become hidden.",
  "Skipping view transition because viewport size changed.",
])

export function isBenignViewTransitionAbort(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return false
  const error = reason as { name?: unknown; message?: unknown }
  if (error.name !== "InvalidStateError") return false
  return typeof error.message === "string" && BENIGN_MESSAGES.has(error.message)
}

let installed = false

/** Call once before hydration (instrumentation-client) so Next never sees these. */
export function installViewTransitionAbortFilter() {
  if (typeof window === "undefined" || installed) return
  installed = true

  const originalReportError =
    typeof window.reportError === "function" ? window.reportError.bind(window) : null
  if (originalReportError) {
    window.reportError = (error: unknown) => {
      if (isBenignViewTransitionAbort(error)) return
      originalReportError(error)
    }
  }

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (!isBenignViewTransitionAbort(event.reason)) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    true,
  )

  window.addEventListener(
    "error",
    (event) => {
      if (!isBenignViewTransitionAbort(event.error)) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    true,
  )
}
