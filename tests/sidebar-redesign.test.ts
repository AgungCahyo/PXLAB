import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8")
const exists = (file: string) => existsSync(path.resolve(root, file))

describe("Threads-inspired compact sidebar", () => {
  const nav = read("components/layout/SocialNav.tsx")
  const header = read("components/layout/SiteHeader.tsx")
  const css = read("app/globals.css")
  const menu = read("components/layout/MobileMenuSheet.tsx")
  const copy = read("lib/copy-social.ts")

  it("keeps a fixed 72px rail and overlays the expanded labels", () => {
    expect(header).toMatch(/site-header social-rail fixed inset-y-0 left-0 z-50 hidden w-\[72px\]/)
    expect(nav).toMatch(/group\/rail/)
    expect(nav).toMatch(/w-\[72px\]/)
    expect(nav).toMatch(/hover:w-\[248px\]/)
    expect(nav).toMatch(/focus-within:w-\[248px\]/)
    expect(nav).toMatch(/transition-\[width\]/)
    expect(nav).toMatch(/group-hover\/rail:opacity-100/)
    expect(css).toMatch(/padding-left: 4\.5rem/)
    expect(css).not.toMatch(/padding-left: 16rem/)
  })

  it("splits navigation into main, hidden communities, and other feeds", () => {
    expect(nav).toMatch(/COMMUNITIES_READY = false/)
    expect(nav).toMatch(/key: "home"/)
    expect(nav).toMatch(/key: "explore"/)
    expect(nav).toMatch(/key: "messages"/)
    expect(nav).toMatch(/key: "activity"/)
    expect(nav).toMatch(/key: "profile"/)
    expect(nav).toMatch(/key: "insights"/)
    expect(nav).toMatch(/gated\("\/insights"\)/)
    expect(nav).toMatch(/key: "myWorks"/)
    expect(nav).toMatch(/href\(lang, "\/dashboard"\)/)
    expect(nav).toMatch(/key: "saved"/)
    expect(nav).toMatch(/key: "liked"/)
    expect(nav).toMatch(/key: "archive"/)
    expect(nav).toMatch(/group: "other"/)
    expect(nav).toMatch(/t\.otherFeeds\[lang\]/)
    expect(nav).not.toMatch(/href\(lang, "\/challenge"\)[\s\S]{0,160}soon: false/)
    expect(copy).toMatch(/forYou:/)
    expect(copy).toMatch(/messages:/)
    expect(copy).toMatch(/insights:/)
  })

  it("puts a prominent Create button last and moves language to Settings", () => {
    expect(nav).toMatch(/prominent: true/)
    expect(nav).toMatch(/bg-\[#6355d8\] font-semibold text-white/)
    expect(nav).not.toMatch(/LanguageSwitch/)
    expect(nav).toMatch(/href\(lang, "\/settings"\)/)
    expect(read("components/profiles/SettingsForm.tsx")).toMatch(/setModal\("language"\)/)
  })

  it("keeps the new destinations reachable from the mobile menu", () => {
    expect(menu).toMatch(/href\(lang, "\/activity"\)/)
    expect(menu).toMatch(/href\(lang, "\/insights"\)/)
    expect(menu).toMatch(/href\(lang, "\/dashboard"\)/)
    expect(menu).toMatch(/href\(lang, "\/saved"\)/)
    expect(menu).toMatch(/href\(lang, "\/liked"\)/)
    expect(menu).toMatch(/href\(lang, "\/archive"\)/)
  })
})

describe("real Saved, Liked, Archive, Activity, and Insights destinations", () => {
  const migration = read("supabase/migrations/20261125120000_saved_and_archive.sql")
  const actions = read("features/feeds/actions.ts")
  const queries = read("features/feeds/queries.ts")
  const detail = read("app/[lang]/(public)/creation/[id]/page.tsx")
  const config = read("next.config.ts")
  const robots = read("app/robots.ts")

  const routes = [
    ["activity", "activityTitle"],
    ["insights", "insightsTitle"],
    ["saved", "savedTitle"],
    ["liked", "likedTitle"],
    ["archive", "archiveTitle"],
  ] as const

  it("ships additive migrations with owner-scoped policies", () => {
    expect(migration).toMatch(/create table if not exists public\.saved_creations/)
    expect(migration).toMatch(/primary key \(user_id, creation_id\)/)
    expect(migration).toMatch(/saved_creations_select_own/)
    expect(migration).toMatch(/saved_creations_insert_own/)
    expect(migration).toMatch(/saved_creations_update_own/)
    expect(migration).toMatch(/saved_creations_delete_own/)
    expect(migration).toMatch(/add column if not exists archived_at timestamptz/)
    expect(migration).toMatch(/grant select, insert, update, delete on table public\.saved_creations/)
    expect(migration).toMatch(/status = 'published' and archived_at is null/)
    expect(migration).toMatch(/grant update \(archived_at\) on table public\.creations/)
  })

  it("provides server actions with migration-aware failures", () => {
    expect(actions).toMatch(/export async function setSavedStateAction/)
    expect(actions).toMatch(/export async function setArchiveStateAction/)
    expect(actions).toMatch(/onConflict: "user_id,creation_id"/)
    expect(actions).toMatch(/archived_at: desired \? new Date\(\)\.toISOString\(\) : null/)
    expect(actions).toMatch(/creation\.user_id !== profile\.id/)
    expect(actions).toMatch(/migrationMissing\(error\.code, error\.message\)/)
    expect(actions).toMatch(/revalidatePath\(href\(locale, path\)\)/)
  })

  it("backs each page with a real query, not a placeholder", () => {
    expect(queries).toMatch(/export async function listSavedCreations/)
    expect(queries).toMatch(/export async function listLikedCreations/)
    expect(queries).toMatch(/export async function listArchivedCreations/)
    expect(queries).toMatch(/export async function listOwnActivity/)
    expect(queries).toMatch(/export async function getInsightsSummary/)
    expect(queries).toMatch(/from\("reactions"\)/)
    expect(queries).toMatch(/from\("follows"\)/)
  })

  it("exposes Save and Archive controls on the creation detail page", () => {
    expect(detail).toMatch(/SaveCreationButton/)
    expect(detail).toMatch(/ArchiveCreationButton/)
    expect(detail).toMatch(/isCreationSaved\(creation\.id\)/)
    expect(detail).toMatch(/isCreationArchived\(creation\.id\)/)
  })

  it("keeps creation→profile embeds unambiguous after adding saved_creations", () => {
    const creations = read("features/creations/queries.ts")
    expect(creations).toMatch(
      /profiles!creations_user_id_fkey \(username, display_name, avatar_url, avatar_config\)/,
    )
    expect(creations).toMatch(
      /profiles!creations_user_id_fkey \(username, display_name, avatar_url, avatar_config, bio\)/,
    )
    expect(creations).not.toMatch(/profiles \(username, display_name, avatar_url/)
    expect(read("features/community/activity.ts")).toMatch(/profiles!creations_user_id_fkey \(username\)/)
    expect(read("features/moderation/actions.ts")).toMatch(/profiles!creations_user_id_fkey \(username\)/)
  })

  it("registers every new private route and loading fallback", () => {
    for (const [route] of routes) {
      const page = `app/[lang]/(member)/${route}/page.tsx`
      expect(exists(page), page).toBe(true)
      expect(exists(`app/[lang]/(member)/${route}/loading.tsx`)).toBe(true)
      expect(read(page)).toMatch(/export const instant = false/)
      expect(read(page)).toMatch(/noIndex: true/)
      expect(config).toMatch(new RegExp(`"/${route}"`))
      expect(robots).toMatch(new RegExp(`"/${route}"`))
      expect(robots).toMatch(new RegExp(`"/en/${route}"`))
      expect(robots).toMatch(new RegExp(`"/id/${route}"`))
    }
  })
})
