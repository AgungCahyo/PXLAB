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
    return /\.(ts|tsx|css)$/.test(entry.name) ? [rel] : []
  })
}

describe("route transitions removed (Phase 6)", () => {
  it("leaves no ViewTransition consumer in application source", () => {
    const files = ["app", "components", "features", "lib"].flatMap(sourceFiles)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(read(file), file).not.toMatch(
        /ViewTransition|transitionTypes|viewTransitionName|::view-transition|view-transition-abort/,
      )
    }
  })

  it("deletes the wrapper, abort filter, and instrumentation", () => {
    for (const file of [
      "components/layout/PageTransition.tsx",
      "components/layout/ViewTransitionGuard.tsx",
      "lib/view-transition-abort.ts",
      "instrumentation-client.ts",
    ]) {
      expect(existsSync(path.resolve(root, file)), file).toBe(false)
    }
    expect(read("components/layout/PublicShell.tsx")).not.toMatch(/ViewTransitionGuard/)
  })

  it("leaves no orphaned transition CSS", () => {
    const css = read("app/globals.css")
    for (const pattern of [
      /::view-transition/,
      /@keyframes (via-blur|vt-fade|vt-slide-y|vt-slide-x)/,
      /--duration-(exit|enter|move)/,
      /\.(nav-forward|nav-back|morph|slide-down|slide-up)/,
    ]) {
      expect(css).not.toMatch(pattern)
    }
  })

  it("keeps normal React transitions intact", () => {
    expect(read("components/creations/CreationMoreMenu.tsx")).toMatch(/useTransition/)
    expect(read("components/canvas/SpaceBoard.tsx")).toMatch(/startTransition/)
  })
})
