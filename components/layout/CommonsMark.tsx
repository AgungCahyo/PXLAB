import { cn } from "@/lib/utils"

/** Four shared blocks — original mark, not a game sprite. */
export function CommonsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("pixel-deco h-6 w-6", className)}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="6" height="6" className="fill-sky" />
      <rect x="9" y="1" width="6" height="6" className="fill-grass" />
      <rect x="1" y="9" width="6" height="6" className="fill-coin" />
      <rect x="9" y="9" width="6" height="6" className="fill-brick" />
    </svg>
  )
}
