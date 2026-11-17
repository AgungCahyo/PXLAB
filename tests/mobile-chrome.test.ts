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

  it("uses 44px icon-only save/preview/publish on phone and hides the site header", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const css = read("app/globals.css")
    expect(playground).toMatch(/createPreview/)
    expect(playground).toMatch(/createPublish/)
    expect(playground).toMatch(/PixelIcon name="save"/)
    expect(playground).toMatch(/PixelIcon name=\{preview \? "pencil" : "eye"\}/)
    expect(playground).toMatch(/PixelIcon name="publish"/)
    expect(playground).toMatch(/h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-5/)
    expect(playground).toMatch(/hidden sm:inline/)
    expect(playground).not.toMatch(/size="sm"[\s\S]*createPreview|createPreview[\s\S]*size="sm"/)
    expect(playground).toMatch(/top-0[\s\S]*md:top-\[66px\]/)
    expect(playground).toMatch(/playground-toolbar/)
    expect(css).toMatch(/\[data-chrome="playground"\]\) \.site-header/)
    expect(css).toMatch(/body\.playground-open \.site-header/)
    expect(css).not.toMatch(
      /\[data-chrome="playground"\]\) header\s*\{/,
    )
    expect(playground).toMatch(/playground-header/)
    expect(playground).toMatch(/z-\[60\]/)
  })

  it("closes zoom actions and keeps size start reachable with range errors", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const form = read("components/creations/PixelNewForm.tsx")
    expect(playground).toMatch(/zoomBy\(1\)[\s\S]*setMoreOpen\(false\)/)
    expect(playground).toMatch(/zoomBy\(-1\)[\s\S]*setMoreOpen\(false\)/)
    expect(form).toMatch(/sizeRangeError/)
    expect(form).toMatch(/fixed inset-x-0 bottom-\[calc\(4rem/)
    expect(form).toMatch(/error=\{/)
  })

  it("keeps D tools on a full-width scroll row separate from brush/symmetry actions", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const skeleton = read("components/creations/PageSkeletons.tsx")
    expect(playground).toMatch(
      /role="toolbar"[\s\S]*pixelFill[\s\S]*pixelEyedropper[\s\S]*pixelEllipse[\s\S]*playground-brush/,
    )
    expect(playground).toMatch(/flex w-full items-center gap-1\.5 overflow-x-auto/)
    expect(playground).toMatch(/flex w-full flex-wrap items-center gap-1\.5/)
    expect(playground).not.toMatch(
      /flex min-w-0 flex-1 items-center gap-1\.5 overflow-x-auto[\s\S]*flex shrink-0 items-center gap-1\.5/,
    )
    expect(skeleton).toMatch(/tool-\$\{index\}/)
    expect(skeleton).toMatch(/action-\$\{index\}/)
  })
})
