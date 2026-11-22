/**
 * Minimal GIF89a encoder for indexed frames.
 *
 * PXLB documents are already palette-indexed (<= 256 colours), so frames map straight to GIF
 * colour indices with no quantisation. Optional single transparent index, per-frame delay,
 * loop count, nearest-neighbour integer upscaling. Pure: no DOM, no dependencies.
 */
export type GifFrame = {
  /** width*height palette indices (use `transparentIndex` for transparent cells). */
  indices: Uint8Array
  delayMs: number
}

export type GifOptions = {
  width: number
  height: number
  /** RGB triples, at most 256. */
  palette: ReadonlyArray<readonly [number, number, number]>
  frames: readonly GifFrame[]
  /** Index shown as transparent, or null. */
  transparentIndex?: number | null
  /** 0 = loop forever, otherwise the number of plays. Ignored for a single frame. */
  loop?: number
  /** Integer nearest-neighbour upscale applied while encoding. */
  scale?: number
}

export const GIF_MAX_COLORS = 256

function lzwEncode(pixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clear = 1 << minCodeSize
  const eoi = clear + 1
  const out: number[] = []
  let cur = 0
  let curBits = 0
  let codeSize = minCodeSize + 1
  let nextCode = eoi + 1
  let table = new Map<number, number>()

  const emit = (code: number) => {
    cur |= code << curBits
    curBits += codeSize
    while (curBits >= 8) {
      out.push(cur & 0xff)
      cur >>>= 8
      curBits -= 8
    }
  }

  emit(clear)
  let prefix = pixels[0]!
  for (let i = 1; i < pixels.length; i += 1) {
    const k = pixels[i]!
    const key = (prefix << 8) | k
    const found = table.get(key)
    if (found !== undefined) {
      prefix = found
      continue
    }
    emit(prefix)
    if (nextCode === 4096) {
      emit(clear)
      table = new Map()
      nextCode = eoi + 1
      codeSize = minCodeSize + 1
    } else {
      if (nextCode >= 1 << codeSize) codeSize += 1
      table.set(key, nextCode)
      nextCode += 1
    }
    prefix = k
  }
  emit(prefix)
  emit(eoi)
  if (curBits > 0) out.push(cur & 0xff)
  return Uint8Array.from(out)
}

export function scaleIndicesNearest(
  indices: Uint8Array,
  width: number,
  height: number,
  scale: number,
): Uint8Array {
  if (scale === 1) return indices
  const outW = width * scale
  const out = new Uint8Array(outW * height * scale)
  for (let y = 0; y < height; y += 1) {
    const row = y * scale * outW
    for (let x = 0; x < width; x += 1) {
      const v = indices[y * width + x]!
      for (let dx = 0; dx < scale; dx += 1) out[row + x * scale + dx] = v
    }
    for (let dy = 1; dy < scale; dy += 1) out.copyWithin(row + dy * outW, row, row + outW)
  }
  return out
}

export function encodeGif(options: GifOptions): Uint8Array {
  const { width, height, palette, frames } = options
  const scale = options.scale ?? 1
  if (!Number.isInteger(scale) || scale < 1) throw new Error("scale")
  const outW = width * scale
  const outH = height * scale
  if (outW < 1 || outH < 1 || outW > 65535 || outH > 65535) throw new Error("size")
  if (palette.length < 1 || palette.length > GIF_MAX_COLORS) throw new Error("palette")
  if (frames.length < 1) throw new Error("frames")
  const transparent = options.transparentIndex ?? null
  if (transparent !== null && (transparent < 0 || transparent >= palette.length)) throw new Error("transparent")

  let tableBits = 1
  while (1 << tableBits < palette.length) tableBits += 1
  const tableSize = 1 << tableBits
  const minCodeSize = Math.max(2, tableBits)

  const bytes: number[] = []
  const push = (...values: number[]) => {
    for (const v of values) bytes.push(v & 0xff)
  }
  const pushWord = (value: number) => push(value & 0xff, (value >> 8) & 0xff)
  const pushAscii = (text: string) => {
    for (let i = 0; i < text.length; i += 1) push(text.charCodeAt(i))
  }

  pushAscii("GIF89a")
  pushWord(outW)
  pushWord(outH)
  push(0x80 | 0x70 | (tableBits - 1), 0, 0)
  for (let i = 0; i < tableSize; i += 1) {
    const c = palette[i] ?? [0, 0, 0]
    push(c[0], c[1], c[2])
  }
  if (frames.length > 1) {
    push(0x21, 0xff, 0x0b)
    pushAscii("NETSCAPE2.0")
    push(0x03, 0x01)
    pushWord(Math.max(0, Math.min(65535, Math.round(options.loop ?? 0))))
    push(0x00)
  }

  for (const frame of frames) {
    if (frame.indices.length !== width * height) throw new Error("frame")
    const delay = Math.max(2, Math.min(65535, Math.round(frame.delayMs / 10)))
    // Disposal 2 (restore to background) so a transparent frame never shows the previous one.
    push(0x21, 0xf9, 0x04, (2 << 2) | (transparent !== null ? 1 : 0))
    pushWord(delay)
    push(transparent ?? 0, 0x00)
    push(0x2c)
    pushWord(0)
    pushWord(0)
    pushWord(outW)
    pushWord(outH)
    push(0x00)
    push(minCodeSize)
    const data = lzwEncode(scaleIndicesNearest(frame.indices, width, height, scale), minCodeSize)
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.subarray(i, Math.min(i + 255, data.length))
      push(chunk.length)
      for (const b of chunk) bytes.push(b)
    }
    push(0x00)
  }
  push(0x3b)
  return Uint8Array.from(bytes)
}
