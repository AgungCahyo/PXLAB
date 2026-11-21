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

export function withQuery(path: string, key: string, value: string | null | undefined): string {
  if (!value) return path
  const join = path.includes("?") ? "&" : "?"
  return `${path}${join}${key}=${encodeURIComponent(value)}`
}

export function loginHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/login"), next)
}

export function registerHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/register"), next)
}

export function forgotPasswordHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/forgot-password"), next)
}

export function resetPasswordHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/reset-password"), next)
}

export function verifyEmailHref(
  lang: Lang,
  next?: string | null,
  error?: "expired" | "invalid" | string | null,
) {
  return withQuery(withNextQuery(href(lang, "/verify-email"), next), "error", error)
}

export function welcomeHref(lang: Lang, next?: string | null) {
  return withNextQuery(href(lang, "/welcome"), next)
}

export function authDestination(lang: Lang, next: unknown) {
  const fallback = href(lang, "/explore")
  const safe = safeInternalPath(next, fallback)
  if (safe === "/" || safe === "/en" || safe === "/en/") return fallback
  return safe
}

/** After auth: unfinished onboarding → /welcome; else safe destination. */
export function postAuthPath(
  lang: Lang,
  next: unknown,
  profile: { onboarding_completed_at: string | null } | null | undefined,
) {
  const destination = authDestination(lang, next)
  if (!profile?.onboarding_completed_at) return welcomeHref(lang, destination)
  return destination
}

/**
 * Logged-in visit to `/`: unfinished onboarding → /welcome; else /dashboard.
 * Server-only gate for the landing page (not middleware) so other public routes stay open.
 */
export function homeMemberPath(
  lang: Lang,
  profile: { onboarding_completed_at: string | null } | null | undefined,
) {
  const dashboard = href(lang, "/dashboard")
  if (!profile?.onboarding_completed_at) return welcomeHref(lang, dashboard)
  return dashboard
}
