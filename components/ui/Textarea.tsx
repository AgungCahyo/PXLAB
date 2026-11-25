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
          "min-h-28 w-full rounded-2xl p-4 text-[15px] text-fg placeholder:text-muted/60 transition-all",
          "border border-slate-200 bg-slate-50/70 focus-visible:border-[#6355d8] focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20",
          error ? "border-brick ring-2 ring-brick/20" : null,
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
