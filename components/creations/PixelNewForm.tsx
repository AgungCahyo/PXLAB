"use client"

import { useActionState, useMemo, useState, type CSSProperties } from "react"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Input } from "@/components/ui/Input"
import { createDraftAction, type CreationActionState } from "@/features/creations/actions"
import { isUnnamedTitle } from "@/lib/creations"
import { copy, pixelSizePresetLabels } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  formatPixelSize,
  PIXEL_CANVAS_AREA_MAX,
  PIXEL_CANVAS_MAX,
  PIXEL_CANVAS_MIN,
  PIXEL_DEFAULT_PRESET,
  PIXEL_INK,
  PIXEL_PAPER,
  PIXEL_SIZE_PRESETS,
  isPixelCanvasSize,
  type PixelSizePresetId,
  type PixelStageGround,
} from "../../lib/pixel"
import { CREATION_TITLE_MAX } from "@/lib/site"
import { cn } from "@/lib/utils"

function previewBox(width: number, height: number, max = 44) {
  if (width >= height) {
    return { width: max, height: Math.max(8, Math.round((max * height) / width)) }
  }
  return { width: Math.max(8, Math.round((max * width) / height)), height: max }
}

function formatGroupedCount(n: number, lang: Lang) {
  const digits = String(Math.abs(Math.trunc(n)))
  const sep = lang === "id" ? "." : ","
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

function groundFill(ground: PixelStageGround): CSSProperties {
  if (ground === "ink") return { backgroundColor: PIXEL_INK }
  if (ground === "paper") return { backgroundColor: PIXEL_PAPER }
  return {
    backgroundColor: PIXEL_PAPER,
    backgroundImage:
      "linear-gradient(45deg, #e8e4d8 25%, transparent 25%), linear-gradient(-45deg, #e8e4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e4d8 75%), linear-gradient(-45deg, transparent 75%, #e8e4d8 75%)",
    backgroundSize: "10px 10px",
    backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
  }
}

function SizeChoice({
  lang,
  selected,
  title,
  subtitle,
  onClick,
}: {
  lang: Lang
  selected: boolean
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${title} ${subtitle}`}
      title={`${title} ${subtitle}`}
      className={cn(
        "pixel-choice inline-flex min-h-9 items-center rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all hover:bg-slate-50",
        selected && "border-purple-600 bg-purple-50/70 text-purple-900",
      )}
    >
      {selected ? <span className="sr-only">{copy.sizeSelected[lang]}</span> : null}
      <span className="tabular-nums">{subtitle}</span>
    </button>
  )
}

/** Compact new-artwork form. The dialog shell lives in `NewArtworkDialog`. */
export function PixelNewForm({
  lang,
  onCancel,
}: {
  lang: Lang
  onCancel: () => void
}) {
  const [state, action, pending] = useActionState<CreationActionState, FormData>(
    createDraftAction,
    null,
  )
  const [title, setTitle] = useState("")
  const [titleError, setTitleError] = useState(false)
  const [preset, setPreset] = useState<PixelSizePresetId | "custom">(PIXEL_DEFAULT_PRESET)
  const [customWidth, setCustomWidth] = useState(128)
  const [customHeight, setCustomHeight] = useState(64)
  const [ground, setGround] = useState<PixelStageGround>("paper")

  const size = useMemo(() => {
    if (preset === "custom") return { width: customWidth, height: customHeight }
    const found = PIXEL_SIZE_PRESETS.find((item) => item.id === preset)
    return found ?? PIXEL_SIZE_PRESETS[2]
  }, [preset, customWidth, customHeight])

  const sizeOk = isPixelCanvasSize(size.width, size.height)
  const titleOk = title.trim().length > 0 && !isUnnamedTitle(title.trim())
  const sideOutOfRange =
    customWidth < PIXEL_CANVAS_MIN ||
    customWidth > PIXEL_CANVAS_MAX ||
    customHeight < PIXEL_CANVAS_MIN ||
    customHeight > PIXEL_CANVAS_MAX
  const areaTooLarge =
    Number.isFinite(customWidth) &&
    Number.isFinite(customHeight) &&
    customWidth >= PIXEL_CANVAS_MIN &&
    customHeight >= PIXEL_CANVAS_MIN &&
    customWidth <= PIXEL_CANVAS_MAX &&
    customHeight <= PIXEL_CANVAS_MAX &&
    customWidth * customHeight > PIXEL_CANVAS_AREA_MAX

  const rangeHint = copy.sizeRangeError[lang]
    .replaceAll("{min}", String(PIXEL_CANVAS_MIN))
    .replaceAll("{max}", String(PIXEL_CANVAS_MAX))
  const areaHint = copy.sizeAreaError[lang].replaceAll("{area}", String(PIXEL_CANVAS_AREA_MAX))
  const customHint = copy.sizeCustomHint[lang]
    .replaceAll("{min}", String(PIXEL_CANVAS_MIN))
    .replaceAll("{max}", String(PIXEL_CANVAS_MAX))
    .replaceAll("{area}", String(PIXEL_CANVAS_AREA_MAX))
  const sizeLabel = formatPixelSize(size.width, size.height)
  const pixelCount = copy.sizePixelCount[lang].replace(
    "{n}",
    formatGroupedCount(size.width * size.height, lang),
  )
  const thumb = previewBox(size.width, size.height)

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!titleOk) {
          event.preventDefault()
          setTitleError(true)
        }
      }}
      className="grid min-w-0 gap-3"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="type" value="pixel" />
      <input type="hidden" name="title" value={title.trim()} />
      <input type="hidden" name="width" value={size.width} />
      <input type="hidden" name="height" value={size.height} />
      <input type="hidden" name="stage_ground" value={ground} />

      {state && "error" in state ? (
        <Alert tone="error" flat>
          {state.error === "title_required"
            ? copy.createTitleRequired[lang]
            : copy.errors[state.error][lang]}
        </Alert>
      ) : null}

      {/* Thumbnail sits inline with the title to keep the sheet short. */}
      <div className="flex min-w-0 items-end gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/80 p-0.5 shadow-sm"
          aria-hidden="true"
        >
          <div style={{ width: thumb.width, height: thumb.height, ...groundFill(ground) }} />
        </div>
        <Input
          id="new-artwork-title"
          name="title-field"
          maxLength={CREATION_TITLE_MAX}
          autoComplete="off"
          label={copy.createTitleLabel[lang]}
          placeholder={copy.createTitlePlaceholder[lang]}
          value={title}
          error={titleError && !titleOk ? copy.createTitleRequired[lang] : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            if (titleError) setTitleError(false)
          }}
        />
      </div>

      <fieldset className="grid min-w-0 gap-2">
        <legend className="text-[13px] font-semibold text-fg">{copy.pixelCanvasSize[lang]}</legend>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.pixelCanvasSize[lang]}>
          {PIXEL_SIZE_PRESETS.map((item) => {
            const labels = pixelSizePresetLabels[item.id]
            return (
              <SizeChoice
                key={item.id}
                lang={lang}
                selected={preset === item.id}
                title={labels.name[lang]}
                subtitle={formatPixelSize(item.width, item.height)}
                onClick={() => setPreset(item.id)}
              />
            )
          })}
          <SizeChoice
            lang={lang}
            selected={preset === "custom"}
            title={copy.sizeCustom[lang]}
            subtitle={`${copy.sizeWidth[lang]} × ${copy.sizeHeight[lang]}`}
            onClick={() => setPreset("custom")}
          />
        </div>
      </fieldset>

      {preset === "custom" ? (
        <div className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
          <p className="text-[11px] leading-snug text-muted">{customHint}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              id="custom-width"
              type="number"
              min={PIXEL_CANVAS_MIN}
              max={PIXEL_CANVAS_MAX}
              label={copy.sizeWidth[lang]}
              value={customWidth}
              error={customWidth < PIXEL_CANVAS_MIN || customWidth > PIXEL_CANVAS_MAX ? rangeHint : undefined}
              onChange={(event) => setCustomWidth(Number(event.target.value))}
            />
            <Input
              id="custom-height"
              type="number"
              min={PIXEL_CANVAS_MIN}
              max={PIXEL_CANVAS_MAX}
              label={copy.sizeHeight[lang]}
              value={customHeight}
              error={customHeight < PIXEL_CANVAS_MIN || customHeight > PIXEL_CANVAS_MAX ? rangeHint : undefined}
              onChange={(event) => setCustomHeight(Number(event.target.value))}
            />
          </div>
          {areaTooLarge && !sideOutOfRange ? (
            <p className="text-[12px] text-brick" role="status">
              {areaHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <fieldset className="grid min-w-0 gap-2">
        <legend className="text-[13px] font-semibold text-fg">{copy.canvasBackground[lang]}</legend>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["checker", copy.canvasBackgroundTransparent[lang]],
              ["paper", copy.canvasBackgroundLight[lang]],
              ["ink", copy.canvasBackgroundDark[lang]],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={ground === value}
              onClick={() => setGround(value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                ground === value
                  ? "border-purple-500 bg-purple-50 text-fg"
                  : "border-slate-200/80 bg-card text-muted hover:text-fg",
              )}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded border border-slate-200/80"
                style={groundFill(value)}
                aria-hidden="true"
              />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3 max-md:sticky max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        <p className="mr-auto text-[12px] text-muted">
          {sizeLabel} · {pixelCount}
        </p>
        <button type="button" onClick={onCancel} className={socialButtonClass({ variant: "ghost", size: "md" })}>
          {copy.createCancel[lang]}
        </button>
        <button
          type="submit"
          disabled={pending || !sizeOk || !titleOk}
          aria-busy={pending || undefined}
          className={socialButtonClass({ variant: "solid", size: "md" })}
        >
          {pending ? copy.sizeStarting[lang] : copy.createOpenEditor[lang]}
        </button>
      </div>
    </form>
  )
}
