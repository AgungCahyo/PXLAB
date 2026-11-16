"use client"

import { useState } from "react"
import { colorUsagePercents, type ColorUsageEntry } from "@/lib/pixel"
import { copy } from "@/lib/copy"
import { type Lang } from "@/lib/i18n"
import { COLOR_USAGE_PREVIEW_MAX } from "@/lib/site"

export function CreationColorPalette({
  lang,
  usage,
}: {
  lang: Lang
  usage: ColorUsageEntry[] | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  if (usage == null) return null

  if (usage.length === 0) {
    return (
      <section className="mt-4" aria-labelledby="color-palette-heading">
        <h2 id="color-palette-heading" className="text-[14px] font-medium text-fg">
          {copy.colorPaletteTitle[lang]}
        </h2>
        <p className="mt-0.5 text-[12px] text-muted">{copy.colorPaletteHint[lang]}</p>
        <p className="mt-2 text-[13px] text-muted">{copy.colorPaletteEmpty[lang]}</p>
      </section>
    )
  }

  const percents = colorUsagePercents(usage)
  const visible = expanded ? usage : usage.slice(0, COLOR_USAGE_PREVIEW_MAX)
  const hasMore = usage.length > COLOR_USAGE_PREVIEW_MAX

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedHex(hex)
      window.setTimeout(() => setCopiedHex((current) => (current === hex ? null : current)), 2000)
    } catch {
      setCopiedHex(null)
    }
  }

  return (
    <section className="mt-4" aria-labelledby="color-palette-heading">
      <h2 id="color-palette-heading" className="text-[14px] font-medium text-fg">
        {copy.colorPaletteTitle[lang]}
      </h2>
      <p className="mt-0.5 text-[12px] text-muted">{copy.colorPaletteHint[lang]}</p>

      <div
        className="mt-2 flex h-3 w-full overflow-hidden border-[3px] border-earth sm:h-3.5"
        role="img"
        aria-label={copy.colorPaletteTitle[lang]}
      >
        {usage.map((entry, index) => {
          const pct = percents[index]
          if (pct <= 0) return null
          return (
            <span
              key={`${entry.hex}-${index}`}
              title={`${entry.hex} · ${pct}%`}
              className="h-full min-w-px"
              style={{ backgroundColor: entry.hex, width: `${pct}%` }}
            />
          )
        })}
      </div>

      <ul className="mt-2 grid gap-1">
        {visible.map((entry, index) => {
          const pct = percents[index] ?? 0
          return (
            <li key={`${entry.hex}-${index}`} className="flex items-center gap-2.5 text-[12px]">
              <span
                className="h-3.5 w-3.5 shrink-0 border-[2px] border-earth"
                style={{ backgroundColor: entry.hex }}
                aria-hidden
              />
              <button
                type="button"
                className="font-mono text-fg underline-offset-2 hover:underline"
                aria-label={copy.colorCopyHex[lang].replace("{hex}", entry.hex)}
                onClick={() => void copyHex(entry.hex)}
              >
                {entry.hex}
              </button>
              <span className="text-muted">{pct}%</span>
              {copiedHex === entry.hex ? (
                <span className="text-muted">{copy.colorHexCopied[lang]}</span>
              ) : null}
            </li>
          )
        })}
      </ul>

      {hasMore ? (
        <button
          type="button"
          className="mt-2 text-[12px] font-medium text-fg underline-offset-2 hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? copy.colorPaletteShowLess[lang] : copy.colorPaletteShowAll[lang]}
        </button>
      ) : null}
    </section>
  )
}
