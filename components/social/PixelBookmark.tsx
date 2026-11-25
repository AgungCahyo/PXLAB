const GRID = [
  "XXXXXX",
  "XXXXXX",
  "XXXXXX",
  "XXXXXX",
  "XXXXXX",
  "XX..XX",
  "X....X",
]

const cells = GRID.flatMap((row, y) =>
  [...row].map((char, x) => {
    if (char !== "X") return null
    const edge = [
      GRID[y - 1]?.[x],
      GRID[y + 1]?.[x],
      row[x - 1],
      row[x + 1],
    ].some((n) => n !== "X")
    return { x, y, edge }
  }),
).filter((cell): cell is { x: number; y: number; edge: boolean } => cell !== null)

/** Pixel-art bookmark: outline when idle, solid when saved. Colour comes from `currentColor`. */
export function PixelBookmark({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 6 7"
      width={(size * 6) / 7}
      height={size}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {cells
        .filter((cell) => filled || cell.edge)
        .map((cell) => (
          <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" />
        ))}
    </svg>
  )
}
