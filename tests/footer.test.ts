import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("app footer", () => {
  const footer = read("components/layout/SiteFooter.tsx")
  const css = read("app/globals.css")

  it("is a copyright line, not a second navigation or brand pitch", () => {
    expect(footer).toMatch(/SITE_NAME/)
    expect(footer).not.toMatch(/NAV_ITEMS/)
    expect(footer).not.toMatch(/tagline/)
    expect(footer).not.toMatch(/footerView/)
    expect(footer).not.toMatch(/OWNER_NAME/)
    expect(footer).not.toMatch(/GroundStrip/)
  })

  it("stays off the studio", () => {
    expect(css).toMatch(/data-chrome="studio"/)
    expect(css).toMatch(/data-chrome="playground"/)
    expect(read("app/[lang]/(member)/create/page.tsx")).not.toMatch(/data-chrome=/)
    expect(read("app/[lang]/(member)/create/[id]/page.tsx")).toMatch(/data-chrome="studio"/)
    expect(read("components/creations/PlaygroundForm.tsx")).toMatch(/data-chrome="playground"/)
  })
})
