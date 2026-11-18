/**
 * Renders synthetic OG previews for visual QA.
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
  const top = usage ?? []
  const accent = top[0]?.hex ?? "#59bceb"
  const secondary = top[1]?.hex ?? accent
  const artIsDark = hexLuminance(accent) < 0.35
  const artStageBg = artIsDark
    ? mixHex(accent, "#0a0b10", 0.55)
    : mixHex(mixHex(accent, secondary, 0.35), "#12141c", 0.62)
  return {
    artStageBg,
    panelBg: mixHex("#101218", accent, 0.12),
    panelFg: "#f3f0ea",
    panelMuted: "#a8a3b0",
    accent,
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

function SocialCardMarkup({ title, displayName, username, artworkDataUrl, aspect, artWidth, artHeight, palette }) {
  const colors = palette
  const handle = `@${username}`
  const artShare = aspect === "landscape" ? 0.68 : aspect === "portrait" ? 0.6 : 0.64
  const pad = aspect === "landscape" ? 2 : 2.5

  return createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundColor: colors.panelBg,
      },
    },
    createElement(
      "div",
      {
        style: {
          display: "flex",
          width: `${Math.round(artShare * 100)}%`,
          height: "100%",
          flexShrink: 0,
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: colors.artStageBg,
            backgroundImage: `linear-gradient(145deg, ${colors.artStageBg} 0%, ${mixHex(colors.artStageBg, colors.accent, 0.22)} 100%)`,
            overflow: "hidden",
          },
        },
        createElement("img", {
          src: artworkDataUrl,
          width: artWidth >= artHeight ? 1200 : Math.round(1200 * (artWidth / artHeight)),
          height: artHeight >= artWidth ? 1200 : Math.round(1200 * (artHeight / artWidth)),
          style: {
            maxWidth: `${100 - pad * 2}%`,
            maxHeight: `${100 - pad * 2}%`,
            objectFit: "contain",
            imageRendering: "pixelated",
          },
        }),
      ),
    ),
    createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: `${100 - Math.round(artShare * 100)}%`,
          height: "100%",
          padding: "48px 40px",
          backgroundColor: colors.panelBg,
          backgroundImage: `linear-gradient(180deg, ${colors.panelBg} 0%, #0c0d12 100%)`,
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: colors.accent,
          },
        },
        "PXLB",
      ),
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flex: 1,
            justifyContent: "center",
          },
        },
        createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              color: colors.panelFg,
              lineHeight: 1.2,
            },
          },
          title,
        ),
        createElement("div", {
          style: { display: "flex", width: 48, height: 4, backgroundColor: colors.accent },
        }),
        createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 6 } },
          createElement(
            "div",
            { style: { display: "flex", fontSize: 26, fontWeight: 600, color: colors.panelFg } },
            displayName,
          ),
          createElement(
            "div",
            { style: { display: "flex", fontSize: 22, color: colors.panelMuted } },
            handle,
          ),
        ),
      ),
      createElement(
        "div",
        { style: { display: "flex", fontSize: 16, color: colors.panelMuted, letterSpacing: "0.04em" } },
        "pxlb.fun",
      ),
    ),
  )
}

const samples = [
  {
    name: "square-bright",
    aspect: "square",
    usage: [{ hex: "#ffd447", count: 40 }, { hex: "#59bceb", count: 20 }],
    art: { w: 64, h: 64, colors: ["#ffd447", "#59bceb", "#ffffff", "#e94b3c"] },
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
    name: "transparent-bright",
    aspect: "square",
    usage: [{ hex: "#9a45e0", count: 30 }, { hex: "#59bceb", count: 20 }],
    art: { w: 64, h: 64, colors: ["#9a45e0", "#59bceb", "#ffd447"], transparent: true },
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
  const palette = socialCardPalette(sample.usage)
  const res = new ImageResponse(
    createElement(SocialCardMarkup, {
      title: sample.name.replace(/-/g, " "),
      displayName: "Agung Cahyo",
      username: "cahyo",
      artworkDataUrl,
      aspect: sample.aspect,
      artWidth: sample.art.w,
      artHeight: sample.art.h,
      palette,
    }),
    { width: 1200, height: 630 },
  )
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(outDir, `${sample.name}.png`)
  writeFileSync(path, buf)
  console.log("wrote", path, buf.length)
}
