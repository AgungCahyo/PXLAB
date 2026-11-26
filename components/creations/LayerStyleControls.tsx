"use client"

import { useId } from "react"
import type { PixelLayerInfo, PixelLayerStylePatch } from "@/components/canvas/PixelBoard"
import { copy, pixelBlendLabels } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_BLEND_MODES, type PixelBlendMode } from "@/lib/pixel-blend"

type Props = {
  lang: Lang
  layer: PixelLayerInfo
  /** The bottom layer has no transparent cells, so the transparency lock does nothing there. */
  isBase: boolean
  onStyle: (id: string, patch: PixelLayerStylePatch) => boolean
}

export function LayerStyleControls({ lang, layer, isBase, onStyle }: Props) {
  const opacityId = useId()
  const blendId = useId()
  const lockId = useId()
  return (
    <div className="mt-3 grid gap-2.5 border-t border-white/[0.08] pt-3" role="group" aria-label={copy.pixelLayerStyle[lang]}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 text-[12px] font-medium text-[var(--studio-fg)]/80" htmlFor={opacityId}>
            {copy.pixelLayerOpacity[lang]}
          </label>
          <span className="w-12 text-right text-[12px] tabular-nums text-[var(--studio-fg)]">{layer.opacity}%</span>
        </div>
        <input
          id={opacityId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={layer.opacity}
          className="w-full accent-[var(--studio-accent)]"
          onChange={(event) => onStyle(layer.id, { opacity: Number(event.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-[12px] font-medium text-[var(--studio-fg)]/80" htmlFor={blendId}>
          {copy.pixelLayerBlend[lang]}
        </label>
        <select
          id={blendId}
          value={layer.blend}
          className="studio-control min-w-0 flex-1 rounded-[2px] border border-[var(--studio-border-color)] bg-[var(--studio-surface-2)] px-2 text-[12px] text-[var(--studio-fg)]"
          onChange={(event) => onStyle(layer.id, { blend: event.target.value as PixelBlendMode })}
        >
          {PIXEL_BLEND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {pixelBlendLabels[mode][lang]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-[var(--studio-fg)]/85" htmlFor={lockId} title={isBase ? copy.pixelLayerLockAlphaBase[lang] : undefined}>
        <input
          id={lockId}
          type="checkbox"
          checked={layer.lockAlpha}
          disabled={isBase}
          onChange={(event) => onStyle(layer.id, { lockAlpha: event.target.checked })}
        />
        {copy.pixelLayerLockAlpha[lang]}
      </label>
      <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-[var(--studio-fg-muted)]">
        {copy.pixelLayerStyleHint[lang]}
      </p>
    </div>
  )
}
