import type { MetadataRoute } from "next"
import { LANGS } from "@/lib/i18n"
import { SITE_URL } from "@/lib/site"

const PUBLIC_PATHS = ["/", "/explore", "/creators", "/space"] as const

/** Public indexable routes (id default rewrite + /en). Member/create omitted. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const path of PUBLIC_PATHS) {
    for (const lang of LANGS) {
      const url =
        lang === "id"
          ? path === "/"
            ? SITE_URL
            : `${SITE_URL}${path}`
          : path === "/"
            ? `${SITE_URL}/en`
            : `${SITE_URL}/en${path}`

      entries.push({
        url,
        lastModified: now,
        changeFrequency: path === "/explore" ? "hourly" : "weekly",
        priority: path === "/" ? 1 : path === "/explore" ? 0.9 : 0.6,
        alternates: {
          languages: {
            id: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
            en: path === "/" ? `${SITE_URL}/en` : `${SITE_URL}/en${path}`,
          },
        },
      })
    }
  }

  return entries
}
