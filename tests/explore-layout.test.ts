import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("Explore gallery layout", () => {
  const card = read("components/creations/CreationCard.tsx")
  const gallery = read("components/creations/ExploreGallery.tsx")
  const infinite = read("components/social/ExploreInfinite.tsx")
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
    expect(card).toMatch(/absolute inset-0/)
    expect(card).toMatch(/ProfileAvatar/)
  })

  it("uses a dense 2 / sm:3 / lg:4 tile grid", () => {
    expect(infinite).toMatch(/grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-1\.5 lg:grid-cols-4/)
    expect(gallery).toMatch(/role="search"/)
    expect(gallery).toMatch(/name="q"/)
    expect(gallery).not.toMatch(/masonry/)
    expect(explorePage).toMatch(/parseExploreSearch/)
  })

  it("keeps minimal chrome with horizontally scrolling size chips on mobile", () => {
    expect(gallery).toMatch(/overflow-x-auto/)
    expect(gallery).toMatch(/flex-nowrap/)
    expect(gallery).toMatch(/sr-only/)
    expect(gallery).toMatch(/min-w-0/)
    expect(gallery).not.toMatch(/<details/)
    expect(explorePage).toMatch(/w-full min-w-0 max-w-6xl/)
    expect(explorePage).not.toMatch(/exploreIntro/)
    expect(explorePage).toMatch(/PageHeader/)
  })


  it("keeps a distinct pagination landmark and page position under infinite scroll", () => {
    expect(infinite).toMatch(/explorePaginationAria/)
    expect(infinite).toMatch(/explorePageStatus/)
    expect(read("components/social/useInfiniteList.ts")).toMatch(/IntersectionObserver/)
    expect(infinite).toMatch(/useInfiniteList/)
    expect(infinite).toMatch(/loadMoreExploreAction/)
    expect(gallery).not.toMatch(/aria-label=\{copy\.exploreTitle/)
  })
})
