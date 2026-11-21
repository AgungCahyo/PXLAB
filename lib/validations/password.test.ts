import { describe, expect, it } from "vitest"
import { isStrongPassword } from "@/lib/validations/password"
import { registerSchema } from "@/lib/validations/profile"

describe("isStrongPassword", () => {
  it("accepts a varied password", () => {
    expect(isStrongPassword("River9!pixel")).toBe(true)
  })

  it("accepts a long password with fewer character types", () => {
    expect(isStrongPassword("long enough phrase here")).toBe(true)
  })

  it("rejects short, common, and patterned passwords", () => {
    expect(isStrongPassword("short1!")).toBe(false)
    expect(isStrongPassword("password123")).toBe(false)
    expect(isStrongPassword("aaaaaaaaA1")).toBe(false)
    expect(isStrongPassword("12345678Aa!")).toBe(false)
  })
})

describe("registerSchema", () => {
  it("reports weak passwords with a specific code", () => {
    const result = registerSchema.safeParse({ email: "a@b.co", password: "password123" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "password_weak")).toBe(true)
    }
  })
})
