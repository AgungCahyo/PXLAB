import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("Explore gallery layout", () => {
  const card = read("components/creations/CreationCard.tsx")
  const gallery = read("components/creations/ExploreGallery.tsx")
  const explorePage = read("app/[lang]/(public)/explore/page.tsx")

  it("keeps artwork first with a single frame and no caption/tags on the card", () => {
    expect(card).toMatch(/PixelArt/)
    expect(card).toMatch(/framed=\{false\}/)
    expect(card).toMatch(/pixel-frame/)
    expect(card).toMatch(/creationCategoryLabels/)
    expect(card).not.toMatch(/captionForCard/)
    expect(card).not.toMatch(/tagsForCard/)
    expect(card).not.toMatch(/appreciate|reaction/i)
    expect(card).not.toMatch(/masonry/)
  })

  it("shows title, optional username, and secondary size only", () => {
    expect(card).toMatch(/displayTitle/)
    expect(card).toMatch(/showAuthor/)
    expect(card).toMatch(/@\{creation\.author\.username\}/)
    expect(card).toMatch(/sizeLabel/)
    expect(card).toMatch(/text-\[11px\]/)
    expect(card).toMatch(/className="block h-full hover:bg-soft"/)
  })

  it("uses a dense 2 / lg:3 / xl:4 grid", () => {
    expect(gallery).toMatch(/grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4/)
    expect(gallery).toMatch(/role="search"/)
    expect(gallery).toMatch(/name="q"/)
    expect(gallery).not.toMatch(/masonry/)
    expect(explorePage).toMatch(/parseExploreSearch/)
  })

  it("keeps minimal chrome and folded size filters on mobile", () => {
    expect(gallery).toMatch(/flex w-full min-w-0 gap-2/)
    expect(gallery).toMatch(/sr-only/)
    expect(gallery).toMatch(/min-w-0/)
    expect(gallery).toMatch(/<details className="group sm:hidden"/)
    expect(gallery).toMatch(/categoryFilterSummary/)
    expect(gallery).toMatch(/hidden min-w-0 sm:block/)
    expect(explorePage).toMatch(/w-full min-w-0 max-w-6xl/)
    expect(explorePage).not.toMatch(/exploreIntro/)
    expect(explorePage).toMatch(/pixel-title/)
  })

  it("shows page position with a distinct pagination landmark", () => {
    expect(gallery).toMatch(/explorePaginationAria/)
    expect(gallery).toMatch(/explorePageStatus/)
    expect(gallery).not.toMatch(/aria-label=\{copy\.exploreTitle/)
  })
})
