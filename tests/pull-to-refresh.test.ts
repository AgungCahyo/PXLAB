import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8")

function sourceFiles(dir: string): string[] {
  const absolute = path.resolve(root, dir)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

describe("pull-to-refresh (Phase 5)", () => {
  const component = read("components/social/PullToRefresh.tsx")
  const home = read("components/social/HomeFeed.tsx")
  const explore = read("components/creations/ExploreGallery.tsx")

  it("owns touch gestures with a non-passive move listener", () => {
    expect(component).toMatch(/"use client"/)
    expect(component).toMatch(/addEventListener\("touchstart"/)
    expect(component).toMatch(/addEventListener\("touchmove", onMove, \{ passive: false \}\)/)
    expect(component).toMatch(/addEventListener\("touchend"/)
    expect(component).toMatch(/addEventListener\("touchcancel"/)
    expect(component).toMatch(/event\.cancelable\) event\.preventDefault\(\)/)
  })

  it("only starts at the top of the page and resists short pulls", () => {
    expect(component).toMatch(/window\.scrollY > 0/)
    expect(component).toMatch(/const THRESHOLD = 72/)
    expect(component).toMatch(/const RESISTANCE = 0\.5/)
    expect(component).toMatch(/pullRef\.current >= THRESHOLD/)
  })

  it("ignores canvases, dialogs, inputs and horizontal scrollers", () => {
    for (const selector of [
      "canvas",
      "[data-pull-refresh-ignore]",
      "[role='dialog']",
      "input",
      "textarea",
      "select",
      "overflow-x-auto",
    ]) {
      expect(component, selector).toContain(selector)
    }
  })

  it("keeps content visible and remounts with fresh server data", () => {
    expect(component).toMatch(/router\.refresh\(\)/)
    expect(component).toMatch(/<div key=\{refreshKey\}>\{children\}<\/div>/)
    expect(component).toMatch(/status === "refreshing"/)
    expect(component).toMatch(/status === "error"/)
    expect(component).toMatch(/REFRESH_TIMEOUT_MS = 8000/)
    expect(component).toMatch(/copy\.errorRetry\[lang\]/)
  })

  it("respects reduced motion and announces status", () => {
    expect(component).toMatch(/prefers-reduced-motion: reduce/)
    expect(component).toMatch(/useSyncExternalStore/)
    expect(component).toMatch(/role="status" aria-live="polite"/)
  })

  it("is scoped to Home and Explore feeds", () => {
    expect(home).toMatch(/<PullToRefresh lang=\{props\.lang\}>/)
    expect(home).toMatch(/<HomeFeedList \{\.\.\.props\} \/>/)
    expect(explore).toMatch(/<PullToRefresh lang=\{lang\}>/)
    const consumers = ["app", "components", "features"]
      .flatMap(sourceFiles)
      .map((file) => file.split(path.sep).join("/"))
      .filter((file) => file !== "components/social/PullToRefresh.tsx")
      .filter((file) => read(file).includes("<PullToRefresh"))
    expect(consumers.sort()).toEqual([
      "components/creations/ExploreGallery.tsx",
      "components/social/HomeFeed.tsx",
    ])
  })
})
