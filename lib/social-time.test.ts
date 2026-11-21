import { describe, expect, it } from "vitest"
import { formatRelativeTime } from "@/lib/social-time"

const NOW = Date.parse("2026-11-20T12:00:00Z")

describe("formatRelativeTime", () => {
  it("returns empty string for invalid dates", () => {
    expect(formatRelativeTime("nope", "en", NOW)).toBe("")
  })
  it("uses hours for same-day past values", () => {
    expect(formatRelativeTime("2026-11-20T09:00:00Z", "en", NOW)).toMatch(/3/)
  })
  it("uses days for older values", () => {
    expect(formatRelativeTime("2026-11-17T12:00:00Z", "id", NOW)).toMatch(/3/)
  })
  it("never goes negative-empty for now", () => {
    expect(formatRelativeTime(NOW, "en", NOW).length).toBeGreaterThan(0)
  })
})
