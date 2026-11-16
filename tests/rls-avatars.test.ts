import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20261117006000_avatars_bucket.sql"),
  "utf8",
)

describe("avatars bucket migration", () => {
  it("creates a public avatars bucket capped at 512KB jpeg/png/webp", () => {
    expect(sql).toMatch(/'avatars'/)
    expect(sql).toMatch(/public, file_size_limit, allowed_mime_types/)
    expect(sql).toMatch(/true,\s*524288/)
    expect(sql).toMatch(/image\/jpeg/)
    expect(sql).toMatch(/image\/png/)
    expect(sql).toMatch(/image\/webp/)
  })

  it("allows public read and scopes writes to the owner path prefix", () => {
    expect(sql).toMatch(/avatars_public_select/)
    expect(sql).toMatch(/avatars_insert_own/)
    expect(sql).toMatch(/avatars_update_own/)
    expect(sql).toMatch(/avatars_delete_own/)
    expect(sql).toMatch(/split_part\(name, '\/', 1\) = auth\.uid\(\)::text/)
  })
})
