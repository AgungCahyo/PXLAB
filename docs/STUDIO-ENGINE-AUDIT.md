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
| M6 | Brush engine: opacity/flow/spacing, pressure, custom shapes | |
| M7 | Layer alpha/blend/groups (needs §3 approval; V3 schema + migration tests) | |
| M8 | Export: JPEG/WebP, per-layer, spritesheet, previews | |
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
