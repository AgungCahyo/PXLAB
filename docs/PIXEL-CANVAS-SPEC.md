# THE COMMONS — Pixel Engine Notes

**Status:** Dual-mode engine notes. **Not** the product center.  
**Product source of truth:** [PRODUCT-SPEC.md](PRODUCT-SPEC.md)  
**Sequencing:** [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)

This file used to say THE COMMONS is one shared pixel canvas. That framing is retired.

There are two pixel surfaces. They share drawing math. They do not share a world model.

| Mode | Role | Canvas model | When |
|---|---|---|---|
| **Pixel Art Playground** | Primary Create path | Fixed 512 × 512, owner-only | Community MVP (phase B2) |
| **Common Space** | Secondary giant world | Sparse tiles, camera, grow-on-demand | After community MVP (phase B6) |

Visual identity: [PIXEL-ART-DESIGN-SYSTEM.md](PIXEL-ART-DESIGN-SYSTEM.md).

---

## 1. Shared drawing rules

These apply to both modes unless a section overrides them.

- Discrete square pixels; no anti-aliased freehand brush.
- Empty / erased cells are Paper `#FFFDF7`.
- Curated swatches remain shortcuts: Ink `#20202A` plus Coral, Tangerine, Lemon, Lime, Mint, Sky, Blue, Violet, Pink. Playground drawing color is any `#RRGGBB` stored in the work’s document palette.
- Integer coordinates. Clamp or reject out of bounds.
- HTML Canvas 2D (or equivalent raster). One buffer per view, not one DOM node per pixel.
- Nearest-neighbor scaling; image smoothing disabled.
- Pointer Events; Bresenham paths so fast moves do not skip cells.
- Zoom steps used by the prototype: Fit, 1×, 2×, 4×, 8×, 12×. Grid overlay from 8×.
- Never one network request per pixel.
- Never trust client user IDs, colors, or coordinates without server validation.

Constants live in `lib/pixel.ts` (`PIXEL_CANVAS_SIZE` 512, `PIXEL_TILE_SIZE` 32, swatches, `walkLine`, `clientToCell`).

Eyedropper and fill bucket stay deferred until PRODUCT-SPEC approves them. The Playground custom color picker is approved (free color, HEX, recent, favorites).

**Design-tool expansion (beyond MVP pencil/eraser/pan):** audit and phased roadmap live in [PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md](PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md). That document is planning-only until an explicit D1+ slice is approved. Do not treat this SPEC’s “deferred” list as a denial of that roadmap — only as the current shipped baseline.

---

## 2. Pixel Art Playground (personal)

In-app editor at `/create` and `/create/[id]`. Not a separate application.

- Owner-only write.
- Local undo/redo is allowed (personal document).
- Persist as `creations.type = pixel` with **two artifacts** (see TECHNICAL-SPEC):
  - **Editor source:** palette + RLE of palette indices (`source.json`). Required to reopen and keep editing.
  - **Rendered PNG:** generated from source on save/publish. Display only (thumbnail, Explore, profile, detail).
- Playground hydrates from source, never by sampling the PNG. On load, validate format version (keep v1 readable), encoded size, RLE decode length, and palette-index bounds before painting.
- Loop: save draft → preview → publish. Owner can unpublish without delete.
- Auth required to save or publish.
- Fork copies **source** (then regenerates PNG) into a new draft.

Playground owns PixelBoard. `/space` is a secondary later-canvas page; it does not mount the Playground engine.

### Recorded at Phase 1 prototype

- Flag: `NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE` is retired for `/space` (B5). SVG `SpaceBoard` stays archived on that route. SVG is not deleted.
- Logical canvas 512 × 512; tile size 32 × 32 recorded for later Common Space storage, unused in the prototype.
- Drawing is in-memory only.
- Stroke/rate limits, action retention, realtime, and the site-wide redesign are not in the prototype.

---

## 3. Common Space (later, secondary)

People draw giant pixel art on one shared canvas. It is not the landing hero, **not community MVP**, and **not a launch requirement**. Sparse tiles, viewport, conflicts, and realtime stay in phase B6 after the community can ship.

### World model

- Sparse tile map. A tile exists only where someone has drawn. Missing tile = Paper.
- Tile size 32 × 32.
- Camera/viewport loads nearby tiles. Do not download the whole world.
- “Unlimited” means grow-on-demand with a practical anti-abuse extent of **±32,768 pixels** on each axis (PRODUCT-SPEC default; revise before B6 if needed).
- Not a single 512 × 512 shared replica of the Playground.
- Not the legacy SVG text/shape board as the long-term model.

### Collaboration rules (when B6 is approved)

- Visitors view, zoom, and pan. Members draw and erase anywhere (no territories by default).
- Batched strokes. Server is authoritative. Last accepted server commit wins on overlapping pixels.
- Include tile revision/version information. Reconcile optimistic preview with authoritative state. Never trust client timestamps for ordering.
- Undo is not local Ctrl+Z: members may undo only their own most recent eligible action, and only if later actions have not changed those pixels.
- Record action ID, actor, affected tiles, compact deltas, previous/new colors, server timestamp, revision.
- Realtime transports committed changes only, after persistence works.
- Auth, validation, max pixels per stroke, rate limits, action history, and admin recovery are required before public draw-anywhere.

Do not add protected territories without explicit product approval.

### `/space` during the community MVP

Keep the route as a later-canvas page with the SVG board archived in place. Do not add `canvas_tiles` or realtime in B1–B5. Do not drop `space_elements`.

When the giant canvas ships, the canvas/viewport dominates; toolbar stays close; status is secondary.

---

## 4. MVP drawing tools

| Tool | Playground (B2) | Common Space (B6) |
|---|---|---|
| Pencil | Yes | Yes |
| Eraser | Yes (restore Paper) | Yes |
| Palette | Document colors + custom picker | Curated swatches |
| Zoom / pan / fit | Yes | Yes (camera over a world) |
| Undo/redo | Local, own document | Own eligible action only, server-checked |
| Custom color picker | Yes (HEX, recent, favorites) | Deferred |
| Eyedropper | Deferred | Deferred |
| Fill bucket | Deferred | Deferred |

### Stroke flow (persisted modes)

1. Pointer down starts a stroke.
2. Movement maps to grid coordinates.
3. Client previews locally.
4. Duplicate coordinates are removed.
5. Pointer up completes the stroke.
6. One compact batch is sent (Playground: save source + derived PNG; Space: stroke RPC).
7. Server validates and persists.
8. Playground: owner reloads from **source**. Space: other clients receive the committed change when realtime exists.
9. Client reconciles preview with authoritative state.

---

## 5. Existing MVP compatibility

| Existing module | Decision |
|---|---|
| Authentication | Keep |
| Profiles | Keep |
| Explore | Keep; emphasize pixel-art creations |
| Individual creations | Adapt Create into Playground; add type `pixel` |
| Old text/shape Common Space | Keep table/UI; not the long-term model |
| Comments/appreciation | Keep; primary community loop |
| Fork | Remix/duplicate of individual pixel art |
| Moderation | Keep; extend to canvas actions in B6 |
| Dashboard | Keep useful shortcuts |

Do not delete old data or migrations.

---

## 6. Out of scope (both modes unless approved)

Multiple canvases/rooms, user-owned territories, voice/chat, layers, animation timeline, image import/pixelation, AI generation, advanced selection/gradient/text tools, leaderboards, monetization, and treating the shared canvas as the whole product.

---

## 7. Acceptance

### Playground (community MVP)

- Crisp square pixels at recorded zoom levels.
- Owner can draw, save source, reopen from source, preview, publish, unpublish.
- Anonymous cannot persist.
- Published PNG appears on Explore/detail; editing still uses source.

### Common Space (later)

- Visitors can view, zoom, and pan a sparse world.
- Members can draw with mouse and touch; paths do not gap at normal speed.
- Strokes persist after refresh; invalid payloads rejected.
- Overlaps follow last-commit-wins; undo cannot overwrite later work.
- Auth/profile and community features remain intact.
