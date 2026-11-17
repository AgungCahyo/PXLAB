"use client"

import { useActionState, useMemo, useState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { createDraftAction, type CreationActionState } from "@/features/creations/actions"
import { isUnnamedTitle } from "@/lib/creations"
import { copy, pixelSizePresetLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
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
} from "@/lib/pixel"
import { CREATION_TITLE_MAX } from "@/lib/site"
import { cn } from "@/lib/utils"

function previewBox(width: number, height: number, max = 176) {
  if (width >= height) {
    return { width: max, height: Math.max(24, Math.round((max * height) / width)) }
  }
  return { width: Math.max(24, Math.round((max * width) / height)), height: max }
}

function formatGroupedCount(n: number, lang: Lang) {
  const digits = String(Math.abs(Math.trunc(n)))
  const sep = lang === "id" ? "." : ","
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

function SizePreview({
  width,
  height,
  ground,
}: {
  width: number
  height: number
  ground: PixelStageGround
}) {
  const box = previewBox(width, height)
  const checker =
    "linear-gradient(45deg, #e8e4d8 25%, transparent 25%), linear-gradient(-45deg, #e8e4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e4d8 75%), linear-gradient(-45deg, transparent 75%, #e8e4d8 75%)"
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border-[3px] border-earth bg-soft p-3">
      <div
        className="pixel-deco border-[3px] border-earth"
        style={{
          width: box.width,
          height: box.height,
          backgroundColor: ground === "ink" ? PIXEL_INK : PIXEL_PAPER,
          backgroundImage: ground === "checker" ? checker : undefined,
          backgroundSize: ground === "checker" ? "8px 8px" : undefined,
          backgroundPosition: ground === "checker" ? "0 0, 0 4px, 4px -4px, -4px 0" : undefined,
        }}
        aria-hidden="true"
      />
    </div>
  )
}

export function PixelNewForm({ lang }: { lang: Lang }) {
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
  const areaHint = copy.sizeAreaError[lang].replaceAll(
    "{area}",
    String(PIXEL_CANVAS_AREA_MAX),
  )
  const customHint = copy.sizeCustomHint[lang]
    .replaceAll("{min}", String(PIXEL_CANVAS_MIN))
    .replaceAll("{max}", String(PIXEL_CANVAS_MAX))
    .replaceAll("{area}", String(PIXEL_CANVAS_AREA_MAX))
  const sizeLabel = formatPixelSize(size.width, size.height)
  const pixelCount = copy.sizePixelCount[lang].replace(
    "{n}",
    formatGroupedCount(size.width * size.height, lang),
  )

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!titleOk) {
          event.preventDefault()
          setTitleError(true)
        }
      }}
      className="grid gap-0 overflow-hidden border-[3px] border-earth bg-card"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="type" value="pixel" />
      <input type="hidden" name="title" value={title.trim()} />
      <input type="hidden" name="width" value={size.width} />
      <input type="hidden" name="height" value={size.height} />
      <input type="hidden" name="stage_ground" value={ground} />

      <div className="border-b-[3px] border-earth px-5 py-4">
        <h1 className="pixel-title">{copy.createNewHeading[lang]}</h1>
        <p className="mt-1 text-[13px] text-muted">{copy.createModalHint[lang]}</p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid order-2 gap-5 lg:order-1">
          {state && "error" in state ? (
            <Alert tone="error">
              {state.error === "title_required"
                ? copy.createTitleRequired[lang]
                : copy.errors[state.error][lang]}
            </Alert>
          ) : null}

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

          <fieldset className="grid gap-2">
            <legend className="text-[14px] font-medium text-fg">{copy.pixelCanvasSize[lang]}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group">
              {PIXEL_SIZE_PRESETS.map((item) => {
                const labels = pixelSizePresetLabels[item.id]
                const selected = preset === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id)}
                    aria-pressed={selected}
                    className="pixel-choice px-2 py-3 text-center text-[14px] font-medium hover:bg-soft"
                  >
                    {selected ? <span className="sr-only">{copy.sizeSelected[lang]}</span> : null}
                    {labels.name[lang]}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setPreset("custom")}
                aria-pressed={preset === "custom"}
                className="pixel-choice px-2 py-3 text-center text-[14px] font-medium hover:bg-soft"
              >
                {preset === "custom" ? (
                  <span className="sr-only">{copy.sizeSelected[lang]}</span>
                ) : null}
                {copy.sizeCustom[lang]}
              </button>
            </div>
          </fieldset>

          {preset === "custom" ? (
            <div className="grid gap-3">
              <p className="text-[13px] leading-snug text-muted">{customHint}</p>
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
              {areaTooLarge && !sideOutOfRange ? (
                <p className="text-[13px] text-brick" role="status">
                  {areaHint}
                </p>
              ) : null}
            </div>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="text-[14px] font-medium text-fg">{copy.canvasBackground[lang]}</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["checker", copy.canvasBackgroundTransparent[lang], "checker"],
                  ["paper", copy.canvasBackgroundLight[lang], "paper"],
                  ["ink", copy.canvasBackgroundDark[lang], "ink"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={ground === value}
                  onClick={() => setGround(value)}
                  className="pixel-choice inline-flex items-center gap-2 px-3 py-2 text-[14px] font-medium"
                >
                  <span
                    className={cn(
                      "h-6 w-6 shrink-0 border-[3px] border-earth",
                      value === "ink" ? "bg-ink" : "bg-bg",
                    )}
                    style={
                      value === "checker"
                        ? {
                            backgroundImage:
                              "linear-gradient(45deg, #e8e4d8 25%, transparent 25%), linear-gradient(-45deg, #e8e4d8 25%, transparent 25%)",
                            backgroundSize: "8px 8px",
                          }
                        : value === "ink"
                          ? { backgroundColor: PIXEL_INK }
                          : { backgroundColor: PIXEL_PAPER }
                    }
                    aria-hidden="true"
                  />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted">{copy.canvasBackgroundHint[lang]}</p>
          </fieldset>
        </div>

        <aside className="grid order-1 gap-2 lg:order-2">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
            {copy.createPreview[lang]}
          </p>
          <SizePreview width={size.width} height={size.height} ground={ground} />
          <p className="text-center text-[15px] font-medium text-fg">{sizeLabel}</p>
          <p className="text-center text-[13px] text-muted">{pixelCount}</p>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t-[3px] border-earth bg-bg px-5 py-3 max-md:sticky max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] max-md:z-30">
        <p className="mr-auto text-[13px] text-muted md:sr-only">{sizeLabel}</p>
        <Link
          href={href(lang, "/dashboard")}
          className="inline-flex min-h-11 items-center px-4 text-[14px] text-muted hover:text-fg"
        >
          {copy.createCancel[lang]}
        </Link>
        <Button
          type="submit"
          disabled={pending || !sizeOk || !titleOk}
          aria-busy={pending || undefined}
        >
          {pending ? copy.sizeStarting[lang] : copy.createOpenEditor[lang]}
        </Button>
      </div>
    </form>
  )
}
