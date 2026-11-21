import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("typography roles", () => {
  const css = read("app/globals.css")
  const header = read("components/layout/SiteHeader.tsx")
  const lang = read("components/layout/LanguageSwitch.tsx")
  const dialog = read("components/ui/Dialog.tsx")
  const explore = read("app/[lang]/(public)/explore/page.tsx")
  const create = read("app/[lang]/(member)/create/page.tsx")
  const detail = read("app/[lang]/(public)/creation/[id]/page.tsx")
  const profile = read("app/[lang]/(public)/u/[username]/page.tsx")
  const community = read("components/community/CreationCommunity.tsx")

  it("defines Press Start for titles/kickers and DM Sans for body", () => {
    expect(css).toMatch(/--pixel-title-size/)
    expect(css).toMatch(/--pixel-kicker-size/)
    expect(css).toMatch(/--pixel-brand-size/)
    expect(css).toMatch(/\.pixel-title/)
    expect(css).toMatch(/\.pixel-kicker/)
    expect(css).toMatch(/\.pixel-brand/)
    expect(css).toMatch(/\.page-heading-sans/)
    expect(css).toMatch(/body \{[\s\S]*font-family: var\(--font-sans\)/)
    expect(css).toMatch(/--text-body: 0\.9375rem/)
  })

  it("keeps chrome brand pixel and language switch on sans", () => {
    expect(header).toMatch(/pixel-brand/)
    expect(header).not.toMatch(/font-pixel text-\[10px\]/)
    expect(lang).not.toMatch(/font-pixel/)
    expect(lang).toMatch(/text-\[12px\] font-medium/)
  })

  it("uses pixel page titles and sans for long user content", () => {
    const pageHeader = read("components/ui/PageHeader.tsx")
    expect(pageHeader).toMatch(/pixel-title/)
    // Explore is search-led: an accessible h1, no visible title bar.
    expect(explore).toMatch(/<h1 className="sr-only">/)
    expect(create).toMatch(/PageHeader/)
    expect(dialog).toMatch(/pixel-title/)
    expect(detail).toMatch(/page-heading-sans/)
    expect(detail).not.toMatch(/pixel-title/)
    expect(profile).toMatch(/page-heading-sans/)
    expect(profile).toMatch(/pixel-kicker/)
    expect(community).toMatch(/pixel-title/)
  })
})

