import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { DRAFT_UNNAMED_TITLE } from "@/lib/creations"
import { emptyCreationContent } from "@/lib/validations/creation"
import { isVirginPixelDraft } from "@/lib/virgin-draft"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("virgin pixel draft", () => {
  it("detects never-saved size-pick drafts", () => {
    expect(
      isVirginPixelDraft({
        type: "pixel",
        status: "draft",
        title: DRAFT_UNNAMED_TITLE,
        cover_url: null,
        content: emptyCreationContent("pixel", { width: 16, height: 16 }),
      }),
    ).toBe(true)
  })

  it("treats a named draft without source as virgin", () => {
    expect(
      isVirginPixelDraft({
        type: "pixel",
        status: "draft",
        title: "Forest sprite",
        cover_url: null,
        content: emptyCreationContent("pixel"),
      }),
    ).toBe(true)
  })

  it("keeps drafts that already have a cover or source", () => {
    expect(
      isVirginPixelDraft({
        type: "pixel",
        status: "draft",
        title: DRAFT_UNNAMED_TITLE,
        cover_url: "/api/pixel-cover/abc",
        content: emptyCreationContent("pixel"),
      }),
    ).toBe(false)

    const withSource = {
      ...emptyCreationContent("pixel"),
      source_path: "user/id/source.json",
    }
    expect(
      isVirginPixelDraft({
        type: "pixel",
        status: "draft",
        title: DRAFT_UNNAMED_TITLE,
        cover_url: null,
        content: withSource,
      }),
    ).toBe(false)
  })

  it("discards virgin drafts when leaving the playground without work", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const actions = read("features/creations/actions.ts")
    const works = read("components/creations/WorksRow.tsx")
    expect(actions).toMatch(/discardVirginPixelDraftAction/)
    expect(playground).toMatch(/discardVirginPixelDraftAction/)
    expect(playground).toMatch(/discardVirginIfNeeded/)
    expect(works).not.toMatch(/pixelCoverUrl\(item\.id\)/)
  })
})
