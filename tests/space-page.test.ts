import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { pixelCanvasPrototypeEnabled } from "@/lib/flags"

describe("Common Space page after B5", () => {
  const page = readFileSync(
    path.resolve(__dirname, "../app/[lang]/(public)/space/page.tsx"),
    "utf8",
  )

  it("does not present the PixelBoard prototype as the product", () => {
    expect(page).not.toMatch(/PixelBoard/)
    expect(page).not.toMatch(/pixelCanvasPrototypeEnabled/)
  })

  it("keeps the archived SVG board in place", () => {
    expect(page).toMatch(/SpaceBoard/)
    expect(page).toMatch(/listActiveSpaceElements/)
    expect(page).toMatch(/spaceLegacyNote/)
  })

  it("points visitors to Explore and Create", () => {
    expect(page).toMatch(/\/explore/)
    expect(page).toMatch(/\/create/)
  })
})

describe("retired prototype flag", () => {
  it("stays a boolean helper and no longer decides /space", () => {
    expect(typeof pixelCanvasPrototypeEnabled()).toBe("boolean")
  })
})
