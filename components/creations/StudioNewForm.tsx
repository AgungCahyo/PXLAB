"use client"

import { useActionState, useMemo, useState } from "react"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { createDraftAction, type CreationActionState } from "@/features/creations/actions"
import { DRAFT_UNNAMED_TITLE } from "@/lib/creations"
import { copy, pixelSizePresetLabels } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  PIXEL_CANVAS_MAX,
  PIXEL_CANVAS_MIN,
  PIXEL_DEFAULT_PRESET,
  PIXEL_SIZE_PRESETS,
  isPixelCanvasSize,
  type PixelSizePresetId,
} from "@/lib/pixel"

function SizePreview({ width, height }: { width: number; height: number }) {
  const box = 80
  const w = Math.max(12, Math.round((width / PIXEL_CANVAS_MAX) * box))
  const h = Math.max(12, Math.round((height / PIXEL_CANVAS_MAX) * box))
  return (
    <div className="flex h-24 items-center justify-center bg-soft">
      <div
        className="pixel-deco border-[3px] border-earth bg-card"
        style={{
          width: w,
          height: h,
          backgroundImage:
            "linear-gradient(45deg, #e8e4d8 25%, transparent 25%), linear-gradient(-45deg, #e8e4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e4d8 75%), linear-gradient(-45deg, transparent 75%, #e8e4d8 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
        }}
        aria-hidden="true"
      />
    </div>
  )
}

export function StudioNewForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState<CreationActionState, FormData>(
    createDraftAction,
    null,
  )
  const [preset, setPreset] = useState<PixelSizePresetId | "custom">(PIXEL_DEFAULT_PRESET)
  const [customWidth, setCustomWidth] = useState(128)
  const [customHeight, setCustomHeight] = useState(64)

  const size = useMemo(() => {
    if (preset === "custom") return { width: customWidth, height: customHeight }
    const found = PIXEL_SIZE_PRESETS.find((item) => item.id === preset)
    return found ?? PIXEL_SIZE_PRESETS[2]
  }, [preset, customWidth, customHeight])

  const sizeOk = isPixelCanvasSize(size.width, size.height)
  const rangeHint = copy.sizeRangeError[lang]
    .replaceAll("{min}", String(PIXEL_CANVAS_MIN))
    .replaceAll("{max}", String(PIXEL_CANVAS_MAX))

  return (
    <form action={action} className="grid gap-6 pb-36 md:pb-0">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="type" value="pixel" />
      <input type="hidden" name="title" value={DRAFT_UNNAMED_TITLE} />
      <input type="hidden" name="width" value={size.width} />
      <input type="hidden" name="height" value={size.height} />
      {state && "error" in state ? (
        <Alert tone="error">{copy.errors[state.error][lang]}</Alert>
      ) : null}

      <p className="text-[15px] leading-relaxed text-muted">{copy.sizePickerIntro[lang]}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PIXEL_SIZE_PRESETS.map((item) => {
          const labels = pixelSizePresetLabels[item.id]
          const selected = preset === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              aria-pressed={selected}
              className="pixel-choice grid gap-2 p-3 text-left hover:bg-soft"
            >
              <SizePreview width={item.width} height={item.height} />
              {selected ? (
                <span className="pixel-kicker text-brick">{copy.sizeSelected[lang]}</span>
              ) : null}
              <span className="font-medium">{labels.name[lang]}</span>
              <span className="text-[12px] text-muted">
                {item.width} × {item.height}
              </span>
              <span className="text-[13px] leading-snug text-muted">{labels.use[lang]}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setPreset("custom")}
          aria-pressed={preset === "custom"}
          className="pixel-choice grid gap-2 p-3 text-left hover:bg-soft"
        >
          <SizePreview width={customWidth} height={customHeight} />
          {preset === "custom" ? (
            <span className="pixel-kicker text-brick">{copy.sizeSelected[lang]}</span>
          ) : null}
          <span className="font-medium">{copy.sizeCustom[lang]}</span>
          <span className="text-[12px] text-muted">
            {customWidth} × {customHeight}
          </span>
          <span className="text-[13px] leading-snug text-muted">{copy.sizeCustomHint[lang]}</span>
        </button>
      </div>

      {preset === "custom" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="custom-width"
            type="number"
            min={PIXEL_CANVAS_MIN}
            max={PIXEL_CANVAS_MAX}
            label={copy.sizeWidth[lang]}
            value={customWidth}
            error={
              customWidth < PIXEL_CANVAS_MIN || customWidth > PIXEL_CANVAS_MAX
                ? rangeHint
                : undefined
            }
            onChange={(event) => setCustomWidth(Number(event.target.value))}
          />
          <Input
            id="custom-height"
            type="number"
            min={PIXEL_CANVAS_MIN}
            max={PIXEL_CANVAS_MAX}
            label={copy.sizeHeight[lang]}
            value={customHeight}
            error={
              customHeight < PIXEL_CANVAS_MIN || customHeight > PIXEL_CANVAS_MAX
                ? rangeHint
                : undefined
            }
            onChange={(event) => setCustomHeight(Number(event.target.value))}
          />
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 border-t-[3px] border-earth bg-bg px-5 py-3 sm:px-8 lg:px-16 md:static md:bottom-auto md:z-auto md:border-0 md:bg-transparent md:p-0">
        <p className="mb-2 text-[13px] text-muted md:sr-only">
          {size.width} × {size.height}
        </p>
        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={pending || !sizeOk}
          aria-busy={pending || undefined}
        >
          {pending ? copy.sizeStarting[lang] : copy.sizeStart[lang]}
        </Button>
      </div>
    </form>
  )
}
