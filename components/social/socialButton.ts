import { cn } from "@/lib/utils"

const variants = {
  solid: "bg-fg text-bg hover:opacity-90",
  brand: "bg-brick text-white hover:brightness-105",
  soft: "bg-soft text-fg hover:bg-[color:var(--soc-hairline)]",
  ghost: "bg-transparent text-muted hover:bg-soft hover:text-fg",
} as const

const sizes = {
  sm: "min-h-9 px-3 text-[13px]",
  md: "min-h-11 px-4 text-[14px]",
  lg: "min-h-12 px-6 text-[15px]",
} as const

/** Flat button style for social surfaces. Same API shape as buttonClassName, no heavy shadow. */
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
    "inline-flex select-none items-center justify-center gap-2 font-semibold transition-[background-color,opacity,transform]",
    "duration-[var(--soc-fast)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  )
}
