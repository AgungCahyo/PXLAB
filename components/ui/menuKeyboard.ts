import type { KeyboardEvent as ReactKeyboardEvent } from "react"

/**
 * Shared product-menu keyboard contract
 * (docs/audit/UI_INTERACTION_SPEC.md §4.3, owner decision 2026-11-25):
 * full `role="menu"` semantics — ArrowUp/ArrowDown roving with wrap-around,
 * Home/End, Escape closes and returns focus to the trigger (via `onClose`),
 * Tab closes without swallowing the browser's default focus movement.
 * Studio menus are out of scope; they follow STUDIO_INTERACTION_SPEC.md.
 */
export function handleMenuKeyDown(
  event: ReactKeyboardEvent<HTMLElement>,
  { onClose }: { onClose: () => void },
) {
  const { key, currentTarget } = event

  if (key === "Escape") {
    onClose()
    return
  }
  if (key === "Tab") {
    // Close only — default focus movement must proceed to the next control.
    onClose()
    return
  }

  const items = Array.from(currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  if (items.length === 0) return
  const index = items.indexOf(document.activeElement as HTMLElement)

  if (key === "ArrowDown") {
    event.preventDefault()
    items[index < 0 ? 0 : (index + 1) % items.length].focus()
  } else if (key === "ArrowUp") {
    event.preventDefault()
    items[index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length].focus()
  } else if (key === "Home") {
    event.preventDefault()
    items[0].focus()
  } else if (key === "End") {
    event.preventDefault()
    items[items.length - 1].focus()
  }
}

/** Focus the first (or last) item when a menu opens — APG menu-button behavior. */
export function focusMenuItem(container: HTMLElement | null, position: "first" | "last" = "first") {
  const items = container?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (!items || items.length === 0) return
  const target = position === "last" ? items[items.length - 1] : items[0]
  target.focus()
}
