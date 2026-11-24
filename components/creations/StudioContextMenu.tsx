"use client"

import { useEffect, useRef } from "react"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"

export type StudioContextMenuItem =
  | {
      id: string
      label: string
      disabled?: boolean
      danger?: boolean
      onSelect: () => void
    }
  | {
      id: string
      type: "separator"
    }

export function StudioContextMenu({
  lang,
  open,
  x,
  y,
  items,
  onClose,
}: {
  lang: Lang
  open: boolean
  x: number
  y: number
  items: StudioContextMenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer, true)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const pad = 8
    let left = x
    let top = y
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad
    if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad
    if (left < pad) left = pad
    if (top < pad) top = pad
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [open, x, y, items])

  useEffect(() => {
    if (!open || !ref.current) return
    ref.current.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
  }, [open, items])

  if (!open) return null

  return (
    <div
      ref={ref}
      role="group"
      aria-label={copy.pixelCanvasMenu[lang]}
      className="fixed z-[80] min-w-[12.5rem] rounded-xl border border-white/10 bg-[#1a1829] py-1.5 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      {items.map((item) =>
        "type" in item && item.type === "separator" ? (
          <div
            key={item.id}
            role="separator"
            className="my-1 h-px bg-white/10"
            aria-hidden="true"
          />
        ) : "label" in item ? (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              item.onSelect()
              onClose()
            }}
            className={
              item.danger
                ? "flex w-full px-3.5 py-2 text-left text-[13px] font-medium text-rose-400 transition-colors hover:bg-rose-500/15 focus-visible:bg-rose-500/15 disabled:opacity-35"
                : "flex w-full px-3.5 py-2 text-left text-[13px] font-medium text-[#e8e3f8] transition-colors hover:bg-white/10 focus-visible:bg-white/10 disabled:opacity-35"
            }
          >
            {item.label}
          </button>
        ) : null,
      )}
    </div>
  )
}
