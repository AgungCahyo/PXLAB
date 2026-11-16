import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { canEditProfile } from "@/lib/auth/permissions"

const memberA = "11111111-1111-1111-1111-111111111111"
const memberB = "22222222-2222-2222-2222-222222222222"

describe("two-member profile authorization", () => {
  it("allows member A to edit only member A", () => {
    expect(canEditProfile(memberA, memberA)).toBe(true)
  })

  it("denies member A editing member B", () => {
    expect(canEditProfile(memberA, memberB)).toBe(false)
  })

  it("denies member B editing member A", () => {
    expect(canEditProfile(memberB, memberA)).toBe(false)
  })
})

describe("profiles RLS migration", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../supabase/migrations/20261116020000_profiles.sql"),
    "utf8",
  )

  it("enables row level security", () => {
    expect(sql).toMatch(/enable row level security/)
  })

  it("scopes updates to auth.uid so member A cannot update member B", () => {
    expect(sql).toMatch(/using \(id = auth\.uid\(\)\)/)
    expect(sql).toMatch(/with check \(id = auth\.uid\(\)\)/)
  })

  it("does not grant update on role", () => {
    expect(sql).toMatch(/grant update \(username, display_name, bio, avatar_url, updated_at\)/)
    expect(sql).not.toMatch(/grant update \(.*role.*\)/i)
  })

  it("inserts a requested username as-is so duplicates are rejected", () => {
    expect(sql).toMatch(/candidate := requested;/)
  })
})
