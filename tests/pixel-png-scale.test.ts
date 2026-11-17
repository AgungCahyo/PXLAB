import { describe, expect, it } from "vitest"
import {
  assertDownloadScaleAllowed,
  downloadScaleOptions,
  formatDownloadEstimateBytes,
  maxDownloadScale,
  scaledDownloadSize,
  scaleRgbaNearest,
} from "@/lib/pixel-png-scale"

/** Checkerboard: red and blue 2×2 tiles for sharp-edge tests. */
function checkerRgba(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const red = (x + y) % 2 === 0
      data[i] = red ? 255 : 0
      data[i + 1] = 0
      data[i + 2] = red ? 0 : 255
      data[i + 3] = 255
    }
  }
  return data
}

function sample(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * width + x) * 4
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!]
}

describe("pixel PNG download scales", () => {
  it("caps max scale so both edges stay ≤ 512", () => {
    expect(maxDownloadScale(16, 16)).toBe(32)
    expect(maxDownloadScale(32, 32)).toBe(16)
    expect(maxDownloadScale(64, 64)).toBe(8)
    expect(maxDownloadScale(128, 128)).toBe(4)
    expect(maxDownloadScale(256, 256)).toBe(2)
    expect(maxDownloadScale(512, 512)).toBe(1)
    expect(maxDownloadScale(128, 64)).toBe(4)
  })

  it("lists 1× and power-of-two options only within the cap", () => {
    expect(downloadScaleOptions(16, 16)).toEqual([1, 2, 4, 8, 16, 32])
    expect(downloadScaleOptions(64, 64)).toEqual([1, 2, 4, 8])
    expect(downloadScaleOptions(256, 256)).toEqual([1, 2])
    expect(downloadScaleOptions(512, 512)).toEqual([1])
    expect(downloadScaleOptions(128, 64)).toEqual([1, 2, 4])
  })

  it("never offers a size larger than 512×512", () => {
    for (const size of [16, 32, 64, 128, 256, 512]) {
      for (const scale of downloadScaleOptions(size, size)) {
        const out = scaledDownloadSize(size, size, scale)
        expect(out.width).toBeLessThanOrEqual(512)
        expect(out.height).toBeLessThanOrEqual(512)
      }
    }
  })

  it("rejects illegal scales", () => {
    expect(assertDownloadScaleAllowed(64, 64, 0)).toEqual({ ok: false, reason: "scale" })
    expect(assertDownloadScaleAllowed(64, 64, 1.5)).toEqual({ ok: false, reason: "scale" })
    expect(assertDownloadScaleAllowed(64, 64, 16)).toEqual({ ok: false, reason: "bounds" })
    expect(assertDownloadScaleAllowed(64, 64, 8)).toEqual({ ok: true, outW: 512, outH: 512 })
  })

  it("formats byte estimates", () => {
    expect(formatDownloadEstimateBytes(800)).toBe("800 B")
    expect(formatDownloadEstimateBytes(1536)).toMatch(/KB/)
  })
})

describe("scaleRgbaNearest crispness", () => {
  function assertCrispUpscale(size: number, scale: number) {
    const out = size * scale
    const src = checkerRgba(size, size)
    const result = scaleRgbaNearest(src, size, size, scale)
    expect(result.width).toBe(out)
    expect(result.height).toBe(out)
    expect(result.data.length).toBe(out * out * 4)

    // Corner of first red cell stays pure red across its block.
    expect(sample(result.data, out, 0, 0)).toEqual([255, 0, 0, 255])
    expect(sample(result.data, out, scale - 1, scale - 1)).toEqual([255, 0, 0, 255])
    // Adjacent blue cell stays pure blue — no blended edge colors.
    expect(sample(result.data, out, scale, 0)).toEqual([0, 0, 255, 255])
    expect(sample(result.data, out, scale, scale - 1)).toEqual([0, 0, 255, 255])

    // Spot-check mid-block and full scan without per-pixel expect (keeps stack small).
    expect(sample(result.data, out, Math.floor(scale / 2), Math.floor(scale / 2))).toEqual([
      255, 0, 0, 255,
    ])
    let foreign = 0
    for (let i = 0; i < result.data.length; i += 4) {
      const r = result.data[i]!
      const g = result.data[i + 1]!
      const b = result.data[i + 2]!
      const a = result.data[i + 3]!
      const ok =
        a === 255 && g === 0 && ((r === 255 && b === 0) || (r === 0 && b === 255))
      if (!ok) foreign += 1
    }
    expect(foreign).toBe(0)
  }

  it("keeps 16×16 → 512×512 blocks sharp with no new colors", () => {
    assertCrispUpscale(16, 32)
  })

  it("keeps 32×32 → 512×512 blocks sharp with no new colors", () => {
    assertCrispUpscale(32, 16)
  })

  it("keeps 64×64 → 512×512 blocks sharp with no new colors", () => {
    assertCrispUpscale(64, 8)
  })

  it("copies RGBA verbatim at 1×", () => {
    const src = checkerRgba(8, 8)
    const result = scaleRgbaNearest(src, 8, 8, 1)
    expect(result.width).toBe(8)
    expect(result.height).toBe(8)
    expect([...result.data]).toEqual([...src])
  })
})
