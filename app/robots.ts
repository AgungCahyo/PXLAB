import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/responses",
          "/activity",
          "/insights",
          "/saved",
          "/liked",
          "/archive",
          "/settings",
          "/profile/edit",
          "/admin",
          "/create",
          "/en/dashboard",
          "/en/responses",
          "/en/activity",
          "/en/insights",
          "/en/saved",
          "/en/liked",
          "/en/archive",
          "/en/settings",
          "/en/profile/edit",
          "/en/admin",
          "/en/create",
          "/id/dashboard",
          "/id/responses",
          "/id/activity",
          "/id/insights",
          "/id/saved",
          "/id/liked",
          "/id/archive",
          "/id/settings",
          "/id/profile/edit",
          "/id/admin",
          "/id/create",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
