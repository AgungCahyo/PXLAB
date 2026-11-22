import { readFileSync } from "node:fs"
import path from "node:path"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/features/community/actions", () => ({
  followCreatorAction: vi.fn(),
  unfollowCreatorAction: vi.fn(),
}))

import { CreatorCard } from "@/components/creations/CreatorCard"
import { NewCreatorsStrip } from "@/components/creations/NewCreatorsStrip"
import { QuietRack } from "@/components/creations/QuietRack"

const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8")

const creator = {
  id: "u-1",
  username: "maker",
  displayName: "Maker One",
  avatarUrl: null,
  avatarConfig: null,
}

const previews = [
  { id: "c-1", title: "One", coverUrl: "https://example.com/1.png" },
  { id: "c-2", title: "Two", coverUrl: "https://example.com/2.png" },
  { id: "c-3", title: "Three", coverUrl: "https://example.com/3.png" },
  { id: "c-4", title: "Four", coverUrl: "https://example.com/4.png" },
]

function render(member: boolean, following = false, currentUserId: string | null = null) {
  return renderToString(
    createElement(CreatorCard, {
      lang: "id",
      creator,
      previews,
      following,
      member,
      returnPath: "/explore",
      currentUserId,
    }),
  )
}

function nestedAnchors(html: string): boolean {
  let depth = 0
  for (const token of html.match(/<a\b[^>]*>|<\/a>/g) ?? []) {
    if (token.startsWith("</")) depth -= 1
    else depth += 1
    if (depth > 1) return true
  }
  return false
}

describe("one compact creator card across Explore and Search", () => {
  it("is reused by both discovery and search surfaces", () => {
    expect(read("components/creations/NewCreatorsStrip.tsx")).toMatch(/<CreatorCardList/)
    expect(read("components/search/SearchResults.tsx")).toMatch(/<CreatorCardList/)
    expect(read("components/search/SearchResults.tsx")).not.toMatch(/CreatorSearchCard/)
    expect(read("app/[lang]/(public)/creators/page.tsx")).toMatch(/<CreatorCardList/)
  })

  it("shows at most three square previews and no bio", () => {
    expect(read("components/creations/CreatorCard.tsx")).toMatch(/slice\(0, 3\)/)
    expect(read("components/creations/CreatorCard.tsx")).toMatch(
      /grid-cols-\[repeat\(3,minmax\(0,1fr\)\)\]/,
    )
    expect(read("components/creations/CreatorCard.tsx")).not.toMatch(/bio/)
    const html = render(true)
    expect(html).toContain("/creation/c-1")
    expect(html).toContain("/creation/c-3")
    expect(html).not.toContain("/creation/c-4")
  })

  it("keeps avatar, name and Follow as siblings with no nested links", () => {
    const html = render(true)
    expect(html).toContain("/u/maker")
    expect(html).toContain("aria-pressed")
    expect(nestedAnchors(html)).toBe(false)
  })

  it("keeps a compact guest follow action", () => {
    const html = render(false)
    expect(html).toContain("/login")
    expect(html).toContain("Masuk")
    expect(html).not.toContain("Masuk untuk mengikuti")
    expect(html).not.toContain("aria-pressed")
    expect(read("components/community/FollowButton.tsx")).toMatch(/compact \? "min-w-\[4\.75rem\]/)
  })

  it("identifies the viewer by user id and never renders the viewer", () => {
    expect(render(true, false, creator.id)).toBe("")
    expect(read("components/creations/CreatorCard.tsx")).toMatch(/if \(isSelf\) return null/)

    const other = renderToString(
      createElement(CreatorCard, {
        lang: "id",
        creator: { ...creator, id: "u-2", username: "someone-else" },
        previews,
        following: false,
        member: true,
        returnPath: "/explore",
        currentUserId: creator.id,
      }),
    )
    expect(other).toContain("aria-pressed")
    expect(other).toContain("/u/someone-else")
  })

  it("shows a quiet fallback when a creator has no artwork", () => {
    const html = renderToString(
      createElement(CreatorCard, {
        lang: "id",
        creator,
        previews: [],
        following: false,
        member: true,
        returnPath: "/explore",
      }),
    )
    expect(html).toContain("Belum ada karya")
    expect(html).not.toContain("/creation/")
    expect(html).toContain("/u/maker")
  })

  it("fills the grid column in the Creators tab but keeps rails compact", () => {
    const fluid = renderToString(
      createElement(CreatorCard, {
        lang: "id",
        creator,
        previews,
        following: false,
        member: true,
        returnPath: "/explore",
        fluid: true,
      }),
    )
    expect(fluid).toMatch(/class="w-full max-w-full min-w-0 overflow-hidden bg-card p-2\.5"/)
    expect(fluid).not.toMatch(/w-64/)
    expect(render(true)).toMatch(/class="w-64 max-w-full shrink-0 min-w-0 overflow-hidden bg-card p-2\.5"/)
    expect(read("components/search/SearchResults.tsx")).toMatch(
      /layout=\{creatorsVertical \? "grid" : "rail"\}/,
    )
    expect(read("app/[lang]/(public)/creators/page.tsx")).toMatch(/layout="grid"/)
  })

  it("passes the authenticated viewer id through every surface and filters search", () => {
    const page = read("app/[lang]/(public)/explore/page.tsx")
    const search = read("components/search/SearchResults.tsx")
    const strip = read("components/creations/NewCreatorsStrip.tsx")
    expect(page).toMatch(/currentUserId=\{viewer\?\.id \?\? null\}/)
    expect(page).toMatch(/creatorSearch\.items\.filter\(\(creator\) => creator\.id !== viewer\.id\)/)
    expect(page).toMatch(/listNewCreators\(12, currentUserId\)/)
    expect(search).toMatch(/currentUserId=\{currentUserId\}/)
    expect(strip).toMatch(/currentUserId=\{currentUserId\}/)
    expect(read("app/[lang]/(public)/creators/page.tsx")).toMatch(
      /listNewCreators\(36, currentUserId\)/,
    )
    expect(read("app/[lang]/(public)/creators/page.tsx")).toMatch(
      /currentUserId=\{currentUserId\}/,
    )
    expect(read("features/profiles/queries.ts")).not.toMatch(/excludeUserId|currentUserId/)
  })

  it("constrains the card and rails instead of hiding overflow globally", () => {
    const card = read("components/creations/CreatorCard.tsx")
    const list = read("components/creations/CreatorCardList.tsx")
    const search = read("components/search/SearchResults.tsx")
    const strip = read("components/creations/NewCreatorsStrip.tsx")
    const creatorsPage = read("app/[lang]/(public)/creators/page.tsx")
    const follow = read("components/community/FollowButton.tsx")
    expect(follow).toMatch(/<div className="relative">/)
    expect(follow).toMatch(/<span className="sr-only">@\{username\}<\/span>/)
    expect(card).toMatch(/w-64 max-w-full shrink-0 min-w-0 overflow-hidden/)
    expect(card).toMatch(/w-full max-w-full min-w-0 overflow-hidden/)
    expect(card).toMatch(/fluid\?: boolean/)
    expect(card).toMatch(/grid-cols-\[repeat\(3,minmax\(0,1fr\)\)\]/)
    expect(card).toMatch(/className="min-w-0 max-w-full flex-1 overflow-hidden/)
    expect(card).toMatch(/creatorCardNoWork\[lang\]/)

    expect(list).toMatch(/w-full min-w-0 max-w-full/)
    expect(list).toMatch(/className=\{vertical \? "min-w-0 max-w-full" : "min-w-0 max-w-full shrink-0 snap-start"\}/)
    expect(search).toContain('const creatorsVertical = scope === "creators"')
    expect(list).toContain(
      "mt-1 grid min-w-0 max-w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
    )
    expect(list).toContain("snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto")
    expect(list).toContain("fluid={vertical}")
    expect(search).toContain('layout={creatorsVertical ? "grid" : "rail"}')
    expect(strip).toContain('layout="rail"')
    expect(creatorsPage).toContain('layout="grid"')
    expect(creatorsPage).toMatch(/w-full min-w-0 max-w-6xl/)
    for (const source of [search, strip, list, creatorsPage]) {
      expect(source).not.toMatch(/-mx-3/)
    }
    const css = read("app/globals.css")
    expect(css).not.toMatch(/body\s*\{[^}]{0,400}overflow-x:\s*hidden/)
  })

  it("keeps each section independent when it has no data", () => {
    const creatorsHtml = renderToString(
      createElement(NewCreatorsStrip, {
        lang: "id",
        items: [],
        previews: {},
        followingIds: new Set<string>(),
        member: false,
        returnPath: "/explore",
      }),
    )
    expect(creatorsHtml).toContain("Kreator baru")
    expect(creatorsHtml).toContain("Belum ada kreator baru.")
    expect(creatorsHtml).not.toContain("Belum ada karya")

    const quietHtml = renderToString(createElement(QuietRack, { lang: "id", items: [] }))
    expect(quietHtml).toContain("Karya yang masih sepi")
    expect(quietHtml).toContain("Belum ada karya yang menunggu komentar.")

    const failedHtml = renderToString(createElement(QuietRack, { lang: "id", items: [], failed: true }))
    expect(failedHtml).toContain("Bagian ini belum bisa dimuat.")
    expect(failedHtml).not.toContain("Belum ada karya yang menunggu komentar.")
  })

  it("excludes the viewer from recommendations without changing ranking queries", () => {
    const queries = read("features/creations/queries.ts")
    const profiles = read("features/profiles/queries.ts")
    expect(queries).toMatch(/excludeUserId\?: string \| null/)
    expect(queries).toMatch(/query = query\.neq\("user_id", excludeUserId\)/)
    expect(queries).toMatch(/if \(excludeUserId && userId === excludeUserId\) continue/)
    expect(profiles).toMatch(/search_creators_ranked/)
    expect(profiles).not.toMatch(/excludeUserId|currentUserId/)
  })

  it("batches creator previews into one query", () => {
    const queries = read("features/creations/queries.ts")
    expect(queries).toMatch(/listCreatorWorkPreviews/)
    expect(queries).toMatch(/\.in\("user_id", ids\)/)
    expect(queries).not.toMatch(/\.limit\(ids\.length \* limit\)/)
    expect(queries).toMatch(/if \(list\.length >= limit\) continue/)
  })
})
