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
          "/settings",
          "/admin",
          "/create",
          "/en/dashboard",
          "/en/responses",
          "/en/settings",
          "/en/admin",
          "/en/create",
          "/id/dashboard",
          "/id/responses",
          "/id/settings",
          "/id/admin",
          "/id/create",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
