import type { Lang } from "@/lib/i18n"

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

/** "3 jam lalu" / "3h ago"-style label. Pure: pass `now` for deterministic tests. */
export function formatRelativeTime(
  value: string | number | Date,
  lang: Lang,
  now: number = Date.now(),
): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.round((then - now) / 1000)
  const abs = Math.abs(seconds)
  const rtf = new Intl.RelativeTimeFormat(lang === "id" ? "id-ID" : "en", {
    numeric: "auto",
    style: "narrow",
  })
  for (const [unit, size] of UNITS) {
    if (abs >= size) return rtf.format(Math.trunc(seconds / size), unit)
  }
  return rtf.format(0, "second")
}
