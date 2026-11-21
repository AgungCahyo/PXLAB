import { describe, expect, it } from "vitest"
import { RATE_LIMIT_WINDOW_MS, takeRateLimit } from "@/lib/auth/rate-limit"

describe("takeRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test:limit:${Date.now()}`
    expect(takeRateLimit(key, 2, 0)).toBe(true)
    expect(takeRateLimit(key, 2, 1)).toBe(true)
    expect(takeRateLimit(key, 2, 2)).toBe(false)
  })

  it("starts a fresh window after expiry", () => {
    const key = `test:window:${Date.now()}`
    expect(takeRateLimit(key, 1, 0)).toBe(true)
    expect(takeRateLimit(key, 1, RATE_LIMIT_WINDOW_MS - 1)).toBe(false)
    expect(takeRateLimit(key, 1, RATE_LIMIT_WINDOW_MS)).toBe(true)
  })
})
