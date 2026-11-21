import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { classifyVerificationError, needsEmailVerification } from "@/lib/auth/verification"
import { verifyEmailHref } from "@/lib/paths"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("verification link classification — VER-03", () => {
  it("recognizes expired confirmation links", () => {
    expect(
      classifyVerificationError({
        code: "otp_expired",
        message: "Email link is invalid or has expired",
      }),
    ).toBe("expired")
    expect(classifyVerificationError({ message: "Token has expired" })).toBe("expired")
  })

  it("recognizes invalid, reused, and broken verification links", () => {
    expect(classifyVerificationError({ message: "Email link is invalid or has expired" })).toBe(
      "invalid",
    )
    expect(classifyVerificationError({ message: "Email link has already been used" })).toBe(
      "invalid",
    )
    expect(
      classifyVerificationError({
        code: "otp_expired",
        message: "Email link has already been used",
      }),
    ).toBe("invalid")
    expect(classifyVerificationError({ code: "flow_state_not_found" })).toBe("invalid")
  })

  it("leaves unrelated OAuth errors on the existing path", () => {
    expect(classifyVerificationError({ code: "access_denied", message: "User cancelled" })).toBeNull()
    expect(classifyVerificationError(null)).toBeNull()
  })
})

describe("unverified account routing — VER-04", () => {
  it("gates only unconfirmed email/password users", () => {
    expect(needsEmailVerification(null)).toBe(false)
    expect(
      needsEmailVerification({ email_confirmed_at: null, app_metadata: { provider: "email" } }),
    ).toBe(true)
    expect(
      needsEmailVerification({
        email_confirmed_at: "2026-01-01T00:00:00Z",
        app_metadata: { provider: "email" },
      }),
    ).toBe(false)
  })

  it("never pushes Google OAuth users through email verification", () => {
    expect(
      needsEmailVerification({ email_confirmed_at: null, app_metadata: { provider: "google" } }),
    ).toBe(false)
    expect(read("lib/auth/verification.ts")).toMatch(/provider !== "email"/)
  })

  it("keeps a sanitized destination and the error code in the verify link", () => {
    const link = verifyEmailHref("id", "/en/creation/1", "expired")
    expect(link).toContain("/verify-email")
    expect(link).toContain("next=%2Fen%2Fcreation%2F1")
    expect(link).toContain("error=expired")
    expect(verifyEmailHref("en", "//evil.test")).not.toContain("evil")
  })
})

describe("verification wiring", () => {
  it("handles verification failures in the shared callback", () => {
    const callback = read("app/auth/callback/route.ts")
    expect(callback).toMatch(/error_code/)
    expect(callback).toMatch(/if \(oauthError \|\| errorCode\)/)
    expect(callback).toMatch(/classifyVerificationError/)
    expect(callback).toMatch(/verifyEmailHref/)
    expect(callback).toMatch(/needsEmailVerification\(data\.user\)/)
    expect(callback).toMatch(/postAuthPath/)
  })

  it("routes unverified sessions to the verification page from login", () => {
    const actions = read("features/auth/actions.ts")
    const login = read("app/[lang]/(auth)/login/page.tsx")
    expect(actions).toMatch(/needsEmailVerification\(data\.user\)/)
    expect(actions).toMatch(/verifyEmailHref/)
    expect(login).toMatch(/needsEmailVerification/)
    expect(login).toMatch(/verifyEmailHref/)
  })

  it("resends through the rate-limited, anti-enumeration action", () => {
    const form = read("components/auth/VerifyEmailForm.tsx")
    const actions = read("features/auth/actions.ts")
    expect(form).toMatch(/resendRegisterEmailAction/)
    expect(form).toMatch(/verifyEmailSent/)
    expect(form).not.toMatch(/email_taken/)
    expect(actions).toMatch(/takeRateLimit\(`resend:ip:/)
    expect(actions).toMatch(/takeRateLimit\(`resend:email:/)
  })

  it("ships Indonesian and English copy for every verification state", () => {
    const copy = read("lib/copy.ts")
    for (const key of [
      "verifyEmailTitle",
      "verifyEmailExpired",
      "verifyEmailInvalid",
      "verifyEmailSent",
      "verifyEmailSubmit",
      "verifyEmailBack",
    ]) {
      expect(copy).toMatch(new RegExp(`${key}:`))
    }
  })

  it("exposes the page to the default-language rewrite", () => {
    const config = read("next.config.ts")
    expect(config).toMatch(/"\/verify-email"/)
  })
})
