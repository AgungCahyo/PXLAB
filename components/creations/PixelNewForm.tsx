"use client"

import { useActionState, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { createDraftAction, type CreationActionState } from "@/features/creations/actions"
import { isUnnamedTitle } from "@/lib/creations"
import { copy, pixelSizePresetLabels } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import {
  formatPixelSize,
  PIXEL_ASPECT_PRESETS,
  PIXEL_CANVAS_AREA_MAX,
  PIXEL_CANVAS_MAX,
  PIXEL_CANVAS_MIN,
  PIXEL_DEFAULT_PRESET,
  PIXEL_INK,
  PIXEL_PAPER,
  PIXEL_SIZE_PRESETS,
  PIXEL_SQUARE_PRESETS,
  isPixelCanvasSize,
  type PixelSizePresetId,
  type PixelStageGround,
} from "../../lib/pixel"
import { CREATION_TITLE_MAX } from "@/lib/site"
import { cn } from "@/lib/utils"

function previewBox(width: number, height: number, max = 240) {
  if (width >= height) {
    return { width: max, height: Math.max(32, Math.round((max * height) / width)) }
  }
  return { width: Math.max(32, Math.round((max * width) / height)), height: max }
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
  return (
    <div className="relative flex min-h-44 w-full items-center justify-center bg-slate-50/80 py-6 sm:aspect-square sm:min-h-0 sm:py-0">
      <div
        className="pixel-deco rounded-sm border border-slate-200/80 shadow-sm"
        style={{
          width: box.width,
          height: box.height,
          ...groundFill(ground),
        }}
        aria-hidden="true"
      />
    </div>
  )
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
      className={cn(
        "pixel-choice flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-left transition-all hover:bg-slate-50 shadow-sm",
        selected && "border-purple-600 bg-purple-50/70 shadow-purple-500/10",
      )}
    >
      {selected ? <span className="sr-only">{copy.sizeSelected[lang]}</span> : null}
      <span className="text-[14px] font-medium leading-tight text-fg">{title}</span>
      <span className="text-[11px] leading-snug text-muted">{subtitle}</span>
    </button>
  )
}

export function PixelNewForm({
  lang,
  variant = "page",
}: {
  lang: Lang
  variant?: "page" | "dialog"
}) {
  const router = useRouter()
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

  const isDialog = variant === "dialog"

  const form = (
    <form
      action={action}
      onSubmit={(event) => {
        if (!titleOk) {
          event.preventDefault()
          setTitleError(true)
        }
      }}
      className="min-w-0"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="type" value="pixel" />
      <input type="hidden" name="title" value={title.trim()} />
      <input type="hidden" name="width" value={size.width} />
      <input type="hidden" name="height" value={size.height} />
      <input type="hidden" name="stage_ground" value={ground} />

      <div className={cn("grid min-w-0 gap-5", isDialog ? "sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-start" : "lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start")}>
        <aside className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/60">
            <div className={isDialog ? "px-3 py-3" : undefined}>
              <SizePreview width={size.width} height={size.height} ground={ground} />
            </div>
            <div className="border-t border-slate-200/80 bg-card px-3 py-2.5 text-center">
              <p className="text-[14px] font-semibold text-fg">{sizeLabel}</p>
              <p className="text-[12px] text-muted">{pixelCount}</p>
            </div>
          </div>
        </aside>

        <div className={cn("grid min-w-0 gap-5", !isDialog && "rounded-3xl border border-slate-200/80 bg-card p-4 shadow-sm sm:p-6")}>
          {state && "error" in state ? (
            <Alert tone="error" flat>
              {state.error === "title_required"
                ? copy.createTitleRequired[lang]
                : copy.errors[state.error][lang]}
            </Alert>
          ) : null}

          <Input
            appearance="social"
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

          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-[14px] font-medium text-fg">{copy.pixelCanvasSize[lang]}</legend>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={copy.pixelCanvasSize[lang]}>
              {[...PIXEL_SQUARE_PRESETS, ...PIXEL_ASPECT_PRESETS].map((item) => {
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
            <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[13px] leading-snug text-muted">{customHint}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  appearance="social"
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
                  appearance="social"
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
                    "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                    ground === value
                      ? "border-purple-500 bg-purple-50 text-fg"
                      : "border-slate-200/80 bg-white text-muted hover:text-fg",
                  )}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-md border border-slate-200/80"
                    style={groundFill(value)}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-4">
            <p className="mr-auto text-[13px] text-muted">{sizeLabel}</p>
            <Link href={href(lang, "/dashboard")} className={socialButtonClass({ variant: "ghost", size: "md" })}>
              {copy.createCancel[lang]}
            </Link>
            <button
              type="submit"
              disabled={pending || !sizeOk || !titleOk}
              aria-busy={pending || undefined}
              className={socialButtonClass({ variant: "solid", size: "md" })}
            >
              {pending ? copy.sizeStarting[lang] : copy.createOpenEditor[lang]}
            </button>
          </div>
        </div>
      </div>
    </form>
  )

  if (variant !== "dialog") return form

  return (
    <Dialog
      open
      size="lg"
      tone="social"
      onClose={() => router.push(href(lang, "/dashboard"))}
      title={copy.createNewHeading[lang]}
      closeLabel={copy.createCancel[lang]}
    >
      {form}
    </Dialog>
  )
}
