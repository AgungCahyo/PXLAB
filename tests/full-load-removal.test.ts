import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("full-load removal (Section N step 8)", () => {
  const languageSwitch = read("components/layout/LanguageSwitch.tsx")
  const exploreGallery = read("components/creations/ExploreGallery.tsx")
  const exploreSearch = read("components/creations/ExploreSearch.tsx")

  it("uses client navigation for the language switch", () => {
    expect(languageSwitch).toMatch(/from "next\/link"/)
    expect(languageSwitch).toMatch(/<Link\b/)
    expect(languageSwitch).not.toMatch(/<a\s+href=/)
    expect(languageSwitch).not.toMatch(/window\.location|location\.href|location\.assign/)
  })

  it("keeps <html lang> correct after a client locale change", () => {
    expect(languageSwitch).toMatch(/useEffect/)
    expect(languageSwitch).toMatch(/document\.documentElement\.lang/)
  })

  it("removes the Explore search GET form", () => {
    expect(exploreGallery).toMatch(/<ExploreSearch\b/)
    expect(exploreGallery).not.toMatch(/<form[^>]*method="get"/)
    expect(exploreGallery).not.toMatch(/action=\{href\(/)
    expect(exploreGallery).not.toMatch(/name="q"/)
  })

  it("pushes Explore search state through the client router", () => {
    expect(exploreSearch).toMatch(/"use client"/)
    expect(exploreSearch).toMatch(/useRouter/)
    expect(exploreSearch).toMatch(/router\.push\(/)
    expect(exploreSearch).toMatch(/exploreHref\(lang, \{ category, q: next, feed, page: 1 \}\)/)
    expect(exploreSearch).toMatch(/role="search"/)
    expect(exploreSearch).not.toMatch(/window\.location|location\.href|location\.assign/)
  })

  it("remounts the search input when Back/Forward changes q", () => {
    expect(exploreGallery).toMatch(/<ExploreSearch key=\{q\}/)
    expect(exploreSearch).toMatch(/useState\(q\)/)
    expect(exploreSearch).toMatch(/onSubmit=/)
  })
})
