"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_SIZE_PRESETS, formatPixelSize } from "../../lib/pixel"
import {
  PIXEL_IMPORT_COLOR_MAX,
  PIXEL_IMPORT_COLOR_MIN,
  convertRgbaToPixelArt,
  decodeImportImage,
  defaultImportSettings,
  indicesToPreviewDataUrl,
  resolveImportForDocument,
  resolveImportOutputSize,
  sizeFromPreset,
  type DecodedImportImage,
  type PixelArtImportResult,
  type PixelImportDither,
  type PixelImportPaletteMode,
  type PixelImportSettings,
} from "@/lib/pixel-import"
import { cn } from "@/lib/utils"

type Props = {
  lang: Lang
  open: boolean
  file: File | null
  canvasWidth: number
  canvasHeight: number
  documentPalette: readonly string[]
  onClose: () => void
  onConfirm: (result: PixelArtImportResult) => void
}

export function ImportPixelArtDialog({
  lang,
  open,
  file,
  canvasWidth,
  canvasHeight,
  documentPalette,
  onClose,
  onConfirm,
}: Props) {
  const widthId = useId()
  const heightId = useId()
  const colorsId = useId()
  const [decoded, setDecoded] = useState<DecodedImportImage | null>(null)
  const [settings, setSettings] = useState<PixelImportSettings>(() =>
    defaultImportSettings(64, 64, canvasWidth, canvasHeight),
  )
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [converted, setConverted] = useState<PixelArtImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const decodeGen = useRef(0)
  const convertGen = useRef(0)

  useEffect(() => {
    if (!open || !file) {
      setDecoded(null)
      setPreviewUrl(null)
      setConverted(null)
      setError(null)
      return
    }
    const gen = ++decodeGen.current
    setError(null)
    setDecoded(null)
    setPreviewUrl(null)
    setConverted(null)
    void decodeImportImage(file)
      .then((image) => {
        if (gen !== decodeGen.current) return
        setDecoded(image)
        setSettings(defaultImportSettings(image.width, image.height, canvasWidth, canvasHeight))
      })
      .catch((err: unknown) => {
        if (gen !== decodeGen.current) return
        const code = err instanceof Error ? err.message : "decode"
        setError(code)
      })
  }, [open, file, canvasWidth, canvasHeight])

  useEffect(() => {
    if (!open || !decoded) return
    const gen = ++convertGen.current
    const timer = window.setTimeout(() => {
      startTransition(() => {
        try {
          const local = convertRgbaToPixelArt(
            decoded,
            settings,
            canvasWidth,
            canvasHeight,
            documentPalette,
          )
          // Preview uses the same document merge as PixelBoard.importPixelArtLayer.
          const preview = resolveImportForDocument(local, documentPalette)
          if (gen !== convertGen.current) return
          setConverted(local)
          setPreviewUrl(
            indicesToPreviewDataUrl(
              preview.indices,
              preview.width,
              preview.height,
              preview.palette,
            ),
          )
          setError(null)
        } catch (err) {
          if (gen !== convertGen.current) return
          setConverted(null)
          setPreviewUrl(null)
          setError(err instanceof Error ? err.message : "decode")
        }
      })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [open, decoded, settings, canvasWidth, canvasHeight, documentPalette])

  const output = decoded
    ? resolveImportOutputSize(settings, decoded.width, decoded.height, canvasWidth, canvasHeight)
    : { width: settings.width, height: settings.height }

  const errorLabel =
    error === "type"
      ? copy.pixelImportBadType[lang]
      : error === "too_large"
        ? copy.pixelImportTooLarge[lang]
        : error === "dimensions"
          ? copy.pixelImportBadSize[lang]
          : error
            ? copy.pixelImportFailed[lang]
            : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.pixelImportTitle[lang]}
      closeLabel={copy.closeMenu[lang]}
      className="w-[min(calc(100%-2rem),32rem)]"
    >
      <div className="grid gap-4">
        {decoded ? (
          <p className="text-[13px] text-muted">
            {copy.pixelImportSource[lang]
              .replace("{size}", formatPixelSize(decoded.width, decoded.height))
              .replace("{name}", file?.name ?? "")}
          </p>
        ) : (
          <p className="text-[13px] text-muted">{copy.pixelImportLoading[lang]}</p>
        )}

        <div
          className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-slate-200 bg-[length:12px_12px] bg-[linear-gradient(45deg,#f0ebe0_25%,transparent_25%,transparent_75%,#f0ebe0_75%),linear-gradient(45deg,#f0ebe0_25%,transparent_25%,transparent_75%,#f0ebe0_75%)] bg-[position:0_0,6px_6px] bg-[#fffdf7]"
          aria-busy={pending || undefined}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={copy.pixelImportPreviewAlt[lang]}
              className="max-h-48 max-w-full object-contain [image-rendering:pixelated]"
            />
          ) : (
            <span className="text-[13px] text-muted">{copy.pixelImportPreviewWait[lang]}</span>
          )}
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-medium text-fg">{copy.pixelImportOutputSize[lang]}</legend>
          <div className="flex flex-wrap gap-1.5">
            {PIXEL_SIZE_PRESETS.map((preset) => {
              const sized = sizeFromPreset(preset.id, canvasWidth, canvasHeight)
              if (!sized) return null
              const active = output.width === sized.width && output.height === sized.height
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border px-2.5 py-1 text-[12px] font-medium transition-colors",
                    active ? "border-[#6355d8] bg-[#f0edff] text-[#6355d8]" : "border-slate-200 bg-slate-50 text-muted hover:text-fg",
                  )}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      width: sized.width,
                      height: sized.height,
                      maintainAspect: false,
                    }))
                  }
                >
                  {formatPixelSize(sized.width, sized.height)}
                </button>
              )
            })}
          </div>
          <div className="studio-row flex-wrap">
            <label className="grid gap-1" htmlFor={widthId}>
              <span className="text-[12px] text-muted">{copy.pixelShapeWidth[lang]}</span>
              <input
                id={widthId}
                type="number"
                min={1}
                max={Math.max(1, canvasWidth)}
                value={settings.width}
                onChange={(event) => {
                  const width = Number(event.target.value) || 1
                  setSettings((prev) => {
                    if (!prev.maintainAspect || !decoded) return { ...prev, width }
                    const height = Math.max(1, Math.round((width * decoded.height) / decoded.width))
                    return { ...prev, width, height }
                  })
                }}
                className="studio-control w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[13px] text-fg"
              />
            </label>
            <label className="grid gap-1" htmlFor={heightId}>
              <span className="text-[12px] text-muted">{copy.pixelShapeHeight[lang]}</span>
              <input
                id={heightId}
                type="number"
                min={1}
                max={canvasHeight}
                value={settings.height}
                onChange={(event) => {
                  const height = Number(event.target.value) || 1
                  setSettings((prev) => {
                    if (!prev.maintainAspect || !decoded) return { ...prev, height }
                    const width = Math.max(1, Math.round((height * decoded.width) / decoded.height))
                    return { ...prev, width, height }
                  })
                }}
                className="studio-control w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[13px] text-fg"
              />
            </label>
            <label className="mt-5 flex items-center gap-2 text-[13px] text-fg">
              <input
                type="checkbox"
                checked={settings.maintainAspect}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, maintainAspect: event.target.checked }))
                }
                className="h-4 w-4 accent-[var(--brick)]"
              />
              {copy.pixelImportKeepAspect[lang]}
            </label>
          </div>
          <p className="text-[12px] text-muted">
            {copy.pixelImportOutputHint[lang].replace(
              "{size}",
              formatPixelSize(output.width, output.height),
            )}
          </p>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-medium text-fg">{copy.pixelImportColor[lang]}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["reduce", copy.pixelImportReduce[lang]],
                ["document", copy.pixelImportDocumentPalette[lang]],
              ] as const satisfies ReadonlyArray<readonly [PixelImportPaletteMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.paletteMode === mode}
                className={cn(
                  "border-[3px] px-2 py-1 text-[12px] font-medium",
                  settings.paletteMode === mode
                    ? "border-fg bg-soft text-fg"
                    : "border-earth bg-bg text-muted hover:text-fg",
                )}
                onClick={() => setSettings((prev) => ({ ...prev, paletteMode: mode }))}
              >
                {label}
              </button>
            ))}
          </div>
          {settings.paletteMode === "reduce" ? (
            <label className="grid gap-1" htmlFor={colorsId}>
              <span className="text-[12px] text-muted">
                {copy.pixelImportColorCount[lang].replace("{n}", String(settings.colorCount))}
              </span>
              <input
                id={colorsId}
                type="range"
                min={PIXEL_IMPORT_COLOR_MIN}
                max={PIXEL_IMPORT_COLOR_MAX}
                value={settings.colorCount}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    colorCount: Number(event.target.value) || PIXEL_IMPORT_COLOR_MIN,
                  }))
                }
                className="accent-fg"
              />
            </label>
          ) : null}
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-medium text-fg">{copy.pixelImportDither[lang]}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["none", copy.pixelImportDitherNone[lang]],
                ["floyd-steinberg", copy.pixelImportDitherFloyd[lang]],
                ["ordered", copy.pixelImportDitherOrdered[lang]],
              ] as const satisfies ReadonlyArray<readonly [PixelImportDither, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.dither === mode}
                className={cn(
                  "border-[3px] px-2 py-1 text-[12px] font-medium",
                  settings.dither === mode
                    ? "border-fg bg-soft text-fg"
                    : "border-earth bg-bg text-muted hover:text-fg",
                )}
                onClick={() => setSettings((prev) => ({ ...prev, dither: mode }))}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted">{copy.pixelImportScaleHint[lang]}</p>
        </fieldset>

        {errorLabel ? (
          <p className="text-[13px] text-brick" role="alert">
            {errorLabel}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {copy.createCancel[lang]}
          </Button>
          <Button
            type="button"
            disabled={!converted || Boolean(errorLabel)}
            onClick={() => {
              if (!converted) return
              onConfirm(converted)
            }}
          >
            {copy.pixelImportConfirm[lang]}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
