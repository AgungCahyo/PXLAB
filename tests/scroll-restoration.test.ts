import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8")

function sourceFiles(dir: string): string[] {
  const absolute = path.resolve(root, dir)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

describe("scroll restoration", () => {
  it("limits the Explore resume marker to opted-in links", () => {
    const explore = read("components/social/ExploreInfinite.tsx")
    expect(explore).toMatch(/preserveScroll/)
    expect(explore).toMatch(/closest\("a\[data-explore-resume\]"\)/)
    expect(explore).not.toMatch(/closest\("a\[href\]"\)/)
  })

  it("restores with an explicit non-smooth scroll", () => {
    const explore = read("components/social/ExploreInfinite.tsx")
    expect(explore).toMatch(/behavior: "instant"/)
    expect(explore).not.toMatch(/window\.scrollTo\(0, saved\.y\)/)
  })

  it("opts all WorkTile links into the Explore policy only when requested", () => {
    const tile = read("components/social/WorkTile.tsx")
    expect(tile).toMatch(/preserveScroll = false/)
    expect(tile).toMatch(/scroll: false, "data-explore-resume": "true"/)
    expect((tile.match(/\{\.\.\.restoreScrollProps\}/g) ?? []).length).toBe(3)
  })

  it("opts interlude links into the same policy", () => {
    const creators = read("components/creations/NewCreatorsStrip.tsx")
    expect(creators).toMatch(/preserveScroll = false/)
    expect(creators).toMatch(/scroll: false, "data-explore-resume": "true"/)
    expect((creators.match(/\{\.\.\.restoreScrollProps\}/g) ?? []).length).toBe(1)
    const card = read("components/creations/CreatorCard.tsx")
    expect((card.match(/\{\.\.\.restoreScrollProps\}/g) ?? []).length).toBe(3)

    const quiet = read("components/creations/QuietRack.tsx")
    expect(quiet).toMatch(/preserveScroll = false/)
    expect(quiet).toMatch(/preserveScroll=\{preserveScroll\}/)

    const page = read("app/[lang]/(public)/explore/page.tsx")
    expect(page).toMatch(/<QuietRack[^>]*preserveScroll/)
    expect(page).toMatch(/<NewCreatorsStrip[^>]*preserveScroll/)
  })

  it("does not add a generic scroll keeper or change Home/Profile", () => {
    for (const file of ["app", "components", "features", "lib"].flatMap(sourceFiles)) {
      expect(read(file), file).not.toMatch(/history\.scrollRestoration/)
    }
    expect(read("components/social/HomeFeed.tsx")).not.toMatch(
      /preserveScroll|data-explore-resume/,
    )
    expect(read("app/[lang]/(public)/u/[username]/page.tsx")).not.toMatch(
      /preserveScroll|data-explore-resume/,
    )
  })
})
