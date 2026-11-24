import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border border-purple-600/50 bg-[#6355d8] text-white hover:bg-[#5245c7] shadow-sm shadow-purple-500/15",
  secondary:
    "border border-emerald-600/50 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  outline:
    "border border-slate-200 bg-card text-fg hover:bg-slate-50 shadow-sm",
  ghost:
    "border-transparent bg-transparent text-muted hover:bg-slate-100/80 hover:text-fg",
} as const;

const sizes = {
  sm: "min-h-9 px-3.5 text-[13px] rounded-xl",
  md: "min-h-11 px-5 text-[14px] rounded-2xl",
  lg: "min-h-12 px-6 text-[15px] rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 font-medium transition-all duration-150",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
