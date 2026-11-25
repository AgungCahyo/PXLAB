export type RecencyGroup = "today" | "week" | "earlier"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Groups already-sorted items by elapsed time (not calendar day, so server timezone
 * never shifts an item between groups). Order inside a group is preserved; empty groups
 * are omitted. Future timestamps (clock skew) count as "today".
 */
export function groupByRecency<T extends { at: string }>(
  items: T[],
  now: number = Date.now(),
): { group: RecencyGroup; items: T[] }[] {
  const buckets: Record<RecencyGroup, T[]> = { today: [], week: [], earlier: [] }
  for (const item of items) {
    const age = now - Date.parse(item.at)
    const group: RecencyGroup = Number.isNaN(age) || age >= 7 * DAY_MS ? "earlier" : age >= DAY_MS ? "week" : "today"
    buckets[group].push(item)
  }
  return (["today", "week", "earlier"] as const)
    .filter((group) => buckets[group].length > 0)
    .map((group) => ({ group, items: buckets[group] }))
}

/** Splits "{user} appreciated {title}" into text and placeholder parts so the caller can style them. */
export function splitTemplate(template: string): { type: "text" | "user" | "title"; value: string }[] {
  return template
    .split(/(\{user\}|\{title\})/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part === "{user}"
        ? { type: "user" as const, value: part }
        : part === "{title}"
          ? { type: "title" as const, value: part }
          : { type: "text" as const, value: part },
    )
}
