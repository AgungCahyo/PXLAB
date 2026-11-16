import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border-earth bg-brick text-white hover:brightness-105",
  secondary:
    "border-earth bg-grass text-white hover:brightness-105",
  outline:
    "border-earth bg-card text-fg hover:bg-soft",
  ghost:
    "border-transparent bg-transparent text-muted shadow-none hover:border-earth hover:text-fg hover:shadow-[4px_4px_0_0_var(--fg)]",
} as const;

const sizes = {
  sm: "min-h-9 px-3 text-[13px]",
  md: "min-h-11 px-5 text-[14px]",
  lg: "min-h-12 px-6 text-[15px]",
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
    "pixel-press inline-flex items-center justify-center gap-2 border-[3px] font-medium",
    "shadow-[4px_4px_0_0_var(--fg)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_0_var(--fg)]",
    "disabled:pointer-events-none disabled:opacity-50",
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
