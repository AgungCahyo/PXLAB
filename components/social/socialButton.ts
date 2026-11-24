import { cn } from "@/lib/utils"

const variants = {
  solid: "bg-[#1e1435] text-white hover:bg-[#2e2348] shadow-sm",
  brand: "bg-[#6355d8] text-white hover:bg-[#5245c7] shadow-sm shadow-purple-500/20",
  soft: "border border-slate-200/80 bg-slate-50/80 text-fg hover:bg-slate-100",
  ghost: "bg-transparent text-muted hover:bg-slate-100/80 hover:text-fg",
} as const

const sizes = {
  sm: "min-h-9 px-3.5 text-[13px] rounded-xl",
  md: "min-h-11 px-4 text-[14px] rounded-2xl",
  lg: "min-h-12 px-6 text-[15px] rounded-full",
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
