import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { canMutateCreation } from "@/lib/auth/permissions"

const sql = readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20261116100000_pixel_creations.sql"),
  "utf8",
)

const memberA = "11111111-1111-1111-1111-111111111111"
const memberB = "22222222-2222-2222-2222-222222222222"

describe("pixel creations migration", () => {
  it("adds pixel to the type allowlist without rewriting the original table", () => {
    expect(sql).toMatch(/check \(type in \('pixel', 'text', 'visual', 'idea', 'story'\)\)/)
    expect(sql).not.toMatch(/create table public\.creations/)
  })

  it("keeps the pixel bucket private and size-capped", () => {
    expect(sql).toMatch(/'pixel-creations'/)
    expect(sql).toMatch(/public, file_size_limit, allowed_mime_types/)
    expect(sql).toMatch(/false,\s*524288/)
    expect(sql).toMatch(/application\/json/)
    expect(sql).toMatch(/image\/png/)
  })

  it("scopes object writes to the owner path prefix", () => {
    expect(sql).toMatch(/split_part\(name, '\/', 1\) = auth\.uid\(\)::text/)
    expect(sql).toMatch(/pixel_objects_insert_own/)
    expect(sql).toMatch(/pixel_objects_update_own/)
    expect(sql).toMatch(/pixel_objects_delete_own/)
  })

  it("publishes only published cover png objects", () => {
    expect(sql).toMatch(/name like '%\/cover\.png'/)
    expect(sql).toMatch(/c\.status = 'published'/)
    expect(sql).not.toMatch(/name like '%\/source\.json'/)
  })
})

describe("pixel object ownership", () => {
  it("does not let member B mutate member A's creation", () => {
    expect(canMutateCreation(memberB, memberA)).toBe(false)
    expect(canMutateCreation(memberA, memberA)).toBe(true)
  })
})
