import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  appearance?: "default" | "social";
};

export function Input({
  className,
  label,
  hint,
  error,
  id,
  appearance = "default",
  ...props
}: InputProps) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[14px] font-medium text-fg">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 w-full px-3 text-[15px] text-fg placeholder:text-muted",
          appearance === "social"
            ? cn(
                "border bg-soft focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky",
                error ? "border-brick" : "border-[color:var(--soc-hairline)]",
              )
            : cn(
                "border-[3px] bg-bg transition-[box-shadow,border-color] duration-150",
                "focus-visible:border-fg focus-visible:outline-none focus-visible:shadow-[4px_4px_0_0_var(--fg)]",
                error ? "border-brick" : "border-earth",
              ),
          className,
        )}
        {...props}
      />
      {hint ? (
        <p id={id ? `${id}-hint` : undefined} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="text-[13px] text-brick" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
