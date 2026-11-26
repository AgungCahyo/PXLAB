import type { ReactNode, TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

export function Textarea({ className, label, hint, error, id, ...props }: TextareaProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-[14px] font-semibold text-fg">
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-28 w-full rounded-[2px] p-3.5 text-[15px] text-fg placeholder:text-muted/60 transition-colors",
          "border border-line bg-soft focus-visible:border-accent focus-visible:bg-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          error ? "border-brick ring-1 ring-brick" : null,
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
        <p id={id ? `${id}-error` : undefined} className="text-[13px] font-medium text-brick" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
