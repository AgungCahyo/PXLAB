import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("creation detail recommendations", () => {
  it("keeps original card design with denser recommendation grids", () => {
    const card = read("components/creations/CreationCard.tsx")
    const similar = read("components/creations/SimilarWorksStrip.tsx")
    const other = read("components/creations/CreatorBlock.tsx")
    const remix = read("components/creations/RemixStrip.tsx")
    const lazy = read("components/creations/SimilarWorksLazy.tsx")

    expect(card).toMatch(/pixel-frame/)
    expect(card).not.toMatch(/compact/)
    expect(similar).toMatch(/WorkTile/)
    expect(similar).toMatch(/SectionHeader/)
    expect(similar).toMatch(/recommendationStripListClass/)
    expect(other).toMatch(/WorkTile/)
    expect(other).toMatch(/overflow-x-auto|recommendationStripListClass/)
    expect(remix).toMatch(/WorkTile/)
    expect(remix).toMatch(/recommendationStripListClass/)
    expect(lazy).toMatch(/IntersectionObserver/)
    expect(lazy).toMatch(/loadSimilarCreationsAction/)
    expect(lazy).toMatch(/sessionCache/)
  })

  it("exposes recommendation loaders as server actions", () => {
    const actions = read("features/creations/recommendation-actions.ts")
    expect(actions).toMatch(/"use server"/)
    expect(actions).toMatch(/loadSimilarCreationsAction/)
    expect(actions).toMatch(/loadCreatorOtherWorksAction/)
  })
})
