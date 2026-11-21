import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  accountProvider,
  isPasswordAccount,
  reauthMetadata,
  verifyReauth,
} from "@/lib/auth/account-security"

const { signInWithPassword } = vi.hoisted(() => ({ signInWithPassword: vi.fn() }))

vi.mock("@/lib/supabase/public", () => ({
  createPublicSupabase: () => ({ auth: { signInWithPassword } }),
}))

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

const emailUser = {
  id: "u1",
  email: "member@example.test",
  app_metadata: { provider: "email" },
}
const googleUser = {
  id: "u2",
  email: "member@example.test",
  app_metadata: { provider: "google" },
}

describe("SEC-01 re-authentication gate", () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
  })

  it("classifies password and OAuth accounts correctly", () => {
    expect(accountProvider(emailUser)).toBe("email")
    expect(accountProvider(googleUser)).toBe("google")
    expect(isPasswordAccount(emailUser)).toBe(true)
    expect(isPasswordAccount(googleUser)).toBe(false)
    expect(isPasswordAccount(null)).toBe(true)
  })

  it("requires and verifies the current password for email accounts", async () => {
    expect(await verifyReauth(emailUser, {})).toEqual({ ok: false, error: "reauth_required" })

    signInWithPassword.mockResolvedValueOnce({ error: new Error("invalid credentials") })
    expect(await verifyReauth(emailUser, { currentPassword: "wrong" })).toEqual({
      ok: false,
      error: "invalid_current_password",
    })
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: emailUser.email,
      password: "wrong",
    })

    signInWithPassword.mockResolvedValueOnce({ error: null })
    expect(await verifyReauth(emailUser, { currentPassword: "correct" })).toEqual({
      ok: true,
      nonce: null,
    })
  })

  it("uses an emailed nonce for OAuth accounts, never a password brute-force path", async () => {
    expect(await verifyReauth(googleUser, { currentPassword: "anything" })).toEqual({
      ok: false,
      error: "reauth_required",
    })
    expect(await verifyReauth(googleUser, { nonce: "12345" })).toEqual({
      ok: false,
      error: "reauth_required",
    })
    expect(await verifyReauth(googleUser, { nonce: " 654321 " })).toEqual({
      ok: true,
      nonce: "654321",
    })
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it("stamps nonce validation metadata for the deletion flow", () => {
    const metadata = reauthMetadata("654321")
    expect(metadata.nonce).toBe("654321")
    expect(metadata.data).toHaveProperty("pxlb_reauth_at")
  })

  it("refuses re-auth without a signed-in user", async () => {
    expect(await verifyReauth(null, { currentPassword: "x" })).toEqual({
      ok: false,
      error: "not_authenticated",
    })
  })
})

describe("AUTH-05 wiring", () => {
  it("gates password changes and revokes other sessions afterwards", () => {
    const actions = read("features/auth/actions.ts")
    expect(actions).toMatch(/export async function changePasswordAction/)
    expect(actions).toMatch(/verifyReauth\(gate\.user/)
    expect(actions).toMatch(/updateUser\(\s*reauth\.nonce \?/)
    expect(actions).toMatch(/signOut\(\{ scope: "others" \}\)/)
    expect(actions).toMatch(/passwordChanged: true/)
  })

  it("changes email through Supabase verification with a generic response", () => {
    const actions = read("features/auth/actions.ts")
    const callback = read("app/auth/callback/route.ts")
    expect(actions).toMatch(/export async function changeEmailAction/)
    expect(actions).toMatch(/if \(nextEmail === \(gate\.user\.email/)
    expect(actions).toMatch(/email_change=1/)
    expect(actions).toMatch(/emailChangeSent: true/)
    expect(callback).toMatch(/tokenHash && otpType === "email_change"/)
    expect(callback).toMatch(/verifyOtp\(\{ token_hash: tokenHash, type: "email_change" \}\)/)
    expect(callback).toMatch(/settings\}\?email=updated/)
  })

  it("offers explicit local, other-device, and global sign-out", () => {
    const actions = read("features/auth/actions.ts")
    const form = read("components/account/AccountSecurity.tsx")
    expect(actions).toMatch(/signOut\(\{ scope: "local" \}\)/)
    expect(actions).toMatch(/export async function signOutOtherDevicesAction/)
    expect(actions).toMatch(/export async function signOutEverywhereAction/)
    expect(actions).toMatch(/signOut\(\{ scope: "global" \}\)/)
    expect(form).toMatch(/signOutOtherDevicesAction/)
    expect(form).toMatch(/signOutEverywhereAction/)
  })

  it("deletes accounts only after re-auth through a server-only Edge Function", () => {
    const actions = read("features/auth/actions.ts")
    const edge = read("supabase/functions/delete-account/index.ts")
    const settings = read("app/[lang]/(member)/settings/page.tsx")

    expect(actions).toMatch(/export async function deleteAccountAction/)
    expect(actions).toMatch(/!== "DELETE"/)
    expect(actions).toMatch(/reauthMetadata\(reauth\.nonce\)/)
    expect(actions).toMatch(/functions\/v1\/delete-account/)
    expect(actions).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(edge).toMatch(/auth\.admin\.deleteUser/)
    expect(edge).toMatch(/caller\.auth\.getUser\(token\)/)
    expect(edge).toMatch(/Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/)
    expect(settings).toMatch(/AccountSecurity/)
  })

  it("rate limits every sensitive account operation", () => {
    const rateLimit = read("lib/auth/rate-limit.ts")
    const actions = read("features/auth/actions.ts")
    for (const name of [
      "ACCOUNT_PER_IP",
      "REAUTH_PER_USER",
      "EMAIL_CHANGE_PER_USER",
      "SESSION_PER_USER",
      "DELETE_PER_USER",
    ]) {
      expect(rateLimit).toContain(name)
    }
    expect(actions).toMatch(/allowAccountAction\("reauth"/)
    expect(actions).toMatch(/allowAccountAction\("email"/)
    expect(actions).toMatch(/allowAccountAction\("session"/)
    expect(actions).toMatch(/allowAccountAction\("delete"/)
  })

  it("ships bilingual copy for every account security state", () => {
    const source = read("lib/copy.ts")
    for (const key of [
      "accountSecurityTitle",
      "currentPasswordLabel",
      "reauthNonceLabel",
      "passwordChanged",
      "emailChangeSentGeneric",
      "sessionOthersDone",
      "deleteAccountSubmit",
      "invalid_current_password",
      "reauth_failed",
      "account_delete_failed",
    ]) {
      expect(source).toMatch(new RegExp(`${key}:`))
    }
    for (const key of ["invalid_current_password", "reauth_failed", "account_delete_failed"]) {
      expect(source).toMatch(new RegExp(`${key}: \\{[\\s\\S]*?id: "[^"]+",[\\s\\S]*?en: "[^"]+"`))
    }
  })

  it("marks SEC-01..SEC-05 complete without touching cross-cutting items", () => {
    const roadmap = read("docs/auth/auth-audit-report.md")
    for (const id of ["SEC-01", "SEC-02", "SEC-03", "SEC-04", "SEC-05"]) {
      expect(roadmap).toMatch(new RegExp(`- \\[x\\] ${id}:`))
    }
    for (const id of ["SEC-06", "SEC-07", "SEC-09"]) {
      expect(roadmap).toMatch(new RegExp(`- \\[ \\] ${id}:`))
    }
  })
})
