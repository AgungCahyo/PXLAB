import { href, type Lang } from "@/lib/i18n"
import { SITE_URL } from "@/lib/site"

/** Platforms that open an external share intent (not copy/QR/download). */
export const SHARE_INTENT_PLATFORMS = [
  "whatsapp",
  "facebook",
  "x",
  "threads",
  "telegram",
] as const

export type ShareIntentPlatform = (typeof SHARE_INTENT_PLATFORMS)[number]

export const SHARE_EXPORT_FORMATS = {
  og: { width: 1200, height: 630, id: "og" },
  square: { width: 1080, height: 1080, id: "square" },
  story: { width: 1080, height: 1920, id: "story" },
} as const

export type ShareExportFormat = keyof typeof SHARE_EXPORT_FORMATS

export function isShareExportFormat(value: string): value is ShareExportFormat {
  return value in SHARE_EXPORT_FORMATS
}

/** Clean canonical creation URL — no UTM. Used for OG, QR, and copy. */
export function creationCanonicalUrl(lang: Lang, creationId: string) {
  return new URL(href(lang, `/creation/${creationId}`), SITE_URL).toString()
}

/** Branded social preview (1200×630). Absolute path; pair with SITE_URL for meta. */
export function creationSocialPreviewPath(creationId: string) {
  return `/api/og/creation/${creationId}`
}

export function creationSocialExportPath(
  creationId: string,
  format: ShareExportFormat,
  opts?: { brand?: boolean; credit?: boolean },
) {
  const params = new URLSearchParams({ format })
  if (opts?.brand === false) params.set("brand", "0")
  if (opts?.credit === false) params.set("credit", "0")
  return `/api/share-export/${creationId}?${params.toString()}`
}

export function creationQrPath(creationId: string, format: "png" | "svg" = "png") {
  return `/api/qr/creation/${creationId}?format=${format}`
}

/**
 * Attach campaign UTMs for outbound platform shares only.
 * Canonical / OG / QR stay clean.
 */
export function withShareUtm(url: string, source: ShareIntentPlatform | "discord" | "native") {
  const next = new URL(url)
  next.searchParams.set("utm_source", source)
  next.searchParams.set("utm_medium", "social")
  next.searchParams.set("utm_campaign", "creation_share")
  return next.toString()
}

export function platformShareUrl(
  platform: ShareIntentPlatform,
  args: { url: string; title: string },
) {
  const tracked = withShareUtm(args.url, platform)
  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${args.title}\n${tracked}`)}`
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tracked)}`
    case "x":
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(tracked)}&text=${encodeURIComponent(args.title)}`
    case "threads":
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${args.title}\n${tracked}`)}`
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(tracked)}&text=${encodeURIComponent(args.title)}`
  }
}

export function shareCacheControl(publishedUpdatedAt: string | null | undefined) {
  // Short browser cache; longer CDN; stale-while-revalidate for crawlers.
  // Callers should bust with ?v=updated_at when artwork changes.
  void publishedUpdatedAt
  return "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
}
