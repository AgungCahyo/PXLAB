import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { canMutateSpaceElement, canViewSpaceElement } from "@/lib/auth/permissions"

const memberA = "11111111-1111-1111-1111-111111111111"
const memberB = "22222222-2222-2222-2222-222222222222"

describe("two-member space element authorization", () => {
  it("allows member A to mutate only member A's element", () => {
    expect(canMutateSpaceElement(memberA, memberA)).toBe(true)
    expect(canMutateSpaceElement(memberA, memberB)).toBe(false)
    expect(canMutateSpaceElement(memberB, memberA)).toBe(false)
  })

  it("hides hidden elements from the public", () => {
    expect(
      canViewSpaceElement({
        sessionUserId: null,
        ownerId: memberA,
        status: "active",
        isAdmin: false,
      }),
    ).toBe(true)
    expect(
      canViewSpaceElement({
        sessionUserId: null,
        ownerId: memberA,
        status: "hidden",
        isAdmin: false,
      }),
    ).toBe(false)
  })
})

describe("space_elements RLS migration", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../supabase/migrations/20261116040000_space_elements.sql"),
    "utf8",
  )

  it("enables row level security", () => {
    expect(sql).toMatch(/enable row level security/)
  })

  it("publishes only active rows to public select", () => {
    expect(sql).toMatch(/using \(status = 'active'\)/)
  })

  it("scopes owner mutations to auth.uid", () => {
    expect(sql).toMatch(/using \(user_id = auth\.uid\(\)\)/)
    expect(sql).toMatch(/with check \(user_id = auth\.uid\(\) and status = 'active'\)/)
  })

  it("does not grant update on content or status", () => {
    expect(sql).toMatch(/grant update \(position_x, position_y, updated_at\)/)
    expect(sql).not.toMatch(/grant update \(.*content.*\)/)
    expect(sql).not.toMatch(/grant update \(.*status.*\)/)
  })
})
