import { describe, expect, it } from "vitest"
import { mergeUnique } from "@/lib/merge-unique"

const a = (id: string) => ({ id })

describe("mergeUnique", () => {
  it("appends new items in order", () => {
    expect(mergeUnique([a("1"), a("2")], [a("3"), a("4")]).map((x) => x.id)).toEqual(["1", "2", "3", "4"])
  })
  it("drops items that shifted onto the next page after a new publish", () => {
    expect(mergeUnique([a("1"), a("2")], [a("2"), a("3")]).map((x) => x.id)).toEqual(["1", "2", "3"])
  })
  it("drops duplicates inside the incoming batch", () => {
    expect(mergeUnique([], [a("1"), a("1")]).map((x) => x.id)).toEqual(["1"])
  })
  it("returns the same array when nothing is new", () => {
    const prev = [a("1")]
    expect(mergeUnique(prev, [a("1")])).toBe(prev)
  })
})
