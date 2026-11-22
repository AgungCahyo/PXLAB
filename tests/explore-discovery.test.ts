import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8")

describe("Explore keeps three distinct discovery sections", () => {
  const page = read("app/[lang]/(public)/explore/page.tsx")
  const creators = read("components/creations/NewCreatorsStrip.tsx")
  const quiet = read("components/creations/QuietRack.tsx")

  it("renders Karya, Kreator baru and Karya yang masih sepi in that order", () => {
    const works = page.indexOf("explore-works-heading")
    const newCreators = page.indexOf("new-creators-heading")
    const quietWorks = page.indexOf("quiet-rack-heading")
    expect(works).toBeGreaterThan(-1)
    expect(newCreators).toBeGreaterThan(works)
    expect(quietWorks).toBeGreaterThan(newCreators)
  })

  it("only shows the creator and quiet sections in the unfiltered discovery view", () => {
    expect(page).toMatch(/const showDiscovery\s*=/)
    expect(page).toMatch(/\{showDiscovery \? \(/)
    expect(page).toMatch(/<NewCreatorsSlot/)
    expect(page).toMatch(/<QuietRackSlot/)
  })

  it("keeps the artwork mosaic and its pagination untouched", () => {
    const infinite = read("components/social/ExploreInfinite.tsx")
    expect(page).toMatch(/<ExploreGallery/)
    expect(page).not.toMatch(/interludes=/)
    expect(infinite).toMatch(/segmentWithBands/)
    expect(infinite).toMatch(/useInfiniteList/)
  })

  it("gives each section its own quiet empty state", () => {
    expect(creators).toMatch(/DiscoveryNote/)
    expect(creators).toMatch(/discoveryCreatorsEmpty\[lang\]/)
    expect(quiet).toMatch(/DiscoveryNote/)
    expect(quiet).toMatch(/discoveryQuietEmpty\[lang\]/)
    expect(page).toMatch(/discoveryWorksTitle\[lang\]/)
  })

  it("only offers See all where the existing navigation supports it", () => {
    expect(creators).toMatch(/newCreatorsSeeAll\[lang\]/)
    expect(creators).toMatch(/\/creators/)
    expect(quiet).not.toMatch(/newCreatorsSeeAll|Lihat semua/)
  })

  it("the old confusing label is gone from the UI", () => {
    expect(quiet).not.toMatch(/quietRackTitle/)
    expect(read("lib/copy-social.ts")).toMatch(/Tulis catatan pertama/)
  })

  it("creator identity is richer on large tiles (name, @username, comments)", () => {
    const tile = read("components/social/WorkTile.tsx")
    expect(tile).toMatch(/size = "default"/)
    expect(tile).toMatch(/displayName/)
    expect(tile).toMatch(/noComments/)
  })

  it("keeps default tiles self-sized so profile and landing grids do not collapse", () => {
    const tile = read("components/social/WorkTile.tsx")
    expect(tile).toMatch(/large \? "h-full" : "aspect-square"/)
    expect(tile).not.toMatch(/"group relative h-full min-w-0/)
  })
})
