import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { authDestination, loginHref, safeInternalPath } from "@/lib/paths"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("safe return after sign-in", () => {
  it("only accepts same-origin paths", () => {
    expect(safeInternalPath("/creation/abc")).toBe("/creation/abc")
    expect(safeInternalPath("//evil.test")).toBe("/")
    expect(safeInternalPath("https://evil.test")).toBe("/")
    expect(safeInternalPath("../escape")).toBe("/")
    expect(authDestination("id", "/")).toBe("/explore")
    expect(authDestination("en", "/en/creation/1")).toBe("/en/creation/1")
    expect(loginHref("id", "/creation/1")).toContain("next=")
  })

  it("threads next through auth forms and member gate", () => {
    const login = read("app/[lang]/(auth)/login/page.tsx")
    const form = read("components/auth/LoginForm.tsx")
    const actions = read("features/auth/actions.ts")
    const member = read("app/[lang]/(member)/layout.tsx")
    const community = read("components/community/CreationCommunity.tsx")
    const callback = read("app/auth/callback/route.ts")

    expect(login).toMatch(/searchParams/)
    expect(form).toMatch(/name="next"/)
    expect(actions).toMatch(/authDestination/)
    expect(member).toMatch(/loginHref/)
    expect(member).toMatch(/x-pathname/)
    expect(community).toMatch(/loginHref/)
    expect(callback).toMatch(/safeInternalPath/)
  })
})

describe("navigation icons", () => {
  it("keeps tab labels and adds pixel icons", () => {
    const nav = read("components/layout/SiteNav.tsx")
    const icons = read("components/ui/PixelIcon.tsx")
    expect(nav).toMatch(/PixelIcon/)
    expect(nav).toMatch(/icon: "grid"/)
    expect(nav).toMatch(/icon: "pencil"/)
    expect(nav).toMatch(/icon: "user"/)
    expect(nav).toMatch(/nav\.explore/)
    expect(icons).toMatch(/user:/)
    expect(icons).toMatch(/folder:/)
  })
})

describe("auth UX — R2", () => {
  it("shows a guest Join CTA on small screens", () => {
    const nav = read("components/layout/SiteNav.tsx")
    expect(nav).toMatch(/md:hidden/)
    expect(nav).toMatch(/registerHref\(lang, authNext\)/)
    expect(nav).toMatch(/nav\.join/)
  })

  it("distinguishes unconfirmed email and returns field errors", () => {
    const actions = read("features/auth/actions.ts")
    const errors = read("lib/auth/errors.ts")
    expect(errors).toMatch(/mapLoginError/)
    expect(errors).toMatch(/email_not_confirmed/)
    expect(actions).toMatch(/mapLoginError/)
    expect(actions).toMatch(/fieldsFromZod/)
    expect(actions).toMatch(/resendRegisterEmailAction/)
    expect(actions).toMatch(/needsEmail: true, email:/)
  })

  it("makes the post-register screen actionable", () => {
    const form = read("components/auth/RegisterForm.tsx")
    expect(form).toMatch(/registerResend/)
    expect(form).toMatch(/registerChangeEmail/)
    expect(form).toMatch(/registerEmailSentTo/)
    expect(form).toMatch(/error=\{emailError\}/)
  })

  it("surfaces login field and process feedback", () => {
    const form = read("components/auth/LoginForm.tsx")
    expect(form).toMatch(/loginSubmitting/)
    expect(form).toMatch(/error=\{emailError\}/)
    expect(form).toMatch(/error=\{passwordError\}/)
  })

  it("offers Google OAuth on login and register", () => {
    const login = read("components/auth/LoginForm.tsx")
    const register = read("components/auth/RegisterForm.tsx")
    const actions = read("features/auth/actions.ts")
    const callback = read("app/auth/callback/route.ts")
    expect(login).toMatch(/GoogleAuthButton/)
    expect(register).toMatch(/GoogleAuthButton/)
    expect(actions).toMatch(/signInWithOAuth/)
    expect(actions).toMatch(/provider: "google"/)
    expect(callback).toMatch(/exchangeCodeForSession/)
    expect(callback).toMatch(/error=oauth/)
  })
})

describe("password recovery — R8", () => {
  it("links login to forgot-password and keeps next safe", () => {
    const login = read("components/auth/LoginForm.tsx")
    const paths = read("lib/paths.ts")
    const config = read("next.config.ts")
    expect(login).toMatch(/forgotPasswordHref/)
    expect(login).toMatch(/loginForgotPassword/)
    expect(paths).toMatch(/forgotPasswordHref/)
    expect(paths).toMatch(/resetPasswordHref/)
    expect(config).toMatch(/\/forgot-password/)
    expect(config).toMatch(/\/reset-password/)
  })

  it("requests reset via Supabase and lands on reset after callback", () => {
    const actions = read("features/auth/actions.ts")
    const forgot = read("app/[lang]/(auth)/forgot-password/page.tsx")
    const reset = read("app/[lang]/(auth)/reset-password/page.tsx")
    const callback = read("app/auth/callback/route.ts")
    expect(actions).toMatch(/resetPasswordForEmail/)
    expect(actions).toMatch(/updateUser\(\{ password/)
    expect(actions).toMatch(/resetPasswordHref/)
    expect(actions).toMatch(/safeInternalPath|authDestination/)
    expect(forgot).toMatch(/ForgotPasswordForm/)
    expect(reset).toMatch(/ResetPasswordForm/)
    expect(reset).toMatch(/getSessionUserId/)
    expect(callback).toMatch(/safeInternalPath/)
  })
})
