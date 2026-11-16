import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")

function walkSource(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      walkSource(full, acc)
      continue
    }
    if (/\.(ts|tsx|js|mjs)$/.test(name)) acc.push(full)
  }
  return acc
}

function readMigration(file: string) {
  return readFileSync(path.join(root, "supabase/migrations", file), "utf8")
}

describe("launch gate E and B — RLS and grants", () => {
  const profiles = readMigration("20261116020000_profiles.sql")
  const creations = readMigration("20261116030000_creations.sql")
  const space = readMigration("20261116040000_space_elements.sql")
  const community = readMigration("20261116050000_community.sql")
  const pixel = readMigration("20261116100000_pixel_creations.sql")
  const conversation = readMigration("20261116110000_artwork_conversation.sql")

  it("enables row level security on application tables", () => {
    expect(profiles).toMatch(/enable row level security/)
    expect(creations).toMatch(/enable row level security/)
    expect(space).toMatch(/enable row level security/)
    expect(community).toMatch(/alter table public.comments enable row level security/)
    expect(community).toMatch(/alter table public.reactions enable row level security/)
    expect(community).toMatch(/alter table public.reports enable row level security/)
  })

  it("does not grant anonymous inserts on member-write tables", () => {
    expect(creations).not.toMatch(/grant insert .* to anon/)
    expect(space).not.toMatch(/grant insert .* to anon/)
    expect(community).not.toMatch(/grant insert .* to anon/)
    expect(community).not.toMatch(/grant insert on table public.reports to anon/)
  })

  it("blocks role escalation and comment status grants to members", () => {
    expect(profiles).not.toMatch(/grant update \(.*role.*\)/i)
    expect(community).not.toMatch(/grant update \(status\) on table public.comments/)
    expect(conversation).toMatch(/grant update \(content, updated_at\) on table public.comments to authenticated/)
  })

  it("keeps pixel drafts private and published covers readable", () => {
    expect(pixel).toMatch(/pixel_objects_select_own/)
    expect(pixel).toMatch(/name like '%\/cover\.png'/)
    expect(pixel).toMatch(/c.status = 'published'/)
    expect(creations).toMatch(/using \(status = 'published'\)/)
  })
})

describe("launch gate B — service role stays off the client", () => {
  it("does not reference SUPABASE_SERVICE_ROLE_KEY in application source", () => {
    const files = [
      ...walkSource(path.join(root, "app")),
      ...walkSource(path.join(root, "components")),
      ...walkSource(path.join(root, "features")),
      ...walkSource(path.join(root, "lib")),
    ]
    const hits = files.filter((file) => readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"))
    expect(hits).toEqual([])
  })
})
