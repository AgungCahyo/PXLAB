import { describe, expect, it } from "vitest"
import { mapAuthError, mapRegisterError } from "@/lib/auth/errors"

describe("auth error mapping", () => {
  it("keeps login generic and points register duplicates to sign-in", () => {
    expect(mapAuthError({ message: "Invalid login credentials" })).toBe("generic_auth")
    expect(mapRegisterError({ message: "User already registered" })).toBe("email_taken")
  })

  it("keeps username collisions specific", () => {
    expect(mapAuthError({ code: "23505", message: "duplicate key" })).toBe("username_taken")
  })
})
