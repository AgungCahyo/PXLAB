import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("instant interaction — appreciation", () => {
  const community = read("components/community/CreationCommunity.tsx")

  it("applies optimistic appreciate state before the server returns", () => {
    expect(community).toMatch(/toggleAppreciationAction\(null, formData\)/)
    expect(community).toMatch(/flushSync/)
    expect(community).toMatch(/setAppreciated\(next\)/)
    expect(community).toMatch(/previous\.appreciated/)
    expect(community).toMatch(/pendingRef\.current/)
    expect(community).toMatch(/variant=\{appreciated \? "secondary" : "outline"\}/)
    expect(community).toMatch(/type="button"/)
    expect(community).toMatch(/disabled:opacity-100/)
    expect(community).not.toMatch(
      /useActionState<CommunityActionState, FormData>\(\s*toggleAppreciationAction/,
    )
  })
})

describe("instant interaction — route loading shells", () => {
  it("provides page-specific loading UI for key destinations", () => {
    expect(read("app/[lang]/(public)/creation/[id]/loading.tsx")).toMatch(/ArtworkDetailSkeleton/)
    expect(read("app/[lang]/(public)/u/[username]/loading.tsx")).toMatch(/ProfileLoadingSkeleton|ProfileSkeleton/)
    expect(read("app/[lang]/(member)/dashboard/loading.tsx")).toMatch(/WorksSkeleton/)
    expect(read("app/[lang]/(member)/create/loading.tsx")).toMatch(/CreateSkeleton/)
    expect(read("app/[lang]/(member)/create/[id]/loading.tsx")).toMatch(/StudioSkeleton/)
  })
})

describe("instant interaction — conversation retry", () => {
  const community = read("components/community/CreationCommunity.tsx")

  it("keeps failed optimistic notes with retry instead of dropping them", () => {
    expect(community).toMatch(/sendStatus/)
    expect(community).toMatch(/retryFailed/)
    expect(community).toMatch(/discardFailed/)
    expect(community).toMatch(/conversationSendFailed/)
    expect(community).toMatch(/conversationRetry/)
    expect(community).toMatch(/aria-busy=\{sendStatus === "sending"/)
  })
})

describe("instant interaction — works delete", () => {
  it("hides the My Works row as soon as delete is confirmed", () => {
    const row = read("components/creations/WorksRow.tsx")
    const button = read("components/creations/WorksDeleteButton.tsx")
    expect(row).toMatch(/onDeleted=\{\(\) => setRemoved\(true\)\}/)
    expect(button).toMatch(/onSubmit=\{\(\) => \{/)
    expect(button).toMatch(/onDeleted\?\.\(\)/)
  })
})

describe("instant interaction — published creation fetch", () => {
  it("dedupes getPublishedCreation with React cache", () => {
    const queries = read("features/creations/queries.ts")
    expect(queries).toMatch(/import \{ cache \} from "react"/)
    expect(queries).toMatch(/export const getPublishedCreation = cache\(/)
  })

  it("loads detail artwork with high fetch priority", () => {
    expect(read("components/creations/PixelArt.tsx")).toMatch(/fetchPriority=\{priority \? "high"/)
    expect(read("app/[lang]/(public)/creation/[id]/page.tsx")).toMatch(/priority/)
  })
})
