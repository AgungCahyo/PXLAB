import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { needsOnboarding } from "@/lib/auth/session"
import { authDestination, postAuthPath, safeInternalPath, welcomeHref } from "@/lib/paths"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("onboarding paths", () => {
  it("sends unfinished profiles to welcome with a safe next", () => {
    expect(needsOnboarding({ onboarding_completed_at: null })).toBe(true)
    expect(needsOnboarding({ onboarding_completed_at: "2026-01-01T00:00:00Z" })).toBe(false)
    expect(postAuthPath("id", "/create", null)).toBe("/welcome?next=%2Fcreate")
    expect(postAuthPath("en", "/en/explore", { onboarding_completed_at: null })).toContain(
      "/en/welcome",
    )
    expect(
      postAuthPath("id", "https://evil.test", { onboarding_completed_at: "2026-01-01T00:00:00Z" }),
    ).toBe("/explore")
    expect(welcomeHref("id", "/create")).toContain("next=")
    expect(safeInternalPath("//evil.test")).toBe("/")
    expect(authDestination("id", "/")).toBe("/explore")
  })

  it("wires callback, auth actions, and member gate", () => {
    const migration = read("supabase/migrations/20261118010000_onboarding_completed_at.sql")
    const callback = read("app/auth/callback/route.ts")
    const actions = read("features/auth/actions.ts")
    const profileActions = read("features/profiles/actions.ts")
    const member = read("app/[lang]/(member)/layout.tsx")
    const welcome = read("app/[lang]/(member)/welcome/page.tsx")
    const form = read("components/profiles/WelcomeForm.tsx")
    const config = read("next.config.ts")

    expect(migration).toMatch(/onboarding_completed_at/)
    expect(migration).toMatch(/update public\.profiles/)
    expect(migration).toMatch(/explicit_username/)
    expect(callback).toMatch(/postAuthPath/)
    expect(callback).toMatch(/getCurrentProfile/)
    expect(actions).toMatch(/postAuthPath/)
    expect(profileActions).toMatch(/completeOnboardingAction/)
    expect(profileActions).toMatch(/username_taken/)
    expect(profileActions).toMatch(/23505/)
    expect(member).toMatch(/needsOnboarding/)
    expect(member).toMatch(/\/welcome/)
    expect(welcome).toMatch(/WelcomeForm/)
    expect(form).toMatch(/welcomeCreate/)
    expect(form).toMatch(/welcomeExplore/)
    expect(config).toMatch(/\/welcome/)
  })
})
