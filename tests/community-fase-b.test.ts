import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("community experience fase B", () => {
  const migration = read("supabase/migrations/20261117007000_activity_seen_at.sql")
  const activity = read("features/community/activity.ts")
  const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
  const activityPage = read("app/[lang]/(member)/activity/page.tsx")
  const responses = read("app/[lang]/(member)/responses/page.tsx")
  const nav = read("components/layout/SiteNav.tsx")
  const shell = read("components/layout/PublicShell.tsx")
  const explore = read("app/[lang]/(public)/explore/page.tsx")
  const queries = read("features/creations/queries.ts")
  const createPage = read("app/[lang]/(member)/create/page.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")

  it("adds activity_seen_at for activity inbox", () => {
    expect(migration).toMatch(/activity_seen_at/)
    expect(migration).toMatch(/grant update \(activity_seen_at\)/)
    expect(activity).toMatch(/listActivityResponses/)
    expect(activity).toMatch(/markSeen/)
    expect(activity).toMatch(/hasUnseenActivityResponses/)
    expect(activity).toMatch(/unseen/)
    expect(activity).toMatch(/LOOKBACK_MS/)
    expect(activity).not.toMatch(/sinceIso\(profile\.activity_seen_at\)/)
  })

  it("keeps /responses as a redirect and routes activity surfaces to /activity", () => {
    const nextConfig = read("next.config.ts")
    expect(activityPage).toMatch(/listActivityResponses/)
    expect(activityPage).toMatch(/markSeen: true/)
    expect(responses).toMatch(/redirect\(href\(raw, "\/activity"\)\)/)
    expect(dashboard).toMatch(/\/activity/)
    expect(dashboard).not.toMatch(/\/responses/)
    expect(shell).toMatch(/hasUnseenActivityResponses/)
    expect(nav).toMatch(/\/activity/)
    expect(nav).not.toMatch(/\/responses/)
    expect(profile).toMatch(/\/activity/)
    expect(nextConfig).toMatch(/source: "\/responses"/)
    expect(nextConfig).toMatch(/destination: "\/activity"/)
  })

  it("ships a quiet rack on Explore and create inspiration", () => {
    expect(queries).toMatch(/listQuietPublishedCreations/)
    expect(explore).toMatch(/QuietRack/)
    expect(createPage).toMatch(/CreateInspiration/)
    expect(createPage).toMatch(/listPublishedCreations/)
  })
})
