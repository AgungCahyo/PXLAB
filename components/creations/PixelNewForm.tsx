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
import { copy, pixelSizePresetLabels } from "@/lib/copy"
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
} from "@/lib/pixel"
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
    <div className="relative flex min-h-44 w-full items-center justify-center bg-soft py-6 sm:aspect-square sm:min-h-0 sm:py-0">
      <div
        className="pixel-deco border border-[color:var(--soc-hairline)]"
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
      className="pixel-choice flex min-h-14 flex-col items-start justify-center gap-0.5 px-3 py-2 text-left hover:bg-soft"
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

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* Visual stage — the promise of the blank canvas */}
        <aside className="min-w-0 lg:sticky lg:top-[5.5rem]">
          <div className="overflow-hidden border border-[color:var(--soc-hairline)] bg-card">
            <SizePreview width={size.width} height={size.height} ground={ground} />
            <div className="border-t border-[color:var(--soc-hairline)] bg-card px-3 py-3 text-center">
              <p className="text-[15px] font-medium text-fg">{sizeLabel}</p>
              <p className="mt-0.5 text-[12px] text-muted">{pixelCount}</p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-muted lg:sr-only">{copy.createPreview[lang]}</p>
        </aside>

        <div className="grid min-w-0 gap-7">
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
            <p className="text-[13px] text-muted">{copy.createModalHint[lang]}</p>

            <p className="mt-2 text-[12px] font-medium uppercase tracking-wide text-muted">
              {copy.createSizeSquare[lang]}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group">
              {PIXEL_SQUARE_PRESETS.map((item) => {
                const labels = pixelSizePresetLabels[item.id]
                return (
                  <SizeChoice
                    key={item.id}
                    lang={lang}
                    selected={preset === item.id}
                    title={labels.name[lang]}
                    subtitle={labels.use[lang]}
                    onClick={() => setPreset(item.id)}
                  />
                )
              })}
            </div>

            <p className="mt-3 text-[12px] font-medium uppercase tracking-wide text-muted">
              {copy.createSizeAspect[lang]}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group">
              {PIXEL_ASPECT_PRESETS.map((item) => {
                const labels = pixelSizePresetLabels[item.id]
                return (
                  <SizeChoice
                    key={item.id}
                    lang={lang}
                    selected={preset === item.id}
                    title={labels.name[lang]}
                    subtitle={labels.use[lang]}
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
            <div className="grid gap-3 border border-[color:var(--soc-hairline)] bg-soft p-4">
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
                  error={
                    customWidth < PIXEL_CANVAS_MIN || customWidth > PIXEL_CANVAS_MAX
                      ? rangeHint
                      : undefined
                  }
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
                  className="pixel-choice inline-flex items-center gap-2 px-3 py-2 text-[14px] font-medium"
                >
                  <span
                    className="h-6 w-6 shrink-0 border border-[color:var(--soc-hairline)]"
                    style={groundFill(value)}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted">{copy.canvasBackgroundHint[lang]}</p>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--soc-hairline)] pt-5 max-md:sticky max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] max-md:z-30 max-md:-mx-3 max-md:border-t max-md:border-[color:var(--soc-hairline)] max-md:bg-bg max-md:px-3 max-md:py-3 sm:max-md:-mx-6 sm:max-md:px-6">
            <p className="mr-auto hidden text-[13px] text-muted max-md:block">{sizeLabel}</p>
            <Link
              href={href(lang, "/dashboard")}
              className={cn(socialButtonClass({ variant: "ghost", size: "md" }), "max-md:hidden")}
            >
              {copy.createCancel[lang]}
            </Link>
            <Link
              href={href(lang, "/dashboard")}
              className="inline-flex min-h-11 items-center px-3 text-[14px] text-muted hover:text-fg md:hidden"
            >
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
      onClose={() => router.push(href(lang, "/dashboard"))}
      title={copy.createNewHeading[lang]}
      closeLabel={copy.createCancel[lang]}
    >
      <p className="mb-4 text-[13px] leading-relaxed text-muted">{copy.createModalHint[lang]}</p>
      <div className="max-h-[min(75dvh,44rem)] overflow-y-auto">{form}</div>
    </Dialog>
  )
}
