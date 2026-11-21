import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("AUTH-03 recovery hardening", () => {
  it("uses a dedicated, signed recovery callback instead of the generic one", () => {
    const actions = read("features/auth/actions.ts")
    const callback = read("app/auth/recovery/route.ts")
    const generic = read("app/auth/callback/route.ts")

    expect(actions).toMatch(/\/auth\/recovery\?\$\{RECOVERY_STATE_PARAM\}/)
    expect(actions).not.toMatch(/resetPasswordForEmail\([\s\S]{0,500}?\/auth\/callback\?next=/)
    expect(callback).toMatch(/verifyRecoveryState/)
    expect(callback).toMatch(/exchangeCodeForSession/)
    expect(callback).toMatch(/redirectType/)
    expect(callback).toMatch(/recovery_sent_at/)
    expect(callback).toMatch(/markRecoveryNonceUsed/)
    expect(callback).toMatch(/createRecoveryTicket/)
    expect(callback).toMatch(/cookieStore\.delete\(cookie\.name\)/)
    expect(generic).not.toMatch(/reset-password/)
  })

  it("uses a device-independent token_hash exchange for reset links", () => {
    const callback = read("app/auth/recovery/route.ts")
    const template = read("supabase/templates/reset-password.html")
    const example = read(".env.example")

    expect(callback).toMatch(/searchParams\.get\("token_hash"\)/)
    expect(callback).toMatch(/otpType === "recovery"/)
    expect(callback).toMatch(/verifyOtp\(\{[\s\S]*?token_hash: tokenHash,[\s\S]*?type: "recovery"/)
    expect(callback).toMatch(/if \(!state\) return invalid\(\)/)
    expect(callback).toMatch(/else if \(code\)/)

    expect(template).toContain("{{ .RedirectTo }}")
    expect(template).toContain("{{ .TokenHash }}")
    expect(template).toContain("type=recovery")
    expect(template).not.toContain("{{ .ConfirmationURL }}")
    expect(example).toMatch(/templates\/reset-password\.html/)
    expect(example).toMatch(/token_hash/)
  })

  it("gates the reset page and password mutation on a recovery ticket", () => {
    const page = read("app/[lang]/(auth)/reset-password/page.tsx")
    const form = read("components/auth/ResetPasswordForm.tsx")
    const actions = read("features/auth/actions.ts")

    expect(page).toMatch(/verifyRecoveryTicket/)
    expect(page).not.toMatch(/getSessionUserId/)
    expect(form).toMatch(/updatePasswordAction/)
    expect(actions).toMatch(/verifyRecoveryTicket\(rawTicket\)/)
    expect(actions).toMatch(/setSession\(\{/)
    expect(actions).toMatch(/updateUser\(\{ password/)
    expect(actions).toMatch(/signOut\(\{ scope: "global" \}\)/)
    expect(actions).toMatch(/cookieStore\.delete\(RECOVERY_COOKIE\)/)
    expect(actions).toMatch(/reset=done/)
  })

  it("rate limits reset requests and ticket reuse", () => {
    const rateLimit = read("lib/auth/rate-limit.ts")
    const actions = read("features/auth/actions.ts")

    expect(rateLimit).toMatch(/RESET_PER_EMAIL = 3/)
    expect(rateLimit).toMatch(/RESET_PER_IP = 20/)
    expect(actions).toMatch(/reset:ip:\$\{ip\}/)
    expect(actions).toMatch(/reset:email:\$\{parsed\.data\}/)
    expect(actions).toMatch(/recovery:\$\{ticket\.nonce\}/)
  })

  it("keeps recovery secrets server-only and documented", () => {
    const example = read(".env.example")
    const recovery = read("lib/auth/recovery.ts")

    expect(example).toMatch(/AUTH_RECOVERY_SECRET=/)
    expect(example).toMatch(/\/auth\/recovery/)
    expect(recovery).toMatch(/node:crypto/)
    expect(recovery).toMatch(/createDecipheriv/)
    expect(recovery).toMatch(/timingSafeEqual/)
    expect(recovery).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
  })
})
