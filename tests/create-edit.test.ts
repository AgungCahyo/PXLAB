import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("canvas size selection", () => {
  const css = read("app/globals.css")
  const form = read("components/creations/StudioNewForm.tsx")

  it("uses a selected class that .pixel-frame cannot override", () => {
    expect(css).toMatch(/\.pixel-choice\[aria-pressed="true"\]/)
    expect(form).toMatch(/pixel-choice/)
    expect(form).not.toMatch(/pixel-frame/)
    expect(form).toMatch(/sizeSelected/)
  })
})

describe("edit existing work instead of copying it", () => {
  const createPage = read("app/[lang]/(member)/create/page.tsx")
  const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
  const detail = read("app/[lang]/(public)/creation/[id]/page.tsx")
  const fork = read("features/creations/actions.ts")

  it("keeps Create as new-work only and lists own works on My Works", () => {
    expect(createPage).toMatch(/StudioNewForm/)
    expect(createPage).toMatch(/createManageLink/)
    expect(createPage).toMatch(/\/dashboard/)
    expect(createPage).not.toMatch(/listOwnCreations/)
    expect(createPage).not.toMatch(/data-chrome="studio"/)
    const row = read("components/creations/WorksRow.tsx")
    expect(dashboard).toMatch(/listOwnCreations/)
    expect(dashboard).toMatch(/WorksRow/)
    expect(row).toMatch(/worksContinue/)
    expect(row).toMatch(/\/create\/\$\{item\.id\}/)
  })

  it("gives the owner an edit CTA on the public page and hides self-fork", () => {
    expect(detail).toMatch(/createEditThis/)
    expect(detail).toMatch(/\/create\/\$\{creation\.id\}/)
    expect(detail).toMatch(/allowFork=\{!isOwner\}/)
  })

  it("opens the original when the owner tries to fork their own work", () => {
    expect(fork).toMatch(/source\.user_id === profile\.id/)
    expect(fork).toMatch(/\/create\/\$\{source\.id\}/)
  })
})
