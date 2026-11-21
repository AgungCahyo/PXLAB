import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { mapLoginError } from "@/lib/auth/errors"
import { LOGIN_PER_EMAIL, LOGIN_PER_IP, takeRateLimit } from "@/lib/auth/rate-limit"
import {
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE,
  authCookieOptions,
  clearAuthCookies,
  isAuthCookieName,
  isRemembered,
  rememberCookieOptions,
} from "@/lib/auth/session-cookie"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("login anti-enumeration — LOG-01", () => {
  it("maps every provider failure to the same generic code", () => {
    expect(mapLoginError({ code: "email_not_confirmed" })).toBe("generic_auth")
    expect(mapLoginError({ message: "Email not confirmed" })).toBe("generic_auth")
    expect(mapLoginError({ message: "Invalid login credentials" })).toBe("generic_auth")
    expect(mapLoginError(null)).toBe("generic_auth")
  })
})

describe("login rate limits — LOG-05", () => {
  it("checks both the client IP and the submitted address", () => {
    const actions = read("features/auth/actions.ts")
    expect(LOGIN_PER_IP).toBeGreaterThan(0)
    expect(LOGIN_PER_EMAIL).toBeGreaterThan(0)
    expect(actions).toMatch(/login:ip:\$\{ip\}/)
    expect(actions).toMatch(/login:email:\$\{email\}/)
    expect(actions).toMatch(/error: "limit_reached"/)
  })

  it("refuses attempts after the allowance is used", () => {
    const key = `test:login:${Date.now()}:${Math.random()}`
    for (let i = 0; i < LOGIN_PER_EMAIL; i += 1) {
      expect(takeRateLimit(key, LOGIN_PER_EMAIL)).toBe(true)
    }
    expect(takeRateLimit(key, LOGIN_PER_EMAIL)).toBe(false)
  })
})

describe("session regeneration", () => {
  it("drops pre-existing auth cookies before issuing a new session", () => {
    const actions = read("features/auth/actions.ts")
    const start = actions.indexOf("export async function loginAction")
    expect(start).toBeGreaterThan(-1)
    const cleared = actions.indexOf("clearAuthCookies", start)
    const signedIn = actions.indexOf(".auth.signInWithPassword(", start)
    expect(cleared).toBeGreaterThan(start)
    expect(cleared).toBeLessThan(signedIn)
  })
})

describe("remember me", () => {
  it("uses a persistent marker only when requested", () => {
    expect(REMEMBER_COOKIE).toBe("pxlb_remember")
    expect(REMEMBER_MAX_AGE).toBeGreaterThan(0)
    expect(rememberCookieOptions(true).maxAge).toBe(REMEMBER_MAX_AGE)
    expect(rememberCookieOptions(false).maxAge).toBeUndefined()
    expect(rememberCookieOptions(true).httpOnly).toBe(true)
    expect(isRemembered("1")).toBe(true)
    expect(isRemembered("0")).toBe(false)
    expect(isRemembered(undefined)).toBe(true)
  })

  it("reapplies the lifetime to JS-readable auth cookies", () => {
    expect(authCookieOptions(true).maxAge).toBe(REMEMBER_MAX_AGE)
    expect(authCookieOptions(false).maxAge).toBeUndefined()
    expect(authCookieOptions(false).httpOnly).toBe(false)
  })

  it("clears only Supabase auth cookies, including chunks", () => {
    const deleted: string[] = []
    clearAuthCookies({
      getAll: () => [
        { name: "sb-project-auth-token" },
        { name: "sb-project-auth-token.0" },
        { name: REMEMBER_COOKIE },
      ],
      delete: (name) => {
        deleted.push(name)
      },
    })
    expect(deleted).toEqual(["sb-project-auth-token", "sb-project-auth-token.0"])
    expect(isAuthCookieName("pxlb_recovery")).toBe(false)
  })

  it("wires the choice through the form, action, and session refresh", () => {
    const form = read("components/auth/LoginForm.tsx")
    const actions = read("features/auth/actions.ts")
    const middleware = read("lib/supabase/middleware.ts")
    expect(form).toMatch(/name="remember"/)
    expect(form).toMatch(/loginRemember/)
    expect(actions).toMatch(/REMEMBER_COOKIE/)
    expect(actions).toMatch(/formData\.get\("remember"\) === "1"/)
    expect(middleware).toMatch(/isRemembered/)
    expect(middleware).toMatch(/authCookieOptions/)
  })
})
