import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("artwork conversation migration", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../supabase/migrations/20261116110000_artwork_conversation.sql"),
    "utf8",
  )

  it("adds one-level parent_id with cascade delete of replies", () => {
    expect(sql).toMatch(/add column if not exists parent_id uuid references public\.comments \(id\) on delete cascade/)
    expect(sql).toMatch(/replies cannot be nested/)
    expect(sql).toMatch(/parent must belong to the same creation/)
  })

  it("lets owners update content and updated_at, never status", () => {
    expect(sql).toMatch(/create policy comments_update_own/)
    expect(sql).toMatch(/grant update \(content, updated_at\) on table public.comments to authenticated/)
    expect(sql).not.toMatch(/grant update \(status\) on table public.comments/)
  })

  it("lets authenticated members read published pixel source so fork can copy it", () => {
    expect(sql).toMatch(/create policy pixel_source_select_published_authenticated/)
    expect(sql).toMatch(/name like '%\/source\.json'/)
    expect(sql).toMatch(/c.status = 'published'/)
  })
})
