import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/features/explore/actions", () => ({ loadMoreExploreAction: vi.fn() }))

import { ExploreInfinite } from "@/components/social/ExploreInfinite"

const work = (n: number) =>
  ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    title: `Work ${n}`,
    caption: null,
    tags: [],
    type: "pixel",
    category: null,
    published_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
    status: "published",
    cover_url: `https://example.com/${n}.png`,
    commentCount: n === 0 ? 3 : 0,
    author: { id: `u${n}`, username: `maker${n}`, displayName: n === 0 ? "Maker Zero" : null, avatarUrl: null, avatarConfig: null },
  }) as never

const render = (count: number, pageCount: number, withBands = true) =>
  renderToString(
    createElement(ExploreInfinite, {
      lang: "id",
      category: "all",
      q: "",
      feed: "all",
      initialItems: Array.from({ length: count }, (_, i) => work(i)),
      initialPage: 1,
      pageCount,
      interludes: withBands
        ? [
            { at: 5, node: createElement("p", { id: "band-creators" }, "BAND-CREATORS") },
            { at: 15, node: createElement("p", { id: "band-quiet" }, "BAND-QUIET") },
          ]
        : undefined,
    }),
  )

describe("Explore mosaic (SSR)", () => {
  it("renders one large tile per block of five, alternating sides", () => {
    const html = render(12, 3)
    const large = html.match(/col-span-2 row-span-2( sm:col-start-3)?/g) ?? []
    expect(large).toHaveLength(3) // items 0, 5, 10
    expect(large.map((c) => c.includes("sm:col-start-3"))).toEqual([false, true, false])
  })

  it("gives the large tile the rich caption and small tiles the compact chip", () => {
    const html = render(12, 3)
    expect(html).toContain("Maker Zero") // display name only on the large tile
    expect(html).toContain("@maker1")
    expect(html).toContain("Work 0")
  })

  it("puts the first band inside the flow after the fifth work, before the sixth", () => {
    const html = render(12, 3)
    const band = html.indexOf("BAND-CREATORS")
    expect(band).toBeGreaterThan(html.indexOf("Work 4"))
    expect(band).toBeLessThan(html.indexOf("Work 5"))
  })

  it("holds the second band back until 15 works exist and more pages may come", () => {
    expect(render(12, 3)).not.toContain("BAND-QUIET")
    expect(render(15, 3)).toContain("BAND-QUIET")
  })

  it("shows a pending band at the end when the feed is complete and short", () => {
    const html = render(12, 1)
    expect(html).toContain("BAND-QUIET")
    expect(html.indexOf("BAND-QUIET")).toBeGreaterThan(html.indexOf("Work 11"))
  })

  it("does not end a finished feed on a lone large tile", () => {
    const html = render(12, 1) // complete, last block (10, 11) is partial
    const large = html.match(/col-span-2 row-span-2/g) ?? []
    expect(large).toHaveLength(2) // only blocks 0 and 5
  })

  it("renders every work exactly once", () => {
    const html = render(12, 3)
    for (let i = 0; i < 12; i += 1) expect(html.match(new RegExp(`/creation/00000000-0000-4000-8000-${String(i).padStart(12, "0")}"`, "g"))).toHaveLength(1)
  })
})
