import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("platform navigation", () => {
  const nav = read("components/layout/SiteNav.tsx")
  const auth = read("features/auth/actions.ts")

  it("keeps Explore, Create, and Profile in a mobile tab bar", () => {
    expect(nav).toMatch(/app-tabbar/)
    expect(nav).toMatch(/\/explore/)
    expect(nav).toMatch(/\/create/)
    expect(nav).toMatch(/nav\.profile/)
    expect(nav).not.toMatch(/openMenu/)
  })

  it("sends a signed-in member to Explore by default, or to a safe next", () => {
    expect(auth).not.toMatch(/\/dashboard/)
    expect(auth).toMatch(/authDestination/)
    expect(read("lib/paths.ts")).toMatch(/\/explore/)
  })
})

describe("visual-first gallery", () => {
  const card = read("components/creations/CreationCard.tsx")
  const landing = read("app/[lang]/(public)/page.tsx")

  it("lets the picture lead the card", () => {
    expect(card).toMatch(/PixelArt/)
    expect(card).not.toMatch(/pixel-title/)
    expect(card).not.toMatch(/creationTypeLabels/)
    expect(card).toMatch(/creationCategoryLabels/)
  })

  it("shows published work on the landing page", () => {
    expect(landing).toMatch(/listPublishedCreations/)
    expect(landing).toMatch(/CreationCard|WorkTile/)
  })
})
