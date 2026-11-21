/**
 * Explore mosaic: every block of 5 works = 1 large (2×2) + 4 small (1×1).
 * That exactly fills 2 columns × 4 rows (mobile) and 4 columns × 2 rows (sm+), so the grid
 * has no holes. Pure and index-based: tiles already on screen never change when a page is
 * appended. The large tile alternates left/right per block for rhythm.
 */
export const MOSAIC_BLOCK = 5

export function mosaicSlot(index: number): { large: boolean; side: "left" | "right" } {
  const block = Math.floor(index / MOSAIC_BLOCK)
  return { large: index % MOSAIC_BLOCK === 0, side: block % 2 === 0 ? "left" : "right" }
}

/**
 * Whether the tile at `index` renders large. When the list is complete (`complete`) and the
 * last block is partial, its tiles are all small so the feed does not end on a lone big
 * tile with empty cells beside it.
 */
export function isLargeTile(index: number, total: number, complete: boolean): boolean {
  if (!mosaicSlot(index).large) return false
  if (!complete) return true
  const lastFullBlockEnd = Math.floor(total / MOSAIC_BLOCK) * MOSAIC_BLOCK
  return total % MOSAIC_BLOCK === 0 || index < lastFullBlockEnd
}

/** Grid placement classes (literal strings so Tailwind can see them). */
export function mosaicTileClass(index: number, large: boolean): string {
  if (!large) return ""
  return mosaicSlot(index).side === "right"
    ? "col-span-2 row-span-2 sm:col-start-3"
    : "col-span-2 row-span-2"
}

export type MosaicSegment<T, N> =
  | { kind: "tiles"; start: number; items: T[] }
  | { kind: "band"; at: number; node: N }

/**
 * Splits the loaded works into runs of tiles with a band (creators rail, quiet works…)
 * between them. `start` is the global tile index, so mosaic blocks stay aligned as long as
 * every band position is a multiple of MOSAIC_BLOCK. A band whose position has not been
 * reached yet appears at the very end once the feed is complete.
 */
export function segmentWithBands<T, N>(
  items: T[],
  bands: { at: number; node: N }[],
  complete: boolean,
): MosaicSegment<T, N>[] {
  const segments: MosaicSegment<T, N>[] = []
  const sorted = [...bands].sort((a, b) => a.at - b.at)
  const unreached: typeof sorted = []
  let cursor = 0
  for (const band of sorted) {
    if (band.at > items.length) {
      unreached.push(band)
    } else if (band.at > cursor) {
      segments.push({ kind: "tiles", start: cursor, items: items.slice(cursor, band.at) })
      segments.push({ kind: "band", at: band.at, node: band.node })
      cursor = band.at
    }
  }
  if (cursor < items.length) segments.push({ kind: "tiles", start: cursor, items: items.slice(cursor) })
  if (complete) for (const band of unreached) segments.push({ kind: "band", at: band.at, node: band.node })
  return segments
}
