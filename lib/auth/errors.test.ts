import { describe, expect, it } from "vitest"
import { mapAuthError, mapRegisterError } from "@/lib/auth/errors"

describe("auth error mapping", () => {
  it("does not expose whether an email is registered", () => {
    expect(mapAuthError({ message: "Invalid login credentials" })).toBe("generic_auth")
    expect(mapRegisterError({ message: "User already registered" })).toBe("generic_register")
  })

  it("keeps username collisions specific", () => {
    expect(mapAuthError({ code: "23505", message: "duplicate key" })).toBe("username_taken")
  })
})
