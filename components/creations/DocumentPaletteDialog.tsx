"use client"

import { useEffect, useState } from "react"
import { PixelCat } from "@/components/brand/PixelCat"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_INK, PIXEL_PAPER, normalizePixelHex } from "../../lib/pixel"
import { cn } from "@/lib/utils"

export function DocumentPaletteDialog({
  lang,
  open,
  onClose,
  palette,
  activeColor,
  onSelect,
  onReplace,
  onRemove,
}: {
  lang: Lang
  open: boolean
  onClose: () => void
  palette: readonly string[]
  activeColor: string
  onSelect: (hex: string) => void
  onReplace: (fromHex: string, toHex: string) => void
  onRemove: (hex: string) => void
}) {
  const swatches = palette.filter((hex) => normalizePixelHex(hex) !== PIXEL_PAPER)
  const [selected, setSelected] = useState(activeColor)
  const [replaceDraft, setReplaceDraft] = useState("#20202A")
  const [error, setError] = useState<string | null>(null)
  const [openTick, setOpenTick] = useState(open)
  const [notice, setNotice] = useState<string | null>(null)

  if (open !== openTick) {
    setOpenTick(open)
    if (open) {
      setSelected(normalizePixelHex(activeColor) ?? activeColor)
      setReplaceDraft("#20202A")
      setError(null)
      setNotice(null)
    }
  }

  // Keep selection valid after parent palette mutations (multi-delete).
  useEffect(() => {
    if (!open) return
    const inks = palette.filter((hex) => normalizePixelHex(hex) !== PIXEL_PAPER)
    const selectedNorm = normalizePixelHex(selected)
    if (inks.some((hex) => normalizePixelHex(hex) === selectedNorm)) return
    const activeNorm = normalizePixelHex(activeColor)
    if (activeNorm && inks.some((hex) => normalizePixelHex(hex) === activeNorm)) {
      setSelected(activeNorm)
      return
    }
    setSelected(normalizePixelHex(inks[0] ?? "") ?? PIXEL_INK)
  }, [open, palette, activeColor, selected])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.pixelPaletteManage[lang]}
      closeLabel={copy.closeMenu[lang]}
      className="w-[min(calc(100%-2rem),32rem)]"
    >
      <div className="grid gap-4">
        <p className="text-[14px] text-muted">{copy.pixelPaletteManageHint[lang]}</p>
        <div
          className="grid max-h-[min(40vh,16rem)] grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain sm:grid-cols-8"
          role="listbox"
          aria-label={copy.pixelPaletteManage[lang]}
        >
          {swatches.length === 0 ? (
            <div className="col-span-full flex items-center gap-3 rounded-2xl border border-line bg-soft/70 p-3">
              <PixelCat variant="palette" size="sm" />
              <p className="text-[13px] text-muted">{copy.pixelPaletteEmpty[lang]}</p>
            </div>
          ) : (
            swatches.map((hex) => (
              <button
                key={hex}
                type="button"
                role="option"
                aria-selected={normalizePixelHex(selected) === normalizePixelHex(hex)}
                aria-label={hex}
                onClick={() => {
                  setSelected(hex)
                  onSelect(hex)
                  setError(null)
                  setNotice(null)
                }}
                className={cn(
                  "pixel-swatch aspect-square w-full min-h-10 rounded-xl border-2 transition-transform hover:scale-105",
                  normalizePixelHex(selected) === normalizePixelHex(hex)
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-line",
                )}
                style={{ backgroundColor: hex }}
              />
            ))
          )}
        </div>

        <label className="grid gap-1.5">
          <span className="text-[14px] font-medium text-fg">{copy.pixelReplaceWith[lang]}</span>
          <Input
            value={replaceDraft}
            spellCheck={false}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(event) => setReplaceDraft(event.target.value.toUpperCase())}
          />
        </label>
        {error ? (
          <p className="text-[13px] text-brick" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="text-[13px] text-muted" role="status">
            {notice}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={!selected || selected === PIXEL_PAPER || swatches.length === 0}
            onClick={() => {
              const to = normalizePixelHex(replaceDraft)
              if (!to) {
                setError(copy.pixelHexInvalid[lang])
                return
              }
              onReplace(selected, to)
              setSelected(to)
              setError(null)
              setNotice(copy.pixelReplaceColor[lang])
              // Stay open for further edits.
            }}
          >
            {copy.pixelReplaceColor[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selected || selected === PIXEL_PAPER || swatches.length === 0}
            onClick={() => {
              const removing = selected
              onRemove(removing)
              setError(null)
              setNotice(copy.pixelRemoveColor[lang])
              // Stay open — selection syncs from updated palette prop.
            }}
          >
            {copy.pixelRemoveColor[lang]}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.closeMenu[lang]}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
