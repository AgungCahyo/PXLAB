import { describe, expect, it } from "vitest"
import {
  classifySignupConflict,
  mapAuthError,
  mapLoginError,
  mapRegisterError,
} from "@/lib/auth/errors"

describe("auth error mapping", () => {
  it("keeps login and registration failures generic", () => {
    expect(mapAuthError({ message: "Invalid login credentials" })).toBe("generic_auth")
    expect(mapRegisterError({ message: "User already registered" })).toBe("generic_register")
  })

  it("does not leak an unconfirmed email from the login action", () => {
    expect(mapLoginError({ code: "email_not_confirmed" })).toBe("generic_auth")
  })

  it("keeps username collisions specific", () => {
    expect(mapAuthError({ code: "23505", message: "duplicate key" })).toBe("username_taken")
  })
})

describe("classifySignupConflict", () => {
  it("detects a duplicate email", () => {
    expect(classifySignupConflict({ message: "User already registered" })).toBe("duplicate")
    expect(classifySignupConflict({ code: "email_exists" })).toBe("duplicate")
  })

  it("detects an account first created through OAuth", () => {
    expect(
      classifySignupConflict({ message: "User already registered with a different provider" }),
    ).toBe("oauth")
  })

  it("ignores unrelated errors", () => {
    expect(classifySignupConflict({ message: "Invalid password" })).toBeNull()
    expect(classifySignupConflict(null)).toBeNull()
  })
})
