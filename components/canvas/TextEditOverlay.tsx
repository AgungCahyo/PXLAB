"use client"

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react"
import type { PixelTextObject } from "../../lib/pixel-text/model"

/**
 * DOM editing surface for one text object. It is a native <textarea>, so caret, selection,
 * keyboard navigation, clipboard, IME composition and native undo all come from the browser.
 *
 * The glyphs are drawn by the canvas renderer, not by the textarea (its text is transparent),
 * which is what keeps the editing view and the rendered/exported result identical. To keep the
 * native caret on the right glyph, the textarea uses a monospace face whose advance is calibrated
 * to the pixel font's advance at the current zoom, and the same line pitch as the layout engine.
 */

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace'

let advanceRatio: number | null = null

/** Advance of one monospace glyph as a fraction of the font size (platform dependent). */
function monoAdvanceRatio() {
  if (advanceRatio) return advanceRatio
  const probe = document.createElement("span")
  probe.textContent = "M".repeat(20)
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:100px ${MONO};letter-spacing:0`
  document.body.appendChild(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  advanceRatio = width > 0 ? width / 20 / 100 : 0.6
  return advanceRatio
}

export type TextEditOverlayHandle = {
  sync: (
    camera: { originX: number; originY: number; scale: number },
    metrics: {
      object: PixelTextObject
      glyphAdvance: number
      lineAdvance: number
      firstLineY: number
      contentHeight: number
    },
  ) => void
}

type Props = {
  initialText: string
  label: string
  onInput: (value: string) => void
  onExit: () => void
}

export const TextEditOverlay = forwardRef<TextEditOverlayHandle, Props>(function TextEditOverlay(
  { initialText, label, onInput, onExit },
  ref,
) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const areaRef = useRef<HTMLTextAreaElement | null>(null)

  useImperativeHandle(ref, () => ({
    sync(camera, m) {
      const frame = frameRef.current
      const area = areaRef.current
      if (!frame || !area) return
      const o = m.object
      const s = camera.scale
      frame.style.transform = `translate(${camera.originX + o.x * s}px, ${camera.originY + o.y * s}px) rotate(${o.rotation}deg)`
      frame.style.width = `${Math.max(1, o.width * s)}px`
      frame.style.height = `${Math.max(1, o.height * s)}px`
      const height = Math.max(m.lineAdvance, m.contentHeight + m.lineAdvance)
      area.style.top = `${m.firstLineY * s}px`
      area.style.height = `${height * s}px`
      area.style.fontSize = `${(m.glyphAdvance * s) / monoAdvanceRatio()}px`
      area.style.lineHeight = `${m.lineAdvance * s}px`
      area.style.textAlign = o.align
      area.style.caretColor = o.color
    },
  }))

  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return
    area.focus()
    area.setSelectionRange(area.value.length, area.value.length)
  }, [])

  return (
    <div
      ref={frameRef}
      className="pointer-events-none absolute left-0 top-0 z-10 box-border"
      style={{ transformOrigin: "50% 50%" }}
    >
      <textarea
        ref={areaRef}
        aria-label={label}
        defaultValue={initialText}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        wrap="soft"
        className="pixel-text-input pointer-events-auto absolute left-0 w-full resize-none border-0 bg-transparent p-0 text-transparent outline-none"
        style={{
          margin: 0,
          fontFamily: MONO,
          letterSpacing: 0,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          wordBreak: "normal",
          overflow: "hidden",
          tabSize: 2,
        }}
        onInput={(event) => onInput(event.currentTarget.value)}
        onBlur={onExit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            onExit()
          }
        }}
      />
    </div>
  )
})
