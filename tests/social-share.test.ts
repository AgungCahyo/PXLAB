import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  creationCanonicalUrl,
  creationQrPath,
  creationSocialExportPath,
  creationSocialPreviewPath,
  isShareExportFormat,
  platformShareUrl,
  withShareUtm,
} from "@/lib/share"

const root = path.join(__dirname, "..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("share URL helpers", () => {
  it("keeps canonical URLs clean (no UTM)", () => {
    const url = creationCanonicalUrl("en", "11111111-1111-1111-1111-111111111111")
    expect(url).toContain("/en/creation/11111111-1111-1111-1111-111111111111")
    expect(url).not.toContain("utm_")
  })

  it("attaches campaign UTMs only via withShareUtm / platform intents", () => {
    const base = creationCanonicalUrl("id", "11111111-1111-1111-1111-111111111111")
    const tracked = withShareUtm(base, "whatsapp")
    expect(tracked).toContain("utm_source=whatsapp")
    expect(tracked).toContain("utm_medium=social")
    expect(tracked).toContain("utm_campaign=creation_share")

    const wa = platformShareUrl("whatsapp", { url: base, title: "Hello" })
    expect(wa).toContain("wa.me")
    expect(decodeURIComponent(wa)).toContain("utm_source=whatsapp")

    const fb = platformShareUrl("facebook", { url: base, title: "Hello" })
    expect(fb).toContain("facebook.com/sharer")
    expect(fb).toContain("utm_source%3Dfacebook")

    const x = platformShareUrl("x", { url: base, title: "Hello" })
    expect(x).toContain("twitter.com/intent/tweet")

    const tg = platformShareUrl("telegram", { url: base, title: "Hello" })
    expect(tg).toContain("t.me/share")
  })

  it("exposes export and QR paths for published share assets", () => {
    expect(creationSocialPreviewPath("abc")).toBe("/api/og/creation/abc")
    expect(creationSocialExportPath("abc", "square")).toContain("format=square")
    expect(creationSocialExportPath("abc", "story", { brand: false, credit: false })).toContain(
      "brand=0",
    )
    expect(creationQrPath("abc", "svg")).toContain("format=svg")
    expect(isShareExportFormat("og")).toBe(true)
    expect(isShareExportFormat("nope")).toBe(false)
  })
})

describe("social sharing architecture", () => {
  it("reuses pageMeta and points creation metadata at the OG preview route", () => {
    const page = read("app/[lang]/(public)/creation/[id]/page.tsx")
    const meta = read("lib/meta.ts")
    expect(page).toMatch(/creationSocialPreviewPath/)
    expect(page).toMatch(/ogType:\s*"article"/)
    expect(page).toMatch(/getPublishedCreation/)
    expect(meta).toMatch(/summary_large_image/)
    expect(meta).toMatch(/openGraph/)
    expect(meta).toMatch(/twitter/)
    expect(meta).toMatch(/imageWidth/)
  })

  it("ships OG, export, and QR routes that gate on published creations", () => {
    expect(existsSync(path.join(root, "app/api/og/creation/[id]/route.tsx"))).toBe(true)
    expect(existsSync(path.join(root, "app/api/share-export/[id]/route.tsx"))).toBe(true)
    expect(existsSync(path.join(root, "app/api/qr/creation/[id]/route.ts"))).toBe(true)

    const og = read("app/api/og/creation/[id]/route.tsx")
    const exp = read("app/api/share-export/[id]/route.tsx")
    const qr = read("app/api/qr/creation/[id]/route.ts")
    expect(og).toMatch(/loadPublishedSharePayload/)
    expect(og).toMatch(/ImageResponse/)
    expect(exp).toMatch(/loadPublishedSharePayload/)
    expect(exp).toMatch(/format/)
    expect(qr).toMatch(/getPublishedCreation/)
    expect(qr).toMatch(/creationCanonicalUrl/)
    expect(qr).toMatch(/format === "svg"/)
  })

  it("provides a share dialog with platforms, QR, and export studio", () => {
    const dialog = read("components/share/CreationShareDialog.tsx")
    const community = read("components/community/CreationCommunity.tsx")
    expect(community).toMatch(/CreationShareDialog/)
    expect(dialog).toMatch(/navigator\.share/)
    expect(dialog).toMatch(/AbortError/)
    expect(dialog).toMatch(/whatsapp/)
    expect(dialog).toMatch(/facebook/)
    expect(dialog).toMatch(/telegram/)
    expect(dialog).toMatch(/shareDiscord/)
    expect(dialog).toMatch(/shareExportStudio/)
    expect(dialog).toMatch(/shareInstagramNote/)
    expect(dialog).toMatch(/creationQrPath/)
  })

  it("does not invent a second cover pipeline — reuses storage via share-server", () => {
    const server = read("lib/share-server.ts")
    expect(server).toMatch(/getPublishedCreation/)
    expect(server).toMatch(/PIXEL_BUCKET/)
    expect(server).toMatch(/pixelObjectPath/)
    expect(server).toMatch(/cover\.png/)
  })
})
