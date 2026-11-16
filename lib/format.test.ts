import { describe, expect, it } from "vitest"
import { formatRelativeTime } from "@/lib/format"

const now = Date.parse("2026-11-16T12:00:00.000Z")

describe("formatRelativeTime", () => {
  it("uses just-now copy under a minute", () => {
    expect(formatRelativeTime("2026-11-16T11:59:20.000Z", "id", now)).toBe("baru saja")
    expect(formatRelativeTime("2026-11-16T11:59:20.000Z", "en", now)).toBe("just now")
  })

  it("uses minutes, hours, then days before falling back to a date", () => {
    expect(formatRelativeTime("2026-11-16T11:50:00.000Z", "id", now)).toBe("10 menit lalu")
    expect(formatRelativeTime("2026-11-16T11:00:00.000Z", "en", now)).toBe("1 hour ago")
    expect(formatRelativeTime("2026-11-14T12:00:00.000Z", "en", now)).toBe("2 days ago")
    expect(formatRelativeTime("2026-11-01T12:00:00.000Z", "en", now)).toMatch(/Nov/)
  })
})
