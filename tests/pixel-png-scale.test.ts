import { describe, expect, it } from "vitest"
import { PIXEL_EXPORT_EDGE_MAX, PIXEL_PAPER, hexToRgb } from "../lib/pixel"
import {
  assertDownloadScaleAllowed,
  downloadExportOptions,
  downloadScaleOptions,
  fitIntegerScale,
  formatDownloadEstimateBytes,
  letterboxRgbaNearest,
  maxDownloadScale,
  punchPaperAlpha,
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
  it("caps max scale so both edges stay ≤ PIXEL_EXPORT_EDGE_MAX", () => {
    expect(maxDownloadScale(16, 16)).toBe(160)
    expect(maxDownloadScale(32, 32)).toBe(80)
    expect(maxDownloadScale(64, 64)).toBe(40)
    expect(maxDownloadScale(128, 128)).toBe(20)
    expect(maxDownloadScale(256, 256)).toBe(10)
    expect(maxDownloadScale(512, 512)).toBe(5)
    expect(maxDownloadScale(128, 64)).toBe(20)
  })

  it("lists 1× and power-of-two options only within the export cap", () => {
    expect(downloadScaleOptions(16, 16)).toEqual([1, 2, 4, 8, 16, 32, 64, 128])
    expect(downloadScaleOptions(64, 64)).toEqual([1, 2, 4, 8, 16, 32])
    expect(downloadScaleOptions(256, 256)).toEqual([1, 2, 4, 8])
    expect(downloadScaleOptions(512, 512)).toEqual([1, 2, 4])
    expect(downloadScaleOptions(128, 64)).toEqual([1, 2, 4, 8, 16])
  })

  it("never offers a scaled size larger than the export edge max", () => {
    for (const size of [16, 32, 64, 128, 256, 512]) {
      for (const scale of downloadScaleOptions(size, size)) {
        const out = scaledDownloadSize(size, size, scale)
        expect(out.width).toBeLessThanOrEqual(PIXEL_EXPORT_EDGE_MAX)
        expect(out.height).toBeLessThanOrEqual(PIXEL_EXPORT_EDGE_MAX)
      }
    }
  })

  it("rejects illegal scales", () => {
    expect(assertDownloadScaleAllowed(64, 64, 0)).toEqual({ ok: false, reason: "scale" })
    expect(assertDownloadScaleAllowed(64, 64, 1.5)).toEqual({ ok: false, reason: "scale" })
    expect(assertDownloadScaleAllowed(64, 64, 64)).toEqual({ ok: false, reason: "bounds" })
    expect(assertDownloadScaleAllowed(64, 64, 32)).toEqual({ ok: true, outW: 2048, outH: 2048 })
  })

  it("curates a short export list: 1× / 4× / max + fit targets", () => {
    const options = downloadExportOptions(64, 64)
    const scales = options.filter((o) => o.kind === "scale").map((o) => o.scale)
    expect(scales).toEqual([1, 4, 32])
    const fit1080 = options.find((o) => o.kind === "fit" && o.id === "1080p")
    expect(fit1080).toMatchObject({
      kind: "fit",
      id: "1080p",
      targetW: 1920,
      targetH: 1080,
      scale: 16,
      contentW: 1024,
      contentH: 1024,
    })
    const fit1440 = options.find((o) => o.kind === "fit" && o.id === "1440p")
    expect(fit1440).toMatchObject({
      kind: "fit",
      id: "1440p",
      targetW: 2560,
      targetH: 1440,
      scale: 22,
      contentW: 1408,
      contentH: 1408,
    })
  })

  it("formats byte estimates", () => {
    expect(formatDownloadEstimateBytes(800)).toBe("800 B")
    expect(formatDownloadEstimateBytes(1536)).toMatch(/KB/)
  })
})

describe("fit / letterbox", () => {
  it("picks the largest integer scale that fits the target", () => {
    expect(fitIntegerScale(64, 64, 1920, 1080)).toBe(16)
    expect(fitIntegerScale(64, 64, 2560, 1440)).toBe(22)
    expect(fitIntegerScale(480, 270, 1920, 1080)).toBe(4)
  })

  it("letterboxes with transparent margins and keeps content colors exact", () => {
    const size = 8
    const scale = fitIntegerScale(size, size, 40, 24)
    expect(scale).toBe(3)
    const src = checkerRgba(size, size)
    const result = letterboxRgbaNearest(src, size, size, 40, 24, "transparent")
    expect(result.width).toBe(40)
    expect(result.height).toBe(24)
    expect(result.scale).toBe(3)
    const contentW = size * scale
    const contentH = size * scale
    const ox = Math.floor((40 - contentW) / 2)
    const oy = Math.floor((24 - contentH) / 2)

    expect(sample(result.data, 40, 0, 0)).toEqual([0, 0, 0, 0])
    expect(sample(result.data, 40, ox, oy)).toEqual([255, 0, 0, 255])
    expect(sample(result.data, 40, ox + scale, oy)).toEqual([0, 0, 255, 255])

    let foreign = 0
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 40; x++) {
        const [r, g, b, a] = sample(result.data, 40, x, y)
        const inContent =
          x >= ox && x < ox + contentW && y >= oy && y < oy + contentH
        if (inContent) {
          const ok =
            a === 255 && g === 0 && ((r === 255 && b === 0) || (r === 0 && b === 255))
          if (!ok) foreign += 1
        } else if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
          foreign += 1
        }
      }
    }
    expect(foreign).toBe(0)
  })

  it("letterboxes with solid Paper margins when requested", () => {
    const paper = hexToRgb(PIXEL_PAPER)
    const src = checkerRgba(8, 8)
    const result = letterboxRgbaNearest(src, 8, 8, 40, 24, "solid")
    expect(sample(result.data, 40, 0, 0)).toEqual([paper[0], paper[1], paper[2], 255])
  })

  it("punches Paper pixels to transparent for download", () => {
    const paper = hexToRgb(PIXEL_PAPER)
    const data = new Uint8ClampedArray([
      paper[0],
      paper[1],
      paper[2],
      255,
      233,
      75,
      60,
      255,
    ])
    const punched = punchPaperAlpha(data)
    expect([...punched.slice(0, 4)]).toEqual([0, 0, 0, 0])
    expect([...punched.slice(4, 8)]).toEqual([233, 75, 60, 255])
    expect([...data.slice(0, 4)]).toEqual([paper[0], paper[1], paper[2], 255])
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

    expect(sample(result.data, out, 0, 0)).toEqual([255, 0, 0, 255])
    expect(sample(result.data, out, scale - 1, scale - 1)).toEqual([255, 0, 0, 255])
    expect(sample(result.data, out, scale, 0)).toEqual([0, 0, 255, 255])
    expect(sample(result.data, out, scale, scale - 1)).toEqual([0, 0, 255, 255])

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
