import type { Lang } from "@/lib/i18n"

function localeOf(lang: Lang) {
  return lang === "id" ? "id-ID" : "en-GB"
}

export function formatMonthYear(iso: string, lang: Lang) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ""
  return new Intl.DateTimeFormat(localeOf(lang), { year: "numeric", month: "long" }).format(ms)
}

export function formatDayMonthYear(iso: string, lang: Lang) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ""
  return new Intl.DateTimeFormat(localeOf(lang), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(ms)
}

export function formatRelativeTime(iso: string, lang: Lang, now = Date.now()) {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ""
  const delta = Math.max(0, now - ms)
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return lang === "id" ? "baru saja" : "just now"
  if (minutes < 60) {
    return lang === "id" ? `${minutes} menit lalu` : `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return lang === "id" ? `${hours} jam lalu` : `${hours} hour${hours === 1 ? "" : "s"} ago`
  }
  const days = Math.floor(hours / 24)
  if (days < 7) {
    return lang === "id" ? `${days} hari lalu` : `${days} day${days === 1 ? "" : "s"} ago`
  }
  return formatDayMonthYear(iso, lang)
}
