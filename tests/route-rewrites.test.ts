import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const config = readFileSync(path.join(root, "next.config.ts"), "utf8")

/** Top-level static routes under app/[lang]/(group)/<name>/page.tsx */
function staticRoutes() {
  const base = path.join(root, "app", "[lang]")
  const routes: string[] = []
  for (const group of readdirSync(base).filter((name) => /^\(.+\)$/.test(name))) {
    for (const name of readdirSync(path.join(base, group))) {
      if (name.startsWith("[")) continue
      if (existsSync(path.join(base, group, name, "page.tsx"))) routes.push(`/${name}`)
    }
  }
  return routes
}

describe("default-language (no /id prefix) rewrites", () => {
  it("lists every static top-level route, so /<route> never 404s", () => {
    const missing = staticRoutes().filter((route) => !config.includes(`"${route}"`))
    expect(missing).toEqual([])
  })

  it("includes the home feed", () => {
    expect(config).toMatch(/indonesianRoutes = \[\s*"\/home"/)
  })
})
