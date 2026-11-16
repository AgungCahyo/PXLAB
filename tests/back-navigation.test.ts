import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("back and cancel keep unsaved work", () => {
  const playground = read("components/creations/PlaygroundForm.tsx")
  const studio = read("components/creations/StudioForm.tsx")
  const settings = read("components/profiles/SettingsForm.tsx")

  it("saves the pixel draft before leaving the playground", () => {
    expect(playground).toMatch(/updatePixelCreationAction/)
    expect(playground).toMatch(/beforeunload/)
    expect(playground).toMatch(/\/dashboard/)
    expect(playground).not.toMatch(/href=\{href\(lang, "\/create"\)\}/)
  })

  it("saves a legacy draft before returning to My Works", () => {
    expect(studio).toMatch(/createBackToWorks/)
    expect(studio).toMatch(/intent", "draft"/)
    expect(studio).toMatch(/beforeunload/)
    expect(studio).toMatch(/\/dashboard/)
  })

  it("saves profile edits before returning to the profile", () => {
    expect(settings).toMatch(/settingsBack/)
    expect(settings).toMatch(/updateProfileAction/)
    expect(settings).toMatch(/beforeunload/)
  })
})
