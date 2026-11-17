import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { DRAFT_UNNAMED_TITLE } from "@/lib/creations"
import { createDraftSchema } from "@/lib/validations/creation"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("pixel studio redesign S0–S1", () => {
  it("rejects unnamed titles on create", () => {
    expect(
      createDraftSchema.safeParse({
        title: DRAFT_UNNAMED_TITLE,
        type: "pixel",
        width: 64,
        height: 64,
      }).success,
    ).toBe(false)
    expect(
      createDraftSchema.safeParse({
        title: "Naga biru",
        type: "pixel",
        width: 64,
        height: 64,
        stage_ground: "ink",
      }).success,
    ).toBe(true)
  })

  it("uses Commons presets and a title field on the new-artwork form", () => {
    const form = read("components/creations/PixelNewForm.tsx")
    expect(form).toMatch(/PIXEL_SIZE_PRESETS/)
    expect(form).toMatch(/createTitlePlaceholder/)
    expect(form).toMatch(/canvasBackground/)
    expect(form).toMatch(/createOpenEditor/)
    expect(form).toMatch(/sizePixelCount/)
    expect(form).toMatch(/formatGroupedCount/)
    expect(form).not.toMatch(/toLocaleString/)
    expect(form).not.toMatch(/4096/)
  })

  it("moves desktop palette and tool options into the inspector", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const inspector = read("components/creations/StudioInspector.tsx")
    expect(inspector).toMatch(/studio-inspector/)
    expect(inspector).toMatch(/pixelShortcuts/)
    expect(playground).toMatch(/StudioInspector/)
    expect(playground).not.toMatch(/hidden shrink-0 border-t-\[3px\][\s\S]*paletteRow/)
  })

  it("keeps the studio header slim and the tool rail vertical", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    expect(playground).toMatch(/renderZoomWell/)
    expect(playground).not.toMatch(/renderViewControls/)
    expect(playground).toMatch(/overflow-x-hidden overflow-y-auto/)
    expect(playground).toMatch(/setCanvasSizeOpen\(true\)/)
    expect(playground).toMatch(/setDiscardOpen\(true\)/)
    expect(playground).toMatch(/displayTitle\(title, lang\)/)
    expect(playground).not.toMatch(/id="playground-title"/)
  })

  it("lists the full live studio tool rail", () => {
    const playground = read("components/creations/PlaygroundForm.tsx")
    const icons = read("components/ui/PixelIcon.tsx")
    expect(playground).toMatch(/pixelSquareBrush/)
    expect(playground).toMatch(/pixelCircleBrush/)
    expect(playground).toMatch(/toolButton\("polygon"/)
    expect(playground).toMatch(/toolButton\("bezier"/)
    expect(playground).toMatch(/toolButton\("text"/)
    expect(playground).toMatch(/toolButton\("gradient"/)
    expect(playground).toMatch(/toolButton\("selectContiguous"/)
    expect(playground).toMatch(/toolButton\("selectColor"/)
    expect(playground).toMatch(/toolButton\("lasso"/)
    expect(playground).not.toMatch(/onTextRequest/)
    expect(playground).not.toMatch(/pixelTextStamp/)
    expect(playground).not.toMatch(/comingTool/)
    expect(playground).not.toMatch(/pixelToolComing/)
    expect(playground).toMatch(/editor-tool-divider/)
    expect(icons).toMatch(/lasso:/)
    expect(icons).toMatch(/bezier:/)
    const board = read("components/canvas/PixelBoard.tsx")
    expect(board).toMatch(/pixel-text-box/)
    expect(board).toMatch(/pixelTextResize/)
    expect(board).toMatch(/type TextMode = \"point\" \| \"paragraph\"/)
    expect(board).toMatch(/PARAGRAPH_HANDLES/)
    expect(board).toMatch(/beginEditPlacedText/)
  })

  it("exposes paste and selection shortcuts in the studio chrome", () => {
    const inspector = read("components/creations/StudioInspector.tsx")
    const playground = read("components/creations/PlaygroundForm.tsx")
    const board = read("components/canvas/PixelBoard.tsx")
    const copyFile = read("lib/copy.ts")
    expect(inspector).toMatch(/pixelPaste/)
    expect(inspector).toMatch(/hasClipboard/)
    expect(playground).toMatch(/onPaste/)
    expect(playground).toMatch(/onClipboardChange/)
    expect(playground).toMatch(/onEditFeedback/)
    expect(playground).toMatch(/selectionActions/)
    expect(board).toMatch(/hasClipboard/)
    expect(board).toMatch(/clipboard-empty/)
    expect(copyFile).toMatch(/Ctrl\+C\/X\/V/)
    expect(copyFile).toMatch(/V\/W\/K\/S/)
    expect(copyFile).toMatch(/pixelCopied/)
  })

  it("uses SizeSlider and shape Apply/Cancel draft controls", () => {
    const inspector = read("components/creations/StudioInspector.tsx")
    const playground = read("components/creations/PlaygroundForm.tsx")
    const board = read("components/canvas/PixelBoard.tsx")
    const slider = read("components/ui/SizeSlider.tsx")
    expect(slider).toMatch(/type="range"/)
    expect(slider).toMatch(/PIXEL_STROKE_MAX/)
    expect(inspector).toMatch(/SizeSlider/)
    expect(inspector).toMatch(/pixelShapeApply/)
    expect(inspector).toMatch(/pixelShapeCancel/)
    expect(inspector).toMatch(/pixelStrokeWidth/)
    expect(inspector).not.toMatch(/PIXEL_BRUSH_SIZES\.map/)
    expect(playground).toMatch(/showShapeOptions/)
    expect(playground).toMatch(/tool === \"polygon\"/)
    expect(playground).toMatch(/onShapeDraftChange/)
    expect(playground).toMatch(/SizeSlider/)
    expect(board).toMatch(/applyShapeDraft/)
    expect(board).toMatch(/rasterizeCubicPath/)
    expect(board).toMatch(/rasterizePolygon/)
    expect(board).toMatch(/kind: \"polygon\"/)
    expect(board).toMatch(/type ShapeDraft/)
  })

  it("defines shared studio density tokens for responsive chrome", () => {
    const css = read("app/globals.css")
    const playground = read("components/creations/PlaygroundForm.tsx")
    expect(css).toMatch(/--studio-hit/)
    expect(css).toMatch(/--studio-control/)
    expect(css).toMatch(/--studio-thumb/)
    expect(css).toMatch(/\.studio-hit/)
    expect(css).toMatch(/max-width: 767\.98px/)
    expect(css).not.toMatch(/transform:\s*scale\(/)
    expect(playground).toMatch(/studio-hit/)
    expect(playground).toMatch(/studio-stack/)
    expect(playground).toMatch(/playground-stage/)
  })

  it("exposes layer panel and free-rotate controls", () => {
    const inspector = read("components/creations/StudioInspector.tsx")
    const playground = read("components/creations/PlaygroundForm.tsx")
    const board = read("components/canvas/PixelBoard.tsx")
    const layerPanel = read("components/creations/LayerPanel.tsx")
    const copyFile = read("lib/copy.ts")
    const pixel = read("lib/pixel.ts")
    const icons = read("components/ui/PixelIcon.tsx")
    expect(copyFile).toMatch(/pixelLayers/)
    expect(copyFile).toMatch(/pixelRotateFree/)
    expect(copyFile).toMatch(/pixelRotateApply/)
    expect(copyFile).toMatch(/pixelLayerMergeDown/)
    expect(copyFile).toMatch(/pixelLayerAdded/)
    expect(inspector).toMatch(/layerPanel/)
    expect(inspector).toMatch(/LayerPanel/)
    expect(inspector).toMatch(/pixelRotateFree/)
    expect(inspector).toMatch(/onRotateSelection/)
    expect(playground).toMatch(/onLayersChange/)
    expect(playground).toMatch(/LayerMobileStrip/)
    expect(playground).toMatch(/LayerMobileSheet/)
    expect(playground).toMatch(/onRotateSelection/)
    expect(layerPanel).toMatch(/getThumbnail/)
    expect(layerPanel).toMatch(/onContextMenu/)
    expect(layerPanel).toMatch(/draggable/)
    expect(layerPanel).toMatch(/pixelLayerMergeDown/)
    expect(layerPanel).toMatch(/eyeOff/)
    expect(layerPanel).toMatch(/name=\{hidden \? "eyeOff" : "eye"\}/)
    expect(board).toMatch(/buildPixelSourceV2/)
    expect(board).toMatch(/rotateClipboardNearest/)
    expect(board).toMatch(/selectRotateRef/)
    expect(board).toMatch(/getLayers/)
    expect(board).toMatch(/addLayer/)
    expect(board).toMatch(/duplicateLayer/)
    expect(board).toMatch(/mergeDown/)
    expect(board).toMatch(/mergeVisible/)
    expect(board).toMatch(/getLayerThumbnail/)
    expect(pixel).toMatch(/PIXEL_SOURCE_VERSION_V2/)
    expect(pixel).toMatch(/rotateClipboardNearest/)
    expect(pixel).toMatch(/layerThumbnailDataUrl/)
    expect(icons).toMatch(/eyeOff:/)
    expect(icons).toMatch(/lock:/)
    expect(icons).toMatch(/layers:/)
  })
})
