import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("mobile chrome — R3", () => {
  it("adds safe-area padding to the tab bar and studio toolbar", () => {
    const css = read("app/globals.css")
    const shell = read("components/layout/PublicShell.tsx")
    expect(css).toMatch(/safe-area-inset-bottom/)
    expect(css).toMatch(/\.app-tabbar/)
    expect(css).toMatch(/\.playground-toolbar/)
    expect(shell).toMatch(/safe-area-inset-bottom/)
  })

  it("uses 44px publish/preview targets and hides the site header on phone studio", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const css = read("app/globals.css")
    expect(playground).toMatch(/createPreview/)
    expect(playground).toMatch(/createPublish/)
    expect(playground).not.toMatch(/size="sm"[\s\S]*createPreview|createPreview[\s\S]*size="sm"/)
    expect(playground).toMatch(/top-0[\s\S]*md:top-\[66px\]/)
    expect(playground).toMatch(/playground-toolbar/)
    expect(css).toMatch(/\[data-chrome="playground"\]\) header/)
  })

  it("closes zoom actions and keeps size start reachable with range errors", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const form = read("components/creations/StudioNewForm.tsx")
    expect(playground).toMatch(/zoomBy\(1\)[\s\S]*setMoreOpen\(false\)/)
    expect(playground).toMatch(/zoomBy\(-1\)[\s\S]*setMoreOpen\(false\)/)
    expect(form).toMatch(/sizeRangeError/)
    expect(form).toMatch(/fixed inset-x-0 bottom-\[calc\(4rem/)
    expect(form).toMatch(/error=\{/)
  })
})
