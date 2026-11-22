# PXLB Studio — Engine Audit & Roadmap (Phase 1)

Audited commit: `main` (shallow clone, Nov 19 2026). Baseline: 340/342 tests pass; 2 failures pre-date this work (see §4).

## 1. Architecture as it actually is

| Area | Reality |
|---|---|
| Structure | `components/canvas/PixelBoard.tsx` (3777 lines) is the editor: input, tools, history, layers, camera, render in one component. `lib/pixel.ts` (2352 lines) is pure helpers (brush, fill, shapes, selection, RLE, source parse). Form/UI in `PlaygroundForm.tsx` (2208). |
| Pixel model | **Indexed**: each layer is `Uint8Array` palette indices (max 256 palette, 8 layers). Index 0 = Paper; on layers above the base, 0 = transparent. No per-pixel alpha, so no opacity/blend modes. |
| Active-layer edit | Active layer is unpacked into an RGBA `ImageData` for tools, then synced back to indices (`loadActiveIntoImage` / `syncActiveFromImage`). |
| Rendering | Buffer canvas 1:1 + view canvas with integer device scale, rAF-scheduled. Pixel edits invalidate a dirty rect; the compositor and checker blit only that rect. Camera changes redraw the view and do not recomposite. Undo, palette, and layer structure still invalidate the whole frame. Fill invalidates the painted bounds. |
| Coordinates | Centralised and good: `pointerToCell`, `viewDeviceTransform`, `snapCssScaleToDevicePixels` shared by draw and hit-test. Integer device scale, DPR-aware. |
| Strokes | `listPointerClientSamples` (coalesced events) → Catmull-Rom `densifyStrokeSegment` → Bresenham `walkLine` → `stampBrush`. Square/circle only. No pressure, hardness, opacity, flow, spacing. |
| Undo | `PixelHistory` in `lib/pixel-history.ts`. Frames share unchanged layer buffers, palette arrays, selection masks, and float buffers. 32 steps, 48 MiB unique-buffer cap. Palette and selection (including a floating clipboard) restore with undo/redo. |
| Selection | `PixelSelection` = rect + optional mask. Marquee (rectangle or ellipse), lasso, wand, color, polygon, and combine modes. Invert, expand, and contract are undoable. Feather stays out until an alpha model exists. |
| Fill | Scanline 4-connected flood. Tolerance 0 is exact. Tolerance > 0 uses the max channel delta and a visited bitmap. Shift-click replaces every match. Both modes clip to the selection and invalidate only the painted bounds. |
| Persistence | `PixelSource` V1 (RLE flatten) and V2 (layers) with `parsePixelSource`; draft in local storage/IDB; export PNG in a Web Worker. |
| Docs/tests | 43 test files; many engine tests in `lib/pixel.test.ts`. Several UI tests are source-grep tests (brittle). |

## 2. Findings (ranked)

1. **P0 perf — compositor parsed hex per pixel** (`hexToRgb` inside the pixel loop) and recomposited full canvas on every dirty flag. *Fixed in this milestone (5x).*
2. **P0 perf — floodFill** allocated per pixel. *Fixed (4x), now scanline.*
3. **P1 memory — history** stores whole-layer-stack clones. Needs patch/tile-diff history (command pattern keyed to dirty rects).
4. **P1 architecture — PixelBoard monolith**: engines not unit-testable in isolation (history, camera, tool state live in refs inside the component).
5. **P1 — no dirty-region rendering.** *Fixed in M4: strokes, line preview, and selection lifts invalidate a rect. Fill bounds landed in M5. Full-frame invalidation remains for undo, palette, and layers.*
6. **P2 — no alpha model**: opacity, blend modes, lock-transparency, groups need an RGBA or alpha-plane layer model. Requires a V3 source schema + migration (explicit approval needed, see §3).
7. **P2 — brush engine**: no opacity/flow/hardness/spacing/pressure; `getCoalescedEvents` is used but pressure is ignored.
8. **P2 — selection feather** still needs an alpha model (see M7). Invert, expand, contract, and ellipse marquee landed in M5. Selection and palette restore with undo.
9. **P3 — export**: PNG only (no JPEG/WebP/GIF/spritesheet/per-layer).

## 3. Decisions that need your approval before implementation

- **Alpha/blend layer model.** Indexed layers cannot do opacity or blend modes. Proposal: keep indexed storage on disk (V1/V2 unchanged), add per-layer `opacity` + `blend` metadata in a V3 source (additive, V2 readers fall back to normal/100%), and composite in RGBA at render time. Risk: payload cap 512 KiB; mitigation is metadata-only addition.
- **Animation/GIF** requires a frame model that does not exist; out of scope until product decides.
- **True-color (non-indexed) mode** conflicts with the palette-based product contract (<=256 colours); I recommend not doing it.

## 4. Pre-existing failures (not caused by this work)

- `lib/validations/creation.test.ts` "rejects a header palette longer than 64": code allows 256 (`PIXEL_DOCUMENT_PALETTE_MAX`); test is stale.
- `tests/back-navigation.test.ts` "announces save status": source-grep test broken by a template-literal change.

## 5. Roadmap

| # | Milestone | Status |
|---|---|---|
| M1 | Perf hot paths: compositor LUT, scanline fill, regression tests | **Done** |
| M2 | History engine extracted to `lib/pixel-history.ts` (`PixelHistory`), wired into PixelBoard; `camera`/`stroke` extraction still pending | **History done** |
| M3 | Undo memory: structural sharing, 48 MiB budget, palette + selection (and floating clipboard) in every frame | **Done** |
| M4 | Dirty-rect compositing + render invalidation | **Done** |
| M5 | Fill: tolerance, global replace, selection clip; selection invert/expand/contract/ellipse | **Done** |
| M6 | Brush engine: opacity/flow/hardness/spacing, pressure, custom tips | **Done** (not browser-verified) |
| M7a | Layer opacity, 14 blend modes, transparency lock, V3 source + migration, blend-aware merge | **Done** (not browser-verified) |
| M7b | Layer groups (one level), V4 source, isolated group compositing | **Done** (not browser-verified) |
| M8 | Export: JPEG/WebP, GIF, sprite sheet, per-layer ZIP, scaling, preview | **Done** (browser encoder not verified) |
| M9 | Transform: scale/rotate preview, resize/crop with interpolation options | |

## 6. M1 benchmark (vitest, Node, same machine)

| Op | Before | After |
|---|---|---|
| floodFill 512x512 empty | 55.3 ms | 13.6 ms |
| composite 3 layers 512x512 x10 | 389.9 ms | 72.0 ms |

Tests: 344 pass, same 2 pre-existing failures. `tsc --noEmit` clean.

## 7. M2/M3 history engine

- Frames share the buffer of every layer unchanged since the previous frame. Worst case before: 32 steps x 8 layers x 256 KiB = 64 MiB. A stroke on one layer now costs ~256 KiB per step (about 10 MiB for the same 32 strokes plus the base layers).
- Hard byte budget (48 MiB of unique buffers); oldest steps drop first, newest step is always kept.
- 12 history unit tests (the original 8, plus palette restore, palette immutability, selection-mask sharing, and float budget). Suite: 356 pass, same 2 pre-existing failures. `tsc` clean.
- Palette and selection are part of every frame. Unchanged palette arrays and selection masks are shared. A floating selection stores its clipboard; that buffer counts toward the 48 MiB cap. Adding colors, removing a color, and selection changes (marquee, wand, lasso, select-all, deselect, move/resize/rotate) are undoable. `removeColor` restores both the palette and the indices instead of wiping history.
- Pixel undo limits are unchanged: 32 steps, oldest steps drop first when the byte cap is hit. Palette-only and selection-only steps do not copy layer buffers.
- Not yet verified in a browser: draw, pick a new color, marquee, undo, redo, remove a color, undo.

## 8. M4 dirty-rect compositing

- `compositeLayersToRgba` accepts a rectangle. Cells outside it stay as they were. The active layer's indices are written back only inside that rectangle.
- A pencil stroke, line/gradient preview, and a selection lift mark the brush or selection bounds (brush pad and symmetry included). Undo, palette changes, and layer structure mark the whole frame. Fill marked the whole frame here; M5 limits it to the painted cells.
- Pan and zoom redraw the view from the existing composite. They do not run the compositor.
- Bench (vitest, 512×512, 3 layers, 8 iterations, same machine): full composite 24.7 ms, 16×16 rect 0.17 ms.
- Suite: 363 pass, same 2 pre-existing failures. `tsc` clean.
- Not yet verified in a browser.

## 9. M5 fill and selection

- Fill tolerance is the max channel delta, 0–255, default 0. Tolerance 0 keeps the exact scanline path. Above 0, a visited bitmap stops a fill whose new color is still inside the tolerance.
- Shift-click replaces every matching pixel, not just the contiguous region. A selection clips both modes. The dirty rect is the cells that were painted.
- Box select can be a rectangle or an ellipse (the ellipse mask uses the same cover test as the filled ellipse tool). Invert (Ctrl+Shift+I), expand (Shift+]), and contract (Shift+[) are one undo step each. Feather is not included; it needs per-pixel alpha.
- Suite: 367 pass, same 2 pre-existing failures. `tsc` clean.
- Not yet verified in a browser.

## 10. M5 review and fixes

Gaps found against the original spec and what happened:

| Gap | Result |
|---|---|
| Wand and colour select were exact-match only | Fixed: both take a tolerance (same slider as fill), typed-array stack, bounds-checked start. |
| Stale test: header palette "longer than 64" | Fixed: asserts the real 256 limit (accepts 256, rejects 257). |
| Save status not announced (test failure) | Fixed: the save label is now `role="status" aria-live="polite"`. |
| Polygonal (click-vertex) selection | **Done** (section 12). |
| Pattern fill | **Open.** Not implemented. |
| Feather | **Not planned** while layers are indexed (needs per-pixel alpha, see section 3). |

## 11. M6 brush engine (`lib/pixel-brush.ts`)

Design choice: layers are palette indices, so real blending would add a palette entry per blend. Opacity, flow, hardness and pressure are therefore a 0..1 coverage resolved with an 8x8 Bayer dither: deterministic, no palette growth.

- **Opacity** is a ceiling for the whole stroke; overlapping the stroke on itself never exceeds it.
- **Flow** accumulates per stamp inside one stroke; a new stroke starts at zero.
- **Hardness** is a falloff from centre to edge (circle and square). At 100 the footprint matches the legacy brush cell for cell (tested for sizes 1-12).
- **Spacing** is % of brush size; 0 keeps exact Bresenham with no double-stamped joints. Spacing carries across segments, so splitting a stroke into samples does not change the result.
- **Pressure** from pen only (mouse and touch are full pressure), read from coalesced events; scales size (floor 15%) and/or flow.
- **Custom tip** from the selection silhouette or the clipboard (max 64x64), 1:1 (size slider is ignored).
- Default options use the old code path unchanged. The new path allocates one float buffer per canvas size and clears only the touched rectangle between strokes.
- UI: `BrushOptionsPanel` in the inspector (desktop) and a collapsible panel on mobile, pencil, circle and eraser.
- Bench (512x512, 300 strokes of ~500 cells, size 8): legacy 130 ms, soft dithered engine 517 ms (~1.7 ms per stroke), after removing `Math.hypot` and the per-stamp symmetry allocation (865 ms before).
- Suite: 391 pass, 0 fail. `tsc` clean. Lint: no new errors (PixelBoard, PlaygroundForm, StudioInspector keep their 15 existing React-compiler errors).
- Not verified in a browser or with a real pen. Please test pen pressure on a tablet.

## 12. Polygon select tool (`selectPolygon`)

- **Use:** click adds a vertex. Click the first vertex, or the last vertex again, to close. Enter closes. Backspace/Delete and undo remove the last vertex. Esc cancels. Switching tool drops an unfinished polygon. Shift adds to and Alt subtracts from the selection (mode is fixed at the first click). Shortcut `Y`.
- **Touch:** close by tapping the first or last point again; the undo button removes the last vertex.
- **Rasterizer:** `selectionFromPolygonVertices` in `lib/pixel.ts`. Vertices are cell centres; a cell is selected if its centre is inside (even-odd) or it lies on an outline edge (Bresenham). Every clicked vertex and every thin sliver is selected with no gaps, and the result does not depend on zoom or on vertex order. Off-canvas vertices are clipped. Fewer than 3 distinct vertices leaves the selection untouched.
- **History:** one undo step per closed polygon, through the same selection history as the other tools.
- **Preview:** dashed outline, vertex handles, rubber-band segment to the cursor, first handle highlights when a click would close.
- **Known behaviour:** as with the lasso, a first click inside an existing selection (no Shift) moves that selection instead of starting a polygon.
- **Tests:** 9 new unit tests (rectangle, order independence, thin slivers, concave notch, self-crossing, clipping, degenerate input). Suite: 400 pass, 0 fail; `tsc` clean; lint unchanged at the existing 15 errors.
- **Icon:** pixelarticons has no polygon-select glyph, so `PixelIcon.tsx` has a small inline SVG. Swap it if you have a preferred icon.
- Not verified in a browser.

## 13. M7a: layer opacity, blend modes, transparency lock (V3)

**Format.** `PIXEL_SOURCE_VERSION_V3 = 3`. Pixel storage is unchanged (RLE palette indices). Each V3 layer adds `opacity` (0-100), `blend` and `lockAlpha`.
- **Writer:** `buildPixelSourceV2` writes V3 only when some layer uses opacity, a blend mode or the lock. Otherwise it writes V2, so documents that do not use the new features stay readable by older clients. Old clients cannot open a V3 file (they reject version 3), which is the only compatibility cost and only affects documents that use the new features.
- **Reader:** V1, V2 and V3 all parse. A V2 document opens with defaults and is not upgraded unless the user applies a V3 feature. Unknown or malformed V3 fields degrade to the defaults instead of rejecting the file (a newer client may add blend modes). Corrupt pixel data and unknown versions are still rejected.
- The creation header schema (`pixelContentSchema`) now accepts version 3.

**Engine.** `lib/pixel-blend.ts` (maths only) and the compositor in `lib/pixel.ts`.
- 14 modes: normal, multiply, screen, overlay, darken, lighten, add, difference, color-dodge, color-burn, hard-light, soft-light, exclusion, subtract (W3C formulas). Backdrop is always opaque (Paper) and layer cells are empty or opaque, so `result = (1-o)*backdrop + o*B(backdrop, source)`.
- Plain layers (normal, 100%) take the original copy path. A test compares the compositor against a straight port of the old one on random documents: bit-identical.
- Dirty-rect compositing (M4) works with blends: a rect recomposite equals the full composite inside the rect and leaves the rest untouched (tested).
- Cost: 3 layers at 512x512, plain 6.4 ms, with two multiply layers 24.9 ms per full composite. Blended layers cost more, so dirty rects matter.

**Transparency lock.** Painting cannot change which cells of the layer are empty: empty cells stay empty, painted cells cannot be erased, recolouring is allowed. It is enforced where the editing buffer is written back to the layer, so every tool (pencil, fill, eraser, shapes, selection delete) obeys it. It has no effect on the bottom layer (that layer has no empty cells), and the checkbox is disabled there.

**Merge down / merge visible.** Blended results are arbitrary colours but layers store palette indices, so merges now go through a palette resolver (`lib/pixel-merge.ts`): exact palette match, else append a new colour (one undo step also restores the old palette), else nearest colour when the 256-colour palette is full (the existing "palette full" notice is shown).
- All-plain documents use the original index paths, unchanged.
- Tested property: merging visible blended layers and rendering the result reproduces the displayed image exactly.
- Known limit: when merging a semi-transparent layer onto empty cells of a non-base layer, those cells get the source colour at full strength (an indexed layer cannot keep partial transparency).
- A merged layer keeps the lower layer's own opacity and blend.

**History.** Layer frames carry opacity, blend and lock, so undo/redo restores them. Dragging the opacity slider is one undo step (changes to the same layer and property within 900 ms coalesce).

**UI.** `LayerStyleControls` (opacity slider, blend select, lock checkbox) under the layer list on desktop and inside the layer sheet on mobile. New copy in Indonesian and English.

**Tests.** 29 new tests (blend maths, compositor equivalence, rect compositing, V2/V3 round trips, degrade-to-default, version rejection, header schema, alpha lock, resolver, merge, WYSIWYG merge, history). Suite: 429 pass, 0 fail. `tsc` clean. Lint: no new errors (PixelBoard, PlaygroundForm, StudioInspector keep their 15, LayerPanel its 3).

**Not covered / next.**
- Layer thumbnails ignore opacity and blend (they show the layer's own pixels).
- The colour-usage histogram from a saved document counts the top painted index and ignores opacity and blend.
- M7b groups: not started. A group needs an isolated sub-composite plus tree-aware move, delete, merge and history, so it is its own milestone.
- Not verified in a browser.

## 14. M7b: layer groups (V4)

**Model** (`lib/pixel-groups.ts`, pure). One level only (no nesting). Layers stay in one flat stack; `layer.group` names the group. Invariant: a group's members are contiguous. A group has a name, visibility, opacity, blend mode and a UI-only `collapsed` flag.
- Moving a layer decides its group from where it lands: between two members it joins, still touching its own group it stays, anywhere else it leaves. Property test: 60 random sequences of 80 operations keep the layout valid.
- Operations: create from a layer, assign (moved next to the run), remove (a middle member is lifted above the run), ungroup, move a whole group past a layer or group, group style. Empty groups disappear.
- Merge down works only inside one group or between two ungrouped layers. Merge visible respects hidden groups and never drops the merged layer inside a group run.

**Compositing.** A group composites its members in isolation into an RGB + alpha buffer, then blends onto what is below with the group opacity and blend. A normal 100% group of plain layers renders identically to the flat stack; a lone member at opacity X in a normal group renders identically to the ungrouped layer at X; a multiply member does not see layers outside its group. Hidden and 0% groups hide members in compositor, flatten and merge. Dirty-rect compositing matches the full composite with groups. Merging visible layers with groups reproduces the displayed image exactly. Cost (512x512, 4 layers): flat 11.0 ms, plain group 9.1 ms, isolated group 24.2 ms.

**Format V4.** V3 plus `groups` and `layer.group`; written only when a group exists. The parser repairs rather than rejects (malformed records skipped, unknown references and split runs ungrouped, empty groups dropped). Version 5 is rejected. Older clients cannot open a V4 document.

**History.** Frames carry groups and membership. Group slider drags coalesce (900 ms); collapsing is not an undo step.

## 15. Drop a layer on a group header

The group header row in the layer panel is now a drop target: dragging a layer onto it moves the layer into that group (next to the run, same rule as the group select). The header highlights with a dashed outline while hovering. Works on collapsed groups. Dropping a layer already in the group does nothing. The group select remains the keyboard and touch route.

## 16. Pattern fill (`lib/pixel-pattern.ts`)

- 10 patterns: solid, checker, dots, dither 25%, dither 75%, horizontal lines, vertical lines, diagonal, crosshatch, bricks. Patterns are anchored to canvas coordinates, so neighbouring fills tile seamlessly; dither 25% is a subset of dither 75% (ordered Bayer thresholds).
- The pattern paints the current colour on the cells that hit it and leaves the other cells as they were. The fill region is found exactly as for a solid fill (tolerance, selection clip, contiguous or Shift-global), so the pattern does not cut the region up: a 1-cell corridor still fills end to end. A separate visited mask is used because unpainted cells can no longer double as "visited".
- Solid is byte-identical to the previous behaviour. Pattern picker with an 8x8 preview in the inspector (fill tool) and the mobile tool row.
- Not included: a second pattern colour. Use two fills (different pattern or colour) for two-colour patterns.
- 10 tests (density, periodicity incl. negative coordinates, region equality with a reference, tolerance, clip, seamless tiling, global replace).

## 17. M8: export engine and dialog

**Where.** "Export…" in the studio's More panel opens `ExportDialog`. It snapshots the current document (selection committed first), shows a live preview with size and byte count, and downloads. The existing PNG download for saved creations is unchanged.

**Formats** (`lib/pixel-export-engine.ts`, pure; only raster encoding is injected):
| Format | Notes |
|---|---|
| PNG, WebP | transparent, paper or custom background; WebP quality |
| JPEG | no alpha, so a transparent choice falls back to paper; quality |
| GIF | one frame (the visible image) or every visible layer as a frame; delay, loop forever or once; transparent index; disposal 2 so frames never ghost |
| Sprite sheet | visible layers as frames in a grid (columns or auto, gap in px); PNG, or a ZIP with the PNG and a JSON map (index, name, x, y, w, h, scale) |
| Separate layers | ZIP with one PNG per layer (`01-Name.png`, safe unique names), optional layer opacity as alpha, optional hidden layers |

**Scaling.** Any whole number from 1 up to the edge limit (2560 px); nearest-neighbour blocks only. Output over the limit is refused with a message instead of being cropped.

**Fidelity.**
- Composite exports use the editor's own compositor, so blends, opacity and groups match the screen (tested against the viewport compositor on random documents with blends and groups).
- Transparent background removes Paper only where no layer painted. A painted cell that is Paper-coloured stays opaque; semi-transparent and blended cells are baked exactly as shown (against paper).
- Layer exports render one layer on its own; blend mode and group do not apply to a lone layer.
- GIF frames use palette indices directly (the document is already indexed), so there is no quantisation for layer frames. A flat GIF of a blended image with more than 255 colours keeps the most frequent colours and maps the rest to the nearest.
- Layer-frame GIF with a full 256-colour palette needs one unused index for transparency; if every index is used it reports a palette error.

**Encoders written for this milestone** (no dependencies): GIF89a with LZW (`lib/pixel-gif.ts`) and a store-only ZIP writer (`lib/pixel-zip.ts`). Verified three ways: an independent decoder written from the spec in the tests (round trip for palette sizes 2-256, dictionary overflow and clear-code reset), Pillow (3 frames, loop, 120 ms, transparent index, frame sizes) and `unzip -t` on real output. CRC-32 matches the standard check value.

**Speed** (512x512, 8 layers, main thread, stub raster encoder): GIF with 8 layer frames 156 ms, flat GIF 48 ms, composite 25 ms, 8-frame sheet 29 ms. No worker was added because nothing needs it yet.

**Tests.** 20 engine tests + 8 GIF/ZIP tests. Suite: 599 pass, 0 fail. `tsc` clean. Lint: no new errors.

**Not verified / limits.**
- The canvas encoder (`lib/pixel-export-canvas.ts`) and the dialog were not run in a browser. Browsers that cannot encode WebP return a PNG; that is detected and shown as an error instead of saving a PNG named .webp. Canvas may round semi-transparent colours slightly (layer-opacity-as-alpha export).
- The document has no timeline, so "animation" means layers as frames. A real frame model would be its own milestone.
- Nested folders in the ZIP, per-group export and animated WebP are not implemented.
