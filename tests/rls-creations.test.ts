import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { canMutateCreation, canViewCreation } from "@/lib/auth/permissions"

const memberA = "11111111-1111-1111-1111-111111111111"
const memberB = "22222222-2222-2222-2222-222222222222"

describe("two-member creation authorization", () => {
  it("allows member A to mutate only member A's creation", () => {
    expect(canMutateCreation(memberA, memberA)).toBe(true)
    expect(canMutateCreation(memberA, memberB)).toBe(false)
    expect(canMutateCreation(memberB, memberA)).toBe(false)
  })

  it("hides drafts and hidden works from the public", () => {
    expect(
      canViewCreation({
        sessionUserId: null,
        ownerId: memberA,
        status: "published",
        isAdmin: false,
      }),
    ).toBe(true)
    expect(
      canViewCreation({
        sessionUserId: null,
        ownerId: memberA,
        status: "draft",
        isAdmin: false,
      }),
    ).toBe(false)
    expect(
      canViewCreation({
        sessionUserId: null,
        ownerId: memberA,
        status: "hidden",
        isAdmin: false,
      }),
    ).toBe(false)
  })

  it("lets the owner and an admin view a draft", () => {
    expect(
      canViewCreation({
        sessionUserId: memberA,
        ownerId: memberA,
        status: "draft",
        isAdmin: false,
      }),
    ).toBe(true)
    expect(
      canViewCreation({
        sessionUserId: memberB,
        ownerId: memberA,
        status: "draft",
        isAdmin: true,
      }),
    ).toBe(true)
  })
})

describe("creations RLS migration", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../supabase/migrations/20261116030000_creations.sql"),
    "utf8",
  )

  it("enables row level security", () => {
    expect(sql).toMatch(/enable row level security/)
  })

  it("publishes only published rows to public select", () => {
    expect(sql).toMatch(/using \(status = 'published'\)/)
  })

  it("scopes owner mutations to auth.uid", () => {
    expect(sql).toMatch(/using \(user_id = auth\.uid\(\)\)/)
    expect(sql).toMatch(/with check \(user_id = auth\.uid\(\) and status in \('draft', 'published'\)\)/)
  })

  it("does not grant update on user_id or type", () => {
    expect(sql).toMatch(/grant update \(title, content, cover_url, status, published_at, updated_at\)/)
    expect(sql).not.toMatch(/grant update \(.*user_id.*\)/)
    expect(sql).not.toMatch(/grant update \(.*\btype\b.*\)/)
  })
})
