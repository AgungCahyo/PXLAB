import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("Create and My Works stay separate", () => {
  const createPage = read("app/[lang]/(member)/create/page.tsx")
  const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")
  const nav = read("components/layout/SocialNav.tsx")
  const actions = read("features/creations/actions.ts")

  it("keeps Create as the new-canvas door only", () => {
    expect(createPage).toMatch(/NewArtworkRouteDialog/)
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

  it("keeps the work grid and card actions usable on narrow screens", () => {
    const row = read("components/creations/WorksRow.tsx")
    const skeleton = read("components/creations/PageSkeletons.tsx")
    expect(dashboard).toMatch(/grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4/)
    expect(skeleton).toMatch(/grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4/)
    expect(row).toMatch(/flex flex-wrap items-center gap-1\.5 pt-1/)
    expect(row).toMatch(/min-w-0 flex-1 basis-24/)
    expect(row).toMatch(/min-w-0 truncate/)
    expect(row).toMatch(/<li className="min-w-0">/)
  })

  it("links My Works back to the owner profile with flat chrome", () => {
    expect(dashboard).toMatch(/worksBack/)
    expect(dashboard).toMatch(/\/u\/\$\{profile\.username\}/)
    expect(dashboard).not.toMatch(/BackLink/)
  })

  it("uses the same flat social theme as home and explore", () => {
    const row = read("components/creations/WorksRow.tsx")
    expect(dashboard).toMatch(/socialButtonClass/)
    expect(dashboard).toMatch(/SocialEmptyState/)
    expect(dashboard).toMatch(/SectionHeader/)
    expect(dashboard).toMatch(/text-\[17px\] font-semibold leading-snug text-fg/)
    expect(dashboard).not.toMatch(/<PageHeader/)
    expect(dashboard).not.toMatch(/<EmptyState/)
    expect(dashboard).not.toMatch(/buttonClassName/)
    expect(row).toMatch(/socialButtonClass/)
    expect(row).not.toMatch(/buttonClassName/)
  })

  it("links the owner profile and account menu to My Works", () => {
    expect(profile).toMatch(/\/dashboard/)
    expect(profile).toMatch(/nav\.dashboard/)
    expect(nav).toMatch(/href\(lang, "\/dashboard"\)/)
    expect(nav).toMatch(/t\.works\[lang\]/)
    expect(nav).toMatch(/t\.dashboardHint\[lang\]/)
    expect(nav).toMatch(/MobileMenuSheet/)
    expect(nav).toMatch(/grid-cols-5/)
  })

  it("keeps a minimal public profile header with avatar and works grid", () => {
    expect(profile).toMatch(/w-full min-w-0 max-w-5xl/)
    expect(profile).toMatch(/ProfileAvatar/)
    expect(profile).toMatch(/avatar_url/)
    expect(profile).toMatch(/showAuthor=\{false\}/)
    expect(profile).toMatch(/grid-cols-3 gap-0\.5 sm:gap-1/)
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
