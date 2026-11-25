import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("compact new-artwork dialog", () => {
  const dashboard = read("app/[lang]/(member)/dashboard/page.tsx")
  const createPage = read("app/[lang]/(member)/create/page.tsx")
  const dialog = read("components/creations/NewArtworkDialog.tsx")
  const form = read("components/creations/PixelNewForm.tsx")
  const nav = read("components/layout/SocialNav.tsx")

  it("opens from the dashboard without navigating away", () => {
    expect(dashboard).toMatch(/NewArtworkTrigger/)
    expect(dashboard).not.toMatch(/href=\{href\(lang, "\/create"\)\}/)
    expect(dialog).toMatch(/useState\(false\)/)
    expect(dialog).toMatch(/open=\{open\}/)
  })

  it("opens the same dialog from the nav create button", () => {
    expect(nav).toMatch(/NewArtworkTrigger/)
    expect(nav).toMatch(/modal: Boolean\(member\) && !createActive/)
    expect(nav).toMatch(/staticItem: Boolean\(member\) && createActive/)
    // A <button> shrinks to fit unless told to fill the nav item like the links do.
    expect(nav.match(/cn\(className, "w-full"\)/g)).toHaveLength(4)
  })

  it("keeps the direct /create route returning to works", () => {
    expect(createPage).toMatch(/NewArtworkRouteDialog/)
    expect(dialog).toMatch(/router\.push\(href\(lang, "\/dashboard"\)\)/)
  })

  it("uses a compact single-column form with an inline thumbnail", () => {
    expect(dialog).toMatch(/size="md"/)
    expect(form).toMatch(/h-14 w-14/)
    expect(form).toMatch(/max-md:sticky max-md:bottom-\[calc\(4rem/)
    expect(form).toMatch(/onCancel: \(\) => void/)
    expect(form).not.toMatch(/useRouter/)
    expect(form).not.toMatch(/variant="dialog"/)
  })
})
