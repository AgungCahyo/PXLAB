import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const copySource = readFileSync(path.join(root, "lib/copy.ts"), "utf8")

function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(path.join(root, dir))) {
    const relative = path.posix.join(dir, name)
    if (statSync(path.join(root, relative)).isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(name)) {
        files.push(...sourceFiles(relative))
      }
    } else if (/\.(ts|tsx)$/.test(name)) {
      files.push(relative)
    }
  }
  return files
}

describe("copy keys", () => {
  it("defines every copy key referenced by the UI", () => {
    const declared = new Set(
      [...copySource.matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((match) => match[1]),
    )
    const missing: string[] = []
    const files = ["app", "components", "features", "lib"].flatMap(sourceFiles)

    for (const file of files) {
      if (file === "lib/copy.ts") continue
      const text = readFileSync(path.join(root, file), "utf8")
      for (const match of text.matchAll(/\bcopy\.([A-Za-z0-9_]+)\[/g)) {
        if (!declared.has(match[1])) missing.push(`${match[1]} (${file})`)
      }
    }

    expect(missing).toEqual([])
  })

  it("has a bilingual message for every auth error code", () => {
    const errorSource = readFileSync(path.join(root, "lib/auth/errors.ts"), "utf8")
    const codes = [...errorSource.matchAll(/^\s+\| "([a-z_]+)"/gm)].map((match) => match[1])
    const errorsBlock = copySource.slice(copySource.indexOf("  errors: {"))

    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) {
      expect(errorsBlock, code).toMatch(new RegExp(`\\b${code}:`))
    }
  })
})
