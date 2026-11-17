import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("community experience fase C", () => {
  const migration = read("supabase/migrations/20261117008000_follows.sql")
  const follows = read("features/community/follows.ts")
  const actions = read("features/community/actions.ts")
  const site = read("lib/site.ts")
  const creationsLib = read("lib/creations.ts")
  const queries = read("features/creations/queries.ts")
  const explorePage = read("app/[lang]/(public)/explore/page.tsx")
  const exploreGallery = read("components/creations/ExploreGallery.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")
  const creatorBlock = read("components/creations/CreatorBlock.tsx")
  const detail = read("app/[lang]/(public)/creation/[id]/page.tsx")
  const card = read("components/creations/CreationCard.tsx")
  const followButton = read("components/community/FollowButton.tsx")

  it("adds follows table with RLS and no self-follow", () => {
    expect(migration).toMatch(/create table public\.follows/)
    expect(migration).toMatch(/follows_no_self/)
    expect(migration).toMatch(/follows_select_own/)
    expect(migration).toMatch(/follows_insert_own/)
    expect(migration).toMatch(/follows_delete_own/)
    expect(site).toMatch(/FOLLOW_PER_HOUR/)
    expect(follows).toMatch(/isFollowing/)
    expect(follows).toMatch(/listFollowingIds/)
    expect(actions).toMatch(/followCreatorAction/)
    expect(actions).toMatch(/unfollowCreatorAction/)
  })

  it("wires Follow on profile and CreatorBlock with guest login", () => {
    expect(profile).toMatch(/FollowButton/)
    expect(profile).toMatch(/isFollowing/)
    expect(creatorBlock).toMatch(/FollowButton/)
    expect(creatorBlock).toMatch(/canFollow/)
    expect(detail).toMatch(/CreatorBlock/)
    expect(detail).toMatch(/authorId=\{creation\.user_id\}/)
    expect(followButton).toMatch(/loginHref/)
  })

  it("supports Explore feed=following without a new route", () => {
    expect(creationsLib).toMatch(/parseExploreFeed/)
    expect(creationsLib).toMatch(/feed === "following"/)
    expect(queries).toMatch(/followingUserIds/)
    expect(explorePage).toMatch(/feed=following|feed === "following"|parseExploreFeed/)
    expect(exploreGallery).toMatch(/ExploreFollowingGuest/)
    expect(exploreGallery).toMatch(/exploreFollowingEmpty/)
    expect(explorePage).not.toMatch(/\/following/)
  })

  it("ships similar works and a dedicated creators page", () => {
    const creatorsPage = read("app/[lang]/(public)/creators/page.tsx")
    const creatorsStrip = read("components/creations/NewCreatorsStrip.tsx")
    const nextConfig = read("next.config.ts")
    expect(queries).toMatch(/listSimilarCreations/)
    expect(queries).toMatch(/listNewCreators/)
    expect(detail).toMatch(/SimilarWorksStrip/)
    expect(explorePage).toMatch(/NewCreatorsStrip|NewCreatorsSlot/)
    expect(creatorsStrip).toMatch(/\/creators/)
    expect(creatorsPage).toMatch(/listNewCreators/)
    expect(creatorsPage).toMatch(/newCreatorsIntro/)
    expect(nextConfig).toMatch(/"\/creators"/)
  })

  it("shows quiet card indicators without appreciation counts", () => {
    expect(queries).toMatch(/commentCount/)
    expect(queries).toMatch(/attachCommentCounts/)
    expect(queries).toMatch(/markNewSince|isNew/)
    expect(card).toMatch(/cardNotesCount/)
    expect(card).toMatch(/feedNewBadge/)
    expect(card).not.toMatch(/appreciateCount|reaction/)
  })
})
