"use client"

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  PIXEL_CANVAS_SIZE,
  PIXEL_GRID_MIN_ZOOM,
  PIXEL_INK,
  PIXEL_PALETTE,
  PIXEL_PAPER,
  PIXEL_SWATCHES,
  PIXEL_ZOOM_PINCH_MAX,
  PIXEL_ZOOM_PINCH_MIN,
  buildPixelSource,
  clientToCell,
  ensurePaletteColor,
  fillPaper,
  fitOrigin,
  hexToRgb,
  indicesToRgba,
  parsePixelSource,
  resolveScale,
  rgbaToIndices,
  setPixel,
  stepZoom,
  walkLine,
  zoomToward,
  type PixelSourceV1,
  type PixelZoom,
} from "@/lib/pixel"
import { cn } from "@/lib/utils"

type Tool = "pencil" | "eraser" | "pan"

type Camera = { originX: number; originY: number; scale: number }

const HISTORY_LIMIT = 32

function createImage(source: PixelSourceV1 | null, width: number, height: number) {
  const image = new ImageData(width, height)
  if (source) {
    const parsed = parsePixelSource(source)
    if (parsed.ok) {
      indicesToRgba(parsed.indices, image.data, parsed.data.palette)
      return image
    }
  }
  fillPaper(image.data)
  return image
}

function paletteFromSource(source: PixelSourceV1 | null) {
  if (!source) return [...PIXEL_PALETTE]
  const parsed = parsePixelSource(source)
  return parsed.ok ? [...parsed.data.palette] : [...PIXEL_PALETTE]
}

export type PixelBoardHandle = {
  exportSource: () => PixelSourceV1
  exportPng: () => Promise<Blob>
  undo: () => void
  redo: () => void
  zoomBy: (direction: 1 | -1) => void
  fit: () => void
}

export type PixelBoardProps = {
  lang: Lang
  variant?: "prototype" | "studio"
  width?: number
  height?: number
  initialSource?: PixelSourceV1 | null
  tool?: Tool
  color?: string
  onToolChange?: (tool: Tool) => void
  onColorChange?: (color: string) => void
  onPaletteChange?: (palette: string[]) => void
  onStrokeEnd?: () => void
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void
  chrome?: boolean
  className?: string
}

export const PixelBoard = forwardRef<PixelBoardHandle, PixelBoardProps>(function PixelBoard(
  {
    lang,
    variant = "prototype",
    width = PIXEL_CANVAS_SIZE,
    height = PIXEL_CANVAS_SIZE,
    initialSource = null,
    tool: toolProp,
    color: colorProp,
    onToolChange,
    onColorChange,
    onPaletteChange,
    onStrokeEnd,
    onHistoryChange,
    chrome,
    className,
  },
  ref,
) {
  const showChrome = chrome ?? variant === "prototype"
  const titleId = useId()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<HTMLCanvasElement | null>(null)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<ImageData | null>(null)
  const cameraRef = useRef<Camera>({ originX: 0, originY: 0, scale: 1 })
  const sizeRef = useRef({ width: 1, height: 1 })
  const zoomRef = useRef<PixelZoom>("fit")
  const toolRef = useRef<Tool>(toolProp ?? "pencil")
  const colorRef = useRef(colorProp ?? PIXEL_INK)
  const drawRef = useRef<{ x: number; y: number } | null>(null)
  const panRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{
    distance: number
    scale: number
    midX: number
    midY: number
    originX: number
    originY: number
  } | null>(null)
  const rafRef = useRef<number>(0)
  const observerRef = useRef<ResizeObserver | null>(null)
  const undoRef = useRef<Uint8Array[]>([])
  const redoRef = useRef<Uint8Array[]>([])
  const initialSourceRef = useRef(initialSource)
  const canvasWidthRef = useRef(width)
  const canvasHeightRef = useRef(height)
  canvasWidthRef.current = width
  canvasHeightRef.current = height
  const onPaletteChangeRef = useRef(onPaletteChange)
  onPaletteChangeRef.current = onPaletteChange
  const paletteRef = useRef<string[]>(paletteFromSource(initialSource))

  const adoptColor = useCallback((hex: string) => {
    const result = ensurePaletteColor(paletteRef.current, hex)
    if ("error" in result) return
    if (result.palette.length !== paletteRef.current.length) {
      paletteRef.current = result.palette
      onPaletteChangeRef.current?.(result.palette)
    }
  }, [])

  const [internalTool, setInternalTool] = useState<Tool>("pencil")
  const [internalColor, setInternalColor] = useState(PIXEL_INK)
  const [zoom, setZoom] = useState<PixelZoom>("fit")
  const [historyTick, setHistoryTick] = useState(0)
  const applyZoomRef = useRef<(next: PixelZoom, focusX?: number, focusY?: number) => void>(() => {})
  const scheduleRef = useRef<() => void>(() => {})

  const tool = toolProp ?? internalTool
  const color = colorProp ?? internalColor
  toolRef.current = tool
  colorRef.current = color

  const image = () => {
    if (!imageRef.current) {
      imageRef.current = createImage(initialSourceRef.current, canvasWidthRef.current, canvasHeightRef.current)
    }
    return imageRef.current
  }

  const paintColor = () => hexToRgb(toolRef.current === "eraser" ? PIXEL_PAPER : colorRef.current)

  const schedule = () => {
    if (rafRef.current) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0
      draw()
    })
  }

  const applyFit = () => {
    const { width: viewW, height: viewH } = sizeRef.current
    const scale = resolveScale("fit", viewW, viewH, canvasWidthRef.current, canvasHeightRef.current)
    const origin = fitOrigin(viewW, viewH, scale, canvasWidthRef.current, canvasHeightRef.current)
    cameraRef.current = { scale, ...origin }
  }

  const applyZoom = (next: PixelZoom, focusX?: number, focusY?: number) => {
    const { width: viewW, height: viewH } = sizeRef.current
    const prev = cameraRef.current
    const nextScale = resolveScale(next, viewW, viewH, canvasWidthRef.current, canvasHeightRef.current)
    zoomRef.current = next
    setZoom(next)
    if (next === "fit") {
      applyFit()
      schedule()
      return
    }
    const fx = focusX ?? viewW / 2
    const fy = focusY ?? viewH / 2
    cameraRef.current = zoomToward({
      originX: prev.originX,
      originY: prev.originY,
      scale: prev.scale,
      nextScale,
      focusX: fx,
      focusY: fy,
    })
    schedule()
  }

  const draw = () => {
    const view = viewRef.current
    const buffer = bufferRef.current
    if (!view || !buffer) return
    const bufferCtx = buffer.getContext("2d")
    const viewCtx = view.getContext("2d")
    if (!bufferCtx || !viewCtx) return

    const canvasW = canvasWidthRef.current
    const canvasH = canvasHeightRef.current
    if (buffer.width !== canvasW || buffer.height !== canvasH) {
      buffer.width = canvasW
      buffer.height = canvasH
    }

    bufferCtx.putImageData(image(), 0, 0)

    const dpr = window.devicePixelRatio || 1
    const { width: viewW, height: viewH } = sizeRef.current
    const pixelW = Math.max(1, Math.floor(viewW * dpr))
    const pixelH = Math.max(1, Math.floor(viewH * dpr))
    if (view.width !== pixelW || view.height !== pixelH) {
      view.width = pixelW
      view.height = pixelH
    }

    const { originX, originY, scale } = cameraRef.current
    viewCtx.setTransform(1, 0, 0, 1, 0, 0)
    viewCtx.clearRect(0, 0, view.width, view.height)
    viewCtx.fillStyle = "#e8e4d8"
    viewCtx.fillRect(0, 0, view.width, view.height)
    viewCtx.imageSmoothingEnabled = false
    viewCtx.setTransform(scale * dpr, 0, 0, scale * dpr, originX * dpr, originY * dpr)
    viewCtx.drawImage(buffer, 0, 0)

    if (scale >= PIXEL_GRID_MIN_ZOOM) {
      viewCtx.beginPath()
      viewCtx.strokeStyle = "rgba(32, 32, 42, 0.18)"
      viewCtx.lineWidth = 1 / scale
      for (let i = 0; i <= canvasW; i += 1) {
        viewCtx.moveTo(i, 0)
        viewCtx.lineTo(i, canvasH)
      }
      for (let i = 0; i <= canvasH; i += 1) {
        viewCtx.moveTo(0, i)
        viewCtx.lineTo(canvasW, i)
      }
      viewCtx.stroke()
    }
  }

  const emitHistory = () => {
    onHistoryChange?.({
      canUndo: undoRef.current.length > 0,
      canRedo: redoRef.current.length > 0,
    })
  }

  const pushUndo = () => {
    undoRef.current.push(
      rgbaToIndices(image().data, canvasWidthRef.current, canvasHeightRef.current, paletteRef.current),
    )
    if (undoRef.current.length > HISTORY_LIMIT) undoRef.current.shift()
    redoRef.current = []
    setHistoryTick((value) => value + 1)
    emitHistory()
  }

  const applyIndices = (indices: Uint8Array) => {
    indicesToRgba(indices, image().data, paletteRef.current)
    schedule()
  }

  const undo = () => {
    const previous = undoRef.current.pop()
    if (!previous) return
    redoRef.current.push(
      rgbaToIndices(image().data, canvasWidthRef.current, canvasHeightRef.current, paletteRef.current),
    )
    applyIndices(previous)
    setHistoryTick((value) => value + 1)
    emitHistory()
    onStrokeEnd?.()
  }

  const redo = () => {
    const next = redoRef.current.pop()
    if (!next) return
    undoRef.current.push(
      rgbaToIndices(image().data, canvasWidthRef.current, canvasHeightRef.current, paletteRef.current),
    )
    applyIndices(next)
    setHistoryTick((value) => value + 1)
    emitHistory()
    onStrokeEnd?.()
  }

  const undoFnRef = useRef(undo)
  const redoFnRef = useRef(redo)
  undoFnRef.current = undo
  redoFnRef.current = redo

  useImperativeHandle(ref, () => ({
    exportSource: () =>
      buildPixelSource(
        rgbaToIndices(image().data, canvasWidthRef.current, canvasHeightRef.current, paletteRef.current),
        canvasWidthRef.current,
        canvasHeightRef.current,
        paletteRef.current,
      ),
    exportPng: () => {
      const buffer = bufferRef.current
      if (!buffer) return Promise.reject(new Error("buffer"))
      const ctx = buffer.getContext("2d")
      if (!ctx) return Promise.reject(new Error("context"))
      if (buffer.width !== canvasWidthRef.current || buffer.height !== canvasHeightRef.current) {
        buffer.width = canvasWidthRef.current
        buffer.height = canvasHeightRef.current
      }
      ctx.putImageData(image(), 0, 0)
      return new Promise<Blob>((resolve, reject) => {
        buffer.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png")
      })
    },
    undo,
    redo,
    zoomBy: (direction) => {
      const fit = resolveScale(
        "fit",
        sizeRef.current.width,
        sizeRef.current.height,
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
      applyZoomRef.current(stepZoom(zoomRef.current, direction, fit))
    },
    fit: () => applyZoomRef.current("fit"),
  }))

  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      sizeRef.current = { width: entry.contentRect.width, height: entry.contentRect.height }
      if (zoomRef.current === "fit") applyFit()
      scheduleRef.current()
    })
    observer.observe(node)
    observerRef.current = observer
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    applyZoomRef.current = applyZoom
    scheduleRef.current = schedule
  })

  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return
    const onNativeWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction: 1 | -1 = event.deltaY < 0 ? 1 : -1
      const fit = resolveScale(
        "fit",
        sizeRef.current.width,
        sizeRef.current.height,
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
      const next = stepZoom(zoomRef.current, direction, fit)
      const rect = view.getBoundingClientRect()
      applyZoomRef.current(next, event.clientX - rect.left, event.clientY - rect.top)
    }
    view.addEventListener("wheel", onNativeWheel, { passive: false })
    return () => view.removeEventListener("wheel", onNativeWheel)
  }, [])

  useEffect(() => {
    if (variant !== "studio") return
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!(event.ctrlKey || event.metaKey) || (key !== "z" && key !== "y")) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      event.preventDefault()
      if (key === "y" || (key === "z" && event.shiftKey)) redoFnRef.current()
      else undoFnRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [variant])

  useEffect(() => {
    onPaletteChangeRef.current?.(paletteRef.current)
  }, [])

  useEffect(() => {
    adoptColor(color)
  }, [adoptColor, color])

  const cellFromEvent = (event: { clientX: number; clientY: number }) => {
    const view = viewRef.current
    if (!view) return { x: -1, y: -1 }
    const rect = view.getBoundingClientRect()
    const camera = cameraRef.current
    return clientToCell({
      clientX: event.clientX,
      clientY: event.clientY,
      left: rect.left,
      top: rect.top,
      originX: camera.originX,
      originY: camera.originY,
      scale: camera.scale,
    })
  }

  const stamp = (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
    if (toolRef.current !== "eraser") adoptColor(colorRef.current)
    const rgb = paintColor()
    const start = from ?? to
    walkLine(start.x, start.y, to.x, to.y, (x, y) =>
      setPixel(image().data, x, y, rgb, canvasWidthRef.current, canvasHeightRef.current),
    )
    schedule()
  }

  const chooseTool = (next: Tool) => {
    toolRef.current = next
    if (onToolChange) onToolChange(next)
    else setInternalTool(next)
  }

  const chooseColor = (next: string) => {
    adoptColor(next)
    colorRef.current = next
    if (onColorChange) onColorChange(next)
    else setInternalColor(next)
    if (toolRef.current === "eraser") chooseTool("pencil")
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const view = event.currentTarget
    view.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 2) {
      drawRef.current = null
      panRef.current = null
      const points = [...pointersRef.current.values()]
      const dx = points[0].x - points[1].x
      const dy = points[0].y - points[1].y
      pinchRef.current = {
        distance: Math.hypot(dx, dy),
        scale: cameraRef.current.scale,
        midX: (points[0].x + points[1].x) / 2,
        midY: (points[0].y + points[1].y) / 2,
        originX: cameraRef.current.originX,
        originY: cameraRef.current.originY,
      }
      return
    }

    if (toolRef.current === "pan" || event.button === 1) {
      panRef.current = {
        x: event.clientX,
        y: event.clientY,
        originX: cameraRef.current.originX,
        originY: cameraRef.current.originY,
      }
      return
    }

    pushUndo()
    const cell = cellFromEvent(event)
    drawRef.current = cell
    stamp(cell, cell)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()]
      const midX = (points[0].x + points[1].x) / 2
      const midY = (points[0].y + points[1].y) / 2
      const dx = points[0].x - points[1].x
      const dy = points[0].y - points[1].y
      const distance = Math.hypot(dx, dy)
      const pinch = pinchRef.current
      if (pinch) {
        cameraRef.current.originX = pinch.originX + (midX - pinch.midX)
        cameraRef.current.originY = pinch.originY + (midY - pinch.midY)
        if (pinch.distance > 0) {
          cameraRef.current.scale = Math.min(
            PIXEL_ZOOM_PINCH_MAX,
            Math.max(PIXEL_ZOOM_PINCH_MIN, pinch.scale * (distance / pinch.distance)),
          )
        }
        zoomRef.current = cameraRef.current.scale
        setZoom(cameraRef.current.scale)
        schedule()
      }
      return
    }

    if (panRef.current) {
      cameraRef.current.originX = panRef.current.originX + (event.clientX - panRef.current.x)
      cameraRef.current.originY = panRef.current.originY + (event.clientY - panRef.current.y)
      if (zoomRef.current === "fit") {
        zoomRef.current = cameraRef.current.scale
        setZoom(cameraRef.current.scale)
      }
      schedule()
      return
    }

    if (!drawRef.current) return
    const cell = cellFromEvent(event)
    stamp(drawRef.current, cell)
    drawRef.current = cell
  }

  const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const wasDrawing = Boolean(drawRef.current)
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      drawRef.current = null
      panRef.current = null
      if (wasDrawing) onStrokeEnd?.()
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const zoomLabel = zoom === "fit" ? copy.pixelFit[lang] : `${Math.round(Number(zoom) * 10) / 10}×`
  void historyTick

  const viewport = (
    <div
      ref={wrapRef}
      className={cn(
        "pixel-frame relative overflow-hidden overscroll-none bg-soft",
        variant === "studio"
          ? "h-full min-h-0 w-full"
          : "mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-16rem),52rem)]",
        className,
      )}
    >
      <canvas
        ref={bufferRef}
        width={width}
        height={height}
        className="hidden"
        aria-hidden="true"
      />
      <canvas
        ref={viewRef}
        role="img"
        aria-labelledby={titleId}
        className={cn(
          "block h-full w-full touch-none",
          tool === "pan" ? "cursor-grab" : "cursor-crosshair",
        )}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onContextMenu={(event) => event.preventDefault()}
      />
      <span id={titleId} className="sr-only">
        {copy.spaceCanvasTitle[lang]}
      </span>
    </div>
  )

  if (!showChrome) return viewport

  return (
    <div className="grid gap-4">
      <p className="pixel-frame bg-card px-4 py-3 text-[14px] leading-relaxed text-muted">
        {copy.pixelPrototypeNote[lang]}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["pencil", copy.pixelPencil[lang]],
            ["eraser", copy.pixelEraser[lang]],
            ["pan", copy.pixelPan[lang]],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={tool === value ? "primary" : "outline"}
            aria-pressed={tool === value}
            onClick={() => chooseTool(value)}
          >
            {label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          aria-label={copy.pixelZoomOut[lang]}
          onClick={() =>
            applyZoom(
              stepZoom(
                zoomRef.current,
                -1,
                resolveScale("fit", sizeRef.current.width, sizeRef.current.height, width, height),
              ),
            )
          }
        >
          {copy.pixelZoomOut[lang]}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={copy.pixelZoomIn[lang]}
          onClick={() =>
            applyZoom(
              stepZoom(
                zoomRef.current,
                1,
                resolveScale("fit", sizeRef.current.width, sizeRef.current.height, width, height),
              ),
            )
          }
        >
          {copy.pixelZoomIn[lang]}
        </Button>
        <Button size="sm" variant={zoom === "fit" ? "primary" : "outline"} onClick={() => applyZoom("fit")}>
          {copy.pixelFit[lang]}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={copy.pixelColor[lang]}>
        {PIXEL_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            role="radio"
            aria-checked={color === swatch}
            aria-label={`${copy.pixelColor[lang]} ${swatch}`}
            onClick={() => chooseColor(swatch)}
            className={cn(
              "pixel-swatch h-11 w-11 border-[3px]",
              color === swatch ? "border-fg" : "border-earth",
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>

      <p className="text-[13px] text-muted">{copy.pixelHint[lang]}</p>
      {viewport}
      <p className="text-[13px] text-muted">
        {width} × {height} · {copy.pixelLocal[lang]} · {zoomLabel}
      </p>
    </div>
  )
})

PixelBoard.displayName = "PixelBoard"
