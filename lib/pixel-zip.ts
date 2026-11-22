/**
 * Store-only ZIP writer (no compression). Output is deterministic (fixed timestamp), UTF-8 file
 * names. PNG/JPEG/WebP entries are already compressed, so storing them is what other tools do.
 */
export type ZipEntry = { name: string; data: Uint8Array }

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i += 1) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// 1980-01-01 00:00:00 in DOS format.
const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1

export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const names = entries.map((entry) => encoder.encode(entry.name))
  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.name)) throw new Error("duplicate")
    seen.add(entry.name)
  }
  let total = 22
  entries.forEach((entry, i) => {
    total += 30 + names[i]!.length + entry.data.length + 46 + names[i]!.length
  })
  if (entries.length > 0xffff || total > 0xffffffff) throw new Error("zip64")
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  let pos = 0
  const offsets: number[] = []
  const crcs = entries.map((entry) => crc32(entry.data))

  entries.forEach((entry, i) => {
    offsets.push(pos)
    view.setUint32(pos, 0x04034b50, true)
    view.setUint16(pos + 4, 20, true)
    view.setUint16(pos + 6, 0x0800, true)
    view.setUint16(pos + 8, 0, true)
    view.setUint16(pos + 10, DOS_TIME, true)
    view.setUint16(pos + 12, DOS_DATE, true)
    view.setUint32(pos + 14, crcs[i]!, true)
    view.setUint32(pos + 18, entry.data.length, true)
    view.setUint32(pos + 22, entry.data.length, true)
    view.setUint16(pos + 26, names[i]!.length, true)
    view.setUint16(pos + 28, 0, true)
    out.set(names[i]!, pos + 30)
    out.set(entry.data, pos + 30 + names[i]!.length)
    pos += 30 + names[i]!.length + entry.data.length
  })

  const centralStart = pos
  entries.forEach((entry, i) => {
    view.setUint32(pos, 0x02014b50, true)
    view.setUint16(pos + 4, 20, true)
    view.setUint16(pos + 6, 20, true)
    view.setUint16(pos + 8, 0x0800, true)
    view.setUint16(pos + 10, 0, true)
    view.setUint16(pos + 12, DOS_TIME, true)
    view.setUint16(pos + 14, DOS_DATE, true)
    view.setUint32(pos + 16, crcs[i]!, true)
    view.setUint32(pos + 20, entry.data.length, true)
    view.setUint32(pos + 24, entry.data.length, true)
    view.setUint16(pos + 28, names[i]!.length, true)
    view.setUint16(pos + 30, 0, true)
    view.setUint16(pos + 32, 0, true)
    view.setUint16(pos + 34, 0, true)
    view.setUint16(pos + 36, 0, true)
    view.setUint32(pos + 38, 0, true)
    view.setUint32(pos + 42, offsets[i]!, true)
    out.set(names[i]!, pos + 46)
    pos += 46 + names[i]!.length
  })
  const centralSize = pos - centralStart
  view.setUint32(pos, 0x06054b50, true)
  view.setUint16(pos + 4, 0, true)
  view.setUint16(pos + 6, 0, true)
  view.setUint16(pos + 8, entries.length, true)
  view.setUint16(pos + 10, entries.length, true)
  view.setUint32(pos + 12, centralSize, true)
  view.setUint32(pos + 16, centralStart, true)
  view.setUint16(pos + 20, 0, true)
  return out
}
