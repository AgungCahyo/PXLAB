import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { avatarFromSeed, defaultAvatarConfig, generateAvatarCandidates } from "@/lib/avatar-gen"
import { needsOnboarding } from "@/lib/auth/session"
import { postAuthPath } from "@/lib/paths"
import { registerSchema } from "@/lib/validations/profile"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("unified registration + identity onboarding", () => {
  it("registers with credentials only", () => {
    expect(
      registerSchema.safeParse({
        email: "a@b.co",
        password: "River9!pixel",
      }).success,
    ).toBe(true)
    expect(
      registerSchema.safeParse({
        email: "a@b.co",
        password: "River9!pixel",
        username: "extra",
      }).success,
    ).toBe(true) // unknown keys stripped by zod object default... actually z.object strips unknown by default
    const actions = read("features/auth/actions.ts")
    const form = read("components/auth/RegisterForm.tsx")
    expect(actions).not.toMatch(/data:\s*\{\s*username:/)
    expect(form).not.toMatch(/name="username"/)
    expect(form).not.toMatch(/name="displayName"/)
    expect(form).toMatch(/name="email"/)
    expect(form).toMatch(/name="password"/)
  })

  it("creates incomplete profiles in migration + trigger", () => {
    const migration = read("supabase/migrations/20261119011000_unified_onboarding.sql")
    expect(migration).toMatch(/alter column username drop not null/)
    expect(migration).toMatch(/where username is not null/)
    expect(migration).toMatch(/avatar_config/)
    expect(migration).toMatch(/values \(new\.id, null, meta_name, null, null\)/)
    expect(migration).toMatch(/onboarding_completed_at/)
  })

  it("routes unfinished profiles to welcome and keeps legacy complete", () => {
    expect(needsOnboarding({ onboarding_completed_at: null })).toBe(true)
    expect(needsOnboarding({ onboarding_completed_at: "2026-01-01" })).toBe(false)
    expect(postAuthPath("id", "/create", null)).toContain("/welcome")
    expect(postAuthPath("id", "/create", { onboarding_completed_at: null })).toContain("/welcome")
    const member = read("app/[lang]/(member)/layout.tsx")
    expect(member).toMatch(/needsOnboarding/)
    expect(member).toMatch(/\/welcome/)
  })

  it("ships avatar step + identity completion without skip-all", () => {
    const welcome = read("components/profiles/WelcomeForm.tsx")
    const actions = read("features/profiles/actions.ts")
    expect(welcome).toMatch(/generateAvatarCandidates/)
    expect(welcome).toMatch(/welcomeAvatarShuffle/)
    expect(welcome).toMatch(/welcomeAvatarSkip/)
    expect(welcome).toMatch(/completeOnboardingAction/)
    expect(welcome).not.toMatch(/skipOnboardingAction/)
    expect(actions).toMatch(/avatar_config/)
    expect(actions).toMatch(/defaultAvatarConfig/)
    expect(actions).not.toMatch(/export async function skipOnboardingAction/)
  })

  it("generates stable default avatars from user id", () => {
    const a = defaultAvatarConfig("user-1")
    const b = defaultAvatarConfig("user-1")
    const c = defaultAvatarConfig("user-2")
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect(generateAvatarCandidates("user-1", 0, 8)).toHaveLength(8)
    expect(avatarFromSeed("user-1").v).toBe(1)
  })
})
