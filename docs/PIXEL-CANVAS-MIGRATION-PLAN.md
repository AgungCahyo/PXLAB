# THE COMMONS — Pixel Canvas Migration Plan

**Status:** Superseded for sequencing and product center.  
**Use instead:** [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)  
**Product:** [PRODUCT-SPEC.md](PRODUCT-SPEC.md)  
**Engine notes:** [PIXEL-CANVAS-SPEC.md](PIXEL-CANVAS-SPEC.md)

Do not implement this document’s Phase 2–7 as the next workstream. It assumed Common Space (a fixed 512 × 512 shared canvas plus realtime) was the product evolution. THE COMMONS is now a pixel art community. Create is the Playground. The giant sparse Common Space is phase **B6**, after the community loop, and is **not a launch requirement**.

Phase 0 audit and Phase 1 local prototype from this document **did happen**. Keep that work. Do not delete PixelBoard, `lib/pixel.ts`, `SpaceBoard`, or `space_elements`.

---

## 1. Guiding rule (still valid)

This is a targeted product evolution, not a greenfield rebuild.

Do not replace the whole application. Do not rewrite working authentication, profiles, or unrelated modules. Do not delete old tables, migrations, or data. Audit first.

## 2. What this file used to schedule

| Old phase | Old intent | Current fate |
|---|---|---|
| 0 Audit | Inspect `/space`, schema, tokens | Done |
| 1 Local prototype | In-memory PixelBoard on `/space` | Done; reuse engine in Create (B2) |
| 2 Data model `canvas_tiles` 16×16 of 512 | Shared canvas storage | **Do not build next.** B6 uses sparse unlimited tiles, not a fixed 512 world |
| 3 Trusted stroke RPC | Shared-canvas writes | Defer to B6 |
| 4 Realtime | After persistence | Defer to B6; not community MVP |
| 5 Undo and moderation | Shared-canvas undo | Playground undo is local (B2). Shared undo is B6 |
| 6 Colorful redesign starting at Common Space | Space-first restyle | **B1** restyles the community shell/landing first; Space is not the hero |
| 7 Regression as shared-canvas launch | Gate on realtime canvas | Community launch gates are A/B/C/E in IMPLEMENTATION-PLAN; Gate D collective is not a blocker |

## 3. Historical Phase 1 (complete)

**Status:** Historical. Engine moved to Create in B2. B5 retired the flag on `/space`; the SVG board stays archived there.

The prototype validated crisp pixels, zoom/pan, pencil/eraser, and mobile scroll behavior. It does **not** persist. It is not evidence that the shared canvas is the product center.

## 4. Historical schema sketch (B6 input only)

Possible later tables (sparse, not a pre-filled 16 × 16):

- `canvas_tiles` unique `(tile_x, tile_y)`, compact `pixel_data`, `revision`
- `canvas_actions` for attribution, safe undo, admin recovery

Resolve before B6: snapshot vs delta, empty Paper representation, extent cap, retention, atomic multi-tile strokes, revision strategy, undo rule.

Do not store every pixel as a separate database row. Do not assume JSONB is optimal without measuring payload size and write costs. Do not create these tables in B1–B5.

## 5. Release gates (retired as written)

Old gates A–E (prototype → persist → two-account realtime → undo → redesign) applied to a Common Space-centered launch. They are not community-MVP gates.

See IMPLEMENTATION-PLAN phases B1–B5 and B7.
