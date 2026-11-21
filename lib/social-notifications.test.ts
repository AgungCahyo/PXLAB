import { describe, expect, it } from "vitest"
import { groupByRecency, splitTemplate } from "@/lib/social-notifications"

const NOW = Date.parse("2026-11-20T12:00:00Z")
const at = (hoursAgo: number) => ({ at: new Date(NOW - hoursAgo * 3_600_000).toISOString() })

describe("groupByRecency", () => {
  it("buckets by elapsed time and omits empty groups", () => {
    const groups = groupByRecency([at(1), at(23.9), at(30), at(24 * 6.9), at(24 * 7), at(24 * 40)], NOW)
    expect(groups.map((g) => [g.group, g.items.length])).toEqual([
      ["today", 2],
      ["week", 2],
      ["earlier", 2],
    ])
  })

  it("keeps original order inside a group", () => {
    const a = { ...at(2), id: "a" }
    const b = { ...at(5), id: "b" }
    expect(groupByRecency([a, b], NOW)[0].items.map((i) => (i as typeof a).id)).toEqual(["a", "b"])
  })

  it("treats future or invalid timestamps safely", () => {
    const groups = groupByRecency([{ at: new Date(NOW + 60_000).toISOString() }, { at: "garbage" }], NOW)
    expect(groups.map((g) => g.group)).toEqual(["today", "earlier"])
  })

  it("returns nothing for no items", () => {
    expect(groupByRecency([], NOW)).toEqual([])
  })
})

describe("splitTemplate", () => {
  it("keeps placeholder order for both languages", () => {
    expect(splitTemplate("{user} appreciated {title}").map((p) => p.type)).toEqual(["user", "text", "title"])
    expect(splitTemplate("{title} diapresiasi oleh {user}").map((p) => p.type)).toEqual(["title", "text", "user"])
  })
  it("handles templates without placeholders", () => {
    expect(splitTemplate("plain")).toEqual([{ type: "text", value: "plain" }])
  })
})
