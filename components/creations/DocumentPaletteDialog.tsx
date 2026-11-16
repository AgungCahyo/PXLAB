"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_PAPER, normalizePixelHex } from "@/lib/pixel"
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

  if (open !== openTick) {
    setOpenTick(open)
    if (open) {
      setSelected(normalizePixelHex(activeColor) ?? activeColor)
      setReplaceDraft("#20202A")
      setError(null)
    }
  }

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
        <div className="flex flex-wrap gap-1.5" role="listbox" aria-label={copy.pixelPaletteManage[lang]}>
          {swatches.length === 0 ? (
            <p className="text-[13px] text-muted">{copy.pixelPaletteEmpty[lang]}</p>
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
                }}
                className={cn(
                  "pixel-swatch h-11 w-11 border-[3px]",
                  normalizePixelHex(selected) === normalizePixelHex(hex) ? "border-fg" : "border-earth",
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
        {error ? <p className="text-[13px] text-brick">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={!selected || selected === PIXEL_PAPER}
            onClick={() => {
              const to = normalizePixelHex(replaceDraft)
              if (!to) {
                setError(copy.pixelHexInvalid[lang])
                return
              }
              onReplace(selected, to)
              setError(null)
              onClose()
            }}
          >
            {copy.pixelReplaceColor[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selected || selected === PIXEL_PAPER}
            onClick={() => {
              onRemove(selected)
              setError(null)
              onClose()
            }}
          >
            {copy.pixelRemoveColor[lang]}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
