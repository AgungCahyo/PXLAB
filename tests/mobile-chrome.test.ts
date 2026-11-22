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
    expect(playground).toMatch(/PixelIcon name="publish"/)
    expect(playground).toMatch(/studio-hit shrink-0/)
    expect(playground).toMatch(/px-0/)
    expect(playground).not.toMatch(/sm:w-auto sm:px-5/)
    expect(playground).not.toMatch(/id="playground-title"/)
    expect(playground).not.toMatch(/size="sm"[\s\S]*createPreview|createPreview[\s\S]*size="sm"/)
    expect(playground).toMatch(/fixed inset-0/)
    expect(playground).not.toMatch(/md:top-\[66px\]/)
    expect(playground).toMatch(/playground-toolbar/)
    // Studio chrome must be local: a body-level `:has()` selector stays true
    // while React retains the old route during a view transition, which hid
    // the nav and locked the document after leaving the studio.
    expect(css).not.toMatch(/body:has\(\[data-chrome="playground"\]\) \.site-header/)
    expect(css).not.toMatch(/body:has\(\[data-chrome="playground"\]\) \.app-tabbar/)
    expect(css).not.toMatch(/body:has\(\[data-chrome="playground"\]\) \{/)
    expect(css).not.toMatch(/playground-open/)
    expect(playground).not.toMatch(/classList\.(add|remove)\("playground-open"\)/)
    expect(playground).toMatch(/const \[navigating, setNavigating\] = useState\(false\)/)
    expect(playground).toMatch(/setNavigating\(true\)[\s\S]*router\.push/)
    expect(playground).toMatch(/if \(navigating\) return null/)
    // Only decorative busy state may be route-scoped; shell nav must never be.
    expect(css).toMatch(/body:has\(\[data-chrome="playground"\]\) \.corner-busy-shell/)
    expect(css).toMatch(/\.playground-header[\s\S]*safe-area-inset-top/)
    expect(css).not.toMatch(
      /\[data-chrome="playground"\]\) header\s*\{/,
    )
    expect(playground).toMatch(/playground-header/)
    expect(playground).toMatch(/z-\[60\]/)
    const busy = read("components/layout/CornerBusy.tsx")
    expect(busy).not.toMatch(/pixelWorldSceneFromPath/)
  })

  it("closes zoom actions and keeps size start reachable with range errors", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const form = read("components/creations/PixelNewForm.tsx")
    expect(playground).toMatch(/zoomBy\(1\)[\s\S]*setMoreOpen\(false\)/)
    expect(playground).toMatch(/zoomBy\(-1\)[\s\S]*setMoreOpen\(false\)/)
    expect(form).toMatch(/sizeRangeError/)
    expect(form).toMatch(/bottom-\[calc\(4rem/)
    expect(form).toMatch(/error=\{/)
  })

  it("keeps D tools on a full-width scroll row separate from brush/symmetry actions", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const skeleton = read("components/creations/PageSkeletons.tsx")
    const css = read("app/globals.css")
    expect(playground).toMatch(/pixelFill/)
    expect(playground).toMatch(/pixelEyedropper/)
    expect(playground).toMatch(/pixelEllipse/)
    expect(playground).toMatch(/pixelBrushSize/)
    expect(playground).toMatch(/role="toolbar"/)
    expect(playground).toMatch(/md:hidden/)
    expect(playground).toMatch(/flex w-full items-center gap-1\.5 overflow-x-auto/)
    expect(playground).toMatch(/flex w-full flex-wrap items-center gap-1\.5/)
    expect(playground).toMatch(/playground-tool-rail/)
    expect(playground).toMatch(/StudioContextMenu/)
    expect(playground).toMatch(/pixelViewControls/)
    expect(playground).toMatch(/renderZoomWell/)
    expect(playground).toMatch(/editor-status/)
    expect(playground).toMatch(/editor-mobile-view/)
    expect(playground).toMatch(/hidden md:block[\s\S]*renderZoomWell/)
    expect(playground).toMatch(/StudioInspector/)
    expect(read("components/creations/StudioInspector.tsx")).toMatch(/pixelStatusShortcuts/)
    expect(playground).toMatch(/pixelCanvasSize/)
    expect(playground).toMatch(/pixelDiscard/)
    expect(playground).toMatch(/onHoverCell/)
    expect(playground).toMatch(/overflow-x-hidden overflow-y-auto/)
    expect(css).toMatch(/\.playground-tool-rail[\s\S]*overflow-y: auto/)
    expect(playground).not.toMatch(/viewChrome/)
    expect(playground).not.toMatch(
      /flex min-w-0 flex-1 items-center gap-1\.5 overflow-x-auto[\s\S]*flex shrink-0 items-center gap-1\.5/,
    )
    expect(skeleton).toMatch(/tool-\$\{index\}/)
    expect(skeleton).toMatch(/action-\$\{index\}/)
    expect(skeleton).toMatch(/editor-mobile-view/)
    expect(skeleton).toMatch(/editor-status/)
  })
})
