"use client"

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  PIXEL_BRUSH_SIZES,
  PIXEL_CANVAS_SIZE,
  PIXEL_GRID_MIN_ZOOM,
  PIXEL_INK,
  PIXEL_PALETTE,
  PIXEL_PAPER,
  PIXEL_SWATCHES,
  PIXEL_ZOOM_PINCH_MAX,
  PIXEL_ZOOM_PINCH_MIN,
  blitRect,
  buildPixelSource,
  clearCanvasToPaper,
  clearRectToPaper,
  clientToCell,
  constrainSquareEnd,
  ensurePaletteColor,
  extractRect,
  fillPaper,
  fillRect,
  fitOrigin,
  flipCanvasHorizontal,
  flipCanvasVertical,
  flipRectHorizontal,
  flipRectVertical,
  floodFill,
  getPixelRgb,
  hexToRgb,
  indicesToRgba,
  normalizePixelHex,
  normalizePixelRect,
  paintEllipse,
  parsePixelSource,
  pointInPixelRect,
  resolveScale,
  rgbaToIndices,
  rgbToHex,
  removeDocumentColor,
  replaceRgbInPixels,
  rotateCanvas90Cw,
  rotateRect90Cw,
  stepZoom,
  strokeBrushLine,
  strokeBrushLineSymmetric,
  strokeRect,
  zoomToward,
  type PixelBrushSize,
  type PixelClipboard,
  type PixelDrawTool,
  type PixelRect,
  type PixelSourceV1,
  type PixelSymmetry,
  type PixelZoom,
} from "@/lib/pixel"
import { cn } from "@/lib/utils"

export type Tool = PixelDrawTool

type Camera = { originX: number; originY: number; scale: number }

const HISTORY_LIMIT = 32
const SHAPE_TOOLS = new Set<Tool>(["line", "rect", "ellipse"])

/** Session clipboard shared across Playground remounts in the same tab. */
let sessionClipboard: PixelClipboard | null = null

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
  getZoom: () => PixelZoom
  clearCanvas: () => void
  flipHorizontal: () => void
  flipVertical: () => void
  rotate90Cw: () => boolean
  selectAll: () => void
  clearSelection: () => void
  hasSelection: () => boolean
  replaceColor: (fromHex: string, toHex: string) => number
  removeColor: (hex: string) => { ok: true; replaced: number } | { ok: false; error: "paper" | "missing" }
  clearHistory: () => void
  getPalette: () => string[]
}

export type PixelBoardProps = {
  lang: Lang
  variant?: "prototype" | "studio"
  width?: number
  height?: number
  initialSource?: PixelSourceV1 | null
  tool?: Tool
  color?: string
  brushSize?: PixelBrushSize
  gridVisible?: boolean
  symmetry?: PixelSymmetry
  onToolChange?: (tool: Tool) => void
  onColorChange?: (color: string) => void
  onPaletteChange?: (palette: string[]) => void
  onBrushSizeChange?: (size: PixelBrushSize) => void
  onGridVisibleChange?: (visible: boolean) => void
  onSymmetryChange?: (mode: PixelSymmetry) => void
  onZoomChange?: (zoom: PixelZoom) => void
  onStrokeEnd?: () => void
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void
  onSelectionChange?: (hasSelection: boolean) => void
  onPaletteFull?: () => void
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
    brushSize: brushSizeProp,
    gridVisible: gridVisibleProp,
    symmetry: symmetryProp,
    onToolChange,
    onColorChange,
    onPaletteChange,
    onBrushSizeChange,
    onGridVisibleChange,
    onSymmetryChange,
    onZoomChange,
    onStrokeEnd,
    onHistoryChange,
    onSelectionChange,
    onPaletteFull,
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
  const brushRef = useRef<PixelBrushSize>(brushSizeProp ?? 1)
  const gridRef = useRef(gridVisibleProp ?? true)
  const symmetryRef = useRef<PixelSymmetry>(symmetryProp ?? "off")
  const onPaletteFullRef = useRef(onPaletteFull)
  onPaletteFullRef.current = onPaletteFull
  const spacePanRef = useRef(false)
  const altSampleRef = useRef(false)
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null)
  const shapeBaseRef = useRef<Uint8ClampedArray | null>(null)
  const shapeShiftRef = useRef(false)
  const shapeFillRef = useRef(false)
  const selectionRef = useRef<PixelRect | null>(null)
  const selectStartRef = useRef<{ x: number; y: number } | null>(null)
  const moveRef = useRef<{
    origin: PixelRect
    grabX: number
    grabY: number
    floating: PixelClipboard
    base: Uint8ClampedArray
  } | null>(null)
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  const editActionRef = useRef({
    copy: () => undefined as void,
    cut: () => undefined as void,
    paste: () => undefined as void,
    delete: () => undefined as void,
  })
  /** Whether the current select gesture mutated pixels (move) vs marquee-only. */
  const selectMutatedRef = useRef(false)
  const drawRef = useRef<{ x: number; y: number } | null>(null)
  const panRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const onZoomChangeRef = useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange
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
    if ("error" in result) {
      if (result.error === "palette_full") onPaletteFullRef.current?.()
      return false
    }
    if (result.palette.length !== paletteRef.current.length) {
      paletteRef.current = result.palette
      onPaletteChangeRef.current?.(result.palette)
    }
    return true
  }, [])

  const [internalTool, setInternalTool] = useState<Tool>("pencil")
  const [internalColor, setInternalColor] = useState(PIXEL_INK)
  const [internalBrush, setInternalBrush] = useState<PixelBrushSize>(1)
  const [internalGrid, setInternalGrid] = useState(true)
  const [internalSymmetry, setInternalSymmetry] = useState<PixelSymmetry>("off")
  const [zoom, setZoom] = useState<PixelZoom>("fit")
  const [historyTick, setHistoryTick] = useState(0)
  const applyZoomRef = useRef<(next: PixelZoom, focusX?: number, focusY?: number) => void>(() => {})
  const scheduleRef = useRef<() => void>(() => {})

  const tool = toolProp ?? internalTool
  const color = colorProp ?? internalColor
  const brushSize = brushSizeProp ?? internalBrush
  const gridVisible = gridVisibleProp ?? internalGrid
  const symmetry = symmetryProp ?? internalSymmetry
  toolRef.current = tool
  colorRef.current = color
  brushRef.current = brushSize
  gridRef.current = gridVisible
  symmetryRef.current = symmetry

  const image = () => {
    if (!imageRef.current) {
      imageRef.current = createImage(initialSourceRef.current, canvasWidthRef.current, canvasHeightRef.current)
    }
    return imageRef.current
  }

  const paintColor = () => hexToRgb(toolRef.current === "eraser" ? PIXEL_PAPER : colorRef.current)

  const emitZoom = (next: PixelZoom) => {
    zoomRef.current = next
    setZoom(next)
    onZoomChangeRef.current?.(next)
  }

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
    emitZoom(next)
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

    // Grid on: always visible (lighter below former auto threshold). Grid off: never.
    if (gridRef.current) {
      viewCtx.beginPath()
      viewCtx.strokeStyle = scale >= PIXEL_GRID_MIN_ZOOM ? "rgba(32, 32, 42, 0.18)" : "rgba(32, 32, 42, 0.08)"
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

    const selection = selectionRef.current
    if (selection && selection.width > 0 && selection.height > 0) {
      viewCtx.save()
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([2 / scale, 2 / scale])
      viewCtx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      viewCtx.strokeStyle = "rgba(255, 253, 247, 0.95)"
      viewCtx.lineDashOffset = 2 / scale
      viewCtx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      viewCtx.restore()
    }
  }

  const emitSelection = () => {
    onSelectionChangeRef.current?.(selectionRef.current !== null)
    schedule()
  }

  const setSelection = (next: PixelRect | null) => {
    selectionRef.current = next
    emitSelection()
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

  const runBufferOp = (op: () => void) => {
    pushUndo()
    op()
    schedule()
    onStrokeEnd?.()
  }

  const copySelection = () => {
    const selection = selectionRef.current
    if (!selection) return
    sessionClipboard = extractRect(
      image().data,
      selection,
      canvasWidthRef.current,
      canvasHeightRef.current,
    )
  }

  const deleteSelection = () => {
    const selection = selectionRef.current
    if (!selection) return
    runBufferOp(() => {
      clearRectToPaper(image().data, selection, canvasWidthRef.current, canvasHeightRef.current)
      setSelection(null)
    })
  }

  const cutSelection = () => {
    const selection = selectionRef.current
    if (!selection) return
    sessionClipboard = extractRect(
      image().data,
      selection,
      canvasWidthRef.current,
      canvasHeightRef.current,
    )
    deleteSelection()
  }

  const pasteClipboard = () => {
    if (!sessionClipboard) return
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const selection = selectionRef.current
    const destX = selection ? selection.x : Math.max(0, Math.floor((w - sessionClipboard.width) / 2))
    const destY = selection ? selection.y : Math.max(0, Math.floor((h - sessionClipboard.height) / 2))
    runBufferOp(() => {
      blitRect(image().data, sessionClipboard!, destX, destY, w, h)
      setSelection({
        x: destX,
        y: destY,
        width: sessionClipboard!.width,
        height: sessionClipboard!.height,
      })
    })
  }

  editActionRef.current = {
    copy: copySelection,
    cut: cutSelection,
    paste: pasteClipboard,
    delete: deleteSelection,
  }

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
    getZoom: () => zoomRef.current,
    clearCanvas: () => {
      runBufferOp(() => {
        clearCanvasToPaper(image().data)
        setSelection(null)
      })
    },
    flipHorizontal: () => {
      const selection = selectionRef.current
      const w = canvasWidthRef.current
      const h = canvasHeightRef.current
      runBufferOp(() => {
        if (selection) flipRectHorizontal(image().data, selection, w, h)
        else flipCanvasHorizontal(image().data, w, h)
      })
    },
    flipVertical: () => {
      const selection = selectionRef.current
      const w = canvasWidthRef.current
      const h = canvasHeightRef.current
      runBufferOp(() => {
        if (selection) flipRectVertical(image().data, selection, w, h)
        else flipCanvasVertical(image().data, w, h)
      })
    },
    rotate90Cw: () => {
      const w = canvasWidthRef.current
      const h = canvasHeightRef.current
      const selection = selectionRef.current
      if (selection) {
        runBufferOp(() => {
          const next = rotateRect90Cw(image().data, selection, w, h)
          setSelection(next)
        })
        return true
      }
      if (w !== h) return false
      runBufferOp(() => rotateCanvas90Cw(image().data, w))
      return true
    },
    selectAll: () => {
      setSelection({ x: 0, y: 0, width: canvasWidthRef.current, height: canvasHeightRef.current })
      chooseTool("select")
    },
    clearSelection: () => setSelection(null),
    hasSelection: () => selectionRef.current !== null,
    clearHistory: () => {
      undoRef.current = []
      redoRef.current = []
      setHistoryTick((value) => value + 1)
      emitHistory()
    },
    getPalette: () => [...paletteRef.current],
    replaceColor: (fromHex, toHex) => {
      const from = normalizePixelHex(fromHex)
      const to = normalizePixelHex(toHex)
      if (!from || !to) return 0
      let count = 0
      runBufferOp(() => {
        adoptColor(to)
        count = replaceRgbInPixels(
          image().data,
          hexToRgb(from),
          hexToRgb(to),
          selectionRef.current ?? undefined,
          canvasWidthRef.current,
          canvasHeightRef.current,
        )
      })
      return count
    },
    removeColor: (hex) => {
      const normalized = normalizePixelHex(hex)
      if (!normalized) return { ok: false, error: "missing" as const }
      if (normalized === PIXEL_PAPER) return { ok: false, error: "paper" as const }
      const result = removeDocumentColor(
        image().data,
        paletteRef.current,
        normalized,
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
      if ("error" in result) return { ok: false, error: result.error }
      paletteRef.current = result.palette
      onPaletteChangeRef.current?.(result.palette)
      undoRef.current = []
      redoRef.current = []
      setHistoryTick((value) => value + 1)
      emitHistory()
      schedule()
      onStrokeEnd?.()
      return { ok: true, replaced: result.replaced }
    },
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

  const chooseTool = (next: Tool) => {
    toolRef.current = next
    if (onToolChange) onToolChange(next)
    else setInternalTool(next)
  }

  const chooseBrush = (next: PixelBrushSize) => {
    brushRef.current = next
    if (onBrushSizeChange) onBrushSizeChange(next)
    else setInternalBrush(next)
  }

  const chooseColor = (next: string) => {
    adoptColor(next)
    colorRef.current = next
    if (onColorChange) onColorChange(next)
    else setInternalColor(next)
    if (toolRef.current === "eraser" || toolRef.current === "eyedropper") chooseTool("pencil")
  }

  const chooseToolRef = useRef(chooseTool)
  chooseToolRef.current = chooseTool
  const chooseBrushRef = useRef(chooseBrush)
  chooseBrushRef.current = chooseBrush

  useEffect(() => {
    if (variant !== "studio") return
    const typing = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing(event.target)) return
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault()
        spacePanRef.current = true
        return
      }
      if (event.key === "Alt") {
        altSampleRef.current = true
        return
      }
      const mod = event.metaKey || event.ctrlKey
      if (mod) {
        const key = event.key.toLowerCase()
        if (key === "z" || key === "y") {
          event.preventDefault()
          if (key === "y" || (key === "z" && event.shiftKey)) redoFnRef.current()
          else undoFnRef.current()
          return
        }
        if (key === "a") {
          event.preventDefault()
          setSelection({ x: 0, y: 0, width: canvasWidthRef.current, height: canvasHeightRef.current })
          chooseToolRef.current("select")
          return
        }
        if (key === "c") {
          event.preventDefault()
          editActionRef.current.copy()
          return
        }
        if (key === "x") {
          event.preventDefault()
          editActionRef.current.cut()
          return
        }
        if (key === "v") {
          event.preventDefault()
          editActionRef.current.paste()
          return
        }
        return
      }
      if (event.key === "Escape") {
        setSelection(null)
        return
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectionRef.current) {
          event.preventDefault()
          editActionRef.current.delete()
        }
        return
      }
      const key = event.key.toLowerCase()
      if (key === "b") chooseToolRef.current("pencil")
      else if (key === "e") chooseToolRef.current("eraser")
      else if (key === "h") chooseToolRef.current("pan")
      else if (key === "i") chooseToolRef.current("eyedropper")
      else if (key === "g") chooseToolRef.current("fill")
      else if (key === "l") chooseToolRef.current("line")
      else if (key === "u") chooseToolRef.current("rect")
      else if (key === "o") chooseToolRef.current("ellipse")
      else if (key === "v") chooseToolRef.current("select")
      else if (key === "[") {
        const idx = PIXEL_BRUSH_SIZES.indexOf(brushRef.current)
        chooseBrushRef.current(PIXEL_BRUSH_SIZES[Math.max(0, idx - 1)] ?? 1)
      } else if (key === "]") {
        const idx = PIXEL_BRUSH_SIZES.indexOf(brushRef.current)
        chooseBrushRef.current(
          PIXEL_BRUSH_SIZES[Math.min(PIXEL_BRUSH_SIZES.length - 1, idx + 1)] ?? 8,
        )
      } else if (key === "'") {
        const next = !gridRef.current
        gridRef.current = next
        if (onGridVisibleChange) onGridVisibleChange(next)
        else setInternalGrid(next)
        scheduleRef.current()
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spacePanRef.current = false
      if (event.key === "Alt") altSampleRef.current = false
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [variant, onGridVisibleChange])

  const stampStroke = (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
    if (toolRef.current !== "eraser") {
      if (!adoptColor(colorRef.current)) return
    }
    const rgb = paintColor()
    const start = from ?? to
    strokeBrushLineSymmetric(
      image().data,
      start.x,
      start.y,
      to.x,
      to.y,
      rgb,
      brushRef.current,
      canvasWidthRef.current,
      canvasHeightRef.current,
      symmetryRef.current,
    )
    schedule()
  }

  const sampleColorAt = (cell: { x: number; y: number }) => {
    const rgb = getPixelRgb(image().data, cell.x, cell.y, canvasWidthRef.current, canvasHeightRef.current)
    if (!rgb) return
    chooseColor(rgbToHex(rgb))
  }

  const restoreShapeBase = () => {
    const base = shapeBaseRef.current
    if (!base) return
    image().data.set(base)
  }

  const paintShapePreview = (end: { x: number; y: number }) => {
    const start = shapeStartRef.current
    if (!start) return
    restoreShapeBase()
    if (toolRef.current !== "eraser") adoptColor(colorRef.current)
    const rgb = paintColor()
    let x1 = end.x
    let y1 = end.y
    if (shapeShiftRef.current && (toolRef.current === "rect" || toolRef.current === "ellipse")) {
      const square = constrainSquareEnd(start.x, start.y, end.x, end.y)
      x1 = square.x
      y1 = square.y
    }
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const pixels = image().data
    const filled = shapeFillRef.current
    if (toolRef.current === "line") {
      strokeBrushLine(pixels, start.x, start.y, x1, y1, rgb, brushRef.current, w, h)
    } else if (toolRef.current === "rect") {
      if (filled) fillRect(pixels, start.x, start.y, x1, y1, rgb, w, h)
      else strokeRect(pixels, start.x, start.y, x1, y1, rgb, w, h)
    } else if (toolRef.current === "ellipse") {
      paintEllipse(pixels, start.x, start.y, x1, y1, rgb, filled, w, h)
    }
    schedule()
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const view = event.currentTarget
    view.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    shapeShiftRef.current = event.shiftKey
    shapeFillRef.current = event.altKey

    if (pointersRef.current.size === 2) {
      drawRef.current = null
      panRef.current = null
      shapeStartRef.current = null
      shapeBaseRef.current = null
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

    if (toolRef.current === "pan" || event.button === 1 || spacePanRef.current) {
      panRef.current = {
        x: event.clientX,
        y: event.clientY,
        originX: cameraRef.current.originX,
        originY: cameraRef.current.originY,
      }
      return
    }

    const cell = cellFromEvent(event)

    if (
      toolRef.current === "eyedropper" ||
      ((altSampleRef.current || event.altKey) && !SHAPE_TOOLS.has(toolRef.current) && toolRef.current !== "fill")
    ) {
      sampleColorAt(cell)
      return
    }

    if (toolRef.current === "fill") {
      pushUndo()
      adoptColor(colorRef.current)
      floodFill(
        image().data,
        cell.x,
        cell.y,
        hexToRgb(colorRef.current),
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
      schedule()
      onStrokeEnd?.()
      return
    }

    if (toolRef.current === "select") {
      const selection = selectionRef.current
      if (selection && pointInPixelRect(cell.x, cell.y, selection)) {
        pushUndo()
        selectMutatedRef.current = true
        const floating = extractRect(
          image().data,
          selection,
          canvasWidthRef.current,
          canvasHeightRef.current,
        )
        clearRectToPaper(image().data, selection, canvasWidthRef.current, canvasHeightRef.current)
        const base = new Uint8ClampedArray(image().data)
        moveRef.current = {
          origin: selection,
          grabX: cell.x - selection.x,
          grabY: cell.y - selection.y,
          floating,
          base,
        }
        blitRect(
          image().data,
          floating,
          selection.x,
          selection.y,
          canvasWidthRef.current,
          canvasHeightRef.current,
        )
        schedule()
        return
      }
      selectMutatedRef.current = false
      selectStartRef.current = cell
      moveRef.current = null
      setSelection(null)
      return
    }

    if (SHAPE_TOOLS.has(toolRef.current)) {
      pushUndo()
      shapeStartRef.current = cell
      shapeBaseRef.current = new Uint8ClampedArray(image().data)
      paintShapePreview(cell)
      return
    }

    pushUndo()
    drawRef.current = cell
    stampStroke(cell, cell)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    shapeShiftRef.current = event.shiftKey
    shapeFillRef.current = event.altKey

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
        emitZoom(cameraRef.current.scale)
        schedule()
      }
      return
    }

    if (panRef.current) {
      cameraRef.current.originX = panRef.current.originX + (event.clientX - panRef.current.x)
      cameraRef.current.originY = panRef.current.originY + (event.clientY - panRef.current.y)
      if (zoomRef.current === "fit") emitZoom(cameraRef.current.scale)
      schedule()
      return
    }

    if (moveRef.current) {
      const move = moveRef.current
      const cell = cellFromEvent(event)
      const nextX = cell.x - move.grabX
      const nextY = cell.y - move.grabY
      image().data.set(move.base)
      blitRect(
        image().data,
        move.floating,
        nextX,
        nextY,
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
      setSelection({
        x: nextX,
        y: nextY,
        width: move.floating.width,
        height: move.floating.height,
      })
      return
    }

    if (selectStartRef.current) {
      const start = selectStartRef.current
      const end = cellFromEvent(event)
      setSelection(normalizePixelRect(start.x, start.y, end.x, end.y))
      return
    }

    if (shapeStartRef.current) {
      paintShapePreview(cellFromEvent(event))
      return
    }

    if (!drawRef.current) return
    const cell = cellFromEvent(event)
    stampStroke(drawRef.current, cell)
    drawRef.current = cell
  }

  const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const wasStroke = Boolean(drawRef.current) || Boolean(shapeStartRef.current)
    const wasMove = Boolean(moveRef.current)
    const wasMarquee = Boolean(selectStartRef.current)
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) {
      drawRef.current = null
      panRef.current = null
      shapeStartRef.current = null
      shapeBaseRef.current = null
      selectStartRef.current = null
      moveRef.current = null
      if (wasStroke || wasMove || (wasMarquee && selectMutatedRef.current)) onStrokeEnd?.()
      selectMutatedRef.current = false
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
          tool === "pan" || spacePanRef.current
            ? "cursor-grab"
            : tool === "eyedropper"
              ? "cursor-cell"
              : "cursor-crosshair",
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
            ["fill", copy.pixelFill[lang]],
            ["eyedropper", copy.pixelEyedropper[lang]],
            ["line", copy.pixelLine[lang]],
            ["rect", copy.pixelRect[lang]],
            ["ellipse", copy.pixelEllipse[lang]],
            ["select", copy.pixelSelect[lang]],
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
