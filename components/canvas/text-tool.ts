import {
  canAddLayer,
  createEmptyLayer,
  type PixelLayerRuntime,
  type PixelPoint,
} from "../../lib/pixel"
import { resolvePixelFont, snapFontSize } from "../../lib/pixel-text/fonts"
import {
  boxCorners,
  clampTextPosition,
  handlePosition,
  hitTextBorder,
  hitTextHandle,
  pointInTextBox,
  resizeTextBox,
  TEXT_HANDLES,
  type TextHandle,
} from "@/lib/pixel-text/geometry"
import { layoutText } from "@/lib/pixel-text/layout"
import {
  createTextObject,
  normalizeTextObject,
  PIXEL_TEXT_MAX_CHARS,
  textObjectsEqual,
  type PixelTextObject,
} from "../../lib/pixel-text/model"
import { drawTextObject, textDirtyRect, unionTextRect, type TextRect } from "@/lib/pixel-text/raster"

/**
 * Text tool interaction controller. It owns selection, creation, move, resize and the editing
 * session of text objects, and nothing else: pixels, history, palette and recompositing all go
 * through `TextToolEnv`, so the board stays the single owner of the document and this class can
 * run headless in tests.
 */
export type TextToolEnv = {
  layers: () => PixelLayerRuntime[]
  activeIndex: () => number
  setActive: (index: number) => void
  size: () => { width: number; height: number }
  /** Screen pixels per document pixel. */
  viewScale: () => number
  drawingColor: () => string
  /** Palette index for `hex`, adopting it into the document palette; null when the palette is full. */
  colorIndex: (hex: string) => number | null
  /** Hidden by its own flag or by its group. */
  layerHidden: (layer: PixelLayerRuntime) => boolean
  pushUndo: () => void
  /** One undo step per `key` inside the coalescing window. Returns whether a step was pushed. */
  pushUndoCoalesced: (key: string) => boolean
  discardUndo: () => void
  /**
   * Pixels in `rect` changed (null: none). `structure` when layers were added, removed or
   * reordered; `typing` while a keystroke burst is in flight so autosave can stay debounced.
   */
  changed: (rect: TextRect | null, opts?: { structure?: boolean; typing?: boolean }) => void
  requestView: () => void
  flash: (kind: "max" | "locked") => void
  paletteFull: () => void
}

type Drag =
  | { kind: "create"; start: PixelPoint; end: PixelPoint }
  | { kind: "move"; id: string; grab: PixelPoint; moved: boolean }
  | { kind: "resize"; id: string; handle: TextHandle; start: PixelTextObject; moved: boolean }

type Editing = { id: string; created: boolean; pushes: number; pushedForContent: boolean }

export type TextToolState = {
  selected: PixelTextObject | null
  editing: boolean
}

/** Fields owned by the layer system; the typography path never writes them. */
const LAYER_OWNED = new Set(["id", "text", "visible", "locked", "opacity"])
const DEFAULT_BOX_MAX = 96
const DEFAULT_BOX_MIN = 24

/** Remembered typography for the next new text object. */
type StyleMemory = Partial<
  Pick<
    PixelTextObject,
    "fontFamily" | "fontSize" | "fontWeight" | "fontStyle" | "align" | "verticalAlign" | "lineHeight" | "letterSpacing" | "overflow"
  >
>

export class TextToolController {
  private selectedId: string | null = null
  private drag: Drag | null = null
  private editing: Editing | null = null
  private memory: StyleMemory = {}

  constructor(
    private readonly env: TextToolEnv,
    private readonly onState: () => void,
  ) {}

  // --- lookup -------------------------------------------------------------------------------

  private find(id: string | null) {
    if (!id) return null
    const layers = this.env.layers()
    const index = layers.findIndex((layer) => layer.text?.id === id)
    if (index < 0) return null
    return { layer: layers[index]!, index }
  }

  private selectedLive() {
    const found = this.find(this.selectedId)
    return found && found.layer.text ? { ...found, text: found.layer.text } : null
  }

  state(): TextToolState {
    const sel = this.selectedLive()
    return { selected: sel ? sel.text : null, editing: this.editing !== null && sel?.text.id === this.editing.id }
  }

  editingObject(): PixelTextObject | null {
    if (!this.editing) return null
    return this.find(this.editing.id)?.layer.text ?? null
  }

  isEditing() {
    return this.editing !== null
  }

  hasInteraction() {
    return this.drag !== null
  }

  // --- selection ----------------------------------------------------------------------------

  select(id: string | null) {
    if (this.selectedId === id) return
    if (this.editing && this.editing.id !== id) this.finishEdit()
    this.selectedId = id
    this.onState()
    this.env.requestView()
  }

  /** The active layer decides what is selected: a text layer selects its object, others clear it. */
  syncSelectionToActive() {
    const layer = this.env.layers()[this.env.activeIndex()]
    this.select(layer?.text ? layer.text.id : null)
  }

  /** Call after layers were added, removed or restored (undo/redo) so stale ids are dropped. */
  layersReplaced() {
    this.drag = null
    if (this.editing && !this.find(this.editing.id)) this.editing = null
    if (this.selectedId && !this.find(this.selectedId)) this.selectedId = null
    this.onState()
  }

  /** Leave editing and drop any drag (tool switch, undo, canvas replaced). */
  cancelInteraction() {
    this.drag = null
    this.finishEdit()
    this.env.requestView()
  }

  deselect() {
    this.cancelInteraction()
    this.select(null)
  }

  // --- hit testing --------------------------------------------------------------------------

  private hitTest(p: PixelPoint) {
    const layers = this.env.layers()
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const layer = layers[i]!
      if (!layer.text || this.env.layerHidden(layer)) continue
      if (pointInTextBox(layer.text, p)) return { layer, index: i, text: layer.text }
    }
    return null
  }

  private handleRadius() {
    return Math.max(0.75, 8 / this.env.viewScale())
  }

  private borderBand() {
    return Math.max(1, 5 / this.env.viewScale())
  }

  // --- pointer ------------------------------------------------------------------------------

  /** Returns true when the text tool consumed the press. */
  pointerDown(cell: PixelPoint): boolean {
    const p = { x: cell.x + 0.5, y: cell.y + 0.5 }
    const sel = this.selectedLive()
    if (sel && !sel.layer.locked) {
      const handle = hitTextHandle(sel.text, p, this.handleRadius())
      if (handle) {
        this.drag = { kind: "resize", id: sel.text.id, handle, start: { ...sel.text }, moved: false }
        return true
      }
      if (hitTextBorder(sel.text, p, this.borderBand())) {
        this.drag = { kind: "move", id: sel.text.id, grab: { x: p.x - sel.text.x, y: p.y - sel.text.y }, moved: false }
        return true
      }
    }
    const hit = this.hitTest(p)
    if (hit) {
      if (!sel || sel.layer !== hit.layer) {
        this.finishEdit()
        this.env.setActive(hit.index)
        this.selectedId = hit.text.id
        this.onState()
      }
      if (hit.layer.locked) {
        this.env.flash("locked")
      } else {
        // Dragging the body moves the object; a plain click only selects it.
        this.drag = { kind: "move", id: hit.text.id, grab: { x: p.x - hit.text.x, y: p.y - hit.text.y }, moved: false }
      }
      this.env.requestView()
      return true
    }
    this.finishEdit()
    this.select(null)
    this.drag = { kind: "create", start: cell, end: cell }
    this.env.requestView()
    return true
  }

  pointerMove(cell: PixelPoint) {
    const d = this.drag
    if (!d) return
    if (d.kind === "create") {
      d.end = cell
      this.env.requestView()
      return
    }
    const entry = this.find(d.id)
    if (!entry || !entry.layer.text) return
    const before = entry.layer.text
    const { width, height } = this.env.size()
    const p = { x: cell.x + 0.5, y: cell.y + 0.5 }
    let patch: Partial<PixelTextObject>
    if (d.kind === "move") {
      const next = clampTextPosition(p.x - d.grab.x, p.y - d.grab.y, before, width, height)
      if (next.x === before.x && next.y === before.y) return
      patch = next
    } else {
      const face = resolvePixelFont(before.fontFamily)
      const cell1 = Math.max(1, Math.round(face.glyphWidth * (before.fontSize / face.nativeSize)))
      patch = resizeTextBox(
        d.start,
        d.handle,
        p,
        { minWidth: cell1, minHeight: Math.max(1, Math.round(before.fontSize)), canvasWidth: width, canvasHeight: height },
        { square: false },
      )
      if (
        patch.x === before.x &&
        patch.y === before.y &&
        patch.width === before.width &&
        patch.height === before.height
      ) {
        return
      }
    }
    if (!d.moved) {
      d.moved = true
      this.env.pushUndo()
      if (this.editing) this.editing.pushes += 1
    }
    this.apply(entry.layer, { ...before, ...patch })
  }

  pointerUp(cell: PixelPoint) {
    const d = this.drag
    this.drag = null
    if (!d) return
    if (d.kind === "create") {
      this.finishCreate(d.start, cell)
      return
    }
    if (d.moved) this.env.changed(null)
    this.env.requestView()
  }

  doubleClick(cell: PixelPoint) {
    const hit = this.hitTest({ x: cell.x + 0.5, y: cell.y + 0.5 })
    if (!hit) return
    this.drag = null
    this.env.setActive(hit.index)
    this.selectedId = hit.text.id
    this.startEdit(hit.text.id)
  }

  // --- creation -----------------------------------------------------------------------------

  private newObject(box: { x: number; y: number; width: number; height: number }) {
    return createTextObject({
      ...this.memory,
      ...box,
      color: this.env.drawingColor(),
    })
  }

  private finishCreate(start: PixelPoint, end: PixelPoint) {
    const { width: cw, height: ch } = this.env.size()
    const base = this.newObject({ x: 0, y: 0, width: 1, height: 1 })
    const face = resolvePixelFont(base.fontFamily)
    const lineH = Math.max(1, Math.round(base.fontSize))
    const minW = Math.max(1, Math.round(face.glyphWidth * (base.fontSize / face.nativeSize)))
    const dragged = Math.hypot(end.x - start.x, end.y - start.y)
    let x: number
    let y: number
    let width: number
    let height: number
    if (dragged < 2) {
      width = Math.min(cw, Math.max(DEFAULT_BOX_MIN, Math.min(DEFAULT_BOX_MAX, Math.floor(cw / 2))))
      height = Math.min(ch, lineH)
      x = Math.max(0, Math.min(start.x, cw - width))
      y = Math.max(0, Math.min(start.y, ch - height))
    } else {
      x = Math.max(0, Math.min(start.x, end.x))
      y = Math.max(0, Math.min(start.y, end.y))
      width = Math.max(minW, Math.min(cw - x, Math.abs(end.x - start.x) + 1))
      height = Math.max(lineH, Math.min(ch - y, Math.abs(end.y - start.y) + 1))
    }
    this.create({ x, y, width, height })
  }

  /** Create a text object (also used for programmatic creation). Returns its id, or null when full. */
  create(box: { x: number; y: number; width: number; height: number }, text = ""): string | null {
    const layers = this.env.layers()
    if (!canAddLayer(layers, "text")) {
      this.env.flash("max")
      this.env.requestView()
      return null
    }
    this.env.pushUndo()
    const { width: cw, height: ch } = this.env.size()
    const active = layers[this.env.activeIndex()]
    const layer = createEmptyLayer(cw, ch, "Text")
    layer.group = active?.group ?? null
    layer.text = { ...this.newObject(box), text }
    const at = Math.min(layers.length, this.env.activeIndex() + 1)
    layers.splice(at, 0, layer)
    this.env.setActive(at)
    this.selectedId = layer.text.id
    const rect = this.paint(layer, null)
    this.env.changed(rect, { structure: true })
    if (!text) this.startEdit(layer.text.id, { created: true, pushes: 1 })
    else this.onState()
    return layer.text.id
  }

  // --- editing ------------------------------------------------------------------------------

  startEdit(id: string, init: { created?: boolean; pushes?: number } = {}) {
    const entry = this.find(id)
    if (!entry) return
    if (entry.layer.locked) {
      this.env.flash("locked")
      return
    }
    if (this.editing && this.editing.id !== id) this.finishEdit()
    this.selectedId = id
    this.editing = {
      id,
      created: Boolean(init.created),
      pushes: init.pushes ?? 0,
      pushedForContent: Boolean(init.created),
    }
    this.onState()
    this.env.requestView()
  }

  /** Apply the textarea's value. One undo step covers the whole editing session. */
  setContent(value: string) {
    const e = this.editing
    const entry = e ? this.find(e.id) : null
    if (!e || !entry || !entry.layer.text) return
    const next = value.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").slice(0, PIXEL_TEXT_MAX_CHARS)
    const before = entry.layer.text
    if (next === before.text) return
    if (!e.pushedForContent) {
      this.env.pushUndo()
      e.pushedForContent = true
      e.pushes += 1
    }
    this.apply(entry.layer, { ...before, text: next }, { typing: true })
  }

  /** A just-created box that is still blank: leaving it cancels the creation (undo consumed). */
  abortBlankNew(): boolean {
    const e = this.editing
    const entry = e ? this.find(e.id) : null
    if (!e || !e.created || !entry?.layer.text || entry.layer.text.text.trim()) return false
    this.finishEdit()
    return true
  }

  finishEdit() {
    const e = this.editing
    if (!e) return
    this.editing = null
    const entry = this.find(e.id)
    if (entry && entry.layer.text && !entry.layer.text.text.trim()) {
      // A blank text box is not an object worth keeping.
      const rect = textDirtyRect(entry.layer.text, this.env.size().width, this.env.size().height)
      if (e.created) for (let i = 0; i < e.pushes; i += 1) this.env.discardUndo()
      const layers = this.env.layers()
      layers.splice(entry.index, 1)
      this.env.setActive(Math.max(0, Math.min(entry.index - 1, layers.length - 1)))
      if (this.selectedId === e.id) this.selectedId = null
      this.env.changed(rect, { structure: true })
    } else {
      this.env.changed(null)
    }
    this.onState()
    this.env.requestView()
  }

  // --- typography / geometry ----------------------------------------------------------------

  /**
   * Change typography or box geometry of the selected object. Each call is one history step;
   * pass `coalesceKey` for continuous controls so a slider drag stays one step.
   */
  update(patch: Partial<PixelTextObject>, coalesceKey?: string): boolean {
    const sel = this.selectedLive()
    if (!sel) return false
    if (sel.layer.locked) {
      this.env.flash("locked")
      return false
    }
    const before = sel.text
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) if (!LAYER_OWNED.has(key)) clean[key] = value
    const merged = normalizeTextObject({ ...before, ...clean })
    if (!merged) return false
    const face = resolvePixelFont(merged.fontFamily)
    merged.fontSize = snapFontSize(face, merged.fontSize)
    if (merged.color !== before.color && this.env.colorIndex(merged.color) === null) {
      this.env.paletteFull()
      merged.color = before.color
    }
    if (textObjectsEqual(merged, before)) return false
    const pushed = coalesceKey ? this.env.pushUndoCoalesced(`text:${before.id}:${coalesceKey}`) : (this.env.pushUndo(), true)
    if (pushed && this.editing) this.editing.pushes += 1
    this.remember(merged)
    this.apply(sel.layer, merged)
    return true
  }

  private remember(t: PixelTextObject) {
    this.memory = {
      fontFamily: t.fontFamily,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
      fontStyle: t.fontStyle,
      align: t.align,
      verticalAlign: t.verticalAlign,
      lineHeight: t.lineHeight,
      letterSpacing: t.letterSpacing,
      overflow: t.overflow,
    }
  }

  nudge(dx: number, dy: number): boolean {
    const sel = this.selectedLive()
    if (!sel || this.editing) return false
    const { width, height } = this.env.size()
    const next = clampTextPosition(sel.text.x + dx, sel.text.y + dy, sel.text, width, height)
    return this.update(next, "nudge")
  }

  deleteSelected(): boolean {
    const sel = this.selectedLive()
    if (!sel || this.editing) return false
    if (sel.layer.locked) {
      this.env.flash("locked")
      return false
    }
    this.env.pushUndo()
    const layers = this.env.layers()
    const rect = textDirtyRect(sel.text, this.env.size().width, this.env.size().height)
    layers.splice(sel.index, 1)
    this.env.setActive(Math.max(0, Math.min(sel.index - 1, layers.length - 1)))
    this.selectedId = null
    this.env.changed(rect, { structure: true })
    this.onState()
    return true
  }

  /** Turn a text layer back into ordinary pixels (what is on screen stays exactly as is). */
  rasterize(id: string): boolean {
    const entry = this.find(id)
    if (!entry) return false
    this.env.pushUndo()
    entry.layer.text = undefined
    if (this.selectedId === id) this.selectedId = null
    if (this.editing?.id === id) this.editing = null
    this.env.changed(null, { structure: true })
    this.onState()
    return true
  }

  // --- raster -------------------------------------------------------------------------------

  private apply(layer: PixelLayerRuntime, next: PixelTextObject, opts: { typing?: boolean } = {}) {
    const before = layer.text ?? null
    layer.text = next
    this.env.changed(this.paint(layer, before), { typing: opts.typing })
    this.onState()
  }

  /** Redraw `layer` from its text object, clearing what the previous state covered. */
  private paint(layer: PixelLayerRuntime, before: PixelTextObject | null): TextRect | null {
    const text = layer.text
    if (!text) return null
    const { width, height } = this.env.size()
    if (layer.indices.length !== width * height) layer.indices = new Uint8Array(width * height)
    const rect = unionTextRect(before ? textDirtyRect(before, width, height) : null, textDirtyRect(text, width, height))
    if (rect) {
      for (let y = rect.y; y < rect.y + rect.height; y += 1) {
        layer.indices.fill(0, y * width + rect.x, y * width + rect.x + rect.width)
      }
    }
    const colorIndex = this.env.colorIndex(text.color)
    if (colorIndex === null) {
      this.env.paletteFull()
    } else {
      drawTextObject(text, colorIndex, layer.indices, width, height)
    }
    return rect
  }

  /** Re-derive every text layer (after the palette changed underneath them). */
  refreshAll(): TextRect | null {
    let dirty: TextRect | null = null
    for (const layer of this.env.layers()) {
      if (!layer.text) continue
      dirty = unionTextRect(dirty, this.paint(layer, layer.text))
    }
    if (dirty) this.env.changed(dirty)
    return dirty
  }

  // --- drawing ------------------------------------------------------------------------------

  /** Cursor for the pointer at `cell`, for the view canvas. */
  cursorAt(cell: PixelPoint): string {
    if (this.drag?.kind === "move") return "grabbing"
    const p = { x: cell.x + 0.5, y: cell.y + 0.5 }
    const sel = this.selectedLive()
    if (sel && !sel.layer.locked) {
      const handle = this.drag?.kind === "resize" ? this.drag.handle : hitTextHandle(sel.text, p, this.handleRadius())
      if (handle) return resizeCursor(handle, sel.text.rotation)
      if (hitTextBorder(sel.text, p, this.borderBand())) return "move"
    }
    const over = this.hitTest(p)
    if (!over) return "text"
    return sel?.text.id === over.text.id ? "move" : "pointer"
  }

  /** Draw the selection frame, handles and the creation rectangle. `ctx` is in document space. */
  drawOverlay(ctx: CanvasRenderingContext2D) {
    const px = 1 / this.env.viewScale()
    const d = this.drag
    if (d?.kind === "create") {
      const x = Math.min(d.start.x, d.end.x)
      const y = Math.min(d.start.y, d.end.y)
      const w = Math.abs(d.end.x - d.start.x) + 1
      const h = Math.abs(d.end.y - d.start.y) + 1
      ctx.save()
      ctx.lineWidth = px
      ctx.setLineDash([2 * px, 2 * px])
      ctx.strokeStyle = "rgba(40, 43, 53, 0.95)"
      ctx.strokeRect(x, y, w, h)
      ctx.strokeStyle = "rgba(255, 253, 247, 0.95)"
      ctx.lineDashOffset = 2 * px
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    }
    const sel = this.selectedLive()
    if (!sel) return
    const corners = boxCorners(sel.text)
    ctx.save()
    ctx.lineWidth = px
    ctx.beginPath()
    corners.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)))
    ctx.closePath()
    ctx.strokeStyle = "rgba(40, 43, 53, 0.95)"
    ctx.stroke()
    ctx.setLineDash([3 * px, 3 * px])
    ctx.strokeStyle = "rgba(89, 188, 235, 1)"
    ctx.stroke()
    ctx.setLineDash([])
    if (!sel.layer.locked) {
      const size = 8 * px
      for (const handle of TEXT_HANDLES) {
        const pos = handlePosition(sel.text, handle)
        ctx.fillStyle = "rgba(255, 253, 247, 1)"
        ctx.strokeStyle = "rgba(40, 43, 53, 1)"
        ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size)
        ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size)
      }
    }
    ctx.restore()
  }

  /** Native-textarea metrics for the editing overlay, derived from the same layout as the raster. */
  overlayMetrics(): {
    object: PixelTextObject
    glyphAdvance: number
    lineAdvance: number
    firstLineY: number
    contentHeight: number
  } | null {
    const object = this.editingObject()
    if (!object) return null
    const layout = layoutText(object)
    const face = resolvePixelFont(object.fontFamily)
    return {
      object,
      glyphAdvance: (face.advance("M") + object.letterSpacing + (object.fontWeight === "bold" ? 1 : 0)) * layout.scale,
      lineAdvance: layout.lineAdvance,
      firstLineY: layout.lines[0]?.y ?? 0,
      contentHeight: layout.contentHeight,
    }
  }
}

/** CSS resize cursor for a handle, taking the box rotation into account. */
export function resizeCursor(handle: TextHandle, rotation: number) {
  const base: Record<TextHandle, number> = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 }
  const angle = (((base[handle] + rotation) % 180) + 180) % 180
  const slot = Math.round(angle / 45) % 4
  return ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][slot]!
}
