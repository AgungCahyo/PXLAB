"use client"

import { useId, useState } from "react"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { BRUSH_SPACING_MAX, clampBrushOptions, type BrushOptions } from "@/lib/pixel-brush"

type Props = {
  lang: Lang
  options: BrushOptions
  onChange: (next: BrushOptions) => void
  /** Returns a tip or null when nothing usable is selected / copied. */
  onTipFromSelection: () => BrushOptions["custom"]
  onTipFromClipboard: () => BrushOptions["custom"]
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1 text-[12px] font-medium text-[#e8e3f8]/80" htmlFor={id}>
          {label}
        </label>
        <span className="w-12 text-right text-[12px] tabular-nums text-[#e8e3f8]">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#8b5cf6] disabled:opacity-35"
      />
    </div>
  )
}

export function BrushOptionsPanel({ lang, options, onChange, onTipFromSelection, onTipFromClipboard }: Props) {
  const [tipError, setTipError] = useState(false)
  const set = (patch: Partial<BrushOptions>) => onChange(clampBrushOptions({ ...options, ...patch }))
  const applyTip = (tip: BrushOptions["custom"]) => {
    setTipError(tip === null)
    if (tip) set({ custom: tip })
  }
  const button =
    "studio-control s-btn inline-flex items-center border-transparent px-2.5 text-[12px] font-medium disabled:opacity-35"
  const check = "flex items-center gap-2 text-[12px] text-[#e8e3f8]/85"
  return (
    <div className="grid gap-2.5" role="group" aria-label={copy.pixelBrushOptions[lang]}>
      <Slider label={copy.pixelBrushOpacity[lang]} value={options.opacity} min={1} max={100} suffix="%" onChange={(opacity) => set({ opacity })} />
      <Slider label={copy.pixelBrushFlow[lang]} value={options.flow} min={1} max={100} suffix="%" onChange={(flow) => set({ flow })} />
      <Slider
        label={copy.pixelBrushHardness[lang]}
        value={options.hardness}
        min={0}
        max={100}
        suffix="%"
        disabled={options.custom !== null}
        onChange={(hardness) => set({ hardness })}
      />
      <Slider
        label={copy.pixelBrushSpacing[lang]}
        value={options.spacing}
        min={0}
        max={BRUSH_SPACING_MAX}
        suffix="%"
        onChange={(spacing) => set({ spacing })}
      />
      <label className={check}>
        <input type="checkbox" checked={options.pressureSize} onChange={(e) => set({ pressureSize: e.target.checked })} />
        {copy.pixelBrushPressureSize[lang]}
      </label>
      <label className={check}>
        <input type="checkbox" checked={options.pressureOpacity} onChange={(e) => set({ pressureOpacity: e.target.checked })} />
        {copy.pixelBrushPressureOpacity[lang]}
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={button} onClick={() => applyTip(onTipFromSelection())}>
          {copy.pixelBrushTipSelection[lang]}
        </button>
        <button type="button" className={button} onClick={() => applyTip(onTipFromClipboard())}>
          {copy.pixelBrushTipClipboard[lang]}
        </button>
        {options.custom ? (
          <button
            type="button"
            className={button}
            onClick={() => {
              setTipError(false)
              set({ custom: null })
            }}
          >
            {copy.pixelBrushTipClear[lang]}
          </button>
        ) : null}
      </div>
      {options.custom ? (
        <p className="text-[length:var(--studio-meta,0.75rem)] text-muted">
          {copy.pixelBrushTipActive[lang]
            .replace("{w}", String(options.custom.width))
            .replace("{h}", String(options.custom.height))}
        </p>
      ) : null}
      {tipError ? (
        <p role="status" className="text-[length:var(--studio-meta,0.75rem)] text-brick">
          {copy.pixelBrushTipFailed[lang]}
        </p>
      ) : null}
      <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
        {copy.pixelBrushDitherHint[lang]}
      </p>
    </div>
  )
}
