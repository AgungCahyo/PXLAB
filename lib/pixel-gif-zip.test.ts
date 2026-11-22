import { describe, expect, it } from "vitest"
import { encodeGif, scaleIndicesNearest } from "@/lib/pixel-gif"
import { decodeGif } from "@/lib/pixel-gif-decode.testutil"
import { createZip, crc32 } from "@/lib/pixel-zip"

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

describe("GIF encoder", () => {
  const pal = (n: number) => Array.from({ length: n }, (_, i) => [i % 256, (i * 7) % 256, (i * 13) % 256] as const)

  it("round-trips random frames exactly for every palette size class", () => {
    for (const colors of [2, 3, 4, 5, 16, 17, 100, 255, 256]) {
      const r = rng(colors)
      const w = 13
      const h = 9
      const frames = Array.from({ length: 3 }, () => ({
        indices: Uint8Array.from({ length: w * h }, () => Math.floor(r() * colors)),
        delayMs: 100,
      }))
      const gif = encodeGif({ width: w, height: h, palette: pal(colors), frames })
      const dec = decodeGif(gif)
      expect([dec.width, dec.height, dec.frames.length]).toEqual([w, h, 3])
      dec.frames.forEach((f, i) => expect(Array.from(f.indices)).toEqual(Array.from(frames[i]!.indices)))
      for (let i = 0; i < colors; i += 1) expect(dec.palette[i]).toEqual(Array.from(pal(colors)[i]!))
    }
  })

  it("survives dictionary overflow and the table-reset path (large noisy frame, long runs)", () => {
    const r = rng(99)
    const w = 160
    const h = 140
    const noise = Uint8Array.from({ length: w * h }, () => Math.floor(r() * 200))
    const runs = new Uint8Array(w * h)
    for (let i = 0; i < runs.length; i += 1) runs[i] = Math.floor(i / 977) % 7
    for (const indices of [noise, runs, new Uint8Array(w * h)]) {
      const dec = decodeGif(encodeGif({ width: w, height: h, palette: pal(200), frames: [{ indices, delayMs: 50 }] }))
      expect(Array.from(dec.frames[0]!.indices)).toEqual(Array.from(indices))
    }
  })

  it("writes delay, loop count, transparency and disposal", () => {
    const frames = [
      { indices: Uint8Array.from([0, 1, 2, 3]), delayMs: 120 },
      { indices: Uint8Array.from([3, 2, 1, 0]), delayMs: 40 },
    ]
    const dec = decodeGif(encodeGif({ width: 2, height: 2, palette: pal(4), frames, transparentIndex: 3, loop: 5 }))
    expect(dec.frames.map((f) => f.delay)).toEqual([12, 4])
    expect(dec.frames.every((f) => f.transparent === 3 && f.disposal === 2)).toBe(true)
    expect(dec.loop).toBe(5)
    const one = decodeGif(encodeGif({ width: 2, height: 2, palette: pal(4), frames: [frames[0]!] }))
    expect(one.loop).toBeNull()
    expect(one.frames[0]!.transparent).toBeNull()
  })

  it("scales with nearest neighbour while encoding", () => {
    const indices = Uint8Array.from([0, 1, 2, 3, 1, 0])
    expect(Array.from(scaleIndicesNearest(indices, 3, 2, 2))).toEqual([
      0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2, 3, 3, 1, 1, 0, 0, 3, 3, 1, 1, 0, 0,
    ])
    const dec = decodeGif(encodeGif({ width: 3, height: 2, palette: pal(4), frames: [{ indices, delayMs: 100 }], scale: 3 }))
    expect([dec.width, dec.height]).toEqual([9, 6])
    expect(Array.from(dec.frames[0]!.indices.slice(0, 9))).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2])
  })

  it("rejects invalid input", () => {
    const ok = { width: 2, height: 2, palette: pal(4), frames: [{ indices: new Uint8Array(4), delayMs: 100 }] }
    expect(() => encodeGif({ ...ok, frames: [] })).toThrow()
    expect(() => encodeGif({ ...ok, palette: pal(257 as number).slice(0, 257) })).toThrow()
    expect(() => encodeGif({ ...ok, frames: [{ indices: new Uint8Array(3), delayMs: 100 }] })).toThrow()
    expect(() => encodeGif({ ...ok, transparentIndex: 9 })).toThrow()
    expect(() => encodeGif({ ...ok, scale: 0 })).toThrow()
  })
})

describe("ZIP writer", () => {
  it("matches the CRC-32 check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it("writes a valid store-only archive that reads back", () => {
    const entries = [
      { name: "a.txt", data: new TextEncoder().encode("hello") },
      { name: "dir/ü-ñ.bin", data: Uint8Array.from({ length: 1000 }, (_, i) => i % 251) },
      { name: "empty", data: new Uint8Array(0) },
    ]
    const zip = createZip(entries)
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
    const eocd = zip.length - 22
    expect(view.getUint32(eocd, true)).toBe(0x06054b50)
    expect(view.getUint16(eocd + 10, true)).toBe(3)
    let p = view.getUint32(eocd + 16, true)
    for (const entry of entries) {
      expect(view.getUint32(p, true)).toBe(0x02014b50)
      const crc = view.getUint32(p + 16, true)
      const size = view.getUint32(p + 24, true)
      const nameLen = view.getUint16(p + 28, true)
      const offset = view.getUint32(p + 42, true)
      expect(new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen))).toBe(entry.name)
      expect(size).toBe(entry.data.length)
      expect(crc).toBe(crc32(entry.data))
      const dataStart = offset + 30 + view.getUint16(offset + 26, true)
      expect(Array.from(zip.subarray(dataStart, dataStart + size))).toEqual(Array.from(entry.data))
      p += 46 + nameLen
    }
  })

  it("is deterministic and rejects duplicate names", () => {
    const entries = [{ name: "x", data: Uint8Array.from([1, 2, 3]) }]
    expect(Array.from(createZip(entries))).toEqual(Array.from(createZip(entries)))
    expect(() => createZip([...entries, ...entries])).toThrow()
  })
})
