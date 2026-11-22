import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("artwork detail hierarchy", () => {
  const page = read("app/[lang]/(public)/creation/[id]/page.tsx")
  const community = read("components/community/CreationCommunity.tsx")

  it("puts the pixel artwork above the title and engagement", () => {
    expect(page).toMatch(/isPixel \? \([\s\S]*?<CreationBody[\s\S]*?\{identity\}/)
    expect(page).toMatch(/CreationEngagement/)
    expect(page).toMatch(/<CreationCommunity/)
    expect(page).toMatch(/font-semibold leading-snug/)
    expect(page).toMatch(/displayTitle/)
    expect(page).not.toMatch(/pixel-title/)
    expect(page).not.toMatch(/page-heading-sans/)
  })

  it("links artwork detail back to Explore", () => {
    expect(page).toMatch(/creationBack/)
    expect(page).toMatch(/href\(lang, "\/explore"\)/)
    expect(page).toMatch(/\/explore/)
    expect(page).not.toMatch(/BackLink/)
  })

  it("keeps engagement with the artwork shell and streams only conversation", () => {
    expect(page).toMatch(/getReactionSummary/)
    expect(page).toMatch(/CreationEngagement/)
    expect(page).toMatch(/Suspense[\s\S]*CreationConversationSlot/)
    expect(page).not.toMatch(/CreationEngagementSlot/)
    expect(page).toMatch(/priority/)
    expect(page.indexOf("CreationEngagement")).toBeLessThan(
      page.indexOf("CreationConversationSlot"),
    )
  })

  it("streams comments before deferred recommendations", () => {
    expect(page.indexOf("<CreationConversationSlot")).toBeLessThan(
      page.indexOf("<CreatorOtherWorksSlot"),
    )
    expect(page.indexOf("<CreationConversationSlot")).toBeLessThan(
      page.indexOf("<SimilarWorksLazy"),
    )
    expect(page).not.toMatch(/await Promise\.all\(\[\s*listPublishedCreationsByUser/)
    expect(page).toMatch(/SimilarWorksLazy/)
    expect(page).toMatch(/countPublishedRemixes/)
    expect(page).toMatch(/RecommendationSkeleton/)
  })

  it("adds download More menu outside engagement and keeps remix beside appreciate", () => {
    expect(page).toMatch(/<CreationEngagement[\s\S]*?<CreationMoreMenu/)
    expect(page).toMatch(/allowFork=\{!isOwner\}/)
    expect(page).toMatch(/CreatorBlock/)
    expect(page).toMatch(/RemixStrip/)
    expect(community).toMatch(/ForkForm/)
    expect(community).toMatch(/AppreciateForm/)
    expect(page).not.toMatch(/AppreciateForm/)
  })

  it("keeps conversation rules and moves engagement out of the thread header", () => {
    expect(community).toMatch(/export function CreationEngagement/)
    expect(community).toMatch(/ConversationComposer/)
    expect(community).toMatch(/parentId/)
    expect(community.indexOf("AppreciateForm")).toBeGreaterThan(
      community.indexOf("export function CreationEngagement"),
    )
  })
})
