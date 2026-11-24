"use client"

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { renderComposite, type ExportDocument } from "@/lib/pixel-export-engine"
import {
  clampAffineParams,
  fitRectParams,
  IDENTITY_PARAMS,
  transformDocument,
  type AffineParams,
  type CropRect,
  type Interpolation,
  type TransformRequest,
  type TransformResult,
} from "@/lib/pixel-transform"

type SnapshotDocument = ExportDocument & { activeIndex: number }

type Props = {
  lang: Lang
  open: boolean
  onClose: () => void
  /** Snapshot of the current document; called each time the dialog opens. */
  getDocument: () => SnapshotDocument | null
  getSelectionBounds: () => CropRect | null
  /** Runs the transform on the board (one undo step). */
  onApply: (request: TransformRequest) => Pick<TransformResult, "changed" | "addedColors" | "approximatedColors" | "skipped">
  onApplied?: (summary: Pick<TransformResult, "addedColors" | "approximatedColors" | "skipped">) => void
}

function num(value: string, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const PREVIEW_MAX = 256

export function TransformDialog({ lang, open, onClose, getDocument, getSelectionBounds, onApply, onApplied }: Props) {
  const ids = {
    mode: useId(),
    scope: useId(),
    interp: useId(),
    sx: useId(),
    sy: useId(),
    rot: useId(),
    ox: useId(),
    oy: useId(),
  }
  const doc = useMemo(() => (open ? getDocument() : null), [open, getDocument])
  const selection = useMemo(() => (open ? getSelectionBounds() : null), [open, getSelectionBounds])

  const [mode, setMode] = useState<"free" | "crop">("free")
  const [scope, setScope] = useState<"layer" | "all">("layer")
  const [interpolation, setInterpolation] = useState<Interpolation>("nearest")
  const [scaleX, setScaleX] = useState(100)
  const [scaleY, setScaleY] = useState(100)
  const [keepRatio, setKeepRatio] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  const cropActive = mode === "crop" && selection !== null
  const request = useMemo<TransformRequest>(() => {
    if (cropActive && doc && selection) {
      return {
        scope,
        interpolation,
        params: fitRectParams(selection, doc.width, doc.height, interpolation === "nearest"),
        cropRect: selection,
      }
    }
    return {
      scope,
      interpolation,
      params: clampAffineParams({
        scaleX: scaleX / 100,
        scaleY: scaleY / 100,
        rotation,
        flipH,
        flipV,
        offsetX,
        offsetY,
      }),
      cropRect: null,
    }
  }, [cropActive, doc, selection, scope, interpolation, scaleX, scaleY, rotation, flipH, flipV, offsetX, offsetY])

  // The preview and the real apply run the same engine; heavy settings do not block typing.
  const deferred = useDeferredValue(request)
  const result = useMemo(() => {
    if (!doc) return null
    return transformDocument(
      { width: doc.width, height: doc.height, palette: doc.palette, layers: doc.layers, activeIndex: doc.activeIndex },
      deferred,
    )
  }, [doc, deferred])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !doc || !result) return
    const layers = doc.layers.map((layer, index) => ({ ...layer, indices: result.layerIndices[index] ?? layer.indices }))
    const rgba = renderComposite({ ...doc, palette: result.palette, layers }, { kind: "paper" })
    canvas.width = doc.width
    canvas.height = doc.height
    const ctx = canvas.getContext("2d")
    ctx?.putImageData(new ImageData(new Uint8ClampedArray(rgba), doc.width, doc.height), 0, 0)
  }, [doc, result])

  function reset() {
    setMode("free")
    setScaleX(100)
    setScaleY(100)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setOffsetX(0)
    setOffsetY(0)
  }

  function apply() {
    const summary = onApply(request)
    onApplied?.(summary)
    reset()
    onClose()
  }

  const field = "min-h-11 border-[3px] border-earth bg-card px-3 text-[14px] text-fg"
  const label = "text-[14px] font-medium text-fg"
  const note = "text-[13px] text-muted"
  const checkbox = "flex items-center gap-2 text-[14px] text-fg"
  const lockedCount = result?.skipped.filter((item) => item.reason === "locked").length ?? 0
  const alphaCount = result?.skipped.filter((item) => item.reason === "lockAlpha").length ?? 0
  const previewScale = doc ? Math.max(1, Math.min(8, Math.floor(PREVIEW_MAX / Math.max(doc.width, doc.height)))) : 1
  const fitScale = cropActive && doc && selection ? request.params.scaleX : 1

  return (
    <Dialog open={open} onClose={onClose} title={copy.transformTitle[lang]} closeLabel={copy.closeMenu[lang]} size="lg">
      <div className="grid gap-3 px-5 py-4">
        <div className="grid gap-1.5">
          <label className={label} htmlFor={ids.mode}>
            {copy.transformMode[lang]}
          </label>
          <select id={ids.mode} className={field} value={mode} onChange={(event) => setMode(event.target.value as "free" | "crop")}>
            <option value="free">{copy.transformModeFree[lang]}</option>
            <option value="crop">{copy.transformModeCrop[lang]}</option>
          </select>
          {mode === "crop" ? (
            <p className={note}>
              {selection && doc
                ? copy.transformCropInfo[lang]
                    .replace("{w}", String(selection.width))
                    .replace("{h}", String(selection.height))
                    .replace("{s}", String(Math.round(fitScale * 100) / 100))
                : copy.transformNeedSelection[lang]}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor={ids.scope}>
            {copy.transformScope[lang]}
          </label>
          <select id={ids.scope} className={field} value={scope} onChange={(event) => setScope(event.target.value as "layer" | "all")}>
            <option value="layer">{copy.transformScopeLayer[lang]}</option>
            <option value="all">{copy.transformScopeAll[lang]}</option>
          </select>
        </div>

        <div className="grid gap-1.5">
          <label className={label} htmlFor={ids.interp}>
            {copy.transformInterpolation[lang]}
          </label>
          <select id={ids.interp} className={field} value={interpolation} onChange={(event) => setInterpolation(event.target.value as Interpolation)}>
            <option value="nearest">{copy.transformNearest[lang]}</option>
            <option value="bilinear">{copy.transformBilinear[lang]}</option>
            <option value="bicubic">{copy.transformBicubic[lang]}</option>
          </select>
          <p className={note}>{copy.transformInterpolationHint[lang]}</p>
        </div>

        {mode === "free" ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className={label} htmlFor={ids.sx}>
                  {copy.transformScaleX[lang]}
                </label>
                <input
                  id={ids.sx}
                  type="number"
                  min={5}
                  max={1600}
                  step={5}
                  value={scaleX}
                  className={field}
                  onChange={(event) => {
                    const v = num(event.target.value, 100)
                    setScaleX(v)
                    if (keepRatio) setScaleY(v)
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <label className={label} htmlFor={ids.sy}>
                  {copy.transformScaleY[lang]}
                </label>
                <input
                  id={ids.sy}
                  type="number"
                  min={5}
                  max={1600}
                  step={5}
                  value={scaleY}
                  className={field}
                  onChange={(event) => {
                    const v = num(event.target.value, 100)
                    setScaleY(v)
                    if (keepRatio) setScaleX(v)
                  }}
                />
              </div>
            </div>
            <label className={checkbox}>
              <input type="checkbox" checked={keepRatio} onChange={(event) => setKeepRatio(event.target.checked)} />
              {copy.transformKeepRatio[lang]}
            </label>

            <div className="grid gap-1.5">
              <label className={label} htmlFor={ids.rot}>
                {copy.transformRotation[lang]}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input id={ids.rot} type="number" step={1} value={rotation} className={`${field} w-28`} onChange={(event) => setRotation(num(event.target.value, 0))} />
                <button
                  type="button"
                  className="studio-control inline-flex items-center border-[3px] border-earth bg-bg px-2 text-[13px] font-medium text-fg hover:bg-soft"
                  aria-label={copy.transformRotateLeft[lang]}
                  title={copy.transformRotateLeft[lang]}
                  onClick={() => setRotation((value) => value - 90)}
                >
                  ↺ 90°
                </button>
                <button
                  type="button"
                  className="studio-control inline-flex items-center border-[3px] border-earth bg-bg px-2 text-[13px] font-medium text-fg hover:bg-soft"
                  aria-label={copy.transformRotateRight[lang]}
                  title={copy.transformRotateRight[lang]}
                  onClick={() => setRotation((value) => value + 90)}
                >
                  ↻ 90°
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className={checkbox}>
                <input type="checkbox" checked={flipH} onChange={(event) => setFlipH(event.target.checked)} />
                {copy.transformFlipH[lang]}
              </label>
              <label className={checkbox}>
                <input type="checkbox" checked={flipV} onChange={(event) => setFlipV(event.target.checked)} />
                {copy.transformFlipV[lang]}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className={label} htmlFor={ids.ox}>
                  {copy.transformOffsetX[lang]}
                </label>
                <input id={ids.ox} type="number" step={1} value={offsetX} className={field} onChange={(event) => setOffsetX(num(event.target.value, 0))} />
              </div>
              <div className="grid gap-1.5">
                <label className={label} htmlFor={ids.oy}>
                  {copy.transformOffsetY[lang]}
                </label>
                <input id={ids.oy} type="number" step={1} value={offsetY} className={field} onChange={(event) => setOffsetY(num(event.target.value, 0))} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2" aria-live="polite">
          <span className={label}>{copy.transformPreview[lang]}</span>
          <div className="flex min-h-40 items-center justify-center border-[3px] border-earth bg-bg p-2">
            {doc ? (
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="[image-rendering:pixelated]"
                style={{ width: doc.width * previewScale, height: doc.height * previewScale, maxWidth: "100%" }}
              />
            ) : null}
          </div>
          {result && !result.changed ? <p className={note}>{copy.transformNoChange[lang]}</p> : null}
          {result && result.addedColors > 0 ? (
            <p className={note}>{copy.transformAddedColors[lang].replace("{n}", String(result.addedColors))}</p>
          ) : null}
          {result && result.approximatedColors > 0 ? (
            <p className="text-[13px] text-brick">{copy.transformApproximated[lang].replace("{n}", String(result.approximatedColors))}</p>
          ) : null}
          {lockedCount > 0 ? <p className={note}>{copy.transformSkippedLocked[lang].replace("{n}", String(lockedCount))}</p> : null}
          {alphaCount > 0 ? <p className={note}>{copy.transformSkippedAlpha[lang].replace("{n}", String(alphaCount))}</p> : null}
          <p className={note}>{copy.transformUndoHint[lang]}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={reset}>
            {copy.transformReset[lang]}
          </Button>
          <Button type="button" disabled={!result?.changed || (mode === "crop" && !selection)} onClick={apply}>
            {copy.transformApply[lang]}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export { IDENTITY_PARAMS }
export type { AffineParams }
