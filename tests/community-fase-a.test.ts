import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("community experience fase A", () => {
  const card = read("components/creations/CreationCard.tsx")
  const queries = read("features/creations/queries.ts")
  const detail = read("app/[lang]/(public)/creation/[id]/page.tsx")
  const community = read("components/community/CreationCommunity.tsx")
  const playground = read("components/creations/PlaygroundForm.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")
  const createPage = read("app/[lang]/(member)/create/page.tsx")

  it("routes gallery cards to creators via avatar and username", () => {
    expect(queries).toMatch(/avatar_url/)
    expect(queries).toMatch(/PROFILE_CARD_EMBED/)
    expect(card).toMatch(/ProfileAvatar/)
    expect(card).toMatch(/\/u\/\$\{creation\.author\.username\}/)
    expect(card).toMatch(/absolute inset-0/)
  })

  it("surfaces creator block, remix lineage, and contextual notes on detail", () => {
    expect(detail).toMatch(/CreatorBlock/)
    expect(detail).toMatch(/listPublishedRemixes/)
    expect(detail).toMatch(/conversationPromptSize/)
    expect(community).toMatch(/GuestConversationComposer/)
    expect(community).toMatch(/remixSignIn|ForkForm/)
  })

  it("filters public profiles to pixel works and shows join meta", () => {
    expect(queries).toMatch(/options\.type \?\? "pixel"/)
    expect(profile).toMatch(/memberSince/)
    expect(profile).toMatch(/profileWorksCount/)
    expect(profile).toMatch(/type: "pixel"/)
  })

  it("enriches publish done and caption nudge", () => {
    expect(playground).toMatch(/worksPublishCaptionNudgeTitle/)
    expect(playground).toMatch(/worksPublishDoneBody/)
    expect(playground).toMatch(/share/)
    expect(playground).toMatch(/remixOf/)
  })

  it("renames the new-canvas form to PixelNewForm", () => {
    expect(createPage).toMatch(/NewArtworkRouteDialog/)
    expect(read("components/creations/PixelNewForm.tsx")).toMatch(/export function PixelNewForm/)
  })
})
