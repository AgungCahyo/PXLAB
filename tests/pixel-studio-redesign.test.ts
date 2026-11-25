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
    const dialog = read("components/creations/NewArtworkDialog.tsx")
    expect(form).toMatch(/PIXEL_SIZE_PRESETS/)
    expect(form).toMatch(/createTitlePlaceholder/)
    expect(form).toMatch(/canvasBackground/)
    expect(form).toMatch(/createOpenEditor/)
    expect(dialog).toMatch(/size="md"/)
    expect(dialog).toMatch(/createNewHeading/)
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
    expect(playground).toMatch(/hidden md:block[\s\S]*renderZoomWell\(\)[\s\S]*renderHistoryButtons/)
    expect(playground).toMatch(/StudioMinimap/)
    expect(playground).toMatch(/pixelToolOptions/)
    expect(playground).toMatch(/role="tablist"/)
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
    expect(playground).toMatch(/toolButton\("selectPolygon"/)
    expect(playground).not.toMatch(/onTextRequest/)
    expect(playground).not.toMatch(/pixelTextStamp/)
    expect(playground).not.toMatch(/comingTool/)
    expect(playground).not.toMatch(/pixelToolComing/)
    expect(playground).toMatch(/editor-tool-divider/)
    expect(icons).toMatch(/lasso:/)
    expect(icons).toMatch(/bezier:/)
    const board = read("components/canvas/PixelBoard.tsx")
    // Text is a unified native object now: no stamping, no point/paragraph split.
    expect(board).toMatch(/TextToolController/)
    expect(board).toMatch(/TextEditOverlay/)
    expect(board).not.toMatch(/PARAGRAPH_HANDLES/)
    expect(board).not.toMatch(/type TextMode/)
    expect(board).not.toMatch(/placedTextsRef/)
    expect(board).not.toMatch(/stampText/)
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

  it("organizes the workspace into stable, independently scrolling regions (WR2)", () => {
    const inspector = read("components/creations/StudioInspector.tsx")
    const playground = read("components/creations/PlaygroundForm.tsx")
    // Right sidebar: collapsible panels, layers keep the flexible space, no whole-column scroll.
    expect(inspector).toMatch(/function InspectorSection/)
    expect(inspector).toMatch(/aria-expanded=\{open\}/)
    expect(inspector).toMatch(/shrink-0 flex-col overflow-hidden border-l/)
    expect(inspector).toMatch(/min-h-\[8rem\] flex-1 overflow-y-auto/)
    expect(inspector).toMatch(/hasToolOptions/)
    expect(inspector).toMatch(/symmetryControl/)
    // The current colour lives in the palette header instead of a second row.
    expect(inspector).not.toMatch(/studio-hit border-earth"\s+style=\{\{ backgroundColor: color \}\}/)
    // Swatches are fluid squares, so the grid cannot overflow the sidebar.
    expect(inspector).toMatch(/aspect-square/)
    // Top bar: Save keeps its slot, the inspector can be collapsed, status sits with the title.
    expect(playground).toMatch(/disabled=\{pending \|\| leaving \|\| !\(dirty \|\| metadataDirty\)\}/)
    expect(playground).not.toMatch(/\{dirty \|\| metadataDirty \? \(\s*<Button/)
    expect(playground).toMatch(/setInspectorOpen/)
    expect(playground).toMatch(/!preview && inspectorOpen/)
    expect(playground).toMatch(/renderStatusBar\("desktop"\)/)
    expect(playground).toMatch(/renderStatusBar\("mobile"\)/)
    // Left rail: tools only. Symmetry is a tool option and lives in the inspector on desktop.
    const rail = playground.slice(
      playground.indexOf('className="playground-tool-rail'),
      playground.indexOf("</aside>", playground.indexOf('className="playground-tool-rail')),
    )
    expect(rail).toMatch(/renderToolButtons\("desktop"\)/)
    expect(rail).not.toMatch(/renderSymmetryButton/)
    expect(playground).toMatch(/symmetryControl=\{renderSymmetryButton\(\)\}/)
    // Tool groups: draw, shapes, fill & colour, then selection & navigation.
    const order = ["pencil", "line", "fill", "select", "pan"].map((tool) =>
      playground.indexOf(`{toolButton("${tool}"`),
    )
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("makes group creation a layer-list action, not a layer property (WR3)", () => {
    const panel = read("components/creations/LayerPanel.tsx")
    const controls = read("components/creations/LayerGroupControls.tsx")
    const playground = read("components/creations/PlaygroundForm.tsx")
    const board = read("components/canvas/PixelBoard.tsx")
    const groups = read("lib/pixel-groups.ts")
    const copyFile = read("lib/copy.ts")
    // The "Grup" dropdown is gone from the properties area.
    expect(controls).not.toMatch(/<select[\s\S]*pixelGroupNone/)
    expect(controls).not.toMatch(/NEW_VALUE/)
    expect(copyFile).not.toMatch(/pixelGroupNone/)
    expect(panel).not.toMatch(/<LayerGroupControls/)
    // Toolbar: layer + group side by side, overflow for secondary actions.
    expect(panel).toMatch(/aria-label=\{copy\.pixelLayerAdd\[lang\]\}[\s\S]*aria-label=\{createLabel\}[\s\S]*aria-label=\{copy\.pixelLayersMore\[lang\]\}/)
    expect(panel).toMatch(/copy\.pixelGroupCreateTip\[lang\]/)
    expect(panel).toMatch(/runCreateGroup\(selection\)/)
    expect(panel).toMatch(/pixelLayerMergeVisible/)
    // Multi-select, rename, expand/collapse, drag in and out.
    expect(panel).toMatch(/event\.shiftKey/)
    expect(panel).toMatch(/event\.ctrlKey \|\| event\.metaKey/)
    expect(panel).toMatch(/setEditingGroupId/)
    expect(panel).toMatch(/collapsed: !group\.collapsed/)
    expect(panel).toMatch(/groupApi\.onAssign\(moving, group\.id\)/)
    expect(panel).toMatch(/groupApi\.onRemove\(moving\)/)
    // Layer opacity, blend and transparency lock stay layer properties.
    expect(panel).toMatch(/<LayerStyleControls/)
    expect(panel).toMatch(/<GroupStyleControls/)
    // One grouping system: the board reuses the model and records one undo step.
    expect(groups).toMatch(/export function createGroupFromLayers/)
    expect(groups).toMatch(/return createGroupFromLayers\(layers, groups, \[layerId\], name\)/)
    expect(board).toMatch(/createGroupFromLayersModel/)
    expect(board).not.toMatch(/createGroup: \(/)
    expect(playground).toMatch(/createGroupFromLayers\(layerIds, name\)/)
    expect(playground).toMatch(/onCreateGroup=/)
    // Mobile has no drag and drop, so the sheet carries the structural actions.
    expect(panel).toMatch(/<LayerGroupActions/)
  })
})
