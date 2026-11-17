import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("community experience fase B", () => {
  const migration = read("supabase/migrations/20261117007000_activity_seen_at.sql")
  const activity = read("features/community/activity.ts")
  const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
  const responses = read("app/[lang]/(member)/responses/page.tsx")
  const nav = read("components/layout/SiteNav.tsx")
  const shell = read("components/layout/PublicShell.tsx")
  const explore = read("app/[lang]/(public)/explore/page.tsx")
  const queries = read("features/creations/queries.ts")
  const createPage = read("app/[lang]/(member)/create/page.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")

  it("adds activity_seen_at for response inbox", () => {
    expect(migration).toMatch(/activity_seen_at/)
    expect(migration).toMatch(/grant update \(activity_seen_at\)/)
    expect(activity).toMatch(/listCreationResponses/)
    expect(activity).toMatch(/markSeen/)
    expect(activity).toMatch(/hasUnseenCreationResponses/)
    expect(activity).toMatch(/unseen/)
    expect(activity).toMatch(/LOOKBACK_MS/)
    expect(activity).not.toMatch(/sinceIso\(profile\.activity_seen_at\)/)
  })

  it("keeps responses as a dedicated page and account menu item", () => {
    const nextConfig = read("next.config.ts")
    expect(responses).toMatch(/ResponsesInbox/)
    expect(responses).toMatch(/markSeen: true/)
    expect(responses).toMatch(/path: "\/responses"/)
    expect(dashboard).not.toMatch(/ResponsesInbox/)
    expect(shell).toMatch(/hasUnseenCreationResponses/)
    expect(nav).toMatch(/\/responses/)
    expect(nav).toMatch(/nav\.responses/)
    expect(profile).toMatch(/\/responses/)
    expect(nextConfig).toMatch(/"\/responses"/)
  })

  it("ships a quiet rack on Explore and create inspiration", () => {
    expect(queries).toMatch(/listQuietPublishedCreations/)
    expect(explore).toMatch(/QuietRack/)
    expect(createPage).toMatch(/CreateInspiration/)
    expect(createPage).toMatch(/listPublishedCreations/)
  })
})
