/** Append `next` to `prev`, skipping ids already present. Order of `prev` is preserved. */
export function mergeUnique<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map((item) => item.id))
  const fresh = next.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  return fresh.length ? [...prev, ...fresh] : prev
}
