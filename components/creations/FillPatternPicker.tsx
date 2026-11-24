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
      className="h-8 w-8 shrink-0 rounded-md border border-white/15 bg-[#231f35] text-[#e8e3f8] [image-rendering:pixelated]"
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
        <label className="shrink-0 text-[12px] font-medium text-[#e8e3f8]/80" htmlFor={id}>
          {copy.pixelFillPattern[lang]}
        </label>
        <select
          id={id}
          value={value}
          className="studio-control min-w-0 flex-1 rounded-md border border-white/10 bg-[#231f35] px-2 text-[12px] text-[#e8e3f8]"
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
        <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-[#e8e3f8]/50">
          {copy.pixelFillPatternHint[lang]}
        </p>
      ) : null}
    </div>
  )
}
