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
    expect(createPage).toMatch(/PixelNewForm/)
    expect(createPage).not.toMatch(/listOwnCreations/)
    expect(createPage).toMatch(/\/dashboard/)
  })

  it("turns dashboard into the owner work list", () => {
    const row = read("components/creations/WorksRow.tsx")
    expect(dashboard).toMatch(/listOwnCreations/)
    expect(dashboard).toMatch(/worksDrafts/)
    expect(dashboard).toMatch(/worksPublished/)
    expect(dashboard).toMatch(/WorksRow/)
    expect(row).toMatch(/PixelArt/)
    expect(dashboard).not.toMatch(/dashboardHello/)
  })

  it("links My Works back to the owner profile", () => {
    expect(dashboard).toMatch(/worksBack/)
    expect(dashboard).toMatch(/PixelIcon/)
    expect(dashboard).toMatch(/\/u\/\$\{profile\.username\}/)
  })

  it("links the owner profile and account menu to My Works", () => {
    expect(profile).toMatch(/\/dashboard/)
    expect(profile).toMatch(/nav\.dashboard/)
    expect(nav).toMatch(/\/dashboard/)
    expect(nav).toMatch(/nav\.dashboard/)
  })

  it("keeps a minimal public profile header with avatar and works grid", () => {
    expect(profile).toMatch(/w-full min-w-0 max-w-6xl/)
    expect(profile).toMatch(/ProfileAvatar/)
    expect(profile).toMatch(/avatar_url/)
    expect(profile).toMatch(/showAuthor=\{false\}/)
    expect(profile).toMatch(/grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4/)
    expect(profile).toMatch(/nav\.dashboard/)
    expect(profile).toMatch(/nav\.settings/)
    expect(profile).toMatch(/memberSince/)
    expect(profile).toMatch(/profileWorksCount/)
    expect(profile).not.toMatch(/LogoutButton/)
  })

  it("returns delete to My Works", () => {
    expect(actions).toMatch(/redirect\(href\(lang, "\/dashboard"\)\)/)
  })
})
