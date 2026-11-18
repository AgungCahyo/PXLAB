/**
 * Renders warm editorial OG previews for visual QA.
 * Run: node scripts/render-og-samples.mjs
 */
import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createElement } from "react"
import { ImageResponse } from "next/og.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, "..", ".tmp", "og-samples")
mkdirSync(outDir, { recursive: true })

const SOCIAL_IVORY = "#faf6ee"
const SOCIAL_WARM = "#f3ede3"
const SOCIAL_INK = "#2c2825"
const SOCIAL_MUTED = "#6b645c"
const SOCIAL_EARTH = "#936037"
const SOCIAL_SKY = "#59bceb"

function mixHex(a, b, amountOfB) {
  const t = Math.min(1, Math.max(0, amountOfB))
  const parse = (hex) => {
    const raw = hex.replace("#", "")
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((c) => c + c)
            .join("")
        : raw
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) || 0)
  }
  const A = parse(a)
  const B = parse(b)
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`
}

function hexLuminance(hex) {
  const raw = hex.replace("#", "")
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw
  const channel = (i) => {
    const v = Number.parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

function socialCardPalette(usage) {
  const top = (usage ?? []).filter((e) => {
    const h = e.hex.toLowerCase()
    return h !== "#000000" && h !== "#ffffff"
  })
  const rawAccent = top[0]?.hex ?? SOCIAL_SKY
  const lum = hexLuminance(rawAccent)
  const artIsDark = lum < 0.35
  const accent =
    lum < 0.22
      ? top.find((e) => hexLuminance(e.hex) >= 0.28)?.hex ?? SOCIAL_EARTH
      : rawAccent
  return {
    canvasBg: mixHex(SOCIAL_IVORY, SOCIAL_WARM, 0.35),
    artStageBg: mixHex(SOCIAL_IVORY, accent, artIsDark ? 0.08 : 0.14),
    ink: SOCIAL_INK,
    muted: SOCIAL_MUTED,
    accent: mixHex(accent, SOCIAL_EARTH, lum > 0.7 ? 0.25 : 0.08),
    artIsDark,
  }
}

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function rgbaPng(width, height, paint) {
  const rows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4)
    row[0] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = paint(x, y)
      const i = 1 + x * 4
      row[i] = r
      row[i + 1] = g
      row[i + 2] = b
      row[i + 3] = a
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function hexToRgb(hex) {
  const h = hex.replace("#", "")
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

function makeArt({ w, h, colors, transparent = false }) {
  const cells = 16
  const png = rgbaPng(w, h, (x, y) => {
    if (transparent) {
      const cx = x / w
      const cy = y / h
      if (!(cx > 0.2 && cx < 0.8 && cy > 0.15 && cy < 0.85)) return [0, 0, 0, 0]
    }
    const cx = Math.floor((x / w) * cells)
    const cy = Math.floor((y / h) * cells)
    const idx = (cx + cy) % colors.length
    if ((cx + cy) % 5 === 0) return [...hexToRgb(colors[0]), 255]
    return [...hexToRgb(colors[idx]), 255]
  })
  return `data:image/png;base64,${png.toString("base64")}`
}

function intrinsic(artWidth, artHeight) {
  const ratio = artWidth / artHeight
  if (ratio >= 1) return { width: 1200, height: Math.round(1200 / ratio) }
  return { width: Math.round(1200 * ratio), height: 1200 }
}

function Artwork({ src, aspect, artWidth, artHeight, colors }) {
  const box = intrinsic(artWidth, artHeight)
  const pad = aspect === "landscape" ? 2 : aspect === "portrait" ? 2.5 : 3
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: colors.artStageBg,
        overflow: "hidden",
      },
    },
    createElement("img", {
      src,
      width: box.width,
      height: box.height,
      style: {
        maxWidth: `${100 - pad * 2}%`,
        maxHeight: `${100 - pad * 2}%`,
        objectFit: "contain",
        imageRendering: "pixelated",
      },
    }),
  )
}

function Credit({ title, colors, brand }) {
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
        width: "100%",
      },
    },
    createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8, flex: 1 } },
      createElement(
        "div",
        { style: { display: "flex", fontSize: 36, fontWeight: 700, color: colors.ink, lineHeight: 1.2 } },
        title,
      ),
      createElement(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: 10 } },
        createElement(
          "div",
          { style: { display: "flex", fontSize: 22, fontWeight: 600, color: colors.ink } },
          "Agung Cahyo",
        ),
        createElement(
          "div",
          { style: { display: "flex", fontSize: 20, color: colors.muted } },
          "@cahyo",
        ),
      ),
    ),
    brand
      ? createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: colors.accent,
            },
          },
          "PXLB",
        )
      : null,
  )
}

function Stacked({ title, artworkDataUrl, aspect, artWidth, artHeight, colors, artFlex }) {
  return createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.artStageBg,
      },
    },
    createElement(
      "div",
      { style: { display: "flex", flex: artFlex, minHeight: 0, width: "100%" } },
      createElement(Artwork, { src: artworkDataUrl, aspect, artWidth, artHeight, colors }),
    ),
    createElement(
      "div",
      {
        style: {
          display: "flex",
          padding: "24px 40px 28px",
          backgroundColor: colors.artStageBg,
        },
      },
      createElement(Credit, { title, colors, brand: true }),
    ),
  )
}

function SideCaption({ title, artworkDataUrl, aspect, artWidth, artHeight, colors, artShare = 0.62 }) {
  const left = Math.round(artShare * 100)
  const right = 100 - left
  return createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundColor: colors.artStageBg,
      },
    },
    createElement(
      "div",
      { style: { display: "flex", width: `${left}%`, height: "100%", flexShrink: 0 } },
      createElement(Artwork, { src: artworkDataUrl, aspect, artWidth, artHeight, colors }),
    ),
    createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: `${right}%`,
          height: "100%",
          padding: "40px 36px",
          backgroundColor: colors.artStageBg,
        },
      },
      createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 12 } },
        createElement(
          "div",
          { style: { display: "flex", fontSize: 38, fontWeight: 700, color: colors.ink, lineHeight: 1.2 } },
          title,
        ),
        createElement(
          "div",
          { style: { display: "flex", fontSize: 24, fontWeight: 600, color: colors.ink } },
          "Agung Cahyo",
        ),
        createElement(
          "div",
          { style: { display: "flex", fontSize: 20, color: colors.muted } },
          "@cahyo",
        ),
        createElement(
          "div",
          {
            style: {
              display: "flex",
              marginTop: 16,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: colors.accent,
            },
          },
          "PXLB",
        ),
      ),
    ),
  )
}

function Card(props) {
  if (props.aspect === "landscape") {
    return createElement(Stacked, { ...props, artFlex: 0.86 })
  }
  return createElement(SideCaption, {
    ...props,
    artShare: props.aspect === "portrait" ? 0.56 : 0.62,
  })
}

const samples = [
  {
    name: "small-64",
    aspect: "square",
    usage: [{ hex: "#59bceb", count: 30 }, { hex: "#e94b3c", count: 20 }],
    art: { w: 64, h: 64, colors: ["#59bceb", "#e94b3c", "#ffd447", "#ffffff"] },
  },
  {
    name: "square-bright",
    aspect: "square",
    usage: [{ hex: "#ffd447", count: 40 }, { hex: "#59bceb", count: 20 }],
    art: { w: 128, h: 128, colors: ["#ffd447", "#59bceb", "#ffffff", "#e94b3c"] },
  },
  {
    name: "portrait-dark",
    aspect: "portrait",
    usage: [{ hex: "#1a1a2e", count: 50 }, { hex: "#e94560", count: 20 }],
    art: { w: 48, h: 80, colors: ["#1a1a2e", "#16213e", "#e94560", "#0f3460"] },
  },
  {
    name: "landscape-bright",
    aspect: "landscape",
    usage: [{ hex: "#45a849", count: 40 }, { hex: "#fffdf7", count: 20 }],
    art: { w: 96, h: 48, colors: ["#45a849", "#59bceb", "#ffd447", "#ffffff"] },
  },
  {
    name: "square-dark",
    aspect: "square",
    usage: [{ hex: "#111111", count: 60 }, { hex: "#59bceb", count: 10 }],
    art: { w: 64, h: 64, colors: ["#111111", "#222222", "#59bceb", "#e94b3c"] },
  },
  {
    name: "portrait-bright",
    aspect: "portrait",
    usage: [{ hex: "#fff6d6", count: 40 }, { hex: "#936037", count: 20 }],
    art: { w: 40, h: 72, colors: ["#fff6d6", "#ffd447", "#936037", "#e94b3c"] },
  },
]

for (const sample of samples) {
  const artworkDataUrl = makeArt(sample.art)
  const colors = socialCardPalette(sample.usage)
  const res = new ImageResponse(
    createElement(Card, {
      title: sample.name.replace(/-/g, " "),
      artworkDataUrl,
      aspect: sample.aspect,
      artWidth: sample.art.w,
      artHeight: sample.art.h,
      colors,
    }),
    { width: 1200, height: 630 },
  )
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(outDir, `${sample.name}.png`)
  writeFileSync(path, buf)
  console.log("wrote", path, buf.length)
}
