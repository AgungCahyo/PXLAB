import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { DRAFT_UNNAMED_TITLE, displayTitle, isUnnamedTitle, titleForStorage } from "@/lib/creations"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("unnamed draft titles", () => {
  it("stores a marker that is not Tanpa judul or Untitled", () => {
    expect(DRAFT_UNNAMED_TITLE).not.toBe("Tanpa judul")
    expect(DRAFT_UNNAMED_TITLE).not.toBe("Untitled")
    expect(isUnnamedTitle(DRAFT_UNNAMED_TITLE)).toBe(true)
    expect(isUnnamedTitle("Tanpa judul")).toBe(true)
    expect(isUnnamedTitle("Sky")).toBe(false)
    expect(titleForStorage("")).toBe(DRAFT_UNNAMED_TITLE)
    expect(titleForStorage("  Moon  ")).toBe("Moon")
    expect(displayTitle("Tanpa judul", "id")).toBe("Belum dinamai")
  })

  it("requires a real title before opening the pixel editor", () => {
    const form = read("components/creations/PixelNewForm.tsx")
    const schema = read("lib/validations/creation.ts")
    expect(form).toMatch(/createTitleLabel/)
    expect(form).toMatch(/createOpenEditor/)
    expect(form).not.toMatch(/DRAFT_UNNAMED_TITLE/)
    expect(form).not.toMatch(/pixelUntitled/)
    expect(schema).toMatch(/isUnnamedTitle/)
    expect(schema).toMatch(/stage_ground/)
  })

  it("blocks publish without a real name in the playground and on the server", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const actions = read("features/creations/actions.ts")
    expect(playground).toMatch(/requestPublish/)
    expect(playground).toMatch(/worksNamePublishTitle/)
    expect(playground).toMatch(/worksPublishDoneTitle/)
    expect(playground).toMatch(/worksNamePlaceholder/)
    expect(actions).toMatch(/title_required/)
    expect(actions).toMatch(/isUnnamedTitle/)
  })
})

describe("My Works delete", () => {
  it("offers delete with confirmation on the work list", () => {
    const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
    const row = read("components/creations/WorksRow.tsx")
    const button = read("components/creations/WorksDeleteButton.tsx")
    expect(dashboard).toMatch(/WorksRow/)
    expect(row).toMatch(/WorksDeleteButton/)
    expect(button).toMatch(/deleteCreationAction/)
    expect(button).toMatch(/DeleteCreationCopy/)
    expect(button).toMatch(/onDeleted/)
    expect(button).toMatch(/createDeleting/)
  })

  it("names the work and warns when published", () => {
    const copyBody = read("components/creations/DeleteCreationCopy.tsx")
    const studio = read("components/creations/StudioForm.tsx")
    expect(copyBody).toMatch(/createDeleteConfirmTitle/)
    expect(copyBody).toMatch(/createDeleteConfirmPublished/)
    expect(studio).toMatch(/StudioDeleteSubmit/)
    expect(studio).toMatch(/createDeleting/)
    expect(studio).toMatch(/DeleteCreationCopy/)
  })
})
