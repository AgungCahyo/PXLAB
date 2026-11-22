import { existsSync, readFileSync, readdirSync } from "node:fs"
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

describe("resource cleanup and bounded growth (Phase 7)", () => {
  const similar = read("components/creations/SimilarWorksLazy.tsx")
  const explore = read("components/social/ExploreInfinite.tsx")
  const layerPanel = read("components/creations/LayerPanel.tsx")
  const toast = read("components/social/Toast.tsx")
  const pwa = read("components/pwa/PwaRegister.tsx")
  const workTile = read("components/social/WorkTile.tsx")
  const infinite = read("components/social/useInfiniteList.ts")
  const home = read("components/social/HomeFeed.tsx")

  it("does not introduce Supabase Realtime infrastructure", () => {
    const files = ["app", "components", "features", "lib"].flatMap(sourceFiles)
    const realtime = /\.(channel|subscribe|removeChannel)\(|postgres_changes|["']presence["']|["']broadcast["']/
    expect(files.filter((file) => realtime.test(read(file)))).toEqual([])
  })

  it("bounds the similar-works session cache as an LRU", () => {
    expect(similar).toMatch(/SESSION_CACHE_MAX = 32/)
    expect(similar).toMatch(/function peekCached/)
    expect(similar).toMatch(/function writeCached/)
    expect(similar).toMatch(/sessionCache\.size > SESSION_CACHE_MAX/)
    expect(similar).toMatch(/sessionCache\.keys\(\)\.next\(\)/)
    expect(similar).not.toMatch(/sessionCache\.set\(key, result\.items\)/)
    expect(read("app/[lang]/(public)/creation/[id]/page.tsx")).toMatch(/key=\{creation\.id\}/)
  })

  it("bounds Explore restore storage and uses one resume slot", () => {
    expect(explore).toMatch(/RESUME_KEY = "pxlb:explore:resume"/)
    expect(explore).toMatch(/STORAGE_INDEX_KEY = "pxlb:explore:keys"/)
    expect(explore).toMatch(/MAX_RESTORE_KEYS = 6/)
    expect(explore).toMatch(/MAX_RESTORE_ITEMS = 96/)
    expect(explore).toMatch(/items: current\.slice\(0, MAX_RESTORE_ITEMS\)/)
    expect(explore).toMatch(/keys\.length > MAX_RESTORE_KEYS/)
    expect(explore).toMatch(/sessionStorage\.removeItem\(oldest\)/)
    expect(explore).toMatch(/resume === storageKey/)
    expect(explore).not.toMatch(/resumeKey/)
  })

  it("clears the layer long-press timer on unmount", () => {
    expect(layerPanel).toMatch(/longPressRef/)
    expect(layerPanel).toMatch(/clearTimeout\(longPressRef\.current\.timer\)/)
    expect(layerPanel).toMatch(/useEffect\(\s*\(\) => \(\) => \{[\s\S]*clearTimeout\(longPressRef/)
  })

  it("tracks and clears Toast timers", () => {
    expect(toast).toMatch(/timersRef/)
    expect(toast).toMatch(/window\.setTimeout/)
    expect(toast).toMatch(/window\.clearTimeout\(timer\)/)
    expect(toast).toMatch(/timersRef\.current\.filter/)
  })

  it("cannot install the PWA visibility listener after unmount", () => {
    expect(pwa).toMatch(/let disposed = false/)
    expect(pwa).toMatch(/if \(disposed\) return/)
    expect(pwa).toMatch(/disposed = true/)
    expect(pwa).toMatch(/cleanup\?\.\(\)/)
  })

  it("memoizes feed tiles so appended pages do not repaint earlier tiles", () => {
    expect(workTile).toMatch(/import \{ memo \} from "react"/)
    expect(workTile).toMatch(/export const WorkTile = memo\(function WorkTile/)
    expect(workTile).toMatch(/^\}\)$/m)
  })

  it("caps automatic infinite loads until the next scroll", () => {
    expect(infinite).toMatch(/AUTO_LOAD_LIMIT = 3/)
    expect(infinite).toMatch(/AUTO_ROOT_MARGIN = "240px 0px"/)
    expect(infinite).toMatch(/autoLoadsRef\.current >= AUTO_LOAD_LIMIT/)
    expect(infinite).toMatch(/setAutoPaused\(true\)/)
    expect(infinite).toMatch(/addEventListener\("scroll", resetAutoLoads, \{ passive: true \}\)/)
    expect(infinite).toMatch(/removeEventListener\("scroll", resetAutoLoads\)/)
    expect(infinite).toMatch(/return \(\) => observer\.disconnect\(\)/)
    expect(home).toMatch(/autoPaused/)
    expect(home).toMatch(/\(!observerSupported \|\| autoPaused\)/)
    expect(explore).toMatch(/autoPaused/)
    expect(explore).toMatch(/\(!observerSupported \|\| autoPaused\)/)
  })
})
