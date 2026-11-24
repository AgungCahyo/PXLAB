"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { PixelCat } from "@/components/brand/PixelCat"
import { copy, exportFormatLabels } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { canvasRasterEncoder } from "@/lib/pixel-export-canvas"
import {
  buildExport,
  ExportError,
  maxExportScale,
  type ExportBackground,
  type ExportDocument,
  type ExportOptions,
  type ExportResult,
} from "@/lib/pixel-export-engine"
import { PIXEL_EXPORT_EDGE_MAX } from "../../lib/pixel"
import { formatDownloadEstimateBytes } from "@/lib/pixel-png-scale"

type Format = "png" | "jpeg" | "webp" | "gif" | "sheet" | "layers"
const FORMATS: Format[] = ["png", "jpeg", "webp", "gif", "sheet", "layers"]
type BgKind = "transparent" | "paper" | "color"

type Props = {
  lang: Lang
  open: boolean
  onClose: () => void
  /** Snapshot of the current document; called each time the dialog opens. */
  getDocument: () => ExportDocument | null
  title: string
}

function errorMessage(lang: Lang, error: unknown) {
  if (error instanceof ExportError) {
    switch (error.code) {
      case "bounds":
        return copy.exportErrBounds[lang].replace("{max}", String(PIXEL_EXPORT_EDGE_MAX))
      case "scale":
        return copy.exportErrScale[lang]
      case "no_layers":
        return copy.exportErrNoLayers[lang]
      case "palette":
        return copy.exportErrPalette[lang]
      case "encode":
        return copy.exportErrEncode[lang]
    }
  }
  return copy.exportErrGeneric[lang]
}

const docKeys = new WeakMap<object, number>()
let nextDocKey = 1
/** Stable small id per snapshot object, so a new snapshot invalidates the previous build. */
function docKey(doc: object) {
  let key = docKeys.get(doc)
  if (key === undefined) {
    key = nextDocKey
    nextDocKey += 1
    docKeys.set(doc, key)
  }
  return key
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function ExportDialog({ lang, open, onClose, getDocument, title }: Props) {
  const ids = {
    format: useId(),
    scale: useId(),
    bg: useId(),
    color: useId(),
    quality: useId(),
    gifSource: useId(),
    delay: useId(),
    columns: useId(),
    padding: useId(),
  }
  const [format, setFormat] = useState<Format>("png")
  const [scale, setScale] = useState(1)
  const [bgKind, setBgKind] = useState<BgKind>("transparent")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [quality, setQuality] = useState(92)
  const [gifSource, setGifSource] = useState<"flat" | "layers">("layers")
  const [delayMs, setDelayMs] = useState(120)
  const [loop, setLoop] = useState(true)
  const [columns, setColumns] = useState(0)
  const [padding, setPadding] = useState(0)
  const [includeJson, setIncludeJson] = useState(true)
  const [applyOpacity, setApplyOpacity] = useState(false)
  const [includeHidden, setIncludeHidden] = useState(false)

  // Finished builds only; `busy` is derived from whether the last one matches the current request.
  const [done, setDone] = useState<{ key: string; result: ExportResult | null; error: string | null } | null>(null)
  const seq = useRef(0)

  // Snapshot the document each time the dialog opens so the preview is stable while it is shown.
  const doc = useMemo(() => (open ? getDocument() : null), [open, getDocument])
  const snapshot = doc ? { id: docKey(doc) } : null

  const maxScale = doc ? maxExportScale(doc.width, doc.height) : 1
  const jpeg = format === "jpeg"
  const effectiveBgKind: BgKind = jpeg && bgKind === "transparent" ? "paper" : bgKind

  const options = useMemo<ExportOptions>(() => {
    const background: ExportBackground =
      effectiveBgKind === "color" ? { kind: "color", hex: bgColor } : { kind: effectiveBgKind }
    const base = { scale, background }
    switch (format) {
      case "png":
        return { format, ...base }
      case "jpeg":
      case "webp":
        return { format, ...base, quality: quality / 100 }
      case "gif":
        return { format, ...base, source: gifSource, delayMs, loop: loop ? 0 : 1 }
      case "sheet":
        return { format, ...base, columns, padding, includeJson }
      case "layers":
        return { format, ...base, applyOpacity, includeHidden }
    }
  }, [format, scale, effectiveBgKind, bgColor, quality, gifSource, delayMs, loop, columns, padding, includeJson, applyOpacity, includeHidden])

  const requestKey = snapshot ? `${snapshot.id}|${title}|${lang}|${JSON.stringify(options)}` : ""
  const busy = open && snapshot !== null && done?.key !== requestKey
  const result = done?.result ?? null
  const error = done && done.key === requestKey ? done.error : null

  // Build the export (debounced) whenever something changes. State is only set from the async
  // callback; the previous result stays visible until the new one is ready.
  useEffect(() => {
    if (!open || !doc) return
    const mine = ++seq.current
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const out = await buildExport(doc, options, canvasRasterEncoder, title || "artwork")
          if (mine === seq.current) setDone({ key: requestKey, result: out, error: null })
        } catch (err) {
          if (mine === seq.current) setDone({ key: requestKey, result: null, error: errorMessage(lang, err) })
        }
      })()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [open, doc, options, title, lang, requestKey])

  // Object URL for the preview image; revoked when it changes.
  const previewUrl = useMemo(() => {
    if (!result) return null
    const isImage = result.file.mime.startsWith("image/")
    const bytes = isImage ? result.file.bytes : result.preview
    if (!bytes) return null
    return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: isImage ? result.file.mime : "image/png" }))
  }, [result])
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const [downloaded, setDownloaded] = useState(false)

  function download() {
    if (!result) return
    const url = URL.createObjectURL(new Blob([new Uint8Array(result.file.bytes)], { type: result.file.mime }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = result.file.name
    anchor.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
  }

  const field = "min-h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-[14px] text-fg focus:border-[#6355d8] focus:bg-card focus:outline-none"
  const label = "text-[13px] font-semibold text-fg"
  const note = "text-[12px] text-muted"
  const frameFormats = format === "gif" ? gifSource === "layers" : format === "sheet"
  const presets = [1, 2, 4, 8, 16].filter((value) => value <= maxScale)

  return (
    <Dialog open={open} onClose={onClose} title={copy.exportTitle[lang]} closeLabel={copy.closeMenu[lang]} className="w-[min(calc(100%-2rem),34rem)]">
      <div className="grid gap-3 px-5 py-4">
        <div className="grid gap-1.5">
          <label className={label} htmlFor={ids.format}>
            {copy.exportFormat[lang]}
          </label>
          <select id={ids.format} className={field} value={format} onChange={(event) => setFormat(event.target.value as Format)}>
            {FORMATS.map((item) => (
              <option key={item} value={item}>
                {exportFormatLabels[item][lang]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor={ids.scale}>
            {copy.exportScale[lang]}
            {doc ? ` · ${doc.width * scale}×${doc.height * scale}` : ""}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={ids.scale}
              type="number"
              min={1}
              max={maxScale}
              step={1}
              value={scale}
              className={`${field} w-24`}
              onChange={(event) => setScale(clampInt(Number(event.target.value), 1, maxScale))}
            />
            {presets.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scale === value}
                className={`studio-control inline-flex items-center rounded-xl border px-2.5 text-[13px] font-medium transition-colors ${scale === value ? "border-[#6355d8] bg-[#f0edff] text-[#6355d8]" : "border-slate-200 bg-slate-50 text-fg hover:bg-slate-100"}`}
                onClick={() => setScale(value)}
              >
                {value}×
              </button>
            ))}
          </div>
          <p className={note}>{copy.exportScaleHint[lang]}</p>
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor={ids.bg}>
            {copy.exportBackground[lang]}
          </label>
          <div className="flex items-center gap-2">
            <select id={ids.bg} className={`${field} min-w-0 flex-1`} value={effectiveBgKind} onChange={(event) => setBgKind(event.target.value as BgKind)}>
              {!jpeg ? <option value="transparent">{copy.exportBgTransparent[lang]}</option> : null}
              <option value="paper">{copy.exportBgPaper[lang]}</option>
              <option value="color">{copy.exportBgColor[lang]}</option>
            </select>
            {effectiveBgKind === "color" ? (
              <input
                id={ids.color}
                type="color"
                value={bgColor}
                aria-label={copy.exportBgColor[lang]}
                className="h-10 w-14 rounded-xl border border-slate-200 bg-card p-0.5"
                onChange={(event) => setBgColor(event.target.value)}
              />
            ) : null}
          </div>
          <p className={note}>{jpeg ? copy.exportBgJpegNote[lang] : copy.exportBgHint[lang]}</p>
        </div>

        {format === "jpeg" || format === "webp" ? (
          <div className="grid gap-1.5">
            <label className={label} htmlFor={ids.quality}>
              {copy.exportQuality[lang]}: {quality}%
            </label>
            <input id={ids.quality} type="range" min={40} max={100} step={1} value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
          </div>
        ) : null}

        {format === "gif" ? (
          <div className="grid gap-2">
            <label className={label} htmlFor={ids.gifSource}>
              {copy.exportGifSource[lang]}
            </label>
            <select id={ids.gifSource} className={field} value={gifSource} onChange={(event) => setGifSource(event.target.value as "flat" | "layers")}>
              <option value="layers">{copy.exportGifLayers[lang]}</option>
              <option value="flat">{copy.exportGifFlat[lang]}</option>
            </select>
            <label className={label} htmlFor={ids.delay}>
              {copy.exportGifDelay[lang]}
            </label>
            <input id={ids.delay} type="number" min={20} max={5000} step={10} value={delayMs} className={`${field} w-32`} onChange={(event) => setDelayMs(clampInt(Number(event.target.value), 20, 5000))} />
            <label className="flex items-center gap-2 text-[14px] text-fg">
              <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
              {copy.exportGifLoop[lang]}
            </label>
          </div>
        ) : null}

        {format === "sheet" ? (
          <div className="grid gap-2">
            <label className={label} htmlFor={ids.columns}>
              {copy.exportSheetColumns[lang]}
            </label>
            <input id={ids.columns} type="number" min={0} max={64} step={1} value={columns} className={`${field} w-28`} onChange={(event) => setColumns(clampInt(Number(event.target.value), 0, 64))} />
            <label className={label} htmlFor={ids.padding}>
              {copy.exportSheetPadding[lang]}
            </label>
            <input id={ids.padding} type="number" min={0} max={64} step={1} value={padding} className={`${field} w-28`} onChange={(event) => setPadding(clampInt(Number(event.target.value), 0, 64))} />
            <label className="flex items-center gap-2 text-[14px] text-fg">
              <input type="checkbox" checked={includeJson} onChange={(event) => setIncludeJson(event.target.checked)} />
              {copy.exportSheetJson[lang]}
            </label>
          </div>
        ) : null}

        {format === "layers" ? (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-[14px] text-fg">
              <input type="checkbox" checked={applyOpacity} onChange={(event) => setApplyOpacity(event.target.checked)} />
              {copy.exportLayersOpacity[lang]}
            </label>
            <label className="flex items-center gap-2 text-[14px] text-fg">
              <input type="checkbox" checked={includeHidden} onChange={(event) => setIncludeHidden(event.target.checked)} />
              {copy.exportLayersHidden[lang]}
            </label>
          </div>
        ) : null}

        {frameFormats ? <p className={note}>{copy.exportFramesNote[lang]}</p> : null}

        <div className="grid gap-2" aria-live="polite">
          <span className={label}>{copy.exportPreview[lang]}</span>
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3 [background-image:repeating-conic-gradient(var(--color-soft,#eee)_0%_25%,transparent_0%_50%)] [background-size:16px_16px]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL, pixel art needs crisp scaling
              <img src={previewUrl} alt="" className="max-h-64 max-w-full [image-rendering:pixelated]" />
            ) : (
              <span className={note}>{busy ? copy.exportPreparing[lang] : ""}</span>
            )}
          </div>
          {result ? (
            <p className={note}>
              {result.width}×{result.height}
              {result.frames > 1 ? ` · ${copy.exportFrameCount[lang].replace("{n}", String(result.frames))}` : ""}
              {` · ${formatDownloadEstimateBytes(result.file.bytes.length)} · ${result.file.name}`}
            </p>
          ) : null}
          {result?.entries ? (
            <details className="text-[13px] text-muted">
              <summary className="cursor-pointer">{copy.exportFiles[lang]}</summary>
              <ul className="mt-1 list-disc pl-5">
                {result.entries.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {error ? (
            <p className="text-[13px] text-brick" role="status">
              {error}
            </p>
          ) : null}
        </div>

        <Button type="button" variant="primary" disabled={!result || busy} onClick={download}>
          <PixelIcon name="download" />
          {copy.exportDownload[lang]}
        </Button>
        {downloaded ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[13px] text-emerald-900">
            <PixelCat variant="happy" size="xs" />
            <span>{result?.file.name}</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
