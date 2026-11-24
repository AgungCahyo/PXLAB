import { resolveFontScale, resolvePixelFont, type PixelFontFace } from "./fonts"
import type { PixelTextObject } from "./model"

/**
 * Text Layout Engine. Pure and DOM-free: the editing overlay, the canvas rasteriser and the
 * Inspector all read the same `TextLayout`, which is what keeps them consistent.
 *
 * Wrapping follows the CSS rules the editing textarea uses (`white-space: pre-wrap`,
 * `overflow-wrap: anywhere`): break opportunities after spaces and hyphens, trailing spaces
 * hang past the edge instead of wrapping, and an over-long word breaks at the edge.
 */

export type LayoutLine = {
  /** Source text of the line (without the newline). */
  text: string
  /** Offset of the first character in the source string. */
  start: number
  /** Glyph x offsets in box pixels, already including alignment. */
  glyphs: { char: string; x: number }[]
  /** Ink width in box pixels (trailing spaces excluded). */
  width: number
  /** Top of the line in box pixels, already including vertical alignment. */
  y: number
}

export type TextLayout = {
  scale: number
  /** Pixel height of one line box. */
  lineAdvance: number
  /** Glyph cell height in box pixels. */
  glyphHeight: number
  lines: LayoutLine[]
  /** Size of the text block. */
  contentWidth: number
  contentHeight: number
  overflowX: boolean
  overflowY: boolean
}

export type LayoutInput = Pick<
  PixelTextObject,
  | "text" | "width" | "height" | "fontFamily" | "fontSize" | "fontWeight" | "fontStyle"
  | "align" | "verticalAlign" | "lineHeight" | "letterSpacing"
>

export function lineAdvancePx(face: PixelFontFace, scale: number, lineHeight: number) {
  return Math.max(1, Math.round(face.nativeSize * lineHeight) * scale)
}

function charAdvance(face: PixelFontFace, char: string, scale: number, spacing: number, bold: boolean) {
  return (face.advance(char) + spacing + (bold ? 1 : 0)) * scale
}

type Token = { text: string; start: number; breakAfter: boolean }

/** Split a paragraph into unbreakable runs ending at a break opportunity (space or hyphen). */
function tokenize(paragraph: string, offset: number): Token[] {
  const tokens: Token[] = []
  let from = 0
  for (let i = 0; i < paragraph.length; i += 1) {
    const ch = paragraph[i]!
    if (ch === " " || ch === "-") {
      let end = i + 1
      if (ch === " ") while (end < paragraph.length && paragraph[end] === " ") end += 1
      tokens.push({ text: paragraph.slice(from, end), start: offset + from, breakAfter: true })
      from = end
      i = end - 1
    }
  }
  if (from < paragraph.length) tokens.push({ text: paragraph.slice(from), start: offset + from, breakAfter: false })
  return tokens
}

function wrapParagraph(
  paragraph: string,
  offset: number,
  maxWidth: number,
  measure: (ch: string) => number,
): { text: string; start: number }[] {
  if (paragraph.length === 0) return [{ text: "", start: offset }]
  const out: { text: string; start: number }[] = []
  let line = ""
  let lineStart = offset
  let lineInk = 0
  const flush = (nextStart: number) => {
    out.push({ text: line, start: lineStart })
    line = ""
    lineStart = nextStart
    lineInk = 0
  }
  for (const token of tokenize(paragraph, offset)) {
    // Ink width excludes the token's trailing spaces: they hang past the edge like CSS pre-wrap.
    const trimmed = token.text.replace(/ +$/, "")
    let tokenInk = 0
    for (const ch of trimmed) tokenInk += measure(ch)
    let tokenFull = tokenInk
    for (const ch of token.text.slice(trimmed.length)) tokenFull += measure(ch)
    if (line && lineInk + tokenInk > maxWidth) flush(token.start)
    if (tokenInk > maxWidth) {
      // Over-long word: break at the edge, always keeping at least one glyph per line.
      for (const ch of token.text) {
        const w = measure(ch)
        if (line && lineInk + w > maxWidth) flush(lineStart + line.length)
        line += ch
        lineInk += w
      }
      continue
    }
    line += token.text
    lineInk += tokenFull
  }
  out.push({ text: line, start: lineStart })
  return out
}

const cache = new Map<string, TextLayout>()
const CACHE_LIMIT = 256

export function clearTextLayoutCache() {
  cache.clear()
}

function cacheKey(i: LayoutInput) {
  return [
    i.text, i.width, i.height, i.fontFamily, i.fontSize, i.fontWeight, i.fontStyle,
    i.align, i.verticalAlign, i.lineHeight, i.letterSpacing,
  ].join("\u0001")
}

/**
 * Lay out `input` inside its box. Results are cached by the inputs that affect layout, so
 * re-rendering while only position, colour or rotation changes costs nothing.
 */
export function layoutText(input: LayoutInput): TextLayout {
  const key = cacheKey(input)
  const hit = cache.get(key)
  if (hit) {
    // Refresh recency.
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }
  const layout = computeLayout(input)
  cache.set(key, layout)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
  return layout
}

function computeLayout(input: LayoutInput): TextLayout {
  const face = resolvePixelFont(input.fontFamily)
  const scale = resolveFontScale(face, input.fontSize)
  const bold = input.fontWeight === "bold"
  const spacing = input.letterSpacing
  const measure = (ch: string) => charAdvance(face, ch, scale, spacing, bold)
  const advance = lineAdvancePx(face, scale, input.lineHeight)
  const glyphHeight = face.nativeSize * scale
  const maxWidth = Math.max(1, input.width)

  const raw: { text: string; start: number }[] = []
  let offset = 0
  for (const paragraph of input.text.split("\n")) {
    raw.push(...wrapParagraph(paragraph, offset, maxWidth, measure))
    offset += paragraph.length + 1
  }

  const lastIndex = raw.length - 1
  let contentWidth = 0
  const lines: LayoutLine[] = raw.map((entry, index) => {
    const body = entry.text.replace(/ +$/, "")
    let ink = 0
    for (const ch of body) ink += measure(ch)
    // Trailing letter-spacing after the last glyph is not ink; bold's extra column is.
    const inkWidth = Math.max(0, ink - (body ? spacing * scale : 0))

    let x = 0
    let gap = 0
    const free = maxWidth - inkWidth
    if (input.align === "center") x = Math.floor(free / 2)
    else if (input.align === "right") x = free
    else if (input.align === "justify") {
      // Justify soft-wrapped lines only; the last line of every paragraph stays ragged.
      const endsParagraph = index === lastIndex || input.text[raw[index + 1]!.start - 1] === "\n"
      const spaces = body.split(" ").length - 1
      if (!endsParagraph && spaces > 0 && free > 0) gap = free / spaces
    }
    const glyphs: LayoutLine["glyphs"] = []
    let cursor = x
    for (const ch of entry.text) {
      glyphs.push({ char: ch, x: Math.round(cursor) })
      cursor += measure(ch)
      // Spaces inside the ink run absorb the justification gap; hanging spaces do not.
      if (gap && ch === " " && glyphs.length <= body.length) cursor += gap
    }
    const width = gap ? maxWidth : inkWidth
    contentWidth = Math.max(contentWidth, width)
    return { text: entry.text, start: entry.start, glyphs, width, y: index * advance }
  })

  const contentHeight = Math.max(glyphHeight, (lines.length - 1) * advance + glyphHeight)
  const freeY = input.height - contentHeight
  const offsetY = input.verticalAlign === "middle" ? Math.floor(freeY / 2) : input.verticalAlign === "bottom" ? freeY : 0
  for (const line of lines) line.y += offsetY

  return {
    scale,
    lineAdvance: advance,
    glyphHeight,
    lines,
    contentWidth,
    contentHeight,
    overflowX: contentWidth > input.width,
    overflowY: contentHeight > input.height,
  }
}
