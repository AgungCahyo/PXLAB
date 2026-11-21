import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Square-cell mosaic. Row height is derived from the container width (container query
 * units), not from the tiles, so a large tile (row-span-2) is always exactly 2×2 and can
 * never collapse, even when it is the only item in its block.
 *   mobile: 2 cols, gap 0.25rem   sm+: 4 cols, gap 0.375rem
 */
export function MosaicGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="[container-type:inline-size]">
      <ul
        className={cn(
          "grid grid-flow-dense grid-cols-2 gap-1 auto-rows-[calc((100cqw_-_0.25rem)/2)]",
          "sm:grid-cols-4 sm:gap-1.5 sm:auto-rows-[calc((100cqw_-_1.125rem)/4)]",
          className,
        )}
      >
        {children}
      </ul>
    </div>
  )
}
