import type { PixelClipboard, PixelLayerRuntime, PixelSelection } from "@/lib/pixel"

/**
 * Layer-stack history with structural sharing.
 *
 * A frame is an immutable snapshot of the layer stack, the document palette, and the
 * selection (including a floating clipboard). Layers whose pixels did not change since
 * the previously captured frame reuse the same buffer, so a stroke on one layer costs
 * one layer's bytes instead of the whole stack. Unchanged palette arrays, selection
 * masks, and float buffers are shared the same way. Frame buffers are never mutated;
 * consumers must copy them before editing (the board already does).
 */
export type HistoryLayer = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity?: number
  blend?: PixelLayerRuntime["blend"]
  lockAlpha?: boolean
  indices: Uint8Array
}

export type HistoryFrame = {
  layers: HistoryLayer[]
  active: number
  palette: readonly string[]
  selection: PixelSelection | null
  /** Lifted pixels. Null when the selection is not floating. */
  floating: PixelClipboard | null
}

export type HistoryDocument = {
  layers: readonly PixelLayerRuntime[]
  active: number
  palette: readonly string[]
  selection: PixelSelection | null
  floating: PixelClipboard | null
}

export type PixelHistoryOptions = {
  /** Max undo steps kept. */
  limit?: number
  /** Soft cap on unique buffer bytes across undo + redo (oldest undo steps are dropped first). */
  maxBytes?: number
}

export const PIXEL_HISTORY_DEFAULT_LIMIT = 32
export const PIXEL_HISTORY_DEFAULT_MAX_BYTES = 48 * 1024 * 1024

function sameBytes(a: ArrayLike<number>, b: ArrayLike<number>) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

function samePalette(a: readonly string[], b: readonly string[]) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

/** Reuse `previous` or `alias` when the bytes match so identical masks are stored once. */
function captureMask(mask: Uint8Array | undefined, previous?: Uint8Array, alias?: Uint8Array) {
  if (!mask) return undefined
  if (alias && sameBytes(alias, mask)) return alias
  if (previous && sameBytes(previous, mask)) return previous
  return new Uint8Array(mask)
}

function captureSelection(selection: PixelSelection | null, reference?: HistoryFrame | null): PixelSelection | null {
  if (!selection) return null
  return {
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    mask: captureMask(selection.mask, reference?.selection?.mask),
  }
}

function captureFloating(floating: PixelClipboard | null, reference?: HistoryFrame | null, selectionMask?: Uint8Array) {
  if (!floating) return null
  const prev = reference?.floating
  const data =
    prev &&
    prev.width === floating.width &&
    prev.height === floating.height &&
    sameBytes(prev.data, floating.data)
      ? prev.data
      : new Uint8ClampedArray(floating.data)
  return {
    width: floating.width,
    height: floating.height,
    data,
    mask: captureMask(floating.mask, prev?.mask, selectionMask),
  }
}

export function captureFrame(doc: HistoryDocument, reference?: HistoryFrame | null): HistoryFrame {
  const refById = new Map<string, HistoryLayer>()
  if (reference) for (const layer of reference.layers) refById.set(layer.id, layer)
  const selection = captureSelection(doc.selection, reference)
  return {
    active: doc.active,
    palette: reference && samePalette(reference.palette, doc.palette) ? reference.palette : doc.palette.slice(),
    selection,
    floating: captureFloating(doc.floating, reference, selection?.mask),
    layers: doc.layers.map((layer) => {
      const prior = refById.get(layer.id)
      const indices =
        prior && sameBytes(prior.indices, layer.indices) ? prior.indices : new Uint8Array(layer.indices)
      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        blend: layer.blend,
        lockAlpha: layer.lockAlpha,
        indices,
      }
    }),
  }
}

export class PixelHistory {
  private undoStack: HistoryFrame[] = []
  private redoStack: HistoryFrame[] = []
  private latest: HistoryFrame | null = null
  private readonly limit: number
  private readonly maxBytes: number

  constructor(options: PixelHistoryOptions = {}) {
    this.limit = Math.max(1, options.limit ?? PIXEL_HISTORY_DEFAULT_LIMIT)
    this.maxBytes = Math.max(1, options.maxBytes ?? PIXEL_HISTORY_DEFAULT_MAX_BYTES)
  }

  get canUndo() {
    return this.undoStack.length > 0
  }

  get canRedo() {
    return this.redoStack.length > 0
  }

  get undoDepth() {
    return this.undoStack.length
  }

  get redoDepth() {
    return this.redoStack.length
  }

  /** Unique buffer bytes held (shared buffers counted once). Palette strings are not counted. */
  bytes() {
    const seen = new Set<Uint8Array | Uint8ClampedArray>()
    let total = 0
    const add = (buf?: Uint8Array | Uint8ClampedArray) => {
      if (!buf || seen.has(buf)) return
      seen.add(buf)
      total += buf.byteLength
    }
    for (const frame of [...this.undoStack, ...this.redoStack]) {
      for (const layer of frame.layers) add(layer.indices)
      add(frame.selection?.mask)
      add(frame.floating?.data)
      add(frame.floating?.mask)
    }
    return total
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.latest = null
  }

  /** Record the state *before* a change. Clears redo. */
  push(doc: HistoryDocument) {
    const frame = captureFrame(doc, this.latest)
    this.latest = frame
    this.undoStack.push(frame)
    this.redoStack = []
    this.trim()
  }

  /** Returns the frame to restore, or null. `current` is stored for redo. */
  undo(current: HistoryDocument): HistoryFrame | null {
    const previous = this.undoStack.pop()
    if (!previous) return null
    const now = captureFrame(current, this.latest)
    this.latest = now
    this.redoStack.push(now)
    return previous
  }

  redo(current: HistoryDocument): HistoryFrame | null {
    const next = this.redoStack.pop()
    if (!next) return null
    const now = captureFrame(current, this.latest)
    this.latest = now
    this.undoStack.push(now)
    return next
  }

  private trim() {
    while (this.undoStack.length > this.limit) this.undoStack.shift()
    // Always keep at least the newest step so one huge canvas still gets one undo.
    while (this.undoStack.length > 1 && this.bytes() > this.maxBytes) this.undoStack.shift()
  }
}
