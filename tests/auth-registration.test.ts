import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("AUTH-01 registration fixes", () => {
  it("answers duplicate signups with the same generic success", () => {
    const actions = read("features/auth/actions.ts")
    const errors = read("lib/auth/errors.ts")

    expect(errors).toMatch(/classifySignupConflict/)
    expect(errors).toMatch(/if \(classifySignupConflict\(error\)\) return "generic_register"/)
    expect(actions).toMatch(/classifySignupConflict\(error\)/)
    expect(actions).toMatch(/after\(async \(\) =>/)
    expect(actions).toMatch(/shouldCreateUser: false/)
    expect(actions).toMatch(/needsEmail: true, email/)
    expect(actions).not.toMatch(/email_taken/)
  })

  it("routes new sessions to onboarding and rate limits registration", () => {
    const actions = read("features/auth/actions.ts")

    expect(actions).toMatch(/postAuthPath\(lang, formData\.get\("next"\), null\)/)
    expect(actions).toMatch(/takeRateLimit\(`register:ip:/)
    expect(actions).toMatch(/takeRateLimit\(`register:email:/)
    expect(actions).toMatch(/takeRateLimit\(`resend:email:/)
  })

  it("validates password strength on the server and shows a specific error", () => {
    const profile = read("lib/validations/profile.ts")
    const password = read("lib/validations/password.ts")
    const errors = read("lib/auth/errors.ts")
    const copy = read("lib/copy.ts")

    expect(password).toMatch(/export function isStrongPassword/)
    expect(profile).toMatch(/\.refine\(isStrongPassword, "password_weak"\)/)
    expect(errors).toMatch(/"password_weak"/)
    expect(copy).toMatch(/password_weak:/)
  })
})
