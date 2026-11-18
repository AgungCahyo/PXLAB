/**
 * Generates PXLB PWA icons (192, 512, maskable 512) into public/icons/.
 * Brand mark matches app/icon.tsx — four Classic Pixel Adventure blocks on Paper.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, "..", "public", "icons")
mkdirSync(outDir, { recursive: true })

const PAPER = [255, 253, 247, 255]
const BLOCKS = [
  [89, 188, 235, 255], // sky
  [69, 168, 73, 255], // grass
  [255, 212, 71, 255], // coin
  [233, 75, 60, 255], // brick
]

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
      const px = paint(x, y)
      const i = 1 + x * 4
      row[i] = px[0]
      row[i + 1] = px[1]
      row[i + 2] = px[2]
      row[i + 3] = px[3]
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

/** Four colored blocks centered in a square canvas. */
function paintBrand(size, { padRatio = 0.125, gapRatio = 0.04 } = {}) {
  const pad = Math.round(size * padRatio)
  const gap = Math.max(2, Math.round(size * gapRatio))
  const inner = size - pad * 2
  const cell = Math.floor((inner - gap) / 2)
  return (x, y) => {
    if (x < pad || y < pad || x >= size - pad || y >= size - pad) return PAPER
    const lx = x - pad
    const ly = y - pad
    const col = lx < cell ? 0 : lx >= cell + gap ? 1 : -1
    const row = ly < cell ? 0 : ly >= cell + gap ? 1 : -1
    if (col < 0 || row < 0) return PAPER
    return BLOCKS[row * 2 + col]
  }
}

function writeIcon(name, size, opts) {
  const buf = rgbaPng(size, size, paintBrand(size, opts))
  const path = join(outDir, name)
  writeFileSync(path, buf)
  console.log("wrote", path, buf.length)
}

writeIcon("icon-192.png", 192, { padRatio: 0.14, gapRatio: 0.04 })
writeIcon("icon-512.png", 512, { padRatio: 0.14, gapRatio: 0.04 })
// Maskable: keep mark inside safe zone (~80% center).
writeIcon("icon-maskable-512.png", 512, { padRatio: 0.22, gapRatio: 0.035 })
writeIcon("apple-touch-icon.png", 180, { padRatio: 0.14, gapRatio: 0.04 })
