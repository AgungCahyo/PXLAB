import { describe, expect, it } from "vitest"
import { parseProfileUpdate, usernameSchema } from "@/lib/validations/profile"

describe("usernameSchema", () => {
  it("accepts a valid lowercase username", () => {
    expect(usernameSchema.parse("cahyo_01")).toBe("cahyo_01")
  })

  it("normalizes case", () => {
    expect(usernameSchema.parse("Cahyo")).toBe("cahyo")
  })

  it("rejects reserved names", () => {
    const result = usernameSchema.safeParse("admin")
    expect(result.success).toBe(false)
  })

  it("rejects short names", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false)
  })
})

describe("parseProfileUpdate", () => {
  it("rejects a role field", () => {
    const result = parseProfileUpdate({
      username: "member_a",
      displayName: "A",
      bio: "",
      role: "admin",
    })
    expect(result.success).toBe(false)
  })

  it("accepts owner-editable fields", () => {
    const result = parseProfileUpdate({
      username: "member_a",
      displayName: "Member A",
      bio: "hello",
    })
    expect(result.success).toBe(true)
  })
})
