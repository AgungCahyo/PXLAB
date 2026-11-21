"use client"

import { useId } from "react"
import type { PixelLayerInfo, PixelLayerStylePatch } from "@/components/canvas/PixelBoard"
import { copy, pixelBlendLabels } from "@/lib/copy"
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
    <div className="mt-3 grid gap-2.5 border-t-[3px] border-earth pt-3" role="group" aria-label={copy.pixelLayerStyle[lang]}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 text-[13px] font-medium text-fg" htmlFor={opacityId}>
            {copy.pixelLayerOpacity[lang]}
          </label>
          <span className="w-12 text-right text-[13px] tabular-nums text-fg">{layer.opacity}%</span>
        </div>
        <input
          id={opacityId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={layer.opacity}
          className="w-full"
          onChange={(event) => onStyle(layer.id, { opacity: Number(event.target.value) })}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-[13px] font-medium text-fg" htmlFor={blendId}>
          {copy.pixelLayerBlend[lang]}
        </label>
        <select
          id={blendId}
          value={layer.blend}
          className="studio-control min-w-0 flex-1 border-[3px] border-earth bg-bg px-2 text-[13px] text-fg"
          onChange={(event) => onStyle(layer.id, { blend: event.target.value as PixelBlendMode })}
        >
          {PIXEL_BLEND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {pixelBlendLabels[mode][lang]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-fg" htmlFor={lockId} title={isBase ? copy.pixelLayerLockAlphaBase[lang] : undefined}>
        <input
          id={lockId}
          type="checkbox"
          checked={layer.lockAlpha}
          disabled={isBase}
          onChange={(event) => onStyle(layer.id, { lockAlpha: event.target.checked })}
        />
        {copy.pixelLayerLockAlpha[lang]}
      </label>
      <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
        {copy.pixelLayerStyleHint[lang]}
      </p>
    </div>
  )
}
