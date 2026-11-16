import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("M4 explore card hierarchy", () => {
  const card = read("components/creations/CreationCard.tsx")
  const gallery = read("components/creations/ExploreGallery.tsx")
  const explorePage = read("app/[lang]/(public)/explore/page.tsx")

  it("keeps artwork first with a single frame and no size label", () => {
    expect(card).toMatch(/PixelArt/)
    expect(card).toMatch(/framed=\{false\}/)
    expect(card).toMatch(/pixel-frame/)
    expect(card).not.toMatch(/creationCategoryLabels/)
    expect(card).not.toMatch(/appreciate|reaction/i)
    expect(card).not.toMatch(/masonry/)
  })

  it("stacks title, username, optional caption and tags", () => {
    expect(card).toMatch(/displayTitle/)
    expect(card).toMatch(/@\{creation\.author\.username\}/)
    expect(card).toMatch(/line-clamp-2/)
    expect(card).toMatch(/tagsForCard/)
    // Keep block layout: flex-col + ViewTransition collapses .pixel-thumb.
    expect(card).toMatch(/className="block h-full hover:bg-soft"/)
    expect(card).not.toMatch(/flex-col/)
  })

  it("keeps title search and a consistent grid", () => {
    expect(gallery).toMatch(/role="search"/)
    expect(gallery).toMatch(/name="q"/)
    expect(gallery).toMatch(/sm:grid-cols-2 lg:grid-cols-3/)
    expect(gallery).not.toMatch(/masonry/)
    expect(explorePage).toMatch(/parseExploreSearch/)
  })

  it("shows page position with a distinct pagination landmark", () => {
    expect(gallery).toMatch(/explorePaginationAria/)
    expect(gallery).toMatch(/explorePageStatus/)
    expect(gallery).not.toMatch(/aria-label=\{copy\.exploreTitle/)
  })
})
