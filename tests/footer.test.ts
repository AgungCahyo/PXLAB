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

  it("stays behind the overlay, not hidden by a playground body selector", () => {
    // Text/idea studio remains inside the shell, so its footer can be hidden
    // by route. Playground must never use a body selector: it can linger during
    // a view transition and hide the destination chrome too.
    expect(css).toMatch(/body:has\(\[data-chrome="studio"\]\) footer/)
    expect(css).not.toMatch(/body:has\(\[data-chrome="playground"\]\) footer/)
    expect(read("app/[lang]/(member)/create/page.tsx")).not.toMatch(/data-chrome=/)
    expect(read("app/[lang]/(member)/create/[id]/page.tsx")).toMatch(/data-chrome="studio"/)
    const playground = read("components/creations/PlaygroundForm.tsx")
    expect(playground).toMatch(/data-chrome="playground"/)
    expect(playground).toMatch(/fixed inset-0 z-\[60\]/)
  })
})
