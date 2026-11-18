import type { MetadataRoute } from "next"
import { SITE_NAME, SITE_POSITIONING } from "@/lib/site"

/**
 * Web App Manifest — installable PWA for PXLB.
 * Served at /manifest.webmanifest by Next.js App Router.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — Pixel Art Community`,
    short_name: SITE_NAME,
    description: SITE_POSITIONING,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    background_color: "#fffdf7",
    theme_color: "#fffdf7",
    categories: ["entertainment", "lifestyle", "photo"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
