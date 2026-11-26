import { cn } from "@/lib/utils"

const variants = {
  solid: "border border-fg bg-fg text-bg hover:opacity-90",
  brand: "border border-[#ff4f00] bg-[#ff4f00] text-white hover:border-[#e04400] hover:bg-[#e04400]",
  soft: "border border-line bg-soft text-fg hover:border-fg/30 hover:bg-card",
  ghost: "bg-transparent text-muted hover:bg-soft hover:text-fg",
} as const

const sizes = {
  sm: "min-h-9 px-3.5 text-[13px] rounded-[2px]",
  md: "min-h-11 px-4 text-[14px] rounded-[2px]",
  lg: "min-h-12 px-6 text-[15px] rounded-[2px]",
} as const

/** Flat button style for social & app surfaces. Modern rounded corners with subtle shadows. */
export function socialButtonClass({
  variant = "soft",
  size = "md",
  className,
}: {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  className?: string
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 font-medium transition-all",
    "duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  )
}
