"use client"

import { useState, type ReactNode } from "react"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_PAPER } from "@/lib/pixel"
import { listPixelFonts, resolvePixelFont } from "../../lib/pixel-text/fonts"
import {
  PIXEL_TEXT_LETTER_SPACING_MAX,
  PIXEL_TEXT_LETTER_SPACING_MIN,
  PIXEL_TEXT_LINE_HEIGHT_MAX,
  PIXEL_TEXT_LINE_HEIGHT_MIN,
  type PixelTextAlign,
  type PixelTextObject,
  type PixelTextVAlign,
} from "@/lib/pixel-text/model"
import { cn } from "@/lib/utils"

type Props = {
  lang: Lang
  text: PixelTextObject
  palette: readonly string[]
  /** One history step per call; `coalesceKey` merges a burst from one control into a single step. */
  onChange: (patch: Partial<PixelTextObject>, coalesceKey?: string) => void
}

const field =
  "h-8 w-full min-w-0 rounded-md border border-white/10 bg-[#231f35] px-1.5 text-[12px] tabular-nums text-[#e8e3f8]"
const toggle = (on: boolean) =>
  cn(
    "studio-hit-sm inline-flex flex-1 items-center justify-center rounded-md border text-[12px] transition-colors",
    on
      ? "s-btn-pressed border-transparent"
      : "s-btn border-transparent",
  )

/** Number input that commits on blur/Enter so typing "12" does not apply "1" first. */
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  // Follow external changes (undo, canvas drag) without an effect: reset when the prop moves.
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(String(value))
  }
  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) return setDraft(String(value))
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
    if (clamped !== value) onCommit(clamped)
    setDraft(String(clamped))
  }
  return (
    <label className="grid min-w-0 gap-0.5 text-[11px] text-[#e8e3f8]/55">
      {label}
      <input
        type="number"
        inputMode="decimal"
        className={field}
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
      />
    </label>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2 border-0 p-0">
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#e8e3f8]/55">{title}</legend>
      {children}
    </fieldset>
  )
}

export function TextInspector({ lang, text, palette, onChange }: Props) {
  const face = resolvePixelFont(text.fontFamily)
  const aligns: [PixelTextAlign, string, string][] = [
    ["left", copy.pixelTextAlignLeft[lang], "L"],
    ["center", copy.pixelTextAlignCenter[lang], "C"],
    ["right", copy.pixelTextAlignRight[lang], "R"],
    ["justify", copy.pixelTextAlignJustify[lang], "J"],
  ]
  const valigns: [PixelTextVAlign, string][] = [
    ["top", copy.pixelTextTop[lang]],
    ["middle", copy.pixelTextMiddle[lang]],
    ["bottom", copy.pixelTextBottom[lang]],
  ]
  const scale = Math.max(1, Math.round(text.fontSize / face.nativeSize))
  return (
    <div className="grid gap-4" aria-label={copy.pixelTypography[lang]}>
      <Group title={copy.pixelTextCharacter[lang]}>
        <label className="grid gap-0.5 text-[11px] text-muted">
          {copy.pixelTextFont[lang]}
          <select
            className={field}
            value={text.fontFamily}
            onChange={(event) => onChange({ fontFamily: event.target.value })}
          >
            {listPixelFonts().map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={`${copy.pixelTextSize[lang]} (×${scale})`}
            value={text.fontSize}
            min={face.nativeSize}
            max={256}
            step={face.nativeSize}
            onCommit={(value) => onChange({ fontSize: value })}
          />
          <div className="grid gap-0.5 text-[11px] text-muted">
            <span>&nbsp;</span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-pressed={text.fontWeight === "bold"}
                aria-label={copy.pixelTextBold[lang]}
                title={copy.pixelTextBold[lang]}
                className={cn(toggle(text.fontWeight === "bold"), "font-bold")}
                onClick={() => onChange({ fontWeight: text.fontWeight === "bold" ? "normal" : "bold" })}
              >
                B
              </button>
              <button
                type="button"
                aria-pressed={text.fontStyle === "italic"}
                aria-label={copy.pixelTextItalic[lang]}
                title={copy.pixelTextItalic[lang]}
                className={cn(toggle(text.fontStyle === "italic"), "italic")}
                onClick={() => onChange({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })}
              >
                I
              </button>
            </div>
          </div>
          <NumberField
            label={copy.pixelTextLetterSpacing[lang]}
            value={text.letterSpacing}
            min={PIXEL_TEXT_LETTER_SPACING_MIN}
            max={PIXEL_TEXT_LETTER_SPACING_MAX}
            onCommit={(value) => onChange({ letterSpacing: value }, "letterSpacing")}
          />
          <NumberField
            label={copy.pixelTextLineHeight[lang]}
            value={text.lineHeight}
            min={PIXEL_TEXT_LINE_HEIGHT_MIN}
            max={PIXEL_TEXT_LINE_HEIGHT_MAX}
            step={0.05}
            onCommit={(value) => onChange({ lineHeight: value }, "lineHeight")}
          />
        </div>
        <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label={copy.pixelColor[lang]}>
          {palette
            .filter((swatch) => swatch !== PIXEL_PAPER)
            .map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={text.color === swatch}
                aria-label={`${copy.pixelColor[lang]} ${swatch}`}
                title={swatch}
                onClick={() => onChange({ color: swatch })}
                className={cn(
                  "pixel-swatch !h-auto !min-h-0 !w-full !min-w-0 aspect-square rounded border",
                  text.color === swatch ? "border-white ring-2 ring-[#8b5cf6]" : "border-white/15",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
        </div>
      </Group>

      <Group title={copy.pixelTextParagraph[lang]}>
        <div className="flex gap-1" role="group">
          {aligns.map(([value, label, glyph]) => (
            <button
              key={value}
              type="button"
              aria-pressed={text.align === value}
              aria-label={label}
              title={label}
              className={toggle(text.align === value)}
              onClick={() => onChange({ align: value })}
            >
              {glyph}
            </button>
          ))}
        </div>
      </Group>

      <Group title={copy.pixelTextBox[lang]}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={text.x} onCommit={(value) => onChange({ x: value }, "x")} />
          <NumberField label="Y" value={text.y} onCommit={(value) => onChange({ y: value }, "y")} />
          <NumberField
            label={copy.pixelTextWidth[lang]}
            value={text.width}
            min={1}
            onCommit={(value) => onChange({ width: value }, "width")}
          />
          <NumberField
            label={copy.pixelTextHeight[lang]}
            value={text.height}
            min={1}
            onCommit={(value) => onChange({ height: value }, "height")}
          />
          <NumberField
            label={`${copy.pixelTextRotation[lang]} °`}
            value={text.rotation}
            min={0}
            max={359.99}
            onCommit={(value) => onChange({ rotation: value }, "rotation")}
          />
          <label className="grid gap-0.5 text-[11px] text-muted">
            {copy.pixelTextOverflow[lang]}
            <select
              className={field}
              value={text.overflow}
              onChange={(event) => onChange({ overflow: event.target.value as PixelTextObject["overflow"] })}
            >
              <option value="visible">{copy.pixelTextOverflowVisible[lang]}</option>
              <option value="clip">{copy.pixelTextOverflowClip[lang]}</option>
            </select>
          </label>
        </div>
        <div className="grid gap-0.5 text-[11px] text-muted">
          {copy.pixelTextValign[lang]}
          <div className="flex gap-1" role="group">
            {valigns.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={text.verticalAlign === value}
                className={toggle(text.verticalAlign === value)}
                onClick={() => onChange({ verticalAlign: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Group>
    </div>
  )
}
