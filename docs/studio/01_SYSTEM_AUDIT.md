# PXLB Studio — M0 Existing System Audit

**Document:** `docs/studio/01_SYSTEM_AUDIT.md`  
**Original audit:** 23 Nov 2026
**Inventory refresh:** 24 Nov 2026
**Status:** Active reference / audit only
**Execution mode:** No application code, dependencies, database, or architecture changes.  
**Scope:** Pixel Studio (`PlaygroundForm` + `PixelBoard` + `lib/pixel*`). Not Common Space (`SpaceBoard`) and not legacy non-pixel `StudioForm`.

> **Document purpose:** Current studio inventory and the baseline that supersedes older studio audits.
> **Status:** Active reference. Inventory refreshed 2026-11-24 from code and tests; runtime/browser claims remain explicitly unverified.
> **Updated:** 2026-11-24.
> **Implementation evidence:** VERIFIED IN CODE — `components/creations/PlaygroundForm.tsx`, `components/creations/StudioMinimap.tsx`, `components/canvas/PixelBoard.tsx`, `lib/pixel.ts`, `lib/pixel-groups.ts`; VERIFIED BY TEST — `tests/pixel-studio-redesign.test.ts`, `lib/pixel-groups.test.ts`, `tests/pixel-canvas-size.test.ts`, `tests/palette-ux.test.ts`.
> **Completed:** M0 audit, M1 workspace chrome, minimap, desktop undo/redo, layer/group model, V1–V4 source, brush/fill/export engine.
> **Open:** browser verification of WR and layer/group interactions, drag/keyboard group follow-ups, non-square whole-canvas rotate, stylus pressure; plus any operator/production proof.
> **Dependencies:** `PXLB_STUDIO_EXECUTION.md` tracker, `04_WORKSPACE_REDESIGN_REPORT.md`, `05_LAYER_GROUP_UX.md`.
> **Next action:** Run the browser checklists in `04_WORKSPACE_REDESIGN_REPORT.md:74-83` and `05_LAYER_GROUP_UX.md:48`; then close those follow-ups.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION.

This report describes the **repository as it is**. Items that could not be verified in a browser or with a stylus are marked **UNKNOWN**.

---

## 1. Project architecture overview

### 1.1 What “Studio” is in this repo

PXLB Studio is the member pixel editor at `/[lang]/create/[id]` when `creation.type === "pixel"`. There is **no** route named `/studio` or `/playground`.

**Naming trap:** `StudioForm` + `data-chrome="studio"` is the **legacy** text/idea/visual/story editor on the same `[id]` route. The pixel product is `PlaygroundForm` (`data-chrome="playground"`) + `PixelBoard` (`variant="studio"`). `StudioNewForm` is only an alias of `PixelNewForm`.

| Surface | Route | Implementation |
|---|---|---|
| New artwork | `/[lang]/create` | Full page `PixelNewForm` (title required, size presets, stage ground). Not a modal. |
| Pixel editor | `/[lang]/create/[id]` | Full-viewport overlay `PlaygroundForm` (`data-chrome="playground"`, `fixed inset-0 z-[60]`). |
| Legacy types | `/[lang]/create/[id]` | `StudioForm` for non-pixel creations (text / idea / visual / story). **Out of Studio engine scope.** |
| Public artwork | `/[lang]/creation/[id]` | Community detail; not the editor. |
| Common Space | `/[lang]/space` | `SpaceBoard` prototype. Shares `lib/pixel.ts` helpers; **not** Studio. |

### 1.2 Runtime split

There is **no** Redux/Zustand store. State is split:

| Owner | What it holds |
|---|---|
| `PlaygroundForm` | Tool, color, palette UI, brush options, fill/select options, zoom label, dirty/save/publish, layers/groups list for panels, dialogs. |
| `PixelBoard` refs | ImageData, layer buffers, groups, camera, stroke, selection, floating clipboard, history, shape drafts, text frames. |
| Module singleton | `sessionClipboard` in `PixelBoard.tsx` (tab-local, not OS clipboard). |
| Browser storage | Local pixel draft via IndexedDB (`lib/creation-metadata-local.ts`); metadata in localStorage. |
| Server | `updatePixelCreationAction` writes source JSON + PNG cover to Supabase Storage bucket `pixel-creations` (`{userId}/{creationId}/source.json` and `cover.png`). `creations.content` stores the **header only** (version, size, palette, encoding, `source_path`), not the pixel buffer. Cap: `PIXEL_SOURCE_MAX_BYTES` = 512 KiB. **Width/height changes are rejected** against the existing header. |

### 1.3 Document model

Indexed palette document, not RGBA per pixel.

| Constant | Value | File |
|---|---|---|
| Side | 8–1024 | `PIXEL_CANVAS_MIN` / `PIXEL_CANVAS_MAX` |
| Area | ≤ 262_144 (512²) | `PIXEL_CANVAS_AREA_MAX` |
| Layers | max 8 | `PIXEL_LAYER_MAX` |
| Palette | index 0 = Paper `#FFFDF7`; max **256** | `PIXEL_DOCUMENT_PALETTE_MAX` |
| Source versions | V1 flatten RLE; V2 layers; V3 opacity/blend/lockAlpha; V4 groups | `PIXEL_SOURCE_VERSION*` |
| Writer | `buildPixelSourceV2` emits the lowest version that still encodes used features | `lib/pixel.ts` |

Per-pixel alpha does **not** exist. Layer opacity and blend are metadata composited at render time. Empty cells on non-base layers are index 0 (transparent). Eraser on the base layer paints Paper.

### 1.4 Rendering

- Buffer canvas 1:1 + view canvas with integer device scale (`snapCssScaleToDevicePixels`), `imageSmoothingEnabled = false`, CSS `pixelated`.
- Dirty-rect compositing for strokes, shape preview, fill bounds, selection lifts (`lib/pixel-dirty.ts`). Camera pan/zoom redraws the view without recompositing.
- Full-frame invalidation remains for undo, palette changes, and layer structure.
- Coordinates: `pointerToCell` / `viewDeviceTransform` shared by draw and hit-test.

### 1.5 Key files (line counts, 23 Nov 2026)

| Lines | File | Role |
|---|---|---|
| ~4397 | `components/canvas/PixelBoard.tsx` | Editor engine: input, tools, camera, history wiring, compositing, imperative API. |
| ~3040 | `lib/pixel.ts` | Pure pixel math, RLE, parse/build source, selection, fill, shapes, compositor. |
| ~2301 | `components/creations/PlaygroundForm.tsx` | Studio chrome, persist, publish, mobile/desktop layout. |
| ~746 | `components/creations/LayerPanel.tsx` | Layer list, drag, context menu, mobile sheet/strip. |
| ~486 | `components/creations/StudioInspector.tsx` | Desktop right panel. |
| ~348 | `lib/pixel-brush.ts` | Coverage brush (opacity/flow/hardness/spacing/pressure/custom tip). |
| ~198 | `lib/pixel-history.ts` | Structural-sharing undo (32 steps, 48 MiB unique-buffer cap). |
| ~494 | `lib/pixel-export-engine.ts` | PNG/JPEG/WebP/GIF/sheet/ZIP export (pure). |
| ~343 | `components/creations/PixelNewForm.tsx` | Create form. |
| ~347 | `components/creations/StudioForm.tsx` | Non-pixel editor (not this module). |

Supporting engine modules: `pixel-blend.ts`, `pixel-groups.ts`, `pixel-merge.ts`, `pixel-pattern.ts`, `pixel-font.ts`, `pixel-import.ts`, `pixel-gif.ts`, `pixel-zip.ts`, `pixel-export-canvas.ts`, `pixel-export-client.ts`, `pixel-export.worker.ts`, `pixel-palette-library.ts`, `pixel-color-memory.ts`, `pixel-png-scale.ts`.

### 1.6 Component dependency (Studio path)

```text
app/[lang]/(member)/create/page.tsx
  └── PixelNewForm → createDraftAction → redirect /create/[id]

app/[lang]/(member)/create/[id]/page.tsx
  └── PlaygroundForm
        ├── PixelBoard (chrome={false}, variant="studio")
        ├── StudioInspector
        │     └── LayerPanel → LayerStyleControls, LayerGroupControls
        ├── LayerMobileStrip / LayerMobileSheet
        ├── BrushOptionsPanel, FillPatternPicker, SizeSlider
        ├── ColorPicker, DocumentPaletteDialog
        ├── ExportDialog, ImportPixelArtDialog
        ├── StudioContextMenu
        └── PixelArt (preview mode)

PixelBoard
  └── lib/pixel.ts + pixel-history + pixel-brush + pixel-pattern
      + pixel-groups + pixel-blend + pixel-merge + pixel-font + pixel-dirty
```

`PlaygroundForm` talks to the board through `PixelBoardHandle` (export, history, layers, selection, import, shape draft). Camera/stroke/history still live as refs inside the board; they are not independently unit-tested as a camera/tool engine.

---

## 2. Existing feature inventory

Status key: **Completed** in code with tests or a wired UI; **Partial** if the core exists but the product gap is real; **Missing** if no implementation; **Buggy** only when a defect is evidenced in code or failing tests. Browser behaviour that was not run here is **UNKNOWN**, not Buggy.

### 2.1 Workspace & layout

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Full-bleed studio overlay | `PlaygroundForm` `data-chrome="playground"` | Completed | Site chrome hidden by overlay, not `body:has` | — | Split into `StudioShell` / header / rail / stage (blueprint names do not exist as files) | Medium |
| Desktop header | Back, title, size label, zoom well, undo/redo (`renderHistoryButtons()`), save, publish, more | Completed (code) | Persist, dialogs | Publish still visually prominent; browser behaviour UNKNOWN | Header closer to “document chrome” only if product asks | Low |
| Left tool rail | Vertical `playground-tool-rail` `md:flex` | Completed | `toolButtons` | Many tools in one column; overflow-y | Keep; do not hide live tools | Low |
| Right inspector | `StudioInspector` `hidden md:flex` | Completed | Palette, options, layers | Desktop-only | Keep; avoid duplicating every control on mobile | Medium |
| Status bar | Cursor x,y · tool + swatch · save live region · edit flash | Completed | `onHoverCell` | HEX not shown next to swatch (only title) | Optional HEX | Low |
| Minimap | `StudioMinimap` with `onViewChange` sync | Completed (code) | Board buffer + camera | Browser behaviour UNKNOWN | Keep; verify in browser | Low |
| Mobile dock | Bottom toolbar: zoom/history, tools, brush, options, palette, layers | Partial | Same form as desktop | All panels stacked; `max-h-[45vh]` scroll | Tab/sheet inspector (planned, not built as named components) | High |
| Context menu | Right-click / long-press → `StudioContextMenu` | Completed | Board `onCanvasMenu` | — | Keep | Low |
| New artwork modal | `PixelNewForm` is a **page**, not `NewArtworkDialog` | Partial | `createDraftSchema` rejects unnamed titles | Blueprint wanted a modal over dashboard/create | Modal is a presentation change, not an engine change | Medium |
| Title required | Create schema + publish path reject unnamed | Completed | `DRAFT_UNNAMED_TITLE` | Studio title field still allows empty until publish/save fills storage title | Keep | Low |
| Canvas size after create | Dialog shows W×H + `pixelCanvasSizeLocked`. Server `updatePixelCreationAction` rejects width/height change vs header. | **Missing** (resize/crop) | Creation content header | Size cannot change in editor without a schema/action change | Transform milestone (engine audit M9) | Medium |
| Discard | Confirm dialog + virgin draft discard action | Completed | `isVirginPixelDraft` | UNKNOWN in browser | Keep | Low |
| Density tokens | `--studio-hit`, `--studio-control`, `--studio-thumb` in `app/globals.css` | Completed | Tests in `pixel-studio-redesign.test.ts` | — | Keep | Low |

### 2.2 Drawing tools

`PixelDrawTool` in `lib/pixel.ts`. All listed tools have a rail button and a keyboard shortcut in `PixelBoard` `onKeyDown`.

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Square brush (`pencil`, B) | `stampBrush` + `BrushStroke` | Completed | Brush options, symmetry | Soft brush uses Bayer dither (indexed model) | Keep dither unless alpha model is approved | Medium |
| Circle brush (`circle`, C) | Same engine, circle footprint | Completed | Same | Key `C` also used with Ctrl for copy | Fine (mod branch first) | Low |
| Eraser (`eraser`, E) | Paints Paper / clears non-base | Completed | Transparency lock | Not true alpha erase | Keep | Low |
| Fill (`fill`, G) | Scanline flood; tolerance; Shift = global replace; selection clip; 10 patterns | Completed | `lib/pixel-pattern.ts` | No second pattern color | Optional two-color pattern | Low |
| Line (`line`, L) | Preview then commit; brush size (`strokeBrushLine`) | Completed | Shape dirty rect | No 45° Shift constraint (Shift-square is rect/ellipse only) | Optional 45° lock | Low |
| Rect / ellipse (`u` / `o`) | Draft + apply/cancel; fill/stroke; Shift constrain | Completed | `ShapeDraft` | — | Keep | Low |
| Polygon draw (`polygon`, P) | Click vertices; stroke/fill | Completed | `rasterizePolygon` | Distinct from polygon **select** (Y) | Keep labels clear | Medium |
| Bezier (`bezier`, Q) | Anchors + handles; `rasterizeCubicPath` | Completed | Shape draft | UNKNOWN in browser | Keep | Low |
| Gradient (`gradient`, N) | Linear fill, 8 stops from current color → Paper; drag preview calls `fillLinearGradient` (`PixelBoard.tsx:3420-3454`) | Partial | Palette adoption | No second color, no radial. Palette-full mid-gradient still falls back to the start colour. Browser feel UNKNOWN. | Extra stops / second color | Medium |
| Eyedropper (`eyedropper`, I) | Tool + Alt sample via `sampleColorAt` on `compositeImage()` (`PixelBoard.tsx:3406-3412`) | Completed (code) | Composited image | Browser/stylus behaviour UNKNOWN | Keep; verify in browser | Low |
| Text (`text`, T) | Point vs paragraph frames; 5×7 bitmap font; rasterized into layer | Partial | `lib/pixel-font.ts` | Not a live text layer; no fonts beyond bitmap | Richer text later | Medium |
| Pan (`pan`, H) | Tool + Space hold + middle mouse | Completed | Camera | Clicking inside a selection with the pan tool **moves the selection** | Modifier to force pan | Low |
| Symmetry | `off \| x \| y \| xy` on freehand | Completed | Brush | Button cycles; not in inspector as four-way | Clearer control | Low |
| Brush options | Opacity, flow, hardness, spacing, pressure, custom tip ≤64 | Completed | `lib/pixel-brush.ts` | Pen pressure **UNKNOWN** (not browser/tablet verified). Soft path slower than legacy stamp. | Profile / perf | Medium |

### 2.3 Canvas

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Pixel-perfect view | Integer device scale, snapped origin | Completed | DPR | UNKNOWN on exotic DPR | Keep | High |
| Zoom | Steps + pinch range; fit | Completed | `PIXEL_ZOOM_STEPS` | — | Keep | Low |
| Grid | Culled; `PIXEL_GRID_MIN_ZOOM = 8`; `'` toggle | Completed | View render | — | Keep | Low |
| Hover cell | Status bar coordinates | Completed | rAF throttle in form | — | Keep | Low |
| Import image as layer | Drag/drop or More → `ImportPixelArtDialog` | Completed | `lib/pixel-import.ts`, layer cap | Cannot import if 8 layers | Keep | Low |
| Flip H/V, rotate 90 | Board handle + More menu | Partial | Selection vs whole canvas | Whole-canvas 90° **refuses non-square** canvases | Resize/rotate document | Medium |
| Free rotate selection | `rotateSelection` + inspector angle | Completed | Clipboard nearest | UNKNOWN feel in browser | Keep | Low |
| Stage ground | checker / paper / ink at create | Completed | `stage_ground` in content | Not editable later | Optional | Low |

### 2.4 Selection

`PixelSelection` = rect + optional 1-bit mask.

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Box (rect/ellipse) | `select`, V | Completed | `selectShape` | — | Keep | Low |
| Wand | `selectContiguous`, W; tolerance | Completed | Fill tolerance slider | — | Keep | Low |
| Color select | `selectColor`, K | Completed | Same | — | Keep | Low |
| Lasso | `lasso`, S | Completed | Polygon rasterizer | First click inside selection may move instead of new lasso | Documented behaviour | Low |
| Polygon select | `selectPolygon`, Y | Completed | `selectionFromPolygonVertices` | Shortcut Y vs Ctrl+Y redo | Keep | Low |
| Combine | Shift add / Alt subtract (fixed at first click for polygon) | Completed | — | — | Keep | Low |
| Invert / expand / contract | Ctrl+Shift+I, Shift+] / [ | Completed | History | Feather **not implemented** (needs per-pixel alpha) | Do not fake feather on indices | Medium |
| Move / nudge | Drag; arrows (Shift ×10) | Completed | Floating selection | Esc cancels via undo | Keep | Low |
| Copy/cut/paste/delete | Ctrl+C/X/V, Delete; session clipboard | Completed | `sessionClipboard` | Not OS clipboard; paste does not create a new layer | Optional paste-as-layer | Medium |
| Transform | Move, resize handles, free rotate | Partial | — | No scale/rotate interpolation options UI beyond rotate; no crop | Engine audit M9 | Medium |

### 2.5 Layers

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Stack (max 8) | Runtime layers + V2+ source | Completed | `PIXEL_LAYER_MAX` | Hard cap | Raise only with payload study | Medium |
| Visibility, lock, rename | `LayerPanel` + handle | Completed | History | — | Keep | Low |
| Opacity, 14 blend modes, lock alpha | V3; `lib/pixel-blend.ts` | Completed | Compositor | Merge onto empty cells cannot keep partial alpha | Keep indexed contract | High |
| Groups (one level) | V4; `lib/pixel-groups.ts` | Completed | Contiguous members | No nesting | Keep until product asks | Medium |
| Merge down / visible | Palette resolver `lib/pixel-merge.ts` | Completed | 256 palette | Nearest colour when full | Keep notice | Medium |
| Thumbnails | `layerThumbnailDataUrl` | Partial | Own indices only | **Ignore opacity and blend** | Composite thumbs | Low |
| History of layer ops | Frames store layers + groups + style | Completed | Coalesce 900 ms on sliders | Collapse is not undo | Keep | Low |

### 2.6 Color

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Document palette | Append-only indices; Paper reserved | Completed | 256 max | Older docs said 64 — **stale** | Update stale docs | Low |
| Picker | HEX, recent 12, favorites 24, swatches | Completed | `ColorPicker`, `pixel-color-memory` | — | Keep | Low |
| Palette library | Built-ins + custom local (`pixel-palette-library.ts`) | Completed | `ensureColors` does not remap pixels | — | Keep | Low |
| Manage / replace / remove | `DocumentPaletteDialog` | Completed | History restores palette | Remove-color previously wiped history; now restores | Keep | Low |
| Palette full | Alert + stroke refuse | Completed | — | — | Keep | Low |

### 2.7 Animation & timeline

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Frame timeline | No types, UI, or source field for animation frames | **Missing** | Would need a new document model | GIF export uses **visible layers as frames**, not a timeline | Product decision before M6 | High (for M6) |
| Onion skin / playback | None | **Missing** | Timeline | — | After frame model | High (for M6) |
| Animated GIF/WebP as real animation | GIF encoder exists; animated WebP not implemented | Partial | `lib/pixel-gif.ts` | “Animation” ≠ editor timeline | Do not treat export GIF as M6 done | High |

### 2.8 History

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Undo/redo | `PixelHistory`, Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z | Completed | Structural sharing | Desktop has no header buttons | Add chrome (M7/M1) | High |
| Caps | 32 steps, 48 MiB unique buffers | Completed | Tests in `pixel-history.test.ts` | Large unique strokes still costly | Tile-diff history later | Medium |
| Palette + selection in frames | Yes, including floating clipboard | Completed | — | — | Keep | Low |

### 2.9 Keyboard shortcuts (studio variant only)

Wired in `PixelBoard` when `variant === "studio"`. Ignored while typing or a `dialog[open]` exists.

| Keys | Action |
|---|---|
| B C E H I G P L U O Q T N V W K S Y | Tools (see inventory) |
| Space (hold) | Pan |
| Alt (hold) | Eyedrop sample |
| Ctrl/Cmd+Z / Y / Shift+Z | Undo / redo |
| Ctrl/Cmd+A C X V | Select all / copy / cut / paste |
| Ctrl+Shift+I | Invert |
| Shift+[ / ] | Contract / expand |
| [ / ] | Brush size steps |
| ' | Grid |
| Arrows / Shift+arrows | Nudge selection |
| Esc | Cancel draft / polygon / move / deselect |
| Enter | Close polygon select / apply shape |
| Delete / Backspace | Delete selection or last path vertex |

Inspector shows a short cheat-sheet (`copy.pixelStatusShortcuts`). **Discoverability is Partial** (collapsed details; no customizable keymap).

### 2.10 Persistence, publish, export

| Feature | Implementation | Status | Dependencies | Known issues | Improvement | Priority |
|---|---|---|---|---|---|---|
| Local autosave | Debounced 400 ms to IDB | Completed | Offline flag | Failure surfaces `draftLocalSaveFailed` | Keep | High |
| Explicit server save | `updatePixelCreationAction` source + cover | Completed | 512 KiB source | Payload too large is a hard error | Watch V3/V4 metadata growth | High |
| Publish | Header CTA; unnamed title blocked; caption nudge; details dialog | Partial | Community metadata | Publish still in editor header (blueprint wanted it quieter) | Workflow polish | Medium |
| Export dialog | PNG/WebP/JPEG/GIF/sheet/per-layer ZIP | Completed (unit) | Canvas encoder | **Browser encoder UNKNOWN**; GIF frames = layers | Keep engine; verify in browser | Medium |

### 2.11 Tests (this audit run)

Test history and current state:

- 23 Nov audit run: **742 passed / 2 failed / 744 total** (99 files). Both failures were stale source-grep assertions, not Studio engine defects:
  - `tests/explore-scope.test.ts` — expected creator grid classes inline in `SearchResults`; implementation moved them to `CreatorCardList`.
  - `tests/works-home.test.ts` — expected `max-w-4xl`; public profile uses `max-w-5xl`.
- 24 Nov refresh: VERIFIED BY TEST — both assertions were updated to the actual implementation and their targeted suites pass (`tests/explore-scope.test.ts` 8/8, `tests/works-home.test.ts` 6/6). No UI or app behavior changed.
- Studio-related suites (pixel-*, lib/pixel-*) passed in both runs.
- Many UI tests are **source-grep** tests (`pixel-studio-redesign.test.ts`). They prove strings exist, not that tools work in a browser.
- Engine unit tests are strong (brush, fill, groups, blend, history, export, polygon select).

Lint/typecheck of the full app: **UNKNOWN** this run (`tsc` / `eslint` not executed). Prior engine notes mentioned existing React-compiler lint in `PixelBoard` / `PlaygroundForm` / `StudioInspector` / `LayerPanel`.

---

## 3. Component dependency overview (risk)

1. **`PixelBoard.tsx` is a monolith.** Tools, camera, text, selection, layers, and render scheduling share one component. Regression risk for any tool change is high. History is extracted; camera/stroke extraction is still pending (stated in `docs/STUDIO-ENGINE-AUDIT.md`, still true in code).
2. **`PlaygroundForm.tsx` is a chrome monolith.** Layout, persist, publish, mobile, and dialogs are one file. Workspace milestones will touch this file unless it is split **as a later implementation step** (not M0).
3. **Indexed document contract** couples brush softness, gradient, merge, feather, and animation. Alpha/feather/true animation need an explicit product decision (V3 already added opacity without per-pixel alpha).
4. **Versioned source (V1–V4)** is additive. Older clients cannot open V3/V4. Writer stays on V2 when extra features are unused.
5. **Stale documentation** is a process risk: Wplace/blueprint docs still say “no layers / no inspector / palette 64”. Agents must not implement from those files without re-reading code.

---

## 4. Existing bugs and limitations

### 4.1 Evidenced now

| Item | Evidence | Priority |
|---|---|---|
| Two failing grep tests (Explore / profile) | `npm test` 23 Nov 2026 | Low for Studio (out of module); Medium for repo hygiene |
| Desktop undo/redo/grid not in header | `renderHistoryButtons` only used in `md:hidden` dock; grid is `'` / context menu / mobile | High (workflow) |
| Eyedropper samples active layer, not composite | `sampleColorAt` / `getPixelRgb(image().data)` | High |
| Canvas size locked after create (UI + server) | `pixelCanvasSizeLocked`; action rejects size change | Medium |
| Gradient preview is a 1px line, not the fill | `paintShapePreview` vs `fillLinearGradient` on pointer up | Medium |
| No minimap | Zero matches in TS/TSX | Medium |
| No animation timeline | Zero matches; GIF = layers as frames | High only if M6 is in scope |
| Gradient is color→Paper, 8 stops | `endPointer` in `PixelBoard` | Medium |
| Layer thumbs ignore opacity/blend | `layerThumbnailDataUrl` uses layer indices only | Low |
| Feather missing | Explicitly omitted in engine; no code | Low until alpha exists |
| Session clipboard only | `let sessionClipboard` module scope | Low |
| Non-square canvas cannot rotate 90° as a whole | `rotate90Cw` returns false if `w !== h` | Medium |
| Create is a page, not a modal | `app/.../create/page.tsx` | Medium (UX, not engine) |
| Publish CTA in header | `requestPublish` button always visible | Medium |

### 4.2 UNKNOWN (do not treat as bugs yet)

- Pen pressure on real tablets.
- Browser WebP encode / export dialog.
- Feel of bezier, text, free rotate, groups, blend at 512² on low-end devices.
- Current `eslint` / `tsc` error counts.
- Whether 512 KiB payload bites on dense 8-layer V4 documents in production.

### 4.3 Not bugs

- Indexed palette (product contract).
- Max 8 layers / 256 colours / 512² area.
- One-level groups.
- `StudioForm` for non-pixel types.
- `SpaceBoard` as a separate product surface.

---

## 5. Performance assessment

From **code + existing engine audit numbers**, not a new browser profile.

| Area | Reality | Assessment |
|---|---|---|
| Compositor | LUT / blend path; dirty rects for paint | Healthy for strokes; full-frame on undo/palette/layers |
| Fill | Scanline; bench historically 13.6 ms empty 512² | Healthy |
| Brush | Legacy stamp fast; dithered soft brush ~4× slower in old bench | Acceptable if default options stay “plain” (`isPlainBrush`) |
| History | Shared buffers; 48 MiB cap | Much better than full-stack clones; still not tile-diff |
| View | Pan/zoom skip compositor | Healthy |
| Export | Main-thread GIF/sheet; worker exists for older PNG path | UNKNOWN in browser |
| Architecture | 4k-line board + 3k-line `pixel.ts` | Maintainability cost dominates remaining CPU for many tasks |

No new dependency is required for current performance work.

---

## 6. Comparison with PXLB Studio vision

Master plan goals: professional editing, intuitive UI, performance/reliability; beginner-friendly and capable for experienced pixel artists.

| Vision | Actual |
|---|---|
| Professional editing | **Strong engine already:** tools, selection suite, layers/groups/blends, history, import/export. Gaps: canvas transform, real animation, richer gradient/text, feather. |
| Intuitive UI | **Workspace exists** (header / rail / inspector / status / mobile dock) but is still one form, not the named `StudioShell` tree. Create is a page. No minimap. Desktop undo hidden. Mobile stacks many controls. |
| Performance & reliability | Engine hot paths already optimized and unit-tested. Reliability in-browser for newer milestones is **UNKNOWN**. Repo has 2 unrelated failing grep tests. |
| Do not copy Illustrator/Pixilart | Identity is PXLB (Paper/Earth/`PixelIcon`). Layout is inspired, not cloned. |

**Net:** Studio is past “MVP pencil.” The largest product gap vs the master-plan **roadmap** is no longer “missing tools.” It is **workspace craft, document transform, animation, verification, and monolith risk**.

---

## 7. Technical recommendations

Do **not** start these in M0. Ordered for later milestones.

1. **Treat current engine as the base.** Do not rewrite `lib/pixel.ts` or the indexed model without an explicit decision.
2. **M1 should be chrome and navigation, not new tools.** Split `PlaygroundForm` only as far as needed; keep `PixelBoard` API. Add desktop undo/redo. Decide create-modal vs page. Minimap is optional P1.
3. **Do not implement feather, true layer alpha, or a timeline** until product signs the format change. GIF-from-layers is not a timeline.
4. **Canvas resize/crop/rotate-document** is the main canvas gap (engine audit M9). It needs a plan because size is stored on the creation header.
5. **Extract camera/stroke from PixelBoard** only when a milestone needs testable isolation; not as a drive-by refactor.
6. **Rewrite or quarantine stale docs** (Wplace audit, redesign blueprint constants, playground features audit) so future agents do not re-build layers/inspector.
7. **Prefer engine unit tests over new source-grep tests.** Fix or drop the two failing community grep tests outside Studio if they block CI, but that is not a Studio feature.

---

## 8. Prioritized development backlog

Mapped to the master-plan milestones. Priority uses the master-plan scale (impact, not complexity).

### Critical

None evidenced that currently **lose documents** in unit tests. Payload-too-large and local-draft failure paths exist; production incidence is **UNKNOWN**.

### High

| ID | Item | Suggested milestone |
|---|---|---|
| B1 | Desktop undo/redo (and grid) in studio chrome | M1 / M7 |
| B1b | Eyedropper samples composited pixel, not only the active-layer buffer | M2 / M5 |
| B2 | Mobile inspector density (tabs/sheets vs stacked dock) | M1 |
| B3 | Browser verification pass for brush, layers, export, text, groups | M9 (can start earlier as a gate) |
| B4 | Animation **product decision** (timeline vs layers-as-frames) before any M6 code | M6 gate |
| B5 | Keep persist caps honest (512 KiB) when adding features | All |

### Medium

| ID | Item | Suggested milestone |
|---|---|---|
| B6 | Minimap | M1 |
| B7 | Create as modal (optional UX) | M1 |
| B8 | Canvas resize / crop / non-square rotate | M3 |
| B9 | Gradient: live preview, second colour, not only current→Paper | M2 |
| B10 | Header publish vs document chrome balance | M1 / M7 |
| B11 | Tile-diff or cheaper undo for huge unique strokes | M8 |
| B12 | Layer thumbnails with opacity/blend | M4 |
| B13 | PixelBoard camera/stroke extraction | M8 / architecture |
| B14 | Paste as new layer | M3 / M4 |

### Low

| ID | Item | Suggested milestone |
|---|---|---|
| B15 | Shortcut customization / fuller cheat-sheet | M7 |
| B16 | Status HEX, two-color patterns, extra text fonts | M2 / M5 |
| B17 | Nested groups, animated WebP, per-group ZIP | later |
| B18 | OS clipboard | M7 |
| B19 | Refresh stale historical studio docs | docs only |
| B20 | Fix unrelated Explore/profile grep tests | repo hygiene |

---

## 9. Documentation notes

Read these as **history**, not current inventory:

| File | Problem vs 23 Nov 2026 code |
|---|---|
| `docs/WPLACE-STUDIO-FEATURE-AUDIT.md` | Claims no layers, no inspector, palette 64, few tools. |
| `docs/PIXEL-STUDIO-REDESIGN-BLUEPRINT.md` | Palette max 64; LayersPanel “later”; inspector “not yet”. |
| `docs/PIXEL-EDITOR-IMPLEMENTATION-ROADMAP.md` | Many tools marked belum that now exist. |
| `docs/PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` | Already marked kadaluarsa. |
| `docs/STUDIO-ENGINE-AUDIT.md` | Closest engine history; some sections contradict later sections in the same file. Use code first. |

---

## 10. Audit restrictions checklist

- Application source: unchanged  
- Dependencies: unchanged  
- Database / migrations: unchanged  
- Only added: `docs/studio/PXLB_STUDIO_EXECUTION.md`, `docs/studio/01_SYSTEM_AUDIT.md`

---

# END OF M0 AUDIT
