import { href, type Lang } from "@/lib/i18n"

/** Same-origin app path only. Blocks open redirects. */
export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback
  const path = value.trim()
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback
  }
  return path
}

export function withNextQuery(path: string, next: string | null | undefined): string {
  const safe = next ? safeInternalPath(next, "") : ""
  if (!safe) return path
  const join = path.includes("?") ? "&" : "?"
  return `${path}${join}next=${encodeURIComponent(safe)}`
}

export function loginHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/login"), next)
}

export function registerHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/register"), next)
}

export function authDestination(lang: Lang, next: unknown) {
  const fallback = href(lang, "/explore")
  const safe = safeInternalPath(next, fallback)
  if (safe === "/" || safe === "/en" || safe === "/en/") return fallback
  return safe
}
