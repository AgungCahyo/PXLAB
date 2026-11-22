import { expect } from "vitest"

/** Independent GIF decoder written from the spec; used only to verify the encoder. */
export function decodeGif(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let p = 6
  const width = view.getUint16(p, true)
  const height = view.getUint16(p + 2, true)
  const packed = bytes[p + 4]!
  p += 7
  const tableSize = 1 << ((packed & 7) + 1)
  const palette: number[][] = []
  for (let i = 0; i < tableSize; i += 1) palette.push([bytes[p]!, bytes[p + 1]!, bytes[p + 2]!, ]), (p += 3)
  const frames: Array<{ indices: Uint8Array; delay: number; transparent: number | null; disposal: number }> = []
  let loop: number | null = null
  let gce = { delay: 0, transparent: null as number | null, disposal: 0 }
  for (;;) {
    const b = bytes[p++]!
    if (b === 0x3b) break
    if (b === 0x21) {
      const label = bytes[p++]!
      if (label === 0xf9) {
        const flags = bytes[p + 1]!
        gce = {
          delay: view.getUint16(p + 2, true),
          transparent: flags & 1 ? bytes[p + 4]! : null,
          disposal: (flags >> 2) & 7,
        }
      }
      if (label === 0xff) loop = view.getUint16(p + 1 + 11 + 2, true)
      for (;;) {
        const n = bytes[p++]!
        if (n === 0) break
        p += n
      }
      continue
    }
    if (b !== 0x2c) throw new Error("bad block")
    const w = view.getUint16(p + 4, true)
    const h = view.getUint16(p + 6, true)
    p += 9
    const minCode = bytes[p++]!
    const data: number[] = []
    for (;;) {
      const n = bytes[p++]!
      if (n === 0) break
      for (let i = 0; i < n; i += 1) data.push(bytes[p + i]!)
      p += n
    }
    const clear = 1 << minCode
    const eoi = clear + 1
    const out: number[] = []
    let dict: number[][] = []
    const reset = () => {
      dict = []
      for (let i = 0; i < clear; i += 1) dict.push([i])
      dict.push([], [])
    }
    reset()
    let size = minCode + 1
    let bitPos = 0
    let prev: number[] | null = null
    const read = () => {
      let code = 0
      for (let i = 0; i < size; i += 1) {
        code |= ((data[bitPos >> 3]! >> (bitPos & 7)) & 1) << i
        bitPos += 1
      }
      return code
    }
    for (;;) {
      if (bitPos + size > data.length * 8) break
      const code = read()
      if (code === clear) {
        reset()
        size = minCode + 1
        prev = null
        continue
      }
      if (code === eoi) break
      let entry: number[]
      if (code < dict.length) entry = dict[code]!
      else if (prev) entry = [...prev, prev[0]!]
      else throw new Error("bad code")
      out.push(...entry)
      if (prev && dict.length < 4096) {
        dict.push([...prev, entry[0]!])
        if (dict.length === 1 << size && size < 12) size += 1
      }
      prev = entry
    }
    frames.push({ indices: Uint8Array.from(out), delay: gce.delay, transparent: gce.transparent, disposal: gce.disposal })
    expect(w * h).toBe(out.length)
  }
  return { width, height, palette, frames, loop }
}

