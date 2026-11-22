import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("unified search interaction", () => {
  const search = read("components/creations/ExploreSearch.tsx")
  const explorePage = read("app/[lang]/(public)/explore/page.tsx")
  const results = read("components/search/SearchResults.tsx")
  const migration = read("supabase/migrations/20261122000000_search_ranking.sql")

  it("submits explicitly without fetching on every keystroke", () => {
    expect(search).toMatch(/useState\(q\)/)
    expect(search).toMatch(/onSubmit=/)
    expect(search).toMatch(/const next = query\.trim\(\)/)
    expect(search).not.toMatch(/onChange=\{\(event\) =>\s*router\./)
    expect(search).toMatch(
      /exploreHref\(lang, \{ category, q: next, feed, page: 1 \}\)/,
    )
  })

  it("guards empty, short and repeated queries", () => {
    expect(search).toMatch(/SEARCH_MIN_LENGTH/)
    expect(search).toMatch(/if \(!next\)/)
    expect(search).toMatch(/next\.length < SEARCH_MIN_LENGTH/)
    expect(search).toMatch(/if \(next === q\) return/)
  })

  it("keeps the query in the URL and folds legacy tag links into search", () => {
    expect(explorePage).toMatch(/parseExploreTag\(query\.tag\)/)
    expect(explorePage).toMatch(/query\.q \|\| \(tag \? `#\$\{tag\}` : ""\)/)
    expect(explorePage).toMatch(/activeQ = q\.length >= SEARCH_MIN_LENGTH/)
    expect(explorePage).toMatch(/q=\{activeQ\}/)
  })

  it("ranks creator and creation matches in the database", () => {
    expect(migration).toMatch(/search_creators_ranked/)
    expect(migration).toMatch(/search_published_creations_ranked/)
    expect(migration).toMatch(/lower\(p\.username\) = params\.q then 1/)
    expect(migration).toMatch(/starts_with\(lower\(p\.username\), params\.q\) then 3/)
    expect(migration).toMatch(/lower\(c\.title\) = params\.q then 1/)
    expect(migration).toMatch(/starts_with\(lower\(c\.title\), params\.q\) then 2/)
    expect(migration).toMatch(/security invoker/)
    expect(migration).not.toMatch(/create extension/)
  })

  it("renders grouped sections, exact counts and a clear action", () => {
    expect(results).toMatch(/copy\.searchResultsTitle\[lang\]/)
    expect(results).toMatch(/copy\.searchSectionCreators\[lang\]/)
    expect(results).toMatch(/copy\.searchSectionWorks\[lang\]/)
    expect(results).toMatch(/copy\.searchSectionTags\[lang\]/)
    expect(results).toMatch(/copy\.searchClear\[lang\]/)
    expect(results).toMatch(/SocialEmptyState/)
    expect(results).toMatch(/creators\.total/)
    expect(results).toMatch(/worksTotal/)
  })
})
