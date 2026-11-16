"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { usePixelColorMemory } from "@/lib/pixel-color-memory"
import {
  PIXEL_SWATCHES,
  ensurePaletteColor,
  normalizePixelHex,
  paletteIndexOf,
} from "@/lib/pixel"
import { cn } from "@/lib/utils"

export function ColorPicker({
  lang,
  open,
  onClose,
  value,
  documentPalette,
  onSelect,
}: {
  lang: Lang
  open: boolean
  onClose: () => void
  value: string
  documentPalette: readonly string[]
  onSelect: (hex: string) => void
}) {
  const colorId = useId()
  const hexId = useId()
  const { recent, favorites, remember, toggleFavorite } = usePixelColorMemory()
  const [openTick, setOpenTick] = useState(open)
  const [draft, setDraft] = useState(normalizePixelHex(value) ?? "#20202A")
  const [error, setError] = useState<"hex" | "full" | null>(null)

  if (open !== openTick) {
    setOpenTick(open)
    if (open) {
      setDraft(normalizePixelHex(value) ?? "#20202A")
      setError(null)
    }
  }

  const applyDraft = (raw: string) => {
    const hex = normalizePixelHex(raw)
    if (!hex) {
      setError("hex")
      return
    }
    const result = ensurePaletteColor(documentPalette, hex)
    if ("error" in result && result.error === "palette_full") {
      setError("full")
      return
    }
    if ("error" in result) {
      setError("hex")
      return
    }
    setDraft(hex)
    setError(null)
    remember(hex)
    onSelect(hex)
    onClose()
  }

  const setDraftFromInput = (raw: string) => {
    setDraft(raw.toUpperCase())
    const hex = normalizePixelHex(raw)
    setError(hex ? null : raw.trim() ? "hex" : null)
  }

  const favorited = paletteIndexOf(favorites, draft) >= 0
  const nativeValue = (normalizePixelHex(draft) ?? "#20202A").toLowerCase()

  const swatchRow = (colors: readonly string[], emptyLabel: string, label: string) => (
    <div className="grid gap-1.5">
      <p className="text-[13px] font-medium text-fg">{label}</p>
      {colors.length === 0 ? (
        <p className="text-[13px] text-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
          {colors.map((hex) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={normalizePixelHex(draft) === hex}
              aria-label={`${copy.pixelColor[lang]} ${hex}`}
              onClick={() => applyDraft(hex)}
              className={cn(
                "pixel-swatch h-11 w-11 border-[3px]",
                normalizePixelHex(draft) === hex ? "border-fg" : "border-earth",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.pixelPaletteMore[lang]}
      closeLabel={copy.closeMenu[lang]}
      className="w-[min(calc(100%-2rem),32rem)]"
    >
      <div className="grid gap-4">
        <label htmlFor={colorId} className="grid gap-1.5">
          <span className="text-[14px] font-medium text-fg">{copy.pixelPickColor[lang]}</span>
          <span className="relative block h-24 w-full border-[3px] border-earth">
            <span className="block h-full w-full" style={{ backgroundColor: nativeValue }} />
            <input
              id={colorId}
              type="color"
              value={nativeValue}
              onChange={(event) => {
                const hex = normalizePixelHex(event.target.value)
                if (!hex) return
                setDraft(hex)
                setError(null)
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
        </label>

        <div className="grid gap-1.5">
          <label htmlFor={hexId} className="text-[14px] font-medium text-fg">
            {copy.pixelHex[lang]}
          </label>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Input
                id={hexId}
                value={draft}
                spellCheck={false}
                autoCapitalize="characters"
                autoComplete="off"
                onChange={(event) => setDraftFromInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    applyDraft(draft)
                  }
                }}
                error={
                  error === "hex"
                    ? copy.pixelHexInvalid[lang]
                    : error === "full"
                      ? copy.pixelPaletteFull[lang]
                      : undefined
                }
              />
            </div>
            <button
              type="button"
              aria-label={favorited ? copy.pixelFavoriteRemove[lang] : copy.pixelFavoriteAdd[lang]}
              aria-pressed={favorited}
              onClick={() => {
                const hex = normalizePixelHex(draft)
                if (!hex) {
                  setError("hex")
                  return
                }
                toggleFavorite(hex)
              }}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center border-[3px]",
                favorited ? "border-fg bg-coin text-fg" : "border-earth bg-card text-fg",
              )}
            >
              <PixelIcon name="star" />
            </button>
          </div>
        </div>

        {swatchRow(recent, copy.pixelNoRecent[lang], copy.pixelRecent[lang])}
        {swatchRow(favorites, copy.pixelNoFavorites[lang], copy.pixelFavorites[lang])}
        {swatchRow(PIXEL_SWATCHES, "", copy.pixelShortcuts[lang])}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => applyDraft(draft)}>
            {copy.pixelUseColor[lang]}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
