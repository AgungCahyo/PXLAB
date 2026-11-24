"use client"

import { useId } from "react"
import { copy, pixelFillPatternLabels } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_FILL_PATTERNS, patternHit, type PixelFillPattern } from "@/lib/pixel-pattern"

const PREVIEW = 8

function PatternPreview({ pattern }: { pattern: PixelFillPattern }) {
  const cells: Array<[number, number]> = []
  for (let y = 0; y < PREVIEW; y += 1)
    for (let x = 0; x < PREVIEW; x += 1) if (patternHit(pattern, x, y)) cells.push([x, y])
  return (
    <svg
      viewBox={`0 0 ${PREVIEW} ${PREVIEW}`}
      className="h-8 w-8 shrink-0 border-[2px] border-earth bg-bg text-fg [image-rendering:pixelated]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}

type Props = { lang: Lang; value: PixelFillPattern; onChange: (value: PixelFillPattern) => void }

export function FillPatternPicker({ lang, value, onChange }: Props) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-[13px] font-medium text-fg" htmlFor={id}>
          {copy.pixelFillPattern[lang]}
        </label>
        <select
          id={id}
          value={value}
          className="studio-control min-w-0 flex-1 border-[3px] border-earth bg-bg px-2 text-[13px] text-fg"
          onChange={(event) => onChange(event.target.value as PixelFillPattern)}
        >
          {PIXEL_FILL_PATTERNS.map((pattern) => (
            <option key={pattern} value={pattern}>
              {pixelFillPatternLabels[pattern][lang]}
            </option>
          ))}
        </select>
        <PatternPreview pattern={value} />
      </div>
      {value !== "solid" ? (
        <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
          {copy.pixelFillPatternHint[lang]}
        </p>
      ) : null}
    </div>
  )
}
