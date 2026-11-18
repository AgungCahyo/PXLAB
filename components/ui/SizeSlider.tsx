"use client"

import { PIXEL_STROKE_MAX, PIXEL_STROKE_MIN, clampStrokeWidth } from "@/lib/pixel"
import { cn } from "@/lib/utils"

export function SizeSlider({
  id,
  label,
  value,
  onChange,
  min = PIXEL_STROKE_MIN,
  max = PIXEL_STROKE_MAX,
  showLabel = false,
  className,
}: {
  id: string
  label: string
  value: number
  onChange: (size: number) => void
  min?: number
  max?: number
  /** Visible label; default false — studio prefers icon chrome + aria. */
  showLabel?: boolean
  className?: string
}) {
  const clamped = clampStrokeWidth(Math.max(min, Math.min(max, value)))
  return (
    <div className={cn("grid gap-1", className)}>
      <label
        className={cn(
          "font-medium text-fg",
          showLabel ? "text-[12px] md:text-[13px]" : "sr-only",
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="studio-row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={clamped}
          aria-label={label}
          title={`${label}: ${clamped}`}
          onChange={(event) => onChange(clampStrokeWidth(Number(event.target.value)))}
          className="studio-control min-w-0 flex-1 accent-fg"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={1}
          value={clamped}
          aria-label={label}
          title={label}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (!Number.isFinite(next)) return
            onChange(clampStrokeWidth(Math.max(min, Math.min(max, next))))
          }}
          className="studio-control w-14 border-[3px] border-earth bg-bg px-1 text-center text-[12px] font-medium text-fg md:w-16 md:text-[13px]"
        />
      </div>
    </div>
  )
}
