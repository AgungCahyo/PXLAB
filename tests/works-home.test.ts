import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("Create and My Works stay separate", () => {
  const createPage = read("app/[lang]/(member)/create/page.tsx")
  const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")
  const nav = read("components/layout/SiteNav.tsx")
  const actions = read("features/creations/actions.ts")

  it("keeps Create as the new-canvas door only", () => {
    expect(createPage).toMatch(/StudioNewForm/)
    expect(createPage).not.toMatch(/listOwnCreations/)
    expect(createPage).toMatch(/\/dashboard/)
  })

  it("turns dashboard into the owner work list", () => {
    expect(dashboard).toMatch(/listOwnCreations/)
    expect(dashboard).toMatch(/worksDrafts/)
    expect(dashboard).toMatch(/worksPublished/)
    expect(dashboard).toMatch(/PixelArt/)
    expect(dashboard).not.toMatch(/dashboardHello/)
  })

  it("links the owner profile and account menu to My Works", () => {
    expect(profile).toMatch(/\/dashboard/)
    expect(profile).toMatch(/nav\.dashboard/)
    expect(nav).toMatch(/\/dashboard/)
    expect(nav).toMatch(/nav\.dashboard/)
  })

  it("returns delete to My Works", () => {
    expect(actions).toMatch(/redirect\(href\(lang, "\/dashboard"\)\)/)
  })
})
