import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8")

describe("service worker never serves stale chunks in development", () => {
  const register = read("components/pwa/PwaRegister.tsx")

  it("only registers in production builds", () => {
    expect(register).toMatch(/process\.env\.NODE_ENV !== "production"/)
    // The production path still registers /sw.js (see pwa.test.ts).
    expect(register).toMatch(/serviceWorker\.register\("\/sw\.js"/)
  })

  it("cleans up registrations and pxlb caches left from earlier sessions", () => {
    expect(register).toMatch(/getRegistrations\(\)/)
    expect(register).toMatch(/\.unregister\(\)/)
    expect(register).toMatch(/pxlb-pwa-/)
    expect(register).toMatch(/caches\.delete/)
  })

  it("does the dev cleanup before it can register anything", () => {
    expect(register.indexOf("getRegistrations")).toBeLessThan(register.indexOf("serviceWorker.register"))
  })
})
