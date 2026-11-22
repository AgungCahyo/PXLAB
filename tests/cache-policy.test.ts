import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8")

const normalize = (file: string) => file.split(path.sep).join("/")

function sourceFiles(dir: string): string[] {
  const absolute = path.resolve(root, dir)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(rel)
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : []
  })
}

function segmentFiles(dir: string): string[] {
  const absolute = path.resolve(root, dir)
  if (!existsSync(absolute)) return []
  const own = ["page.tsx", "layout.tsx"]
    .map((name) => path.join(dir, name))
    .filter((file) => existsSync(path.resolve(root, file)))
  const nested = readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? segmentFiles(path.join(dir, entry.name)) : [],
  )
  return [...own, ...nested]
}

describe("stale-content policy and cache ownership", () => {
  it("pins the client-cache TTLs so private routes are never reused", () => {
    const config = read("next.config.ts")
    expect(config).toMatch(/cacheComponents:\s*true/)
    expect(config).toMatch(/staleTimes:\s*\{[\s\S]*?dynamic:\s*0,[\s\S]*?static:\s*180/)
  })

  it("keeps private, auth and member segments blocking for auth correctness", () => {
    for (const dir of ["app/[lang]/(auth)", "app/[lang]/(member)", "app/[lang]/admin"]) {
      const files = segmentFiles(dir)
      expect(files.length, dir).toBeGreaterThan(0)
      for (const file of files) {
        expect(read(file), file).toMatch(/export const instant = false/)
      }
    }
  })

  it("limits server-side caching to static, non-personalized output", () => {
    const cached = ["app", "components", "features", "lib"]
      .flatMap(sourceFiles)
      .filter((file) => /["']use cache["']/.test(read(file)))
      .map(normalize)
    expect(cached.sort()).toEqual(["components/layout/SiteFooter.tsx"])
    for (const file of ["app", "components", "features", "lib"].flatMap(sourceFiles)) {
      expect(read(file), file).not.toMatch(/unstable_cache/)
    }
  })

  it("does not introduce a blanket client-cache library", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]
    expect(names).not.toContain("@tanstack/react-query")
  })

  it("keeps mutation invalidation explicit", () => {
    expect(read("features/auth/actions.ts")).toMatch(/revalidatePath\("\/", "layout"\)/)
    expect(read("features/creations/actions.ts")).toMatch(/revalidatePath/)
    expect(read("components/canvas/SpaceBoard.tsx")).toMatch(/router\.refresh\(\)/)
  })
})
