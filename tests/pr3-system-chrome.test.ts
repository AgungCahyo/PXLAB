import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("PR-3 system chrome + SEO", () => {
  it("shares FilterChip across Explore and Admin", () => {
    const chip = read("components/ui/FilterChip.tsx")
    const gallery = read("components/creations/ExploreGallery.tsx")
    const admin = read("components/moderation/AdminReports.tsx")
    expect(chip).toMatch(/aria-current/)
    expect(chip).toMatch(/bg-brick/)
    expect(gallery).toMatch(/FilterChip/)
    expect(gallery).not.toMatch(/function FilterLink/)
    expect(admin).toMatch(/FilterChip/)
  })

  it("ships branded not-found, error, robots, and sitemap", () => {
    expect(read("app/[lang]/not-found.tsx")).toMatch(/notFoundTitle/)
    expect(read("app/[lang]/error.tsx")).toMatch(/errorTitle/)
    expect(read("app/not-found.tsx")).toMatch(/notFoundTitle/)
    expect(read("app/robots.ts")).toMatch(/sitemap\.xml/)
    expect(read("app/robots.ts")).toMatch(/disallow:[\s\S]*\/dashboard/)
    expect(read("app/sitemap.ts")).toMatch(/\/explore/)
    expect(read("app/sitemap.ts")).toMatch(/alternates/)
  })

  it("keeps unique public meta descriptions", () => {
    const copyFile = read("lib/copy.ts")
    expect(copyFile).toMatch(/landingMeta:/)
    expect(copyFile).toMatch(/creationMetaBy:/)
    expect(copyFile).not.toMatch(/exploreMeta: \{\s*id: "Galeri pixel art\."/)
    expect(read("app/[lang]/(public)/page.tsx")).toMatch(/landingMeta/)
    expect(read("app/[lang]/(public)/creation/[id]/page.tsx")).toMatch(/creationMetaBy/)
  })
})
