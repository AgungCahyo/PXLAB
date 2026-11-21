"use client"

import {
  BrushStroke,
  brushMaskFromClipboard,
  brushMaskFromSelection,
  brushOptionsExtent,
  clampBrushOptions,
  DEFAULT_BRUSH_OPTIONS,
  isPlainBrush,
  listPointerSamples,
  normalizePointerPressure,
  type BrushMask,
  type BrushOptions,
} from "@/lib/pixel-brush"
import { clampLayerOpacity, isPixelBlendMode, type PixelBlendMode } from "@/lib/pixel-blend"
import { PixelHistory, type HistoryFrame } from "@/lib/pixel-history"
import { bakeMergeDown, bakeVisibleLayers, createPaletteResolver } from "@/lib/pixel-merge"
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
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
  blitIndicesIntoLayer,
  blitRect,
  buildPaletteRgbIndex,
  buildPixelSourceV2,
  clampStrokeWidth,
  clampFillTolerance,
  clearCanvasToPaper,
  clearRectToPaper,
  copyRgbaWithCanvasChecker,
  pointerToCell,
  compositeLayersToRgba,
  viewDeviceTransform,
  createBezierAnchor,
  createEmptyLayer,
  createLayerId,
  inCanvas,
  layerThumbnailDataUrl,
  constrainSquareEnd,
  densifyStrokeSegment,
  ensurePaletteColor,
  extractRect,
  fillLinearGradient,
  contractSelection,
  expandSelection,
  fillBoundsRect,
  fillPaper,
  fillRect,
  fitOrigin,
  flipCanvasHorizontal,
  flipCanvasVertical,
  flipRectHorizontal,
  flipRectVertical,
  floodFill,
  getPixelRgb,
  invertSelection,
  hexToRgb,
  indicesToRgba,
  normalizePixelHex,
  normalizePixelRect,
  paintEllipse,
  paletteIndexOf,
  parsePixelSource,
  layerBlend,
  layerOpacity,
  applyAlphaLock,
  snapshotIndicesRect,
  writeIndicesRectToRgba,
  measurePixelTextBox,
  PIXEL_LAYER_MAX,
  pointInPixelRect,
  pointInSelection,
  rasterizeCubicPath,
  rasterizePolygon,
  resolveScale,
  rgbaToIndices,
  rgbToHex,
  removeDocumentColor,
  replaceMatchingColor,
  replaceRgbInPixels,
  rotateCanvas90Cw,
  rotateClipboardNearest,
  rotateRect90Cw,
  combineSelections,
  scaleClipboard,
  selectionCombineModeFromModifiers,
  selectionFromColor,
  selectionFromEllipse,
  selectionFromFlood,
  selectionFromPolygon,
  selectionFromPolygonVertices,
  POLYGON_SELECT_CLOSE_DIST,
  type SelectionCombineMode,
  snapCssScaleToDevicePixels,
  snapOriginToDevicePixels,
  stampText as stampTextBitmap,
  stepBrushSize,
  stepZoom,
  strokeBrushLine,
  strokeBrushLineSymmetric,
  strokeRectBrush,
  writeRgbaRectToIndices,
  zoomToward,
  type BezierAnchor,
  type PixelBrushSize,
  type FillBounds,
  type PixelClipboard,
  type PixelDrawTool,
  type PixelLayerRuntime,
  type PixelPoint,
  type PixelRect,
  type PixelSelection,
  type PixelSource,
  type PixelSymmetry,
  type PixelZoom,
} from "@/lib/pixel"
import { PIXEL_FONT_H, PIXEL_FONT_LEADING, PIXEL_FONT_W } from "@/lib/pixel-font"
import { mergeImportIntoDocumentPalette } from "@/lib/pixel-import"
import { clampDirtyRect, dirtyRectForSegment, unionDirtyRect } from "@/lib/pixel-dirty"
import { cn } from "@/lib/utils"

export type Tool = PixelDrawTool

type Camera = { originX: number; originY: number; scale: number }

const SHAPE_TOOLS = new Set<Tool>(["line", "rect", "ellipse", "gradient"])
const DRAFT_SHAPE_TOOLS = new Set<Tool>(["rect", "ellipse"])
const SELECT_TOOLS = new Set<Tool>(["select", "selectContiguous", "selectColor", "lasso", "selectPolygon"])
const PATH_CLOSE_DIST = 1.5
const HANDLE_HIT = 1.75

export type ShapeDraft =
  | {
      kind: "rect" | "ellipse"
      x0: number
      y0: number
      x1: number
      y1: number
      filled: boolean
      strokeWidth: number
    }
  | {
      kind: "bezier"
      anchors: BezierAnchor[]
      closed: boolean
      mode: "stroke" | "fill"
      strokeWidth: number
      selected: number
    }
  | {
      kind: "polygon"
      points: PixelPoint[]
      closed: boolean
      mode: "stroke" | "fill"
      strokeWidth: number
      selected: number
    }

export type ShapeDraftInfo = {
  active: boolean
  kind: ShapeDraft["kind"] | null
  filled: boolean
  mode: "stroke" | "fill"
  strokeWidth: number
  width: number
  height: number
}
/** Paragraph Text: only left/right change wrap width. Height always follows content. */
const PARAGRAPH_HANDLES = [
  { id: "e", cursor: "ew-resize", style: { right: -5, top: "50%", marginTop: -6 } },
  { id: "w", cursor: "ew-resize", style: { left: -5, top: "50%", marginTop: -6 } },
] as const
type TextHandle = (typeof PARAGRAPH_HANDLES)[number]["id"]
/** Point Text = click; Paragraph Text = click-drag (Photoshop model). */
type TextMode = "point" | "paragraph"
type TextFrame = {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  mode: TextMode
}
type PlacedText = TextFrame & { color: string; scale: number }

/** Session clipboard shared across Playground remounts in the same tab. */
let sessionClipboard: PixelClipboard | null = null

export type PixelLayerInfo = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  active: boolean
  /** 0-100. */
  opacity: number
  blend: PixelBlendMode
  /** Transparency lock: painting cannot change which cells are empty. */
  lockAlpha: boolean
}

export type PixelLayerStylePatch = {
  opacity?: number
  blend?: PixelBlendMode
  lockAlpha?: boolean
}

function cloneLayers(layers: PixelLayerRuntime[]): PixelLayerRuntime[] {
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    blend: layer.blend,
    lockAlpha: layer.lockAlpha,
    indices: new Uint8Array(layer.indices),
  }))
}

function layersFromInitialSource(source: PixelSource | null, width: number, height: number) {
  if (source) {
    const parsed = parsePixelSource(source)
    if (parsed.ok) return cloneLayers(parsed.layers)
  }
  return [createEmptyLayer(width, height, "Layer 1")]
}

function paletteFromSource(source: PixelSource | null) {
  if (!source) return [...PIXEL_PALETTE]
  const parsed = parsePixelSource(source)
  return parsed.ok ? [...parsed.data.palette] : [...PIXEL_PALETTE]
}

export type PixelBoardHandle = {
  exportSource: () => PixelSource
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
  rotateSelection: (degrees: number) => boolean
  selectAll: () => void
  clearSelection: () => void
  invertSelection: () => void
  expandSelection: () => void
  contractSelection: () => void
  hasSelection: () => boolean
  /** Brush tip silhouette from the current selection or clipboard (max 64x64). */
  getBrushTip: (source: "selection" | "clipboard") => BrushMask | null
  copySelection: () => boolean
  cutSelection: () => boolean
  pasteClipboard: () => boolean
  deleteSelection: () => boolean
  hasClipboard: () => boolean
  stampText: (
    x: number,
    y: number,
    text: string,
    box?: { width: number; height?: number; scale?: number; wrap?: boolean },
  ) => void
  replaceColor: (fromHex: string, toHex: string) => number
  removeColor: (hex: string) => { ok: true; replaced: number } | { ok: false; error: "paper" | "missing" }
  /**
   * Append colors to the document palette. Never remaps indices or rewrites pixels.
   * Stops early when the palette is full.
   */
  ensureColors: (hexes: readonly string[]) => {
    palette: string[]
    added: number
    truncated: boolean
  }
  clearHistory: () => void
  getPalette: () => string[]
  getLayers: () => PixelLayerInfo[]
  addLayer: () => boolean
  deleteLayer: (id: string) => boolean
  duplicateLayer: (id: string) => boolean
  mergeDown: (id: string) => boolean
  mergeVisible: () => boolean
  reorderLayer: (id: string, direction: 1 | -1) => boolean
  moveLayer: (id: string, toIndex: number) => boolean
  setActiveLayer: (id: string) => boolean
  setLayerVisible: (id: string, visible: boolean) => boolean
  setLayerLocked: (id: string, locked: boolean) => boolean
  /** Opacity, blend mode and transparency lock. Repeated changes to one property coalesce into one undo step. */
  setLayerStyle: (id: string, patch: PixelLayerStylePatch) => boolean
  renameLayer: (id: string, name: string) => boolean
  getLayerThumbnail: (id: string, size?: number) => string | null
  applyShapeDraft: () => boolean
  cancelShapeDraft: () => void
  updateShapeDraft: (patch: {
    filled?: boolean
    mode?: "stroke" | "fill"
    strokeWidth?: number
    width?: number
    height?: number
  }) => void
  getShapeDraft: () => ShapeDraftInfo
  importPixelArtLayer: (input: {
    indices: Uint8Array
    width: number
    height: number
    palette: string[]
    name?: string
  }) =>
    | { ok: true; layerId: string; colorsAdded: number }
    | { ok: false; error: "layer_limit" | "empty" | "dimensions" }
}

export type PixelBoardProps = {
  lang: Lang
  variant?: "prototype" | "studio"
  width?: number
  height?: number
  initialSource?: PixelSource | null
  tool?: Tool
  color?: string
  brushSize?: PixelBrushSize
  gridVisible?: boolean
  symmetry?: PixelSymmetry
  /** Max channel delta for the fill tool. 0 matches the clicked color exactly. */
  fillTolerance?: number
  /** Marquee shape for the box-select tool. */
  selectShape?: "rect" | "ellipse"
  /** Opacity, flow, hardness, spacing, pressure and custom tip for pencil/circle/eraser. */
  brushOptions?: BrushOptions
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
  onClipboardChange?: (hasClipboard: boolean) => void
  onLayersChange?: (layers: PixelLayerInfo[]) => void
  onEditFeedback?: (kind: "copied" | "cut" | "pasted" | "clipboard-empty") => void
  onShapeDraftChange?: (info: ShapeDraftInfo) => void
  onPaletteFull?: () => void
  /** Right-click or touch long-press on the view canvas. */
  onCanvasMenu?: (info: { clientX: number; clientY: number }) => void
  onHoverCell?: (cell: { x: number; y: number } | null) => void
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
    fillTolerance: fillToleranceProp,
    selectShape: selectShapeProp,
    brushOptions: brushOptionsProp,
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
    onClipboardChange,
    onLayersChange,
    onEditFeedback,
    onShapeDraftChange,
    onPaletteFull,
    onCanvasMenu,
    onHoverCell,
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
  /** View-only: Paper shown as light cell checker; never used for export. */
  const displayRef = useRef<HTMLCanvasElement | null>(null)
  const displayImageRef = useRef<ImageData | null>(null)
  const viewCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const imageRef = useRef<ImageData | null>(null)
  const compositeRef = useRef<ImageData | null>(null)
  const paperRgbRef = useRef(hexToRgb(PIXEL_PAPER))
  const layersRef = useRef<PixelLayerRuntime[]>(
    layersFromInitialSource(initialSource, width, height),
  )
  const activeLayerIndexRef = useRef(0)
  const selectRotateRef = useRef<{
    origin: PixelSelection
    floating: PixelClipboard
    base: Uint8ClampedArray
    centerX: number
    centerY: number
    startAngle: number
    degrees: number
  } | null>(null)
  const cameraRef = useRef<Camera>({ originX: 0, originY: 0, scale: 1 })
  const sizeRef = useRef({ width: 1, height: 1 })
  const devicePixelSizeRef = useRef<{ width: number; height: number } | null>(null)
  /** `full` recomposites every cell. `rect` recomposites only that region. `clean` skips it. */
  const dirtyRef = useRef<{ mode: "full" } | { mode: "rect"; rect: PixelRect } | { mode: "clean" }>({
    mode: "full",
  })
  /** Previous line/gradient preview bounds, so the next move also clears the old stroke. */
  const shapePreviewDirtyRef = useRef<PixelRect | null>(null)
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
  const shapeDraftRef = useRef<ShapeDraft | null>(null)
  const shapeDraftPreviewRef = useRef<{
    image: ImageData
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
  } | null>(null)
  const shapePrefsRef = useRef<{ filled: boolean; mode: "stroke" | "fill" }>({
    filled: false,
    mode: "stroke",
  })
  const shapeDragRef = useRef<
    | { type: "create-rect" | "create-ellipse"; start: PixelPoint }
    | { type: "resize-rect"; corner: "nw" | "ne" | "sw" | "se"; origin: ShapeDraft & { kind: "rect" | "ellipse" } }
    | { type: "move-anchor"; index: number }
    | { type: "move-handle"; index: number; which: "hi" | "ho" }
    | { type: "move-point"; index: number }
    | { type: "create-bezier"; index: number; from: PixelPoint }
    | null
  >(null)
  const selectionRef = useRef<PixelSelection | null>(null)
  /**
   * Full selection pixels while a marquee exists (including parts outside the canvas).
   * When `selectionFloatingRef` is true, pixels are lifted from the layer and only
   * composited in the view until commit — so move does not stamp over neighbors yet.
   */
  const selectionFloatRef = useRef<PixelClipboard | null>(null)
  const selectionFloatingRef = useRef(false)
  const selectStartRef = useRef<{ x: number; y: number } | null>(null)
  const selectMarqueeEndRef = useRef<PixelPoint | null>(null)
  const selectCombineRef = useRef<SelectionCombineMode>("replace")
  const selectResizeRef = useRef<{
    corner: "nw" | "ne" | "sw" | "se"
    origin: PixelSelection
    floating: PixelClipboard
    base: Uint8ClampedArray
  } | null>(null)
  const lassoRef = useRef<PixelPoint[] | null>(null)
  /** In-progress click-by-click polygon selection. */
  const polySelRef = useRef<{
    points: PixelPoint[]
    mode: SelectionCombineMode
    hover: PixelPoint | null
  } | null>(null)
  const onShapeDraftChangeRef = useRef(onShapeDraftChange)
  onShapeDraftChangeRef.current = onShapeDraftChange
  const [textFrame, setTextFrame] = useState<TextFrame | null>(null)
  const textFrameRef = useRef<TextFrame | null>(null)
  const textOverlayRef = useRef<HTMLDivElement | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const textResizeRef = useRef<{ handle: TextHandle; x: number; y: number; width: number; height: number } | null>(
    null,
  )
  const textMoveRef = useRef<{ grabX: number; grabY: number } | null>(null)
  const textCreateRef = useRef<{ start: PixelPoint; end: PixelPoint } | null>(null)
  const placedTextsRef = useRef<PlacedText[]>([])
  const textIdRef = useRef(0)
  const moveRef = useRef<{
    origin: PixelSelection
    grabX: number
    grabY: number
    floating: PixelClipboard
    base: Uint8ClampedArray
  } | null>(null)
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  const onClipboardChangeRef = useRef(onClipboardChange)
  onClipboardChangeRef.current = onClipboardChange
  const onLayersChangeRef = useRef(onLayersChange)
  onLayersChangeRef.current = onLayersChange
  const onEditFeedbackRef = useRef(onEditFeedback)
  onEditFeedbackRef.current = onEditFeedback
  const editActionRef = useRef({
    copy: () => false as boolean,
    cut: () => false as boolean,
    paste: () => false as boolean,
    delete: () => false as boolean,
  })
  /** Whether the current select gesture mutated pixels (move) vs marquee-only. */
  const selectMutatedRef = useRef(false)
  const onCanvasMenuRef = useRef(onCanvasMenu)
  onCanvasMenuRef.current = onCanvasMenu
  const onHoverCellRef = useRef(onHoverCell)
  onHoverCellRef.current = onHoverCell
  const drawRef = useRef<{ x: number; y: number } | null>(null)
  /** Recent freehand cells for sparse-gap Catmull-Rom densify (not undo history). */
  const strokeTrailRef = useRef<PixelPoint[]>([])
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
  const historyRef = useRef(new PixelHistory())
  const styleUndoRef = useRef<{ key: string; at: number } | null>(null)
  const pushUndoRef = useRef<() => void>(() => {})
  const selectionUndoOpenRef = useRef(false)
  const selectAllRef = useRef<() => void>(() => {})
  const deselectRef = useRef<() => void>(() => {})
  const invertSelectionRef = useRef<() => void>(() => {})
  const expandSelectionRef = useRef<() => void>(() => {})
  const contractSelectionRef = useRef<() => void>(() => {})
  const fillToleranceRef = useRef(0)
  const brushOptionsRef = useRef<BrushOptions>(DEFAULT_BRUSH_OPTIONS)
  const brushStrokeRef = useRef<BrushStroke | null>(null)
  const strokePressureRef = useRef(1)
  const lastStampPressureRef = useRef(1)
  const selectShapeRef = useRef<"rect" | "ellipse">("rect")
  const canvasWidthRef = useRef(width)
  const canvasHeightRef = useRef(height)
  canvasWidthRef.current = width
  canvasHeightRef.current = height
  const onPaletteChangeRef = useRef(onPaletteChange)
  onPaletteChangeRef.current = onPaletteChange
  const paletteRef = useRef<string[]>(paletteFromSource(initialSource))
  const paletteIndexMapRef = useRef(buildPaletteRgbIndex(paletteRef.current))

  const syncPaletteIndexMap = () => {
    paletteIndexMapRef.current = buildPaletteRgbIndex(paletteRef.current)
  }

  const adoptColor = useCallback((hex: string, recordHistory = false) => {
    const result = ensurePaletteColor(paletteRef.current, hex)
    if ("error" in result) {
      if (result.error === "palette_full") onPaletteFullRef.current?.()
      return false
    }
    if (result.palette.length !== paletteRef.current.length) {
      if (recordHistory) pushUndoRef.current()
      paletteRef.current = result.palette
      syncPaletteIndexMap()
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
  const [fillToleranceUi, setFillToleranceUi] = useState(0)
  const [selectShapeUi, setSelectShapeUi] = useState<"rect" | "ellipse">("rect")
  const applyZoomRef = useRef<(next: PixelZoom, focusX?: number, focusY?: number) => void>(() => {})
  const scheduleRef = useRef<() => void>(() => {})

  const tool = toolProp ?? internalTool
  const color = colorProp ?? internalColor
  const brushSize = brushSizeProp ?? internalBrush
  const gridVisible = gridVisibleProp ?? internalGrid
  const symmetry = symmetryProp ?? internalSymmetry
  toolRef.current = tool
  textFrameRef.current = textFrame
  colorRef.current = color
  brushRef.current = brushSize
  gridRef.current = gridVisible
  symmetryRef.current = symmetry
  fillToleranceRef.current = clampFillTolerance(fillToleranceProp ?? fillToleranceUi)
  brushOptionsRef.current = brushOptionsProp ? clampBrushOptions(brushOptionsProp) : DEFAULT_BRUSH_OPTIONS
  selectShapeRef.current = selectShapeProp ?? selectShapeUi

  const emitLayers = () => {
    const active = activeLayerIndexRef.current
    onLayersChangeRef.current?.(
      layersRef.current.map((layer, index) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        active: index === active,
        opacity: layerOpacity(layer),
        blend: layerBlend(layer),
        lockAlpha: Boolean(layer.lockAlpha),
      })),
    )
  }

  const syncActiveFromImage = (rect?: PixelRect | null) => {
    const layers = layersRef.current
    const active = layers[activeLayerIndexRef.current]
    if (!active || !imageRef.current) return
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    // Transparency lock only means something on layers above the base (the base has no empty cells).
    const locked = Boolean(active.lockAlpha) && activeLayerIndexRef.current > 0 && active.indices.length === w * h
    const before = locked ? snapshotIndicesRect(active.indices, w, h, rect ?? null) : null
    if (rect && active.indices.length === w * h) {
      writeRgbaRectToIndices(
        imageRef.current.data,
        active.indices,
        w,
        h,
        rect,
        paletteRef.current,
        paletteIndexMapRef.current,
      )
    } else {
      active.indices = rgbaToIndices(
        imageRef.current.data,
        w,
        h,
        paletteRef.current,
        paletteIndexMapRef.current,
      )
    }
    if (before && applyAlphaLock(active.indices, before, w)) {
      // Keep the editing buffer in step with what the lock kept.
      writeIndicesRectToRgba(active.indices, imageRef.current.data, w, before, paletteRef.current)
    }
  }

  const loadActiveIntoImage = () => {
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const layers = layersRef.current
    const active = layers[activeLayerIndexRef.current] ?? layers[0]
    if (!imageRef.current || imageRef.current.width !== w || imageRef.current.height !== h) {
      imageRef.current = new ImageData(w, h)
    }
    if (active) {
      indicesToRgba(active.indices, imageRef.current.data, paletteRef.current)
    } else {
      fillPaper(imageRef.current.data)
    }
  }

  const image = () => {
    if (!imageRef.current) {
      loadActiveIntoImage()
    }
    return imageRef.current!
  }

  const activeLayerEditable = () => {
    const layer = layersRef.current[activeLayerIndexRef.current]
    return Boolean(layer && !layer.locked)
  }

  const currentHistoryState = () => {
    syncActiveFromImage()
    return {
      layers: layersRef.current,
      active: activeLayerIndexRef.current,
      palette: paletteRef.current,
      selection: selectionRef.current,
      floating: selectionFloatingRef.current ? selectionFloatRef.current : null,
    }
  }

  /** Adopt colours a merge had to add (undo already captured the old palette). */
  const growPaletteFromMerge = (resolver: { palette: string[]; added: number; approximated: number }) => {
    if (resolver.added > 0) {
      paletteRef.current = [...resolver.palette]
      syncPaletteIndexMap()
      onPaletteChangeRef.current?.(paletteRef.current)
    }
    if (resolver.approximated > 0) onPaletteFullRef.current?.()
  }

  const applyHistoryFrame = (frame: HistoryFrame) => {
    layersRef.current = cloneLayers(frame.layers)
    activeLayerIndexRef.current = Math.max(
      0,
      Math.min(frame.active, layersRef.current.length - 1),
    )
    const paletteChanged =
      frame.palette.length !== paletteRef.current.length ||
      frame.palette.some((color, index) => color !== paletteRef.current[index])
    if (paletteChanged) {
      paletteRef.current = [...frame.palette]
      syncPaletteIndexMap()
      onPaletteChangeRef.current?.(paletteRef.current)
    }
    selectionRef.current = frame.selection
      ? {
          x: frame.selection.x,
          y: frame.selection.y,
          width: frame.selection.width,
          height: frame.selection.height,
          mask: frame.selection.mask ? new Uint8Array(frame.selection.mask) : undefined,
        }
      : null
    if (frame.floating) {
      selectionFloatingRef.current = true
      selectionFloatRef.current = {
        width: frame.floating.width,
        height: frame.floating.height,
        data: new Uint8ClampedArray(frame.floating.data),
        mask: frame.floating.mask ? new Uint8Array(frame.floating.mask) : undefined,
      }
    } else {
      selectionFloatRef.current = null
      selectionFloatingRef.current = false
    }
    loadActiveIntoImage()
    emitLayers()
    emitSelection()
    schedule()
  }

  const compositeImage = (rect?: PixelRect | null) => {
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    if (!compositeRef.current || compositeRef.current.width !== w || compositeRef.current.height !== h) {
      compositeRef.current = new ImageData(w, h)
    }
    syncActiveFromImage(rect)
    compositeLayersToRgba(
      layersRef.current,
      compositeRef.current.data,
      paletteRef.current,
      w,
      h,
      rect,
    )
    return compositeRef.current
  }

  const paintColor = () => hexToRgb(toolRef.current === "eraser" ? PIXEL_PAPER : colorRef.current)

  const emitZoom = (next: PixelZoom) => {
    zoomRef.current = next
    setZoom(next)
    onZoomChangeRef.current?.(next)
  }

  const scheduleView = () => {
    if (rafRef.current) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0
      draw()
    })
  }

  /** Mark every cell dirty and redraw (undo, palette, layer structure). */
  const schedule = () => {
    dirtyRef.current = { mode: "full" }
    shapePreviewDirtyRef.current = null
    scheduleView()
  }

  /** Mark a cell rectangle dirty. A full invalidation already pending stays full. */
  const scheduleRect = (rect: PixelRect | null) => {
    const clamped = rect ? clampDirtyRect(rect, canvasWidthRef.current, canvasHeightRef.current) : null
    if (!clamped) {
      scheduleView()
      return
    }
    const current = dirtyRef.current
    if (current.mode !== "full") {
      const area = clamped.width * clamped.height
      if (area >= canvasWidthRef.current * canvasHeightRef.current) {
        dirtyRef.current = { mode: "full" }
      } else if (current.mode === "rect") {
        const next = unionDirtyRect(current.rect, clamped)
        dirtyRef.current =
          next.width * next.height >= canvasWidthRef.current * canvasHeightRef.current
            ? { mode: "full" }
            : { mode: "rect", rect: next }
      } else {
        dirtyRef.current = { mode: "rect", rect: clamped }
      }
    }
    scheduleView()
  }

  const currentDpr = () => window.devicePixelRatio || 1

  const applyFit = () => {
    const { width: viewW, height: viewH } = sizeRef.current
    const dpr = currentDpr()
    const scale = resolveScale(
      "fit",
      viewW,
      viewH,
      canvasWidthRef.current,
      canvasHeightRef.current,
      dpr,
    )
    const origin = fitOrigin(viewW, viewH, scale, canvasWidthRef.current, canvasHeightRef.current)
    cameraRef.current = { scale, ...snapOriginToDevicePixels(origin.originX, origin.originY, dpr) }
  }

  const applyZoom = (next: PixelZoom, focusX?: number, focusY?: number) => {
    const { width: viewW, height: viewH } = sizeRef.current
    const prev = cameraRef.current
    const dpr = currentDpr()
    const nextScale = resolveScale(
      next,
      viewW,
      viewH,
      canvasWidthRef.current,
      canvasHeightRef.current,
      dpr,
    )
    emitZoom(next)
    if (next === "fit") {
      applyFit()
      scheduleView()
      return
    }
    const fx = focusX ?? viewW / 2
    const fy = focusY ?? viewH / 2
    const zoomed = zoomToward({
      originX: prev.originX,
      originY: prev.originY,
      scale: prev.scale,
      nextScale,
      focusX: fx,
      focusY: fy,
    })
    cameraRef.current = {
      scale: nextScale,
      ...snapOriginToDevicePixels(zoomed.originX, zoomed.originY, dpr),
    }
    scheduleView()
  }

  const draw = () => {
    const view = viewRef.current
    const buffer = bufferRef.current
    if (!view || !buffer) return
    const bufferCtx = buffer.getContext("2d")
    if (!bufferCtx) return

    const canvasW = canvasWidthRef.current
    const canvasH = canvasHeightRef.current
    if (buffer.width !== canvasW || buffer.height !== canvasH) {
      buffer.width = canvasW
      buffer.height = canvasH
      dirtyRef.current = { mode: "full" }
    }

    // Buffer = opaque Paper composite (export). Display = Paper as light cell colors.
    if (dirtyRef.current.mode !== "clean") {
      const region = dirtyRef.current.mode === "rect" ? dirtyRef.current.rect : null
      const composite = compositeImage(region)

      let display = displayRef.current
      if (!display) {
        display = document.createElement("canvas")
        displayRef.current = display
      }
      const displayResized = display.width !== canvasW || display.height !== canvasH
      if (displayResized) {
        display.width = canvasW
        display.height = canvasH
      }
      if (
        !displayImageRef.current ||
        displayImageRef.current.width !== canvasW ||
        displayImageRef.current.height !== canvasH
      ) {
        displayImageRef.current = new ImageData(canvasW, canvasH)
      }
      const blit = region && !displayResized ? region : null
      if (!blit) bufferCtx.putImageData(composite, 0, 0)
      else bufferCtx.putImageData(composite, 0, 0, blit.x, blit.y, blit.width, blit.height)
      copyRgbaWithCanvasChecker(
        composite.data,
        displayImageRef.current.data,
        canvasW,
        canvasH,
        paperRgbRef.current,
        undefined,
        undefined,
        blit,
      )
      const displayCtx = display.getContext("2d")
      if (displayCtx) {
        if (!blit) displayCtx.putImageData(displayImageRef.current, 0, 0)
        else displayCtx.putImageData(displayImageRef.current, 0, 0, blit.x, blit.y, blit.width, blit.height)
      }

      dirtyRef.current = { mode: "clean" }
    }

    const dpr = currentDpr()
    const { width: viewW, height: viewH } = sizeRef.current
    const device = devicePixelSizeRef.current
    const pixelW = device ? device.width : Math.max(1, Math.round(viewW * dpr))
    const pixelH = device ? device.height : Math.max(1, Math.round(viewH * dpr))
    if (view.width !== pixelW || view.height !== pixelH) {
      view.width = pixelW
      view.height = pixelH
      viewCtxRef.current = null
    }

    let viewCtx = viewCtxRef.current
    if (!viewCtx || viewCtx.canvas !== view) {
      viewCtx = view.getContext("2d", { alpha: false })
      viewCtxRef.current = viewCtx
    }
    if (!viewCtx) return

    // One shared viewport camera for every layer, grid, and overlay drawn below.
    const { originX, originY, scale } = cameraRef.current
    const { deviceScale, translateX, translateY } = viewDeviceTransform(originX, originY, scale, dpr)
    viewCtx.setTransform(1, 0, 0, 1, 0, 0)
    viewCtx.fillStyle = "#f4f1e8"
    viewCtx.fillRect(0, 0, view.width, view.height)
    viewCtx.imageSmoothingEnabled = false
    viewCtx.setTransform(deviceScale, 0, 0, deviceScale, translateX, translateY)
    viewCtx.drawImage(displayRef.current ?? buffer, 0, 0)

    // Lifted selection lives in float until commit — draw it above the layer stack.
    if (selectionFloatingRef.current && selectionFloatRef.current && selectionRef.current) {
      const clip = selectionFloatRef.current
      const sel = selectionRef.current
      for (let row = 0; row < clip.height; row += 1) {
        for (let col = 0; col < clip.width; col += 1) {
          if (clip.mask && clip.mask[row * clip.width + col] !== 1) continue
          const x = sel.x + col
          const y = sel.y + row
          if (!inCanvas(x, y, canvasW, canvasH)) continue
          const p = (row * clip.width + col) * 4
          viewCtx.fillStyle = `rgb(${clip.data[p]}, ${clip.data[p + 1]}, ${clip.data[p + 2]})`
          viewCtx.fillRect(x, y, 1, 1)
        }
      }
    }

    // Grid: cull to visible cells; lighter below PIXEL_GRID_MIN_ZOOM.
    if (gridRef.current) {
      const left = Math.max(0, Math.floor(-originX / scale))
      const top = Math.max(0, Math.floor(-originY / scale))
      const right = Math.min(canvasW, Math.ceil((viewW - originX) / scale))
      const bottom = Math.min(canvasH, Math.ceil((viewH - originY) / scale))
      viewCtx.beginPath()
      viewCtx.strokeStyle = scale >= PIXEL_GRID_MIN_ZOOM ? "rgba(32, 32, 42, 0.18)" : "rgba(32, 32, 42, 0.08)"
      viewCtx.lineWidth = 1 / scale
      for (let i = left; i <= right; i += 1) {
        viewCtx.moveTo(i, top)
        viewCtx.lineTo(i, bottom)
      }
      for (let i = top; i <= bottom; i += 1) {
        viewCtx.moveTo(left, i)
        viewCtx.lineTo(right, i)
      }
      viewCtx.stroke()
    }

    const selection = selectionRef.current
    if (selection && selection.width > 0 && selection.height > 0) {
      viewCtx.save()
      if (selection.mask) {
        viewCtx.fillStyle = "rgba(89, 188, 235, 0.28)"
        for (let i = 0; i < selection.mask.length; i += 1) {
          if (selection.mask[i] !== 1) continue
          viewCtx.fillRect(
            selection.x + (i % selection.width),
            selection.y + Math.floor(i / selection.width),
            1,
            1,
          )
        }
      }
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([2 / scale, 2 / scale])
      viewCtx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      viewCtx.strokeStyle = "rgba(255, 253, 247, 0.95)"
      viewCtx.lineDashOffset = 2 / scale
      viewCtx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      const hs = 3 / scale
      viewCtx.setLineDash([])
      viewCtx.fillStyle = "rgba(255, 253, 247, 0.95)"
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      const corners = [
        { x: selection.x, y: selection.y },
        { x: selection.x + selection.width - 1, y: selection.y },
        { x: selection.x, y: selection.y + selection.height - 1 },
        { x: selection.x + selection.width - 1, y: selection.y + selection.height - 1 },
      ]
      for (const corner of corners) {
        viewCtx.fillRect(corner.x + 0.5 - hs / 2, corner.y + 0.5 - hs / 2, hs, hs)
        viewCtx.strokeRect(corner.x + 0.5 - hs / 2, corner.y + 0.5 - hs / 2, hs, hs)
      }
      // Free-rotate handle above bbox center.
      const hx = selection.x + selection.width / 2
      const hy = selection.y - Math.max(4, 8 / scale)
      viewCtx.beginPath()
      viewCtx.moveTo(selection.x + selection.width / 2, selection.y)
      viewCtx.lineTo(hx, hy)
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([])
      viewCtx.stroke()
      viewCtx.beginPath()
      viewCtx.arc(hx, hy, hs, 0, Math.PI * 2)
      viewCtx.fillStyle = "rgba(89, 188, 235, 0.95)"
      viewCtx.fill()
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.stroke()
      if (selectRotateRef.current) {
        const deg = selectRotateRef.current.degrees
        viewCtx.fillStyle = "rgba(40, 43, 53, 0.85)"
        viewCtx.font = `${10 / scale}px sans-serif`
        viewCtx.fillText(`${Math.round(deg)}°`, hx + hs, hy)
      }
      viewCtx.restore()
    }

    if (
      selectStartRef.current &&
      selectMarqueeEndRef.current &&
      selectCombineRef.current !== "replace"
    ) {
      const draft = normalizePixelRect(
        selectStartRef.current.x,
        selectStartRef.current.y,
        selectMarqueeEndRef.current.x,
        selectMarqueeEndRef.current.y,
      )
      viewCtx.save()
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([3 / scale, 2 / scale])
      viewCtx.strokeRect(draft.x, draft.y, draft.width, draft.height)
      viewCtx.strokeStyle = "rgba(89, 188, 235, 0.95)"
      viewCtx.lineDashOffset = 2 / scale
      viewCtx.strokeRect(draft.x, draft.y, draft.width, draft.height)
      viewCtx.restore()
    }

    const lasso = lassoRef.current
    if (lasso && lasso.length > 0) {
      viewCtx.save()
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([2 / scale, 2 / scale])
      viewCtx.beginPath()
      viewCtx.moveTo(lasso[0].x + 0.5, lasso[0].y + 0.5)
      for (let i = 1; i < lasso.length; i += 1) {
        viewCtx.lineTo(lasso[i].x + 0.5, lasso[i].y + 0.5)
      }
      viewCtx.stroke()
      viewCtx.strokeStyle = "rgba(255, 253, 247, 0.95)"
      viewCtx.lineDashOffset = 2 / scale
      viewCtx.stroke()
      viewCtx.restore()
    }

    const poly = polySelRef.current
    if (poly && poly.points.length > 0) {
      const trail = poly.hover ? [...poly.points, poly.hover] : poly.points
      const first = poly.points[0]!
      const closing =
        poly.hover !== null &&
        poly.points.length >= 3 &&
        Math.hypot(poly.hover.x - first.x, poly.hover.y - first.y) <= POLYGON_SELECT_CLOSE_DIST
      viewCtx.save()
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([2 / scale, 2 / scale])
      const trace = () => {
        viewCtx.beginPath()
        viewCtx.moveTo(trail[0]!.x + 0.5, trail[0]!.y + 0.5)
        for (let i = 1; i < trail.length; i += 1) viewCtx.lineTo(trail[i]!.x + 0.5, trail[i]!.y + 0.5)
        if (closing) viewCtx.closePath()
        viewCtx.stroke()
      }
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      trace()
      viewCtx.strokeStyle = "rgba(255, 253, 247, 0.95)"
      viewCtx.lineDashOffset = 2 / scale
      trace()
      viewCtx.setLineDash([])
      const marker = Math.max(3 / scale, 0.9)
      for (let i = 0; i < poly.points.length; i += 1) {
        const v = poly.points[i]!
        const big = i === 0 ? marker * 1.5 : marker
        viewCtx.fillStyle = i === 0 && closing ? "rgba(89, 188, 235, 1)" : "rgba(255, 253, 247, 1)"
        viewCtx.strokeStyle = "rgba(40, 43, 53, 1)"
        viewCtx.fillRect(v.x + 0.5 - big / 2, v.y + 0.5 - big / 2, big, big)
        viewCtx.strokeRect(v.x + 0.5 - big / 2, v.y + 0.5 - big / 2, big, big)
      }
      viewCtx.restore()
    }

    const creating = textCreateRef.current
    if (creating) {
      const rect = normalizePixelRect(creating.start.x, creating.start.y, creating.end.x, creating.end.y)
      viewCtx.save()
      viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([2 / scale, 2 / scale])
      viewCtx.strokeRect(rect.x, rect.y, rect.width, rect.height)
      viewCtx.strokeStyle = "rgba(255, 253, 247, 0.95)"
      viewCtx.lineDashOffset = 2 / scale
      viewCtx.strokeRect(rect.x, rect.y, rect.width, rect.height)
      viewCtx.restore()
    }

    const draft = shapeDraftRef.current
    if (draft) {
      const w = canvasWidthRef.current
      const h = canvasHeightRef.current
      let preview = shapeDraftPreviewRef.current
      if (!preview || preview.image.width !== w || preview.image.height !== h) {
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (ctx) {
          preview = { image: new ImageData(w, h), canvas, ctx }
          shapeDraftPreviewRef.current = preview
        }
      }
      if (preview) {
        preview.image.data.fill(0)
        const rgb = hexToRgb(colorRef.current)
        const pixels = preview.image.data
        const clip = selectionRef.current
        if (draft.kind === "rect") {
          if (draft.filled) fillRect(pixels, draft.x0, draft.y0, draft.x1, draft.y1, rgb, w, h, clip)
          else strokeRectBrush(pixels, draft.x0, draft.y0, draft.x1, draft.y1, rgb, draft.strokeWidth, w, h, "square", clip)
        } else if (draft.kind === "ellipse") {
          paintEllipse(pixels, draft.x0, draft.y0, draft.x1, draft.y1, rgb, draft.filled, w, h, draft.strokeWidth, clip)
        } else if (draft.kind === "bezier" && draft.anchors.length > 0) {
          rasterizeCubicPath(pixels, draft.anchors, rgb, w, h, {
            mode: draft.mode,
            size: draft.strokeWidth,
            closed: draft.closed || draft.mode === "fill",
            clip,
          })
        } else if (draft.kind === "polygon" && draft.points.length > 0) {
          rasterizePolygon(pixels, draft.points, rgb, w, h, {
            mode: draft.mode,
            size: draft.strokeWidth,
            closed: draft.closed || draft.mode === "fill",
            clip,
          })
        }
        preview.ctx.putImageData(preview.image, 0, 0)
        viewCtx.save()
        viewCtx.imageSmoothingEnabled = false
        viewCtx.globalAlpha = 0.92
        viewCtx.drawImage(preview.canvas, 0, 0)
        viewCtx.restore()
      }

      viewCtx.save()
      viewCtx.lineWidth = 1 / scale
      viewCtx.setLineDash([])
      if (draft.kind === "rect" || draft.kind === "ellipse") {
        const bounds = normalizePixelRect(draft.x0, draft.y0, draft.x1, draft.y1)
        const corners = [
          { x: bounds.x, y: bounds.y },
          { x: bounds.x + bounds.width - 1, y: bounds.y },
          { x: bounds.x, y: bounds.y + bounds.height - 1 },
          { x: bounds.x + bounds.width - 1, y: bounds.y + bounds.height - 1 },
        ]
        const hs = 3 / scale
        viewCtx.fillStyle = "rgba(255, 253, 247, 0.95)"
        viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
        for (const corner of corners) {
          viewCtx.fillRect(corner.x + 0.5 - hs / 2, corner.y + 0.5 - hs / 2, hs, hs)
          viewCtx.strokeRect(corner.x + 0.5 - hs / 2, corner.y + 0.5 - hs / 2, hs, hs)
        }
        viewCtx.font = `${Math.max(10, 11 / Math.max(0.5, scale / 8))}px monospace`
        viewCtx.fillStyle = "rgba(40, 43, 53, 0.9)"
        viewCtx.fillText(`${bounds.width}×${bounds.height}`, bounds.x, Math.max(0, bounds.y - 2 / scale))
      } else if (draft.kind === "bezier") {
        const hs = 3 / scale
        for (let i = 0; i < draft.anchors.length; i += 1) {
          const anchor = draft.anchors[i]
          viewCtx.strokeStyle = "rgba(89, 188, 235, 0.85)"
          viewCtx.beginPath()
          viewCtx.moveTo(anchor.hiX + 0.5, anchor.hiY + 0.5)
          viewCtx.lineTo(anchor.x + 0.5, anchor.y + 0.5)
          viewCtx.lineTo(anchor.hoX + 0.5, anchor.hoY + 0.5)
          viewCtx.stroke()
          const selected = i === draft.selected
          viewCtx.fillStyle = selected ? "rgba(40, 43, 53, 0.95)" : "rgba(255, 253, 247, 0.95)"
          viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
          viewCtx.fillRect(anchor.x + 0.5 - hs / 2, anchor.y + 0.5 - hs / 2, hs, hs)
          viewCtx.strokeRect(anchor.x + 0.5 - hs / 2, anchor.y + 0.5 - hs / 2, hs, hs)
          viewCtx.beginPath()
          viewCtx.arc(anchor.hiX + 0.5, anchor.hiY + 0.5, hs * 0.55, 0, Math.PI * 2)
          viewCtx.fill()
          viewCtx.stroke()
          viewCtx.beginPath()
          viewCtx.arc(anchor.hoX + 0.5, anchor.hoY + 0.5, hs * 0.55, 0, Math.PI * 2)
          viewCtx.fill()
          viewCtx.stroke()
        }
      } else if (draft.kind === "polygon") {
        const hs = 3 / scale
        for (let i = 0; i < draft.points.length; i += 1) {
          const point = draft.points[i]
          const selected = i === draft.selected
          viewCtx.fillStyle = selected ? "rgba(40, 43, 53, 0.95)" : "rgba(255, 253, 247, 0.95)"
          viewCtx.strokeStyle = "rgba(40, 43, 53, 0.95)"
          viewCtx.fillRect(point.x + 0.5 - hs / 2, point.y + 0.5 - hs / 2, hs, hs)
          viewCtx.strokeRect(point.x + 0.5 - hs / 2, point.y + 0.5 - hs / 2, hs, hs)
        }
      }
      viewCtx.restore()
    }

    const overlay = textOverlayRef.current
    const frame = textFrameRef.current
    if (overlay && frame) {
      overlay.style.transform = `translate(${originX + frame.x * scale}px, ${originY + frame.y * scale}px)`
      overlay.style.width = `${Math.max(1, frame.width * scale)}px`
      overlay.style.height = `${Math.max(1, frame.height * scale)}px`
    }
  }

  const emitSelection = () => {
    onSelectionChangeRef.current?.(selectionRef.current !== null)
    scheduleView()
  }

  const cloneClipboard = (clip: PixelClipboard): PixelClipboard => ({
    width: clip.width,
    height: clip.height,
    data: new Uint8ClampedArray(clip.data),
    mask: clip.mask ? new Uint8Array(clip.mask) : undefined,
  })

  const rememberSelectionFloat = (clip: PixelClipboard) => {
    selectionFloatRef.current = cloneClipboard(clip)
  }

  const liftSelectionClipboard = (selection: PixelSelection): PixelClipboard => {
    const held = selectionFloatRef.current
    if (
      held &&
      held.width === selection.width &&
      held.height === selection.height &&
      Boolean(held.mask) === Boolean(selection.mask) &&
      (!held.mask || !selection.mask || held.mask.length === selection.mask.length)
    ) {
      return cloneClipboard(held)
    }
    return extractRect(
      image().data,
      selection,
      canvasWidthRef.current,
      canvasHeightRef.current,
    )
  }

  /** Keep at least one cell of the selection bbox on the canvas so it stays grabbable. */
  const softClampSelectionOrigin = (
    x: number,
    y: number,
    width: number,
    height: number,
    canvasW: number,
    canvasH: number,
  ) => ({
    x: Math.max(1 - width, Math.min(canvasW - 1, x)),
    y: Math.max(1 - height, Math.min(canvasH - 1, y)),
  })

  /** Stamp lifted pixels into the layer (overwrites destination). */
  const commitFloatingSelection = () => {
    if (!selectionFloatingRef.current) return false
    const selection = selectionRef.current
    const clip = selectionFloatRef.current
    selectionFloatingRef.current = false
    if (!selection || !clip) return false
    blitRect(
      image().data,
      clip,
      selection.x,
      selection.y,
      canvasWidthRef.current,
      canvasHeightRef.current,
    )
    scheduleRect(selection)
    onStrokeEnd?.()
    return true
  }

  const ensureSelectionCommitted = () => {
    if (selectionFloatingRef.current) commitFloatingSelection()
  }

  const setSelection = (next: PixelSelection | null) => {
    if (!next) {
      selectionFloatRef.current = null
      selectionFloatingRef.current = false
    }
    selectionRef.current = next
    emitSelection()
  }

  const beginSelectionUndo = () => {
    if (selectionUndoOpenRef.current) return
    selectionUndoOpenRef.current = true
    pushUndoRef.current()
  }

  const endSelectionUndo = () => {
    selectionUndoOpenRef.current = false
  }

  const commitSelection = (next: PixelSelection | null) => {
    const mode = selectCombineRef.current
    if (!next) {
      if (mode === "replace" && selectionRef.current) {
        beginSelectionUndo()
        setSelection(null)
      }
      return
    }
    beginSelectionUndo()
    setSelection(
      combineSelections(
        selectionRef.current,
        next,
        mode,
        canvasWidthRef.current,
        canvasHeightRef.current,
      ),
    )
  }

  const cancelPolygonSelect = () => {
    if (!polySelRef.current) return
    polySelRef.current = null
    scheduleView()
  }

  const finishPolygonSelect = () => {
    const poly = polySelRef.current
    if (!poly) return
    polySelRef.current = null
    const next = selectionFromPolygonVertices(
      poly.points,
      canvasWidthRef.current,
      canvasHeightRef.current,
    )
    // Fewer than 3 distinct vertices: abandon the draft and leave the selection alone.
    if (next) {
      selectCombineRef.current = poly.mode
      if (poly.mode === "replace") ensureSelectionCommitted()
      commitSelection(next)
      endSelectionUndo()
    }
    scheduleView()
  }

  const undoPolygonSelectVertex = () => {
    const poly = polySelRef.current
    if (!poly) return
    poly.points.pop()
    if (poly.points.length === 0) polySelRef.current = null
    scheduleView()
  }

  /** Click adds a vertex. Clicking the first vertex, or the last one again, closes the shape. */
  const polygonSelectClick = (cell: PixelPoint) => {
    const poly = polySelRef.current
    if (!poly) {
      polySelRef.current = {
        points: [cell],
        mode: selectCombineRef.current,
        hover: cell,
      }
      scheduleView()
      return
    }
    const first = poly.points[0]!
    const last = poly.points[poly.points.length - 1]!
    const onLast = last.x === cell.x && last.y === cell.y
    const onFirst =
      Math.hypot(cell.x - first.x, cell.y - first.y) <= POLYGON_SELECT_CLOSE_DIST
    if (poly.points.length >= 3 && (onFirst || onLast)) {
      finishPolygonSelect()
      return
    }
    if (onLast) return
    poly.points.push(cell)
    scheduleView()
  }

  const finishPolygonSelectRef = useRef(finishPolygonSelect)
  finishPolygonSelectRef.current = finishPolygonSelect
  const cancelPolygonSelectRef = useRef(cancelPolygonSelect)
  cancelPolygonSelectRef.current = cancelPolygonSelect
  const undoPolygonSelectVertexRef = useRef(undoPolygonSelectVertex)
  undoPolygonSelectVertexRef.current = undoPolygonSelectVertex

  const restorePathBase = () => {
    const base = shapeBaseRef.current
    if (!base) return
    image().data.set(base)
  }

  const shapeDraftInfo = (draft: ShapeDraft | null): ShapeDraftInfo => {
    if (!draft) {
      const kind =
        toolRef.current === "rect" ||
        toolRef.current === "ellipse" ||
        toolRef.current === "bezier" ||
        toolRef.current === "polygon"
          ? toolRef.current
          : null
      return {
        active: false,
        kind,
        filled: shapePrefsRef.current.filled,
        mode: shapePrefsRef.current.mode,
        strokeWidth: clampStrokeWidth(brushRef.current),
        width: 0,
        height: 0,
      }
    }
    if (draft.kind === "bezier" || draft.kind === "polygon") {
      return {
        active: true,
        kind: draft.kind,
        filled: draft.mode === "fill",
        mode: draft.mode,
        strokeWidth: draft.strokeWidth,
        width: 0,
        height: 0,
      }
    }
    const bounds = normalizePixelRect(draft.x0, draft.y0, draft.x1, draft.y1)
    return {
      active: true,
      kind: draft.kind,
      filled: draft.filled,
      mode: draft.filled ? "fill" : "stroke",
      strokeWidth: draft.strokeWidth,
      width: bounds.width,
      height: bounds.height,
    }
  }

  const emitShapeDraft = () => {
    onShapeDraftChangeRef.current?.(shapeDraftInfo(shapeDraftRef.current))
    scheduleView()
  }

  const setShapeDraft = (next: ShapeDraft | null) => {
    shapeDraftRef.current = next
    emitShapeDraft()
  }

  const clearPathDraft = (restore: boolean) => {
    if (restore) restorePathBase()
    lassoRef.current = null
    shapeBaseRef.current = null
    schedule()
  }

  const cancelShapeDraft = () => {
    shapeDragRef.current = null
    shapeStartRef.current = null
    if (shapeDraftRef.current) setShapeDraft(null)
  }

  const applyShapeDraft = (): boolean => {
    const draft = shapeDraftRef.current
    if (!draft) return false
    if (!activeLayerEditable()) return false
    if (draft.kind === "bezier" && draft.anchors.length < 2) return false
    if (draft.kind === "polygon") {
      if (draft.mode === "fill" && draft.points.length < 3) return false
      if (draft.mode === "stroke" && draft.points.length < 2) return false
    }
    const adoption = ensurePaletteColor(paletteRef.current, colorRef.current)
    if ("error" in adoption) {
      if (adoption.error === "palette_full") onPaletteFullRef.current?.()
      cancelShapeDraft()
      return false
    }
    pushUndo()
    adoptColor(colorRef.current)
    const rgb = hexToRgb(colorRef.current)
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const pixels = image().data
    const clip = selectionRef.current
    if (draft.kind === "rect") {
      if (draft.filled) fillRect(pixels, draft.x0, draft.y0, draft.x1, draft.y1, rgb, w, h, clip)
      else strokeRectBrush(pixels, draft.x0, draft.y0, draft.x1, draft.y1, rgb, draft.strokeWidth, w, h, "square", clip)
    } else if (draft.kind === "ellipse") {
      paintEllipse(pixels, draft.x0, draft.y0, draft.x1, draft.y1, rgb, draft.filled, w, h, draft.strokeWidth, clip)
    } else if (draft.kind === "bezier") {
      rasterizeCubicPath(pixels, draft.anchors, rgb, w, h, {
        mode: draft.mode,
        size: draft.strokeWidth,
        closed: draft.closed || draft.mode === "fill",
        clip,
      })
    } else if (draft.kind === "polygon") {
      rasterizePolygon(pixels, draft.points, rgb, w, h, {
        mode: draft.mode,
        size: draft.strokeWidth,
        closed: draft.closed || draft.mode === "fill",
        clip,
      })
    }
    shapeDragRef.current = null
    setShapeDraft(null)
    schedule()
    onStrokeEnd?.()
    return true
  }

  const updateShapeDraft = (patch: {
    filled?: boolean
    mode?: "stroke" | "fill"
    strokeWidth?: number
    width?: number
    height?: number
  }) => {
    if (patch.filled !== undefined) shapePrefsRef.current.filled = patch.filled
    if (patch.mode !== undefined) shapePrefsRef.current.mode = patch.mode
    if (patch.filled === true) shapePrefsRef.current.mode = "fill"
    if (patch.filled === false) shapePrefsRef.current.mode = "stroke"
    const draft = shapeDraftRef.current
    if (!draft) {
      if (
        (toolRef.current === "rect" || toolRef.current === "ellipse") &&
        (patch.width !== undefined || patch.height !== undefined)
      ) {
        const width = Math.max(1, Math.round(patch.width ?? 1))
        const height = Math.max(1, Math.round(patch.height ?? 1))
        setShapeDraft({
          kind: toolRef.current,
          x0: 0,
          y0: 0,
          x1: Math.min(canvasWidthRef.current - 1, width - 1),
          y1: Math.min(canvasHeightRef.current - 1, height - 1),
          filled: shapePrefsRef.current.filled,
          strokeWidth:
            patch.strokeWidth !== undefined
              ? clampStrokeWidth(patch.strokeWidth)
              : clampStrokeWidth(brushRef.current),
        })
        return
      }
      onShapeDraftChangeRef.current?.({
        active: false,
        kind:
          toolRef.current === "ellipse"
            ? "ellipse"
            : toolRef.current === "bezier"
              ? "bezier"
              : toolRef.current === "polygon"
                ? "polygon"
                : toolRef.current === "rect"
                  ? "rect"
                  : null,
        filled: shapePrefsRef.current.filled,
        mode: shapePrefsRef.current.mode,
        strokeWidth: clampStrokeWidth(brushRef.current),
        width: 0,
        height: 0,
      })
      return
    }
    if (draft.kind === "bezier" || draft.kind === "polygon") {
      const mode = patch.mode ?? (patch.filled === undefined ? draft.mode : patch.filled ? "fill" : "stroke")
      const next: ShapeDraft = {
        ...draft,
        mode,
        strokeWidth: patch.strokeWidth !== undefined ? clampStrokeWidth(patch.strokeWidth) : draft.strokeWidth,
        closed: mode === "fill" || draft.closed,
      }
      setShapeDraft(next)
      return
    }
    const bounds = normalizePixelRect(draft.x0, draft.y0, draft.x1, draft.y1)
    let width = bounds.width
    let height = bounds.height
    if (patch.width !== undefined) width = Math.max(1, Math.round(patch.width))
    if (patch.height !== undefined) height = Math.max(1, Math.round(patch.height))
    const next: ShapeDraft = {
      ...draft,
      x0: bounds.x,
      y0: bounds.y,
      x1: Math.min(canvasWidthRef.current - 1, bounds.x + width - 1),
      y1: Math.min(canvasHeightRef.current - 1, bounds.y + height - 1),
      filled: patch.filled ?? draft.filled,
      strokeWidth: patch.strokeWidth !== undefined ? clampStrokeWidth(patch.strokeWidth) : draft.strokeWidth,
    }
    setShapeDraft(next)
  }

  const applyShapeDraftRef = useRef(applyShapeDraft)
  applyShapeDraftRef.current = applyShapeDraft
  const cancelShapeDraftRef = useRef(cancelShapeDraft)
  cancelShapeDraftRef.current = cancelShapeDraft
  const setShapeDraftRef = useRef(setShapeDraft)
  setShapeDraftRef.current = setShapeDraft
  const updateShapeDraftRef = useRef(updateShapeDraft)
  updateShapeDraftRef.current = updateShapeDraft

  const cancelTextFrame = () => {
    textFrameRef.current = null
    textResizeRef.current = null
    textMoveRef.current = null
    textCreateRef.current = null
    setTextFrame(null)
  }

  const commitTextFrame = () => {
    const frame = textFrameRef.current
    if (!frame) return
    const scale = brushRef.current
    const wrap = frame.mode === "paragraph"
    const measured = measurePixelTextBox(frame.text, scale, wrap ? frame.width : undefined, {
      trim: true,
    })
    cancelTextFrame()
    if (!measured.text) return
    const adoption = ensurePaletteColor(paletteRef.current, colorRef.current)
    if ("error" in adoption) {
      if (adoption.error === "palette_full") onPaletteFullRef.current?.()
      return
    }
    const canvasW = canvasWidthRef.current
    const canvasH = canvasHeightRef.current
    const width = wrap
      ? Math.min(frame.width, canvasW - frame.x)
      : Math.min(measured.width, canvasW - frame.x)
    const height = Math.min(measured.height, canvasH - frame.y)
    const color = colorRef.current
    const placed: PlacedText = {
      ...frame,
      text: measured.text,
      width,
      height,
      color,
      scale,
    }
    placedTextsRef.current = [
      ...placedTextsRef.current.filter((item) => item.id !== placed.id),
      placed,
    ]
    runBufferOp(() => {
      adoptColor(colorRef.current)
      stampTextBitmap(image().data, placed.x, placed.y, placed.text, hexToRgb(color), canvasW, canvasH, {
        width: placed.width,
        scale,
        wrap,
      })
    })
  }
  const commitTextFrameRef = useRef(commitTextFrame)
  commitTextFrameRef.current = commitTextFrame

  const finishTextCreate = (end: PixelPoint) => {
    const draft = textCreateRef.current
    textCreateRef.current = null
    if (!draft) return
    const scale = brushRef.current
    const canvasW = canvasWidthRef.current
    const canvasH = canvasHeightRef.current
    const minW = PIXEL_FONT_W * scale
    const minH = PIXEL_FONT_H * scale
    const dragged = Math.hypot(end.x - draft.start.x, end.y - draft.start.y)
    textIdRef.current += 1
    const id = `text-${textIdRef.current}`
    let next: TextFrame
    if (dragged < 2) {
      // Point Text — click once; box hugs glyphs as the user types.
      next = {
        id,
        x: Math.max(0, Math.min(draft.start.x, canvasW - minW)),
        y: Math.max(0, Math.min(draft.start.y, canvasH - minH)),
        width: minW,
        height: minH,
        text: "",
        mode: "point",
      }
    } else {
      // Paragraph Text — drag sets wrap width; height is only a starting estimate.
      const rect = normalizePixelRect(draft.start.x, draft.start.y, end.x, end.y)
      const width = Math.max(minW, rect.width)
      const fitted = measurePixelTextBox("", scale, width, { trim: false })
      next = {
        id,
        x: Math.min(rect.x, canvasW - minW),
        y: Math.min(rect.y, canvasH - minH),
        width: Math.min(width, canvasW - Math.min(rect.x, canvasW - minW)),
        height: Math.min(fitted.height, canvasH - Math.min(rect.y, canvasH - minH)),
        text: "",
        mode: "paragraph",
      }
    }
    textFrameRef.current = next
    setTextFrame(next)
    scheduleView()
  }

  const beginEditPlacedText = (placed: PlacedText) => {
    commitTextFrameRef.current()
    placedTextsRef.current = placedTextsRef.current.filter((item) => item.id !== placed.id)
    runBufferOp(() => {
      clearRectToPaper(
        image().data,
        { x: placed.x, y: placed.y, width: placed.width, height: placed.height },
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
    })
    colorRef.current = placed.color
    brushRef.current = placed.scale as PixelBrushSize
    onColorChange?.(placed.color)
    onBrushSizeChange?.(placed.scale as PixelBrushSize)
    const next: TextFrame = {
      id: placed.id,
      x: placed.x,
      y: placed.y,
      width: placed.width,
      height: placed.height,
      text: placed.text,
      mode: placed.mode,
    }
    textFrameRef.current = next
    setTextFrame(next)
  }
  const beginEditPlacedTextRef = useRef(beginEditPlacedText)
  beginEditPlacedTextRef.current = beginEditPlacedText

  const placedTextAt = (cell: PixelPoint) => {
    const list = placedTextsRef.current
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (pointInPixelRect(cell.x, cell.y, list[i])) return list[i]
    }
    return null
  }
  const finishTextCreateRef = useRef(finishTextCreate)
  finishTextCreateRef.current = finishTextCreate

  useEffect(() => {
    if (tool !== "text") {
      textCreateRef.current = null
      commitTextFrameRef.current()
    }
    cancelShapeDraftRef.current()
    clearPathDraft(true)
  }, [tool])

  const textOpen = textFrame !== null
  useLayoutEffect(() => {
    if (textOpen) textAreaRef.current?.focus()
  }, [textOpen])

  const emitHistory = () => {
    onHistoryChange?.({
      canUndo: historyRef.current.canUndo,
      canRedo: historyRef.current.canRedo,
    })
  }

  const pushUndo = () => {
    historyRef.current.push(currentHistoryState())
    setHistoryTick((value) => value + 1)
    emitHistory()
  }
  pushUndoRef.current = pushUndo

  const selectAll = () => {
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const current = selectionRef.current
    if (
      !selectionFloatingRef.current &&
      current &&
      !current.mask &&
      current.x === 0 &&
      current.y === 0 &&
      current.width === w &&
      current.height === h
    ) {
      chooseTool("select")
      return
    }
    if (selectionFloatingRef.current) ensureSelectionCommitted()
    pushUndo()
    setSelection({ x: 0, y: 0, width: w, height: h })
    chooseTool("select")
  }
  selectAllRef.current = selectAll

  const deselect = () => {
    if (selectionFloatingRef.current) ensureSelectionCommitted()
    if (!selectionRef.current) return
    pushUndo()
    setSelection(null)
  }
  deselectRef.current = deselect

  const selectionsEqual = (a: PixelSelection | null, b: PixelSelection | null) => {
    if (a === b) return true
    if (!a || !b) return false
    if (a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height) return false
    if (!a.mask && !b.mask) return true
    if (!a.mask || !b.mask || a.mask.length !== b.mask.length) return false
    for (let i = 0; i < a.mask.length; i += 1) if (a.mask[i] !== b.mask[i]) return false
    return true
  }

  const replaceSelection = (next: PixelSelection | null) => {
    ensureSelectionCommitted()
    if (selectionsEqual(selectionRef.current, next)) return
    beginSelectionUndo()
    setSelection(next)
    endSelectionUndo()
  }

  const invertActiveSelection = () => {
    replaceSelection(
      invertSelection(selectionRef.current, canvasWidthRef.current, canvasHeightRef.current),
    )
  }
  const expandActiveSelection = () => {
    replaceSelection(
      expandSelection(selectionRef.current, canvasWidthRef.current, canvasHeightRef.current, 1),
    )
  }
  const contractActiveSelection = () => {
    replaceSelection(
      contractSelection(selectionRef.current, canvasWidthRef.current, canvasHeightRef.current, 1),
    )
  }
  invertSelectionRef.current = invertActiveSelection
  expandSelectionRef.current = expandActiveSelection
  contractSelectionRef.current = contractActiveSelection

  const selectionFromMarquee = (x0: number, y0: number, x1: number, y1: number) =>
    selectShapeRef.current === "ellipse"
      ? selectionFromEllipse(x0, y0, x1, y1)
      : normalizePixelRect(x0, y0, x1, y1)

  const undo = () => {
    if (polySelRef.current) {
      undoPolygonSelectVertexRef.current()
      return
    }
    const previous = historyRef.current.undo(currentHistoryState())
    if (!previous) return
    placedTextsRef.current = []
    applyHistoryFrame(previous)
    setHistoryTick((value) => value + 1)
    emitHistory()
    onStrokeEnd?.()
  }

  const redo = () => {
    const next = historyRef.current.redo(currentHistoryState())
    if (!next) return
    placedTextsRef.current = []
    applyHistoryFrame(next)
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

  const emitClipboard = () => {
    onClipboardChangeRef.current?.(sessionClipboard !== null)
  }

  useEffect(() => {
    emitClipboard()
  }, [])

  const copySelection = () => {
    const selection = selectionRef.current
    if (!selection) return false
    sessionClipboard = liftSelectionClipboard(selection)
    rememberSelectionFloat(sessionClipboard)
    emitClipboard()
    onEditFeedbackRef.current?.("copied")
    return true
  }

  const deleteSelection = () => {
    const selection = selectionRef.current
    if (!selection) return false
    if (selectionFloatingRef.current) {
      // Already lifted — drop the float; hole stays. Undo restores the float.
      pushUndo()
      setSelection(null)
      onStrokeEnd?.()
      scheduleView()
      return true
    }
    runBufferOp(() => {
      clearRectToPaper(image().data, selection, canvasWidthRef.current, canvasHeightRef.current)
      setSelection(null)
    })
    return true
  }

  const cutSelection = () => {
    const selection = selectionRef.current
    if (!selection) return false
    sessionClipboard = liftSelectionClipboard(selection)
    emitClipboard()
    if (!selectionFloatingRef.current) {
      runBufferOp(() => {
        clearRectToPaper(image().data, selection, canvasWidthRef.current, canvasHeightRef.current)
        selectionFloatingRef.current = false
        selectionFloatRef.current = null
        selectionRef.current = null
        emitSelection()
      })
    } else {
      pushUndo()
      selectionFloatingRef.current = false
      selectionFloatRef.current = null
      selectionRef.current = null
      emitSelection()
      onStrokeEnd?.()
      scheduleView()
    }
    onEditFeedbackRef.current?.("cut")
    return true
  }

  const pasteClipboard = () => {
    if (!sessionClipboard) {
      onEditFeedbackRef.current?.("clipboard-empty")
      return false
    }
    ensureSelectionCommitted()
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const selection = selectionRef.current
    const rawX = selection ? selection.x : Math.floor((w - sessionClipboard.width) / 2)
    const rawY = selection ? selection.y : Math.floor((h - sessionClipboard.height) / 2)
    const { x: destX, y: destY } = softClampSelectionOrigin(
      rawX,
      rawY,
      sessionClipboard.width,
      sessionClipboard.height,
      w,
      h,
    )
    pushUndo()
    rememberSelectionFloat(sessionClipboard)
    selectionFloatingRef.current = true
    setSelection({
      x: destX,
      y: destY,
      width: sessionClipboard.width,
      height: sessionClipboard.height,
      mask: sessionClipboard.mask,
    })
    scheduleView()
    onEditFeedbackRef.current?.("pasted")
    return true
  }

  editActionRef.current = {
    copy: copySelection,
    cut: cutSelection,
    paste: pasteClipboard,
    delete: deleteSelection,
  }

  const layerInfoList = (): PixelLayerInfo[] => {
    const active = activeLayerIndexRef.current
    return layersRef.current.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      active: index === active,
      opacity: layerOpacity(layer),
      blend: layerBlend(layer),
      lockAlpha: Boolean(layer.lockAlpha),
    }))
  }

  const rotateSelectionByDegrees = (degrees: number) => {
    const selection = selectionRef.current
    if (!selection || !activeLayerEditable()) return false
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const floating = liftSelectionClipboard(selection)
    if (!selectionFloatingRef.current) {
      pushUndo()
      clearRectToPaper(image().data, selection, w, h)
      selectionFloatingRef.current = true
      scheduleRect(selection)
    } else {
      pushUndo()
    }
    const rotated = rotateClipboardNearest(floating, degrees)
    const cx = selection.x + (selection.width - 1) / 2
    const cy = selection.y + (selection.height - 1) / 2
    const rawX = Math.round(cx - (rotated.width - 1) / 2)
    const rawY = Math.round(cy - (rotated.height - 1) / 2)
    const { x: destX, y: destY } = softClampSelectionOrigin(
      rawX,
      rawY,
      rotated.width,
      rotated.height,
      w,
      h,
    )
    rememberSelectionFloat(rotated)
    setSelection({
      x: destX,
      y: destY,
      width: rotated.width,
      height: rotated.height,
      mask: rotated.mask,
    })
    scheduleView()
    return true
  }

  useImperativeHandle(ref, () => ({
    exportSource: () => {
      ensureSelectionCommitted()
      syncActiveFromImage()
      return buildPixelSourceV2(
        layersRef.current,
        canvasWidthRef.current,
        canvasHeightRef.current,
        paletteRef.current,
      )
    },
    exportPng: () => {
      ensureSelectionCommitted()
      const buffer = bufferRef.current
      if (!buffer) return Promise.reject(new Error("buffer"))
      const ctx = buffer.getContext("2d")
      if (!ctx) return Promise.reject(new Error("context"))
      if (buffer.width !== canvasWidthRef.current || buffer.height !== canvasHeightRef.current) {
        buffer.width = canvasWidthRef.current
        buffer.height = canvasHeightRef.current
      }
      ctx.putImageData(compositeImage(), 0, 0)
      dirtyRef.current = { mode: "clean" }
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
        currentDpr(),
      )
      applyZoomRef.current(stepZoom(zoomRef.current, direction, fit))
    },
    fit: () => applyZoomRef.current("fit"),
    getZoom: () => zoomRef.current,
    clearCanvas: () => {
      placedTextsRef.current = []
      cancelTextFrame()
      cancelShapeDraftRef.current()
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
        if (!activeLayerEditable()) return false
        runBufferOp(() => {
          const next = rotateRect90Cw(image().data, selection, w, h)
          setSelection(next)
        })
        return true
      }
      if (w !== h) return false
      if (!activeLayerEditable()) return false
      runBufferOp(() => rotateCanvas90Cw(image().data, w))
      return true
    },
    rotateSelection: (degrees) => rotateSelectionByDegrees(degrees),
    selectAll: () => selectAllRef.current(),
    clearSelection: () => deselectRef.current(),
    invertSelection: () => invertSelectionRef.current(),
    expandSelection: () => expandSelectionRef.current(),
    contractSelection: () => contractSelectionRef.current(),
    hasSelection: () => selectionRef.current !== null,
    getBrushTip: (source) =>
      source === "selection"
        ? brushMaskFromSelection(selectionRef.current)
        : brushMaskFromClipboard(sessionClipboard),
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection,
    hasClipboard: () => sessionClipboard !== null,
    stampText: (x, y, text, box) => {
      const next = text.replace(/\r/g, "")
      if (!next.trim()) return
      const adoption = ensurePaletteColor(paletteRef.current, colorRef.current)
      if ("error" in adoption) {
        if (adoption.error === "palette_full") onPaletteFullRef.current?.()
        return
      }
      runBufferOp(() => {
        adoptColor(colorRef.current)
        stampTextBitmap(
          image().data,
          x,
          y,
          next,
          hexToRgb(colorRef.current),
          canvasWidthRef.current,
          canvasHeightRef.current,
          box,
        )
      })
    },
    clearHistory: () => {
      historyRef.current.clear()
      placedTextsRef.current = []
      setHistoryTick((value) => value + 1)
      emitHistory()
    },
    getPalette: () => [...paletteRef.current],
    getLayers: () => layerInfoList(),
    addLayer: () => {
      if (layersRef.current.length >= PIXEL_LAYER_MAX) return false
      pushUndo()
      syncActiveFromImage()
      const nextIndex = layersRef.current.length + 1
      layersRef.current.push(
        createEmptyLayer(canvasWidthRef.current, canvasHeightRef.current, `Layer ${nextIndex}`),
      )
      activeLayerIndexRef.current = layersRef.current.length - 1
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    importPixelArtLayer: (input) => {
      if (layersRef.current.length >= PIXEL_LAYER_MAX) return { ok: false, error: "layer_limit" }
      const srcW = Math.floor(input.width)
      const srcH = Math.floor(input.height)
      if (srcW < 1 || srcH < 1 || input.indices.length < srcW * srcH) {
        return { ok: false, error: "dimensions" }
      }
      const opaque = input.indices.some((index) => index !== 0)
      if (!opaque) return { ok: false, error: "empty" }

      const canvasW = canvasWidthRef.current
      const canvasH = canvasHeightRef.current
      const merged = mergeImportIntoDocumentPalette(
        paletteRef.current,
        input.palette,
        input.indices,
      )
      if (!merged.ok) return { ok: false, error: "empty" }

      pushUndo()
      syncActiveFromImage()
      paletteRef.current = merged.palette
      syncPaletteIndexMap()
      onPaletteChange?.(merged.palette)

      const nextIndex = layersRef.current.length + 1
      const layer = createEmptyLayer(
        canvasW,
        canvasH,
        input.name?.trim() || `Import ${nextIndex}`,
      )
      const destX = Math.floor((canvasW - srcW) / 2)
      const destY = Math.floor((canvasH - srcH) / 2)
      blitIndicesIntoLayer(layer.indices, merged.indices, srcW, srcH, destX, destY, canvasW, canvasH)
      layersRef.current.push(layer)
      activeLayerIndexRef.current = layersRef.current.length - 1
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return { ok: true, layerId: layer.id, colorsAdded: merged.colorsAdded }
    },
    deleteLayer: (id) => {
      if (layersRef.current.length <= 1) return false
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index < 0) return false
      pushUndo()
      syncActiveFromImage()
      layersRef.current.splice(index, 1)
      if (activeLayerIndexRef.current >= layersRef.current.length) {
        activeLayerIndexRef.current = layersRef.current.length - 1
      } else if (activeLayerIndexRef.current > index) {
        activeLayerIndexRef.current -= 1
      }
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    reorderLayer: (id, direction) => {
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index < 0) return false
      const target = index + direction
      if (target < 0 || target >= layersRef.current.length) return false
      pushUndo()
      syncActiveFromImage()
      const [layer] = layersRef.current.splice(index, 1)
      layersRef.current.splice(target, 0, layer)
      if (activeLayerIndexRef.current === index) activeLayerIndexRef.current = target
      else if (index < activeLayerIndexRef.current && target >= activeLayerIndexRef.current) {
        activeLayerIndexRef.current -= 1
      } else if (index > activeLayerIndexRef.current && target <= activeLayerIndexRef.current) {
        activeLayerIndexRef.current += 1
      }
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    setActiveLayer: (id) => {
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index < 0 || index === activeLayerIndexRef.current) return false
      ensureSelectionCommitted()
      syncActiveFromImage()
      activeLayerIndexRef.current = index
      selectionFloatRef.current = null
      selectionFloatingRef.current = false
      loadActiveIntoImage()
      emitLayers()
      schedule()
      return true
    },
    setLayerVisible: (id, visible) => {
      const layer = layersRef.current.find((item) => item.id === id)
      if (!layer || layer.visible === visible) return false
      pushUndo()
      syncActiveFromImage()
      layer.visible = visible
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    setLayerStyle: (id, patch) => {
      const layer = layersRef.current.find((item) => item.id === id)
      if (!layer) return false
      const next: PixelLayerStylePatch = {}
      if (patch.opacity !== undefined) next.opacity = clampLayerOpacity(patch.opacity)
      if (patch.blend !== undefined && isPixelBlendMode(patch.blend)) next.blend = patch.blend
      if (patch.lockAlpha !== undefined) next.lockAlpha = Boolean(patch.lockAlpha)
      const changed =
        (next.opacity !== undefined && next.opacity !== layerOpacity(layer)) ||
        (next.blend !== undefined && next.blend !== layerBlend(layer)) ||
        (next.lockAlpha !== undefined && next.lockAlpha !== Boolean(layer.lockAlpha))
      if (!changed) return false
      // A slider drag emits many values; keep it to one undo step per layer+property burst.
      const key = `${id}:${Object.keys(next).sort().join(",")}`
      const now = Date.now()
      const last = styleUndoRef.current
      if (!last || last.key !== key || now - last.at > 900) pushUndo()
      styleUndoRef.current = { key, at: now }
      syncActiveFromImage()
      if (next.opacity !== undefined) layer.opacity = next.opacity
      if (next.blend !== undefined) layer.blend = next.blend
      if (next.lockAlpha !== undefined) layer.lockAlpha = next.lockAlpha
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    setLayerLocked: (id, locked) => {
      const layer = layersRef.current.find((item) => item.id === id)
      if (!layer || layer.locked === locked) return false
      pushUndo()
      syncActiveFromImage()
      layer.locked = locked
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    renameLayer: (id, name) => {
      const layer = layersRef.current.find((item) => item.id === id)
      const next = name.trim().slice(0, 32)
      if (!layer || !next || layer.name === next) return false
      pushUndo()
      syncActiveFromImage()
      layer.name = next
      emitLayers()
      onStrokeEnd?.()
      return true
    },
    duplicateLayer: (id) => {
      if (layersRef.current.length >= PIXEL_LAYER_MAX) return false
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index < 0) return false
      pushUndo()
      syncActiveFromImage()
      const source = layersRef.current[index]!
      const clone: PixelLayerRuntime = {
        id: createLayerId(),
        name: `${source.name} copy`.slice(0, 32),
        visible: source.visible,
        locked: false,
        opacity: source.opacity,
        blend: source.blend,
        lockAlpha: source.lockAlpha,
        indices: new Uint8Array(source.indices),
      }
      layersRef.current.splice(index + 1, 0, clone)
      activeLayerIndexRef.current = index + 1
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    mergeDown: (id) => {
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index <= 0) return false
      const upper = layersRef.current[index]!
      const lower = layersRef.current[index - 1]!
      if (lower.locked) return false
      pushUndo()
      syncActiveFromImage()
      const resolver = createPaletteResolver(paletteRef.current)
      lower.indices = bakeMergeDown(lower, upper, index - 1 === 0, paletteRef.current, resolver)
      growPaletteFromMerge(resolver)
      layersRef.current.splice(index, 1)
      activeLayerIndexRef.current = index - 1
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    mergeVisible: () => {
      syncActiveFromImage()
      const layers = layersRef.current
      const visible = layers.filter((layer) => layer.visible)
      if (visible.length < 2) return false
      if (visible.some((layer) => layer.locked)) return false
      const w = canvasWidthRef.current
      const h = canvasHeightRef.current
      const firstVisible = layers.findIndex((layer) => layer.visible)
      if (firstVisible < 0) return false
      pushUndo()
      const resolver = createPaletteResolver(paletteRef.current)
      const mergedIndices = bakeVisibleLayers(layers, w, h, paletteRef.current, resolver)
      growPaletteFromMerge(resolver)
      const hidden = layers.filter((layer) => !layer.visible)
      const merged: PixelLayerRuntime = {
        id: createLayerId(),
        name: "Merged",
        visible: true,
        locked: false,
        indices: mergedIndices,
      }
      const insertAt = Math.min(firstVisible, hidden.length)
      const next = [...hidden]
      next.splice(insertAt, 0, merged)
      layersRef.current = next.slice(0, PIXEL_LAYER_MAX)
      activeLayerIndexRef.current = Math.min(
        insertAt,
        layersRef.current.length - 1,
      )
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    moveLayer: (id, toIndex) => {
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index < 0) return false
      const target = Math.max(0, Math.min(layersRef.current.length - 1, toIndex))
      if (target === index) return false
      pushUndo()
      syncActiveFromImage()
      const [layer] = layersRef.current.splice(index, 1)
      layersRef.current.splice(target, 0, layer)
      if (activeLayerIndexRef.current === index) activeLayerIndexRef.current = target
      else if (index < activeLayerIndexRef.current && target >= activeLayerIndexRef.current) {
        activeLayerIndexRef.current -= 1
      } else if (index > activeLayerIndexRef.current && target <= activeLayerIndexRef.current) {
        activeLayerIndexRef.current += 1
      }
      loadActiveIntoImage()
      emitLayers()
      schedule()
      onStrokeEnd?.()
      return true
    },
    getLayerThumbnail: (id, size = 32) => {
      syncActiveFromImage()
      const index = layersRef.current.findIndex((layer) => layer.id === id)
      if (index < 0) return null
      const layer = layersRef.current[index]!
      return layerThumbnailDataUrl(
        layer.indices,
        canvasWidthRef.current,
        canvasHeightRef.current,
        paletteRef.current,
        { size, transparentZero: index > 0 },
      )
    },
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
    ensureColors: (hexes) => {
      let next = paletteRef.current
      let added = 0
      let truncated = false
      for (const raw of hexes) {
        const hex = normalizePixelHex(raw)
        if (!hex || hex === PIXEL_PAPER) continue
        const result = ensurePaletteColor(next, hex)
        if ("error" in result) {
          if (result.error === "palette_full") truncated = true
          break
        }
        if (result.palette.length > next.length) added += 1
        next = result.palette
      }
      if (added > 0) {
        pushUndo()
        paletteRef.current = next
        syncPaletteIndexMap()
        onPaletteChangeRef.current?.([...paletteRef.current])
      } else if (truncated) {
        onPaletteChangeRef.current?.([...paletteRef.current])
      }
      return { palette: [...paletteRef.current], added, truncated }
    },
    removeColor: (hex) => {
      const normalized = normalizePixelHex(hex)
      if (!normalized) return { ok: false, error: "missing" as const }
      if (normalized === PIXEL_PAPER) return { ok: false, error: "paper" as const }
      const removedIndex = paletteIndexOf(paletteRef.current, normalized)
      if (removedIndex < 1) return { ok: false, error: "missing" as const }
      pushUndo()
      const result = removeDocumentColor(
        image().data,
        paletteRef.current,
        normalized,
        canvasWidthRef.current,
        canvasHeightRef.current,
      )
      if ("error" in result) return { ok: false, error: result.error }
      // Remap stored layer indices after the palette slot is removed (Paper ← removed).
      for (const layer of layersRef.current) {
        for (let i = 0; i < layer.indices.length; i += 1) {
          const value = layer.indices[i] ?? 0
          if (value === removedIndex) layer.indices[i] = 0
          else if (value > removedIndex) layer.indices[i] = value - 1
        }
      }
      paletteRef.current = result.palette
      syncPaletteIndexMap()
      loadActiveIntoImage()
      onPaletteChangeRef.current?.(result.palette)
      schedule()
      onStrokeEnd?.()
      return { ok: true, replaced: result.replaced }
    },
    applyShapeDraft: () => applyShapeDraftRef.current(),
    cancelShapeDraft: () => cancelShapeDraftRef.current(),
    updateShapeDraft: (patch) => updateShapeDraftRef.current(patch),
    getShapeDraft: () => shapeDraftInfo(shapeDraftRef.current),
  }))

  useLayoutEffect(() => {
    // Observe the view canvas itself (event target), not the bordered wrap,
    // so buffer size and hit-testing share one geometry source.
    const node = viewRef.current ?? wrapRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const dpr = currentDpr()
      const deviceBox = entry.devicePixelContentBoxSize?.[0]
      if (deviceBox) {
        const pixelW = Math.max(1, Math.round(deviceBox.inlineSize))
        const pixelH = Math.max(1, Math.round(deviceBox.blockSize))
        devicePixelSizeRef.current = { width: pixelW, height: pixelH }
        sizeRef.current = { width: pixelW / dpr, height: pixelH / dpr }
      } else {
        devicePixelSizeRef.current = null
        sizeRef.current = { width: entry.contentRect.width, height: entry.contentRect.height }
      }
      if (zoomRef.current === "fit") applyFit()
      scheduleRef.current()
    })
    try {
      observer.observe(node, { box: "device-pixel-content-box" })
    } catch {
      observer.observe(node)
    }
    observerRef.current = observer
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    applyZoomRef.current = applyZoom
    scheduleRef.current = scheduleView
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
        currentDpr(),
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
    emitLayers()
  }, [])

  const paletteHistoryLiveRef = useRef(false)
  useEffect(() => {
    adoptColor(color, paletteHistoryLiveRef.current)
    paletteHistoryLiveRef.current = true
  }, [adoptColor, color])

  const cellFromEvent = (event: { clientX: number; clientY: number }) => {
    const view = viewRef.current
    if (!view) return { x: -1, y: -1 }
    const rect = view.getBoundingClientRect()
    const camera = cameraRef.current
    const dpr = currentDpr()
    // Prefer live buffer size; fall back to last observed device box.
    const bufferWidth = view.width || devicePixelSizeRef.current?.width || Math.max(1, Math.round(rect.width * dpr))
    const bufferHeight =
      view.height || devicePixelSizeRef.current?.height || Math.max(1, Math.round(rect.height * dpr))
    return pointerToCell({
      clientX: event.clientX,
      clientY: event.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
      bufferWidth,
      bufferHeight,
      originX: camera.originX,
      originY: camera.originY,
      scale: camera.scale,
      dpr,
    })
  }

  const chooseTool = (next: Tool) => {
    if (next !== toolRef.current) {
      if (toolRef.current === "text") commitTextFrameRef.current()
      if (shapeDraftRef.current) cancelShapeDraftRef.current()
      clearPathDraft(true)
      polySelRef.current = null
    }
    toolRef.current = next
    if (onToolChange) onToolChange(next)
    else setInternalTool(next)
  }

  const chooseBrush = (next: PixelBrushSize) => {
    const size = clampStrokeWidth(next)
    brushRef.current = size
    if (onBrushSizeChange) onBrushSizeChange(size)
    else setInternalBrush(size)
    const draft = shapeDraftRef.current
    if (draft) {
      setShapeDraft({ ...draft, strokeWidth: size })
    }
  }

  const chooseColor = (next: string) => {
    adoptColor(next, true)
    colorRef.current = next
    if (onColorChange) onColorChange(next)
    else setInternalColor(next)
    if (toolRef.current === "eraser" || toolRef.current === "eyedropper") chooseTool("pencil")
  }

  useEffect(() => {
    if (tool !== "selectPolygon" && polySelRef.current) {
      polySelRef.current = null
      scheduleView()
    }
  }, [tool])

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
          selectAllRef.current()
          return
        }
        if (key === "i" && event.shiftKey) {
          event.preventDefault()
          invertSelectionRef.current()
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
        if (textFrameRef.current || textCreateRef.current) {
          event.preventDefault()
          cancelTextFrame()
          return
        }
        if (polySelRef.current) {
          event.preventDefault()
          cancelPolygonSelectRef.current()
          return
        }
        if (shapeDraftRef.current) {
          event.preventDefault()
          cancelShapeDraftRef.current()
          return
        }
        if (moveRef.current) {
          event.preventDefault()
          moveRef.current = null
          selectMutatedRef.current = false
          undoFnRef.current()
          selectionRef.current = null
          emitSelection()
          schedule()
          return
        }
        if (selectResizeRef.current) {
          event.preventDefault()
          selectResizeRef.current = null
          selectMutatedRef.current = false
          undoFnRef.current()
          return
        }
        if (selectRotateRef.current) {
          event.preventDefault()
          selectRotateRef.current = null
          selectMutatedRef.current = false
          undoFnRef.current()
          return
        }
        if (selectionFloatingRef.current) {
          event.preventDefault()
          undoFnRef.current()
          return
        }
        deselectRef.current()
        return
      }
      if (
        selectionRef.current &&
        (event.key === "ArrowLeft" ||
          event.key === "ArrowRight" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown")
      ) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0
        nudgeSelectionRef.current(dx, dy)
        return
      }
      if ((event.key === "Delete" || event.key === "Backspace") && polySelRef.current) {
        event.preventDefault()
        undoPolygonSelectVertexRef.current()
        return
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const draft = shapeDraftRef.current
        if (draft?.kind === "bezier" && draft.anchors.length > 2 && draft.selected >= 0) {
          event.preventDefault()
          const anchors = draft.anchors.filter((_, index) => index !== draft.selected)
          const selected = Math.min(draft.selected, anchors.length - 1)
          setShapeDraftRef.current({ ...draft, anchors, selected })
          return
        }
        if (draft?.kind === "polygon" && draft.points.length > 2 && draft.selected >= 0) {
          event.preventDefault()
          const points = draft.points.filter((_, index) => index !== draft.selected)
          const selected = Math.min(draft.selected, points.length - 1)
          setShapeDraftRef.current({ ...draft, points, selected })
          return
        }
        if (selectionRef.current) {
          event.preventDefault()
          editActionRef.current.delete()
        }
        return
      }
      const key = event.key.toLowerCase()
      if (event.key === "Enter") {
        if (polySelRef.current) {
          event.preventDefault()
          finishPolygonSelectRef.current()
          return
        }
        if (shapeDraftRef.current) {
          event.preventDefault()
          applyShapeDraftRef.current()
          return
        }
      }
      if (key === "b") chooseToolRef.current("pencil")
      else if (key === "c") chooseToolRef.current("circle")
      else if (key === "e") chooseToolRef.current("eraser")
      else if (key === "h") chooseToolRef.current("pan")
      else if (key === "i") chooseToolRef.current("eyedropper")
      else if (key === "g") chooseToolRef.current("fill")
      else if (key === "p") chooseToolRef.current("polygon")
      else if (key === "l") chooseToolRef.current("line")
      else if (key === "u") chooseToolRef.current("rect")
      else if (key === "o") chooseToolRef.current("ellipse")
      else if (key === "q") chooseToolRef.current("bezier")
      else if (key === "t") chooseToolRef.current("text")
      else if (key === "n") chooseToolRef.current("gradient")
      else if (key === "v") chooseToolRef.current("select")
      else if (key === "w") chooseToolRef.current("selectContiguous")
      else if (key === "k") chooseToolRef.current("selectColor")
      else if (key === "s") chooseToolRef.current("lasso")
      else if (key === "y") chooseToolRef.current("selectPolygon")
      else if (event.shiftKey && event.code === "BracketLeft") {
        event.preventDefault()
        contractSelectionRef.current()
      } else if (event.shiftKey && event.code === "BracketRight") {
        event.preventDefault()
        expandSelectionRef.current()
      } else if (key === "[") {
        chooseBrushRef.current(stepBrushSize(brushRef.current, -1))
      } else if (key === "]") {
        chooseBrushRef.current(stepBrushSize(brushRef.current, 1))
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

  const beginBrushStroke = () => {
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    let stroke = brushStrokeRef.current
    if (!stroke || !stroke.matches(w, h)) {
      stroke = new BrushStroke(w, h)
      brushStrokeRef.current = stroke
    }
    stroke.begin(brushOptionsRef.current)
  }

  const stampStrokeSegment = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    start = false,
  ) => {
    if (toolRef.current !== "eraser") {
      if (!adoptColor(colorRef.current)) return
    }
    const shape = toolRef.current === "circle" ? "circle" : "square"
    const options = brushOptionsRef.current
    if (!isPlainBrush(options) && brushStrokeRef.current) {
      const pressure = strokePressureRef.current
      brushStrokeRef.current.paint(
        image().data,
        start ? null : { x: from.x, y: from.y, pressure: lastStampPressureRef.current },
        { x: to.x, y: to.y, pressure },
        {
          rgb: paintColor(),
          size: brushRef.current,
          shape,
          clip: selectionRef.current,
          symmetry: symmetryRef.current,
        },
      )
      lastStampPressureRef.current = pressure
      return
    }
    strokeBrushLineSymmetric(
      image().data,
      from.x,
      from.y,
      to.x,
      to.y,
      paintColor(),
      brushRef.current,
      canvasWidthRef.current,
      canvasHeightRef.current,
      symmetryRef.current,
      shape,
      selectionRef.current,
    )
  }

  const appendStrokeTrail = (cell: PixelPoint) => {
    const trail = strokeTrailRef.current
    const tip = trail[trail.length - 1]
    if (tip && tip.x === cell.x && tip.y === cell.y) return
    trail.push(cell)
    if (trail.length > 8) trail.splice(0, trail.length - 8)
  }

  /** Stamp freehand through ordered cell samples; one composite at the end. */
  const paintStrokeCells = (cells: Array<PixelPoint & { pressure?: number }>) => {
    if (cells.length === 0) return
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    let dirty: PixelRect | null = null
    const note = (from: PixelPoint, to: PixelPoint) => {
      const rect = dirtyRectForSegment(
        from.x,
        from.y,
        to.x,
        to.y,
        brushOptionsExtent(brushRef.current, brushOptionsRef.current),
        w,
        h,
        symmetryRef.current,
      )
      if (!rect) return
      dirty = dirty ? unionDirtyRect(dirty, rect) : rect
    }
    let prev = drawRef.current
    for (const cell of cells) {
      if (cell.pressure !== undefined) strokePressureRef.current = cell.pressure
      if (!prev) {
        if (!isPlainBrush(brushOptionsRef.current)) beginBrushStroke()
        stampStrokeSegment(cell, cell, true)
        appendStrokeTrail(cell)
        note(cell, cell)
        prev = cell
        continue
      }
      if (prev.x === cell.x && prev.y === cell.y) continue
      const waypoints = densifyStrokeSegment(strokeTrailRef.current, cell)
      for (const point of waypoints) {
        if (prev.x === point.x && prev.y === point.y) continue
        stampStrokeSegment(prev, point)
        appendStrokeTrail(point)
        note(prev, point)
        prev = point
      }
    }
    drawRef.current = prev
    if (dirty) scheduleRect(dirty)
  }

  const paintStrokeFromPointerEvent = (event: {
    clientX: number
    clientY: number
    nativeEvent?: Event
  }) => {
    const source =
      event.nativeEvent && "clientX" in event.nativeEvent
        ? (event.nativeEvent as PointerEvent)
        : event
    const samples = listPointerSamples(source as PointerEvent)
    const cells = samples.map((sample) => ({ ...cellFromEvent(sample), pressure: sample.pressure }))
    paintStrokeCells(cells)
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
    const x1 = end.x
    const y1 = end.y
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const pixels = image().data
    const clip = selectionRef.current
    const strokeSize = toolRef.current === "gradient" ? 1 : brushRef.current
    if (toolRef.current === "line") {
      strokeBrushLine(pixels, start.x, start.y, x1, y1, rgb, brushRef.current, w, h, "circle", clip)
    } else if (toolRef.current === "gradient") {
      strokeBrushLine(pixels, start.x, start.y, x1, y1, rgb, 1, w, h, "square", clip)
    }
    const next = dirtyRectForSegment(start.x, start.y, x1, y1, strokeSize, w, h)
    const prev = shapePreviewDirtyRef.current
    const dirty = next && prev ? unionDirtyRect(prev, next) : (next ?? prev)
    shapePreviewDirtyRef.current = next
    if (dirty) scheduleRect(dirty)
  }

  const hitShapeCorner = (
    draft: ShapeDraft & { kind: "rect" | "ellipse" },
    cell: PixelPoint,
  ): "nw" | "ne" | "sw" | "se" | null => {
    const bounds = normalizePixelRect(draft.x0, draft.y0, draft.x1, draft.y1)
    const corners = [
      { id: "nw" as const, x: bounds.x, y: bounds.y },
      { id: "ne" as const, x: bounds.x + bounds.width - 1, y: bounds.y },
      { id: "sw" as const, x: bounds.x, y: bounds.y + bounds.height - 1 },
      { id: "se" as const, x: bounds.x + bounds.width - 1, y: bounds.y + bounds.height - 1 },
    ]
    for (const corner of corners) {
      if (Math.hypot(cell.x - corner.x, cell.y - corner.y) <= HANDLE_HIT) return corner.id
    }
    return null
  }

  const hitSelectionCorner = (
    selection: PixelSelection,
    cell: PixelPoint,
  ): "nw" | "ne" | "sw" | "se" | null => {
    const corners = [
      { id: "nw" as const, x: selection.x, y: selection.y },
      { id: "ne" as const, x: selection.x + selection.width - 1, y: selection.y },
      { id: "sw" as const, x: selection.x, y: selection.y + selection.height - 1 },
      { id: "se" as const, x: selection.x + selection.width - 1, y: selection.y + selection.height - 1 },
    ]
    for (const corner of corners) {
      if (Math.hypot(cell.x - corner.x, cell.y - corner.y) <= HANDLE_HIT) return corner.id
    }
    return null
  }

  const selectionRotateHandle = (selection: PixelSelection) => ({
    x: selection.x + selection.width / 2,
    y: selection.y - 4,
  })

  const hitSelectionRotate = (selection: PixelSelection, cell: PixelPoint) => {
    const handle = selectionRotateHandle(selection)
    return Math.hypot(cell.x - handle.x, cell.y - handle.y) <= HANDLE_HIT + 0.5
  }

  const beginSelectionRotate = (selection: PixelSelection, cell: PixelPoint) => {
    if (!activeLayerEditable()) return
    selectMutatedRef.current = true
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const floating = liftSelectionClipboard(selection)
    if (!selectionFloatingRef.current) {
      pushUndo()
      clearRectToPaper(image().data, selection, w, h)
      selectionFloatingRef.current = true
      scheduleRect(selection)
    } else {
      pushUndo()
    }
    rememberSelectionFloat(floating)
    const centerX = selection.x + (selection.width - 1) / 2
    const centerY = selection.y + (selection.height - 1) / 2
    const startAngle = (Math.atan2(cell.y - centerY, cell.x - centerX) * 180) / Math.PI
    selectRotateRef.current = {
      origin: selection,
      floating,
      base: new Uint8ClampedArray(0),
      centerX,
      centerY,
      startAngle,
      degrees: 0,
    }
    scheduleView()
  }

  const nudgeSelection = (dx: number, dy: number) => {
    const selection = selectionRef.current
    if (!selection || (dx === 0 && dy === 0)) return
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const { x: nextX, y: nextY } = softClampSelectionOrigin(
      selection.x + dx,
      selection.y + dy,
      selection.width,
      selection.height,
      w,
      h,
    )
    if (nextX === selection.x && nextY === selection.y) return
    const floating = liftSelectionClipboard(selection)
    if (!selectionFloatingRef.current) {
      pushUndo()
      clearRectToPaper(image().data, selection, w, h)
      selectionFloatingRef.current = true
      scheduleRect(selection)
    } else {
      pushUndo()
    }
    rememberSelectionFloat(floating)
    setSelection({ ...selection, x: nextX, y: nextY, mask: floating.mask })
    scheduleView()
  }
  const nudgeSelectionRef = useRef(nudgeSelection)
  nudgeSelectionRef.current = nudgeSelection

  const beginSelectionResize = (corner: "nw" | "ne" | "sw" | "se", selection: PixelSelection) => {
    selectMutatedRef.current = true
    const w = canvasWidthRef.current
    const h = canvasHeightRef.current
    const floating = liftSelectionClipboard(selection)
    if (!selectionFloatingRef.current) {
      pushUndo()
      clearRectToPaper(image().data, selection, w, h)
      selectionFloatingRef.current = true
      scheduleRect(selection)
    } else {
      pushUndo()
    }
    rememberSelectionFloat(floating)
    selectResizeRef.current = {
      corner,
      origin: selection,
      floating,
      base: new Uint8ClampedArray(0),
    }
    scheduleView()
  }

  const hitBezierPart = (
    draft: ShapeDraft & { kind: "bezier" },
    cell: PixelPoint,
  ):
    | { type: "anchor"; index: number }
    | { type: "handle"; index: number; which: "hi" | "ho" }
    | null => {
    for (let i = 0; i < draft.anchors.length; i += 1) {
      const anchor = draft.anchors[i]
      if (Math.hypot(cell.x - anchor.x, cell.y - anchor.y) <= HANDLE_HIT) {
        return { type: "anchor", index: i }
      }
      if (Math.hypot(cell.x - anchor.hiX, cell.y - anchor.hiY) <= HANDLE_HIT) {
        return { type: "handle", index: i, which: "hi" }
      }
      if (Math.hypot(cell.x - anchor.hoX, cell.y - anchor.hoY) <= HANDLE_HIT) {
        return { type: "handle", index: i, which: "ho" }
      }
    }
    return null
  }

  const hitPolygonPoint = (
    draft: ShapeDraft & { kind: "polygon" },
    cell: PixelPoint,
  ): number | null => {
    for (let i = 0; i < draft.points.length; i += 1) {
      const point = draft.points[i]
      if (Math.hypot(cell.x - point.x, cell.y - point.y) <= HANDLE_HIT) return i
    }
    return null
  }

  const beginSelectionMove = (cell: PixelPoint, selection: PixelSelection) => {
    selectMutatedRef.current = true
    const floating = liftSelectionClipboard(selection)
    if (!selectionFloatingRef.current) {
      pushUndo()
      clearRectToPaper(image().data, selection, canvasWidthRef.current, canvasHeightRef.current)
      selectionFloatingRef.current = true
      scheduleRect(selection)
    } else {
      pushUndo()
    }
    rememberSelectionFloat(floating)
    moveRef.current = {
      origin: selection,
      grabX: cell.x - selection.x,
      grabY: cell.y - selection.y,
      floating,
      base: new Uint8ClampedArray(0),
    }
    scheduleView()
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const view = event.currentTarget
    try {
      view.setPointerCapture(event.pointerId)
    } catch {
      /* synthetic events and some browsers reject capture */
    }
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

    const cell = cellFromEvent(event)

    if (toolRef.current === "pan" || event.button === 1 || spacePanRef.current) {
      const selection = selectionRef.current
      if (
        toolRef.current === "pan" &&
        event.button !== 1 &&
        !spacePanRef.current &&
        selection &&
        pointInSelection(cell.x, cell.y, selection)
      ) {
        beginSelectionMove(cell, selection)
        return
      }
      panRef.current = {
        x: event.clientX,
        y: event.clientY,
        originX: cameraRef.current.originX,
        originY: cameraRef.current.originY,
      }
      return
    }

    if (
      toolRef.current === "eyedropper" ||
      ((altSampleRef.current || event.altKey) &&
        !SHAPE_TOOLS.has(toolRef.current) &&
        toolRef.current !== "fill" &&
        toolRef.current !== "polygon" &&
        toolRef.current !== "bezier")
    ) {
      sampleColorAt(cell)
      return
    }

    if (toolRef.current === "fill") {
      if (!activeLayerEditable()) return
      const before = currentHistoryState()
      const paletteBefore = paletteRef.current
      adoptColor(colorRef.current)
      const bounds: FillBounds = { minX: 0, minY: 0, maxX: -1, maxY: -1 }
      const rgb = hexToRgb(colorRef.current)
      const clip = selectionRef.current
      const tolerance = fillToleranceRef.current
      const painted = event.shiftKey
        ? replaceMatchingColor(
            image().data,
            cell.x,
            cell.y,
            rgb,
            canvasWidthRef.current,
            canvasHeightRef.current,
            clip,
            tolerance,
            bounds,
          )
        : floodFill(
            image().data,
            cell.x,
            cell.y,
            rgb,
            canvasWidthRef.current,
            canvasHeightRef.current,
            clip,
            tolerance,
            bounds,
          )
      if (painted > 0 || paletteRef.current !== paletteBefore) {
        historyRef.current.push(before)
        setHistoryTick((value) => value + 1)
        emitHistory()
      }
      if (painted > 0) {
        scheduleRect(fillBoundsRect(bounds))
        onStrokeEnd?.()
      }
      return
    }

    if (toolRef.current === "text") {
      const frame = textFrameRef.current
      if (frame && pointInPixelRect(cell.x, cell.y, frame)) {
        textAreaRef.current?.focus()
        return
      }
      // Finish current edit on outside click; double-click re-opens a placed text.
      commitTextFrameRef.current()
      if (placedTextAt(cell)) {
        scheduleView()
        return
      }
      textCreateRef.current = { start: cell, end: cell }
      scheduleView()
      return
    }

    if (toolRef.current === "polygon") {
      const existing = shapeDraftRef.current
      if (existing?.kind === "polygon") {
        const hit = hitPolygonPoint(existing, cell)
        if (hit !== null) {
          shapeDragRef.current = { type: "move-point", index: hit }
          setShapeDraft({ ...existing, selected: hit })
          return
        }
        const first = existing.points[0]
        if (
          existing.points.length >= 2 &&
          Math.hypot(cell.x - first.x, cell.y - first.y) <= PATH_CLOSE_DIST
        ) {
          setShapeDraft({ ...existing, closed: true, selected: 0 })
          return
        }
        const points = [...existing.points, cell]
        setShapeDraft({ ...existing, points, selected: points.length - 1 })
        return
      }
      setShapeDraft({
        kind: "polygon",
        points: [cell],
        closed: shapePrefsRef.current.mode === "fill",
        mode: shapePrefsRef.current.mode,
        strokeWidth: clampStrokeWidth(brushRef.current),
        selected: 0,
      })
      return
    }

    if (toolRef.current === "bezier") {
      const existing = shapeDraftRef.current
      if (existing?.kind === "bezier") {
        const hit = hitBezierPart(existing, cell)
        if (hit?.type === "anchor") {
          shapeDragRef.current = { type: "move-anchor", index: hit.index }
          setShapeDraft({ ...existing, selected: hit.index })
          return
        }
        if (hit?.type === "handle") {
          shapeDragRef.current = { type: "move-handle", index: hit.index, which: hit.which }
          setShapeDraft({ ...existing, selected: hit.index })
          return
        }
        const first = existing.anchors[0]
        if (
          existing.anchors.length >= 2 &&
          Math.hypot(cell.x - first.x, cell.y - first.y) <= PATH_CLOSE_DIST
        ) {
          setShapeDraft({ ...existing, closed: true, selected: 0 })
          return
        }
        const anchor = createBezierAnchor(cell.x, cell.y)
        const anchors = [...existing.anchors, anchor]
        shapeDragRef.current = { type: "create-bezier", index: anchors.length - 1, from: cell }
        setShapeDraft({ ...existing, anchors, selected: anchors.length - 1 })
        return
      }
      const anchor = createBezierAnchor(cell.x, cell.y)
      shapeDragRef.current = { type: "create-bezier", index: 0, from: cell }
      setShapeDraft({
        kind: "bezier",
        anchors: [anchor],
        closed: shapePrefsRef.current.mode === "fill",
        mode: shapePrefsRef.current.mode,
        strokeWidth: clampStrokeWidth(brushRef.current),
        selected: 0,
      })
      return
    }

    if (
      toolRef.current === "selectContiguous" ||
      toolRef.current === "selectColor" ||
      toolRef.current === "lasso" ||
      SELECT_TOOLS.has(toolRef.current)
    ) {
      const combining = event.shiftKey || event.altKey
      selectCombineRef.current = selectionCombineModeFromModifiers(event.shiftKey, event.altKey)
      const selection = selectionRef.current
      if (selection && !combining && !polySelRef.current) {
        if (hitSelectionRotate(selection, cell)) {
          beginSelectionRotate(selection, cell)
          return
        }
        const corner = hitSelectionCorner(selection, cell)
        if (corner) {
          beginSelectionResize(corner, selection)
          return
        }
        if (pointInSelection(cell.x, cell.y, selection)) {
          beginSelectionMove(cell, selection)
          return
        }
      }
      if (toolRef.current === "selectContiguous") {
        ensureSelectionCommitted()
        commitSelection(
          selectionFromFlood(
            image().data,
            cell.x,
            cell.y,
            canvasWidthRef.current,
            canvasHeightRef.current,
            fillToleranceRef.current,
          ),
        )
        return
      }
      if (toolRef.current === "selectColor") {
        ensureSelectionCommitted()
        commitSelection(
          selectionFromColor(
            image().data,
            cell.x,
            cell.y,
            canvasWidthRef.current,
            canvasHeightRef.current,
            fillToleranceRef.current,
          ),
        )
        return
      }
      if (toolRef.current === "selectPolygon") {
        polygonSelectClick(cell)
        return
      }
      if (toolRef.current === "lasso") {
        lassoRef.current = [cell]
        if (!combining) {
          ensureSelectionCommitted()
          if (selectionRef.current) beginSelectionUndo()
          setSelection(null)
        } else {
          beginSelectionUndo()
        }
        return
      }
      selectMutatedRef.current = false
      selectStartRef.current = cell
      moveRef.current = null
      if (!combining) {
        ensureSelectionCommitted()
        if (selectionRef.current) beginSelectionUndo()
        setSelection(null)
      } else {
        beginSelectionUndo()
      }
      return
    }

    if (DRAFT_SHAPE_TOOLS.has(toolRef.current)) {
      ensureSelectionCommitted()
      const existing = shapeDraftRef.current
      if (existing && (existing.kind === "rect" || existing.kind === "ellipse")) {
        const corner = hitShapeCorner(existing, cell)
        if (corner) {
          shapeDragRef.current = { type: "resize-rect", corner, origin: existing }
          return
        }
      }
      shapeDragRef.current = {
        type: toolRef.current === "ellipse" ? "create-ellipse" : "create-rect",
        start: cell,
      }
      setShapeDraft({
        kind: toolRef.current === "ellipse" ? "ellipse" : "rect",
        x0: cell.x,
        y0: cell.y,
        x1: cell.x,
        y1: cell.y,
        filled: shapeFillRef.current || shapePrefsRef.current.filled,
        strokeWidth: clampStrokeWidth(brushRef.current),
      })
      return
    }

    if (SHAPE_TOOLS.has(toolRef.current)) {
      if (!activeLayerEditable()) return
      ensureSelectionCommitted()
      if (toolRef.current !== "gradient") pushUndo()
      shapeStartRef.current = cell
      shapeBaseRef.current = new Uint8ClampedArray(image().data)
      paintShapePreview(cell)
      return
    }

    if (!activeLayerEditable()) return
    ensureSelectionCommitted()
    pushUndo()
    strokeTrailRef.current = []
    drawRef.current = null
    const downPressure = normalizePointerPressure(event.pointerType, event.pressure)
    strokePressureRef.current = downPressure
    lastStampPressureRef.current = downPressure
    paintStrokeCells([{ ...cell, pressure: downPressure }])
  }

  const emitHover = (event: { clientX: number; clientY: number }) => {
    const cell = cellFromEvent(event)
    onHoverCellRef.current?.(
      inCanvas(cell.x, cell.y, canvasWidthRef.current, canvasHeightRef.current) ? cell : null,
    )
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    emitHover(event)
    const hoverCell = cellFromEvent(event)
    if (polySelRef.current) {
      const prev = polySelRef.current.hover
      if (!prev || prev.x !== hoverCell.x || prev.y !== hoverCell.y) {
        polySelRef.current.hover = hoverCell
        scheduleView()
      }
    }
    if (lassoRef.current) {
      const last = lassoRef.current[lassoRef.current.length - 1]
      if (!last || last.x !== hoverCell.x || last.y !== hoverCell.y) {
        lassoRef.current.push(hoverCell)
        scheduleView()
      }
    }
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
        scheduleView()
      }
      return
    }

    if (panRef.current) {
      cameraRef.current.originX = panRef.current.originX + (event.clientX - panRef.current.x)
      cameraRef.current.originY = panRef.current.originY + (event.clientY - panRef.current.y)
      if (zoomRef.current === "fit") emitZoom(cameraRef.current.scale)
      scheduleView()
      return
    }

    if (moveRef.current) {
      const move = moveRef.current
      const cell = cellFromEvent(event)
      const canvasW = canvasWidthRef.current
      const canvasH = canvasHeightRef.current
      const { x: nextX, y: nextY } = softClampSelectionOrigin(
        cell.x - move.grabX,
        cell.y - move.grabY,
        move.floating.width,
        move.floating.height,
        canvasW,
        canvasH,
      )
      setSelection({
        x: nextX,
        y: nextY,
        width: move.floating.width,
        height: move.floating.height,
        mask: move.floating.mask,
      })
      scheduleView()
      return
    }

    if (selectResizeRef.current) {
      const resize = selectResizeRef.current
      const cell = cellFromEvent(event)
      const origin = resize.origin
      let x0 = origin.x
      let y0 = origin.y
      let x1 = origin.x + origin.width - 1
      let y1 = origin.y + origin.height - 1
      if (resize.corner.includes("w")) x0 = cell.x
      if (resize.corner.includes("e")) x1 = cell.x
      if (resize.corner.includes("n")) y0 = cell.y
      if (resize.corner.includes("s")) y1 = cell.y
      const bounds = normalizePixelRect(x0, y0, x1, y1)
      const canvasW = canvasWidthRef.current
      const canvasH = canvasHeightRef.current
      const width = Math.max(1, bounds.width)
      const height = Math.max(1, bounds.height)
      const { x, y } = softClampSelectionOrigin(bounds.x, bounds.y, width, height, canvasW, canvasH)
      const scaled = scaleClipboard(resize.floating, width, height)
      rememberSelectionFloat(scaled)
      setSelection({ x, y, width, height, mask: scaled.mask })
      scheduleView()
      return
    }

    if (selectRotateRef.current) {
      const rotate = selectRotateRef.current
      const cell = cellFromEvent(event)
      const angle = (Math.atan2(cell.y - rotate.centerY, cell.x - rotate.centerX) * 180) / Math.PI
      let degrees = angle - rotate.startAngle
      if (degrees > 180) degrees -= 360
      if (degrees < -180) degrees += 360
      rotate.degrees = degrees
      const rotated = rotateClipboardNearest(rotate.floating, degrees)
      const canvasW = canvasWidthRef.current
      const canvasH = canvasHeightRef.current
      const rawX = Math.round(rotate.centerX - (rotated.width - 1) / 2)
      const rawY = Math.round(rotate.centerY - (rotated.height - 1) / 2)
      const { x: destX, y: destY } = softClampSelectionOrigin(
        rawX,
        rawY,
        rotated.width,
        rotated.height,
        canvasW,
        canvasH,
      )
      rememberSelectionFloat(rotated)
      setSelection({
        x: destX,
        y: destY,
        width: rotated.width,
        height: rotated.height,
        mask: rotated.mask,
      })
      scheduleView()
      return
    }

    if (textCreateRef.current) {
      textCreateRef.current = { ...textCreateRef.current, end: cellFromEvent(event) }
      scheduleView()
      return
    }

    if (selectStartRef.current) {
      const start = selectStartRef.current
      const end = cellFromEvent(event)
      selectMarqueeEndRef.current = end
      if (selectCombineRef.current === "replace") {
        beginSelectionUndo()
        setSelection(selectionFromMarquee(start.x, start.y, end.x, end.y))
      } else {
        scheduleView()
      }
      return
    }

    const drag = shapeDragRef.current
    if (drag) {
      const cell = cellFromEvent(event)
      if (drag.type === "create-rect" || drag.type === "create-ellipse") {
        let end = cell
        if (shapeShiftRef.current) end = constrainSquareEnd(drag.start.x, drag.start.y, cell.x, cell.y)
        const kind = drag.type === "create-ellipse" ? "ellipse" : "rect"
        setShapeDraft({
          kind,
          x0: drag.start.x,
          y0: drag.start.y,
          x1: end.x,
          y1: end.y,
          filled: shapeFillRef.current || shapePrefsRef.current.filled,
          strokeWidth: clampStrokeWidth(brushRef.current),
        })
        return
      }
      if (drag.type === "resize-rect") {
        const origin = drag.origin
        const bounds = normalizePixelRect(origin.x0, origin.y0, origin.x1, origin.y1)
        let x0 = bounds.x
        let y0 = bounds.y
        let x1 = bounds.x + bounds.width - 1
        let y1 = bounds.y + bounds.height - 1
        if (drag.corner.includes("w")) x0 = cell.x
        if (drag.corner.includes("e")) x1 = cell.x
        if (drag.corner.includes("n")) y0 = cell.y
        if (drag.corner.includes("s")) y1 = cell.y
        if (shapeShiftRef.current) {
          const square = constrainSquareEnd(x0, y0, x1, y1)
          x1 = square.x
          y1 = square.y
        }
        setShapeDraft({
          ...origin,
          x0,
          y0,
          x1,
          y1,
          filled: shapeFillRef.current ? true : origin.filled,
        })
        return
      }
      const draft = shapeDraftRef.current
      if (draft?.kind === "bezier") {
        const anchors = draft.anchors.map((anchor) => ({ ...anchor }))
        if (drag.type === "move-anchor") {
          const anchor = anchors[drag.index]
          const dx = cell.x - anchor.x
          const dy = cell.y - anchor.y
          anchor.x = cell.x
          anchor.y = cell.y
          anchor.hiX += dx
          anchor.hiY += dy
          anchor.hoX += dx
          anchor.hoY += dy
        } else if (drag.type === "move-handle") {
          const anchor = anchors[drag.index]
          if (drag.which === "hi") {
            anchor.hiX = cell.x
            anchor.hiY = cell.y
          } else {
            anchor.hoX = cell.x
            anchor.hoY = cell.y
          }
        } else if (drag.type === "create-bezier") {
          const anchor = anchors[drag.index]
          anchor.hoX = cell.x
          anchor.hoY = cell.y
          anchor.hiX = drag.from.x * 2 - cell.x
          anchor.hiY = drag.from.y * 2 - cell.y
        }
        if (drag.type === "move-anchor" || drag.type === "move-handle" || drag.type === "create-bezier") {
          setShapeDraft({ ...draft, anchors, selected: drag.index })
        }
        return
      }
      if (draft?.kind === "polygon" && drag.type === "move-point") {
        const points = draft.points.map((point) => ({ ...point }))
        points[drag.index] = { x: cell.x, y: cell.y }
        setShapeDraft({ ...draft, points, selected: drag.index })
        return
      }
    }

    if (shapeStartRef.current) {
      paintShapePreview(cellFromEvent(event))
      return
    }

    if (!drawRef.current) return
    paintStrokeFromPointerEvent(event)
  }

  const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawRef.current) {
      paintStrokeFromPointerEvent(event)
    }
    const cell = cellFromEvent(event)
    if (toolRef.current === "gradient" && shapeStartRef.current && shapeBaseRef.current) {
      const start = shapeStartRef.current
      restoreShapeBase()
      if (start.x !== cell.x || start.y !== cell.y) {
        pushUndo()
        const from = hexToRgb(colorRef.current)
        const to = hexToRgb(PIXEL_PAPER)
        const stops: Array<[number, number, number]> = []
        for (let i = 0; i < 8; i += 1) {
          const t = i / 7
          const rgb: [number, number, number] = [
            Math.round(from[0] + (to[0] - from[0]) * t),
            Math.round(from[1] + (to[1] - from[1]) * t),
            Math.round(from[2] + (to[2] - from[2]) * t),
          ]
          const hex = rgbToHex(rgb)
          if (adoptColor(hex)) stops.push(hexToRgb(hex))
          else stops.push(from)
        }
        fillLinearGradient(
          image().data,
          start.x,
          start.y,
          cell.x,
          cell.y,
          stops,
          canvasWidthRef.current,
          canvasHeightRef.current,
          selectionRef.current ?? undefined,
        )
      }
      schedule()
    }
    if (lassoRef.current) {
      commitSelection(
        selectionFromPolygon(lassoRef.current, canvasWidthRef.current, canvasHeightRef.current),
      )
      lassoRef.current = null
    }
    if (selectStartRef.current && selectCombineRef.current !== "replace") {
      const start = selectStartRef.current
      const end = selectMarqueeEndRef.current ?? cell
      commitSelection(selectionFromMarquee(start.x, start.y, end.x, end.y))
    }
    if (textCreateRef.current) finishTextCreateRef.current(cell)
    const wasStroke = Boolean(drawRef.current) || Boolean(shapeStartRef.current)
    const wasMove =
      Boolean(moveRef.current) || Boolean(selectResizeRef.current) || Boolean(selectRotateRef.current)
    const wasMarquee = Boolean(selectStartRef.current)
    const endingPinch = Boolean(pinchRef.current) && pointersRef.current.size <= 2
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) {
      if (endingPinch) {
        const dpr = currentDpr()
        const snappedScale = snapCssScaleToDevicePixels(cameraRef.current.scale, dpr)
        const snappedOrigin = snapOriginToDevicePixels(
          cameraRef.current.originX,
          cameraRef.current.originY,
          dpr,
        )
        cameraRef.current = { scale: snappedScale, ...snappedOrigin }
        emitZoom(snappedScale)
        scheduleView()
      }
      pinchRef.current = null
    }
    if (pointersRef.current.size === 0) {
      endSelectionUndo()
      if (moveRef.current) {
        rememberSelectionFloat(moveRef.current.floating)
        selectionFloatingRef.current = true
      } else if (selectResizeRef.current && selectionRef.current) {
        const sel = selectionRef.current
        rememberSelectionFloat(
          scaleClipboard(selectResizeRef.current.floating, sel.width, sel.height),
        )
        selectionFloatingRef.current = true
      } else if (selectRotateRef.current) {
        rememberSelectionFloat(
          rotateClipboardNearest(
            selectRotateRef.current.floating,
            selectRotateRef.current.degrees,
          ),
        )
        selectionFloatingRef.current = true
      }
      drawRef.current = null
      strokeTrailRef.current = []
      panRef.current = null
      shapeStartRef.current = null
      shapePreviewDirtyRef.current = null
      shapeDragRef.current = null
      shapeBaseRef.current = null
      selectStartRef.current = null
      selectMarqueeEndRef.current = null
      moveRef.current = null
      selectResizeRef.current = null
      selectRotateRef.current = null
      // Floating moves do not stamp yet — skip autosave until commit/deselect.
      if (wasStroke || (wasMarquee && selectMutatedRef.current)) onStrokeEnd?.()
      else if (wasMove) scheduleView()
      selectMutatedRef.current = false
    }
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      /* ignore */
    }
  }

  const zoomLabel = zoom === "fit" ? copy.pixelFit[lang] : `${Math.round(Number(zoom) * 10) / 10}×`
  void historyTick

  const applyTextResize = (cell: { x: number; y: number }) => {
    const start = textResizeRef.current
    const frame = textFrameRef.current
    if (!start || !frame || frame.mode !== "paragraph") return
    const canvasW = canvasWidthRef.current
    const canvasH = canvasHeightRef.current
    const right = start.x + start.width
    const minW = PIXEL_FONT_W * brushRef.current
    let { x, width } = start
    if (start.handle === "e") {
      width = Math.max(minW, Math.min(canvasW - start.x, cell.x - start.x + 1))
    }
    if (start.handle === "w") {
      x = Math.max(0, Math.min(cell.x, right - minW))
      width = right - x
    }
    const fitted = measurePixelTextBox(frame.text, brushRef.current, width, { trim: false })
    setTextFrame((prev) =>
      prev
        ? {
            ...prev,
            x,
            width,
            height: Math.min(fitted.height, canvasH - prev.y),
            mode: "paragraph",
          }
        : null,
    )
  }

  const applyTextMove = (cell: { x: number; y: number }) => {
    const move = textMoveRef.current
    const frame = textFrameRef.current
    if (!move || !frame) return
    const width = frame.width
    const height = frame.height
    const x = Math.max(0, Math.min(cell.x - move.grabX, canvasWidthRef.current - width))
    const y = Math.max(0, Math.min(cell.y - move.grabY, canvasHeightRef.current - height))
    setTextFrame((prev) => (prev ? { ...prev, x, y } : null))
  }

  const endTextBoxPointer = () => {
    textResizeRef.current = null
    textMoveRef.current = null
  }

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
          "pixel-view-canvas block h-full w-full touch-none",
          tool === "pan" || spacePanRef.current
            ? "cursor-grab"
            : tool === "eyedropper"
              ? "cursor-cell"
              : "cursor-crosshair",
        )}
        style={{ touchAction: "none", imageRendering: "pixelated" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={(event) => {
          if (
            toolRef.current === "polygon" &&
            shapeDraftRef.current?.kind === "polygon" &&
            shapeDraftRef.current.points.length >= 3
          ) {
            applyShapeDraftRef.current()
            return
          }
          if (toolRef.current !== "text") return
          const hit = placedTextAt(cellFromEvent(event))
          if (hit) beginEditPlacedTextRef.current(hit)
        }}
        onPointerLeave={() => onHoverCellRef.current?.(null)}
        onContextMenu={(event) => {
          event.preventDefault()
          onCanvasMenuRef.current?.({ clientX: event.clientX, clientY: event.clientY })
        }}
      />
      {textFrame ? (
        <div
          ref={textOverlayRef}
          className="pixel-text-box absolute left-0 top-0 z-10 box-border"
          style={{
            transformOrigin: "0 0",
            transform: `translate(${cameraRef.current.originX + textFrame.x * cameraRef.current.scale}px, ${cameraRef.current.originY + textFrame.y * cameraRef.current.scale}px)`,
            width: Math.max(1, textFrame.width * cameraRef.current.scale),
            height: Math.max(1, textFrame.height * cameraRef.current.scale),
            boxShadow: "0 0 0 1px #FFFDF7, 0 0 0 2px #20202A",
            backgroundColor: "transparent",
          }}
          onPointerMove={(event) => {
            if (textResizeRef.current) applyTextResize(cellFromEvent(event))
            else if (textMoveRef.current) applyTextMove(cellFromEvent(event))
          }}
          onPointerUp={endTextBoxPointer}
          onPointerCancel={endTextBoxPointer}
        >
          <div
            className="absolute -inset-1 z-0 cursor-move"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const frame = textFrameRef.current
              if (!frame) return
              const cell = cellFromEvent(event)
              textMoveRef.current = { grabX: cell.x - frame.x, grabY: cell.y - frame.y }
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                /* ignore */
              }
            }}
            onPointerMove={(event) => {
              if (textMoveRef.current) applyTextMove(cellFromEvent(event))
            }}
            onPointerUp={endTextBoxPointer}
            onPointerCancel={endTextBoxPointer}
          />
          <label className="sr-only" htmlFor={`${titleId}-text`}>
            {copy.pixelTextTool[lang]}
          </label>
          <textarea
            id={`${titleId}-text`}
            ref={textAreaRef}
            value={textFrame.text}
            placeholder={copy.pixelTextPlaceholder[lang]}
            spellCheck={false}
            onChange={(event) => {
              const text = event.target.value
              const current = textFrameRef.current
              if (!current) return
              const scale = brushRef.current
              const canvasW = canvasWidthRef.current
              const canvasH = canvasHeightRef.current
              const wrap = current.mode === "paragraph"
              const measured = measurePixelTextBox(text, scale, wrap ? current.width : undefined, {
                trim: false,
              })
              const width = wrap
                ? current.width
                : Math.min(measured.width, canvasW - current.x)
              const height = Math.min(measured.height, canvasH - current.y)
              const next = { ...current, text, width, height }
              textFrameRef.current = next
              setTextFrame(next)
            }}
            onPaste={(event) => {
              event.preventDefault()
              const pasted = event.clipboardData.getData("text").replace(/\r/g, "").trim()
              const area = event.currentTarget
              const start = area.selectionStart
              const end = area.selectionEnd
              const merged = `${area.value.slice(0, start)}${pasted}${area.value.slice(end)}`
              const current = textFrameRef.current
              if (!current) return
              const scale = brushRef.current
              const canvasW = canvasWidthRef.current
              const canvasH = canvasHeightRef.current
              const wrap = current.mode === "paragraph"
              const measured = measurePixelTextBox(merged, scale, wrap ? current.width : undefined, {
                trim: false,
              })
              const next = {
                ...current,
                text: merged,
                width: wrap ? current.width : Math.min(measured.width, canvasW - current.x),
                height: Math.min(measured.height, canvasH - current.y),
              }
              textFrameRef.current = next
              setTextFrame(next)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                cancelTextFrame()
              }
            }}
            className="absolute inset-0 z-10 resize-none overflow-hidden bg-transparent px-0.5 py-0 outline-none"
            style={{
              fontFamily: "var(--font-pixel), ui-monospace, monospace",
              fontSize: Math.max(8, PIXEL_FONT_H * brushSize * cameraRef.current.scale),
              lineHeight: `${(PIXEL_FONT_H + PIXEL_FONT_LEADING) * brushSize * cameraRef.current.scale}px`,
              whiteSpace: textFrame.mode === "point" ? "pre" : "pre-wrap",
              wordBreak: textFrame.mode === "point" ? "normal" : "break-word",
              overflowWrap: textFrame.mode === "point" ? "normal" : "anywhere",
              color,
              caretColor: color,
            }}
          />
          {textFrame.mode === "paragraph"
            ? PARAGRAPH_HANDLES.map((handle) => (
                <button
                  key={handle.id}
                  type="button"
                  aria-label={`${copy.pixelTextResize[lang]} ${handle.id}`}
                  className="absolute z-20 h-3 w-3 border-[3px] border-earth bg-brick"
                  style={{ cursor: handle.cursor, ...(handle.style as CSSProperties) }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const frame = textFrameRef.current
                    if (!frame) return
                    textResizeRef.current = {
                      handle: handle.id,
                      x: frame.x,
                      y: frame.y,
                      width: frame.width,
                      height: frame.height,
                    }
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId)
                    } catch {
                      /* ignore */
                    }
                  }}
                  onPointerMove={(event) => {
                    if (textResizeRef.current) applyTextResize(cellFromEvent(event))
                  }}
                  onPointerUp={endTextBoxPointer}
                  onPointerCancel={endTextBoxPointer}
                />
              ))
            : null}
        </div>
      ) : null}
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
                resolveScale(
                  "fit",
                  sizeRef.current.width,
                  sizeRef.current.height,
                  width,
                  height,
                  currentDpr(),
                ),
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
                resolveScale(
                  "fit",
                  sizeRef.current.width,
                  sizeRef.current.height,
                  width,
                  height,
                  currentDpr(),
                ),
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

      {tool === "fill" ? (
        <label className="flex max-w-xs items-center gap-3 text-[13px] text-fg">
          <span className="shrink-0">{copy.pixelFillTolerance[lang]}</span>
          <input
            type="range"
            min={0}
            max={255}
            step={1}
            value={fillToleranceUi}
            aria-label={copy.pixelFillTolerance[lang]}
            onChange={(event) => setFillToleranceUi(clampFillTolerance(Number(event.target.value)))}
            className="min-w-0 flex-1"
          />
          <span className="w-8 text-right tabular-nums">{fillToleranceUi}</span>
        </label>
      ) : null}
      {tool === "select" ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.pixelSelectShape[lang]}>
          <Button
            size="sm"
            variant={selectShapeUi === "rect" ? "primary" : "outline"}
            aria-pressed={selectShapeUi === "rect"}
            onClick={() => setSelectShapeUi("rect")}
          >
            {copy.pixelSelectRect[lang]}
          </Button>
          <Button
            size="sm"
            variant={selectShapeUi === "ellipse" ? "primary" : "outline"}
            aria-pressed={selectShapeUi === "ellipse"}
            onClick={() => setSelectShapeUi("ellipse")}
          >
            {copy.pixelSelectEllipse[lang]}
          </Button>
        </div>
      ) : null}

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
