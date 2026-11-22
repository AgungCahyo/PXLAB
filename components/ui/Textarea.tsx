import type { ReactNode, TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  appearance?: "default" | "social"
}

export function Textarea({ className, label, hint, error, id, appearance = "default", ...props }: TextareaProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[14px] font-medium text-fg">
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-28 w-full px-3 py-2 text-[15px] text-fg placeholder:text-muted",
          appearance === "social"
            ? cn(
                "border bg-soft focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky",
                error ? "border-brick" : "border-[color:var(--soc-hairline)]",
              )
            : cn("border-[3px] bg-bg", error ? "border-brick" : "border-earth"),
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
  )
}
