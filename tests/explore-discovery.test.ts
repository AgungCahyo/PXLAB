import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8")

describe("Explore discovery bands live inside the feed", () => {
  const page = read("app/[lang]/(public)/explore/page.tsx")

  it("never renders the quiet rack or creators strip below the infinite feed", () => {
    // They are passed as `interludes` to the gallery, not rendered after it.
    expect(page).toMatch(/interludes/)
    expect(page).toMatch(/QuietRackSlot/)
    expect(page).toMatch(/NewCreatorsSlot/)
    const afterResults = page.slice(page.indexOf("</Suspense>", page.indexOf("<ExploreResults")))
    const jsxAfter = afterResults.slice(0, afterResults.indexOf("async function ExploreResults"))
    expect(jsxAfter).not.toMatch(/<QuietRackSlot|<NewCreatorsSlot/)
  })

  it("only shows bands in the unfiltered discovery view", () => {
    expect(page).toMatch(/showDiscovery\s*\?\s*\[/)
  })

  it("band positions are multiples of 5 so mosaic blocks stay aligned", () => {
    const positions = [...page.matchAll(/at:\s*(\d+)/g)].map((m) => Number(m[1]))
    expect(positions.length).toBeGreaterThan(0)
    for (const at of positions) expect(at % 5).toBe(0)
  })

  it("the old confusing label is gone from the UI", () => {
    expect(read("components/creations/QuietRack.tsx")).not.toMatch(/quietRackTitle/)
    expect(read("lib/copy-social.ts")).toMatch(/Tulis catatan pertama/)
  })

  it("creator identity is richer on large tiles (name, @username, comments)", () => {
    const tile = read("components/social/WorkTile.tsx")
    expect(tile).toMatch(/size = "default"/)
    expect(tile).toMatch(/displayName/)
    expect(tile).toMatch(/noComments/)
  })

  it("keeps default tiles self-sized so profile and landing grids do not collapse", () => {
    const tile = read("components/social/WorkTile.tsx")
    expect(tile).toMatch(/large \? "h-full" : "aspect-square"/)
    expect(tile).not.toMatch(/"group relative h-full min-w-0/)
  })
})
