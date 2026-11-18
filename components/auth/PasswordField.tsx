"use client"

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { cn } from "@/lib/utils"

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  showLabel: string
  hideLabel: string
}

export function PasswordField({
  className,
  label,
  hint,
  error,
  id,
  showLabel,
  hideLabel,
  ...props
}: PasswordFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [visible, setVisible] = useState(false)
  const describedBy =
    [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={fieldId} className="text-[14px] font-medium text-fg">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-h-11 w-full border-[3px] bg-bg py-2 pl-3 pr-12 text-[15px] text-fg placeholder:text-muted",
            "transition-[box-shadow,border-color] duration-150",
            "focus-visible:border-fg focus-visible:outline-none focus-visible:shadow-[4px_4px_0_0_var(--fg)]",
            error ? "border-brick" : "border-earth",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-muted hover:text-fg focus-visible:text-fg focus-visible:outline-none"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          tabIndex={0}
        >
          <PixelIcon name={visible ? "eyeOff" : "eye"} className="h-5 w-5" />
        </button>
      </div>
      {hint ? (
        <p id={`${fieldId}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="text-[13px] text-brick" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
