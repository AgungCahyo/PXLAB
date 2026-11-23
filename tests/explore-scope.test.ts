import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { exploreHref, parseExploreScope } from "@/lib/creations"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("Explore result scope", () => {
  it("parses only known scopes and defaults to all", () => {
    expect(parseExploreScope(undefined)).toBe("all")
    expect(parseExploreScope("creators")).toBe("creators")
    expect(parseExploreScope("creations")).toBe("creations")
    expect(parseExploreScope("unknown")).toBe("all")
  })

  it("keeps the scope in the URL and drops it when cleared", () => {
    expect(exploreHref("id", { q: "cat", scope: "creators" })).toContain("scope=creators")
    expect(exploreHref("id", { q: "cat", scope: "all" })).not.toContain("scope=")
    expect(exploreHref("id", {})).toBe("/explore")
  })

  it("wires one tab set into the existing Explore filters", () => {
    const gallery = read("components/creations/ExploreGallery.tsx")
    expect(gallery).toMatch(/TabLink/)
    expect(gallery).toMatch(/searchTabAll\[lang\]/)
    expect(gallery).toMatch(/searchTabCreators\[lang\]/)
    expect(gallery).toMatch(/searchTabCreations\[lang\]/)
    expect(gallery).toMatch(/scope: tab\.id, page: 1/)
    const search = read("components/creations/ExploreSearch.tsx")
    expect(search).toMatch(/scope === "all" \? baseHref : `\$\{baseHref\}&scope=\$\{scope\}`/)
  })

  it("does not query the feed that the active tab does not show", () => {
    const page = read("app/[lang]/(public)/explore/page.tsx")
    expect(page).toMatch(/parseExploreScope\(query\.scope\)/)
    expect(page).toMatch(/scope !== "creations" \? await searchCreators\(q\)/)
    expect(page).toMatch(/if \(q && scope === "creators"\)/)
    expect(page).toMatch(/tags=\{scope === "all" \?/)
  })

  it("renders only the sections that belong to the active tab", () => {
    const results = read("components/search/SearchResults.tsx")
    expect(results).toMatch(/showCreators = scope !== "creations"/)
    expect(results).toMatch(/showCreations = scope !== "creators"/)
    expect(results).toMatch(/showTags = scope === "all"/)
  })

  it("keeps creator cards horizontal in All and vertical in Creators", () => {
    const results = read("components/search/SearchResults.tsx")
    const list = read("components/creations/CreatorCardList.tsx")
    expect(results).toContain('const creatorsVertical = scope === "creators"')
    expect(results).toContain('layout={creatorsVertical ? "grid" : "rail"}')
    expect(list).toContain(
      "mt-1 grid min-w-0 max-w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
    )
    expect(list).toContain("snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto")
    expect(list).toContain("fluid={vertical}")
    expect(list).not.toMatch(/overflow-y-auto/)
  })

  it("shows one primary navigation system per context", () => {
    const gallery = read("components/creations/ExploreGallery.tsx")
    expect(gallery).toMatch(/\{activeQ \? \([\s\S]*scope === "creations" \?/)
    expect(gallery.match(/exploreFeedAria\[lang\]/g)).toHaveLength(1)
    expect(gallery).not.toMatch(/searchTagEmpty/)
  })

  it("keeps exactly one empty message for the active search scope", () => {
    const results = read("components/search/SearchResults.tsx")
    expect(results).toMatch(/if \(!hasAny && !hasFailed && !guestFollowing\)/)
    expect(results).toMatch(/copy\.searchCreatorEmpty\[lang\]/)
    expect(results).toMatch(/copy\.searchCreationEmpty\[lang\]/)
    expect(results).toMatch(/copy\.searchAllEmpty\[lang\]/)
    expect(results).not.toMatch(/hasAny \? \([\s\S]*searchTagEmpty/)
    expect(results).not.toMatch(/SearchEmptyNote>\{copy\.exploreSearchEmpty/)
  })
})
