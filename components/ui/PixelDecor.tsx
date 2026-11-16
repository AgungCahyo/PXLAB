import { cn } from "@/lib/utils"

/** Original 8-bit motifs. Not Nintendo sprites. */
export function PixelCloud({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 16"
      width={80}
      height={32}
      className={cn("pixel-deco text-sky", className)}
      aria-hidden="true"
      fill="currentColor"
    >
      <rect x="10" y="6" width="20" height="8" />
      <rect x="16" y="2" width="12" height="6" />
      <rect x="6" y="8" width="8" height="6" />
      <rect x="26" y="8" width="10" height="6" />
    </svg>
  )
}

export function PixelCoin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={16}
      height={16}
      className={cn("pixel-deco text-coin", className)}
      aria-hidden="true"
      fill="currentColor"
    >
      <rect x="3" y="1" width="6" height="10" />
      <rect x="2" y="3" width="8" height="6" />
      <rect x="5" y="3" width="2" height="6" className="fill-earth" />
    </svg>
  )
}

export function PixelBrick({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 10"
      width={40}
      height={20}
      className={cn("pixel-deco", className)}
      aria-hidden="true"
    >
      <rect width="20" height="10" className="fill-earth" />
      <rect x="1" y="1" width="18" height="3" className="fill-brick" />
      <rect x="1" y="5" width="8" height="4" className="fill-brick" />
      <rect x="11" y="5" width="8" height="4" className="fill-brick" />
    </svg>
  )
}

export function GroundStrip({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-3 w-full bg-grass shadow-[0_8px_0_0_var(--earth)]", className)}
    />
  )
}
