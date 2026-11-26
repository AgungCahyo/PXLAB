import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border border-[#ff4f00] bg-[#ff4f00] text-white hover:border-[#e04400] hover:bg-[#e04400]",
  secondary:
    "border border-fg bg-fg text-bg hover:opacity-90",
  outline:
    "border border-line bg-card text-fg hover:border-fg/30 hover:bg-soft",
  ghost:
    "border-transparent bg-transparent text-muted hover:bg-soft hover:text-fg",
} as const;

const sizes = {
  sm: "min-h-9 px-3.5 text-[13px] rounded-[2px]",
  md: "min-h-11 px-5 text-[14px] rounded-[2px]",
  lg: "min-h-12 px-6 text-[15px] rounded-[2px]",
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
  loading = false,
  disabled,
  "aria-busy": ariaBusy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      {...props}
      disabled={loading || disabled}
      aria-busy={loading || ariaBusy}
      data-loading={loading || undefined}
      className={buttonClassName({ variant, size, className })}
    />
  );
}
