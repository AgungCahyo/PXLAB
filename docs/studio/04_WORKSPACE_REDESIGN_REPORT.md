# PXLB Studio — Workspace Redesign (WR0–WR4)

**Date:** 23 Nov 2026 · **Scope:** chrome only (`PlaygroundForm`, `StudioInspector`, tests, docs)
**Not touched:** `PixelBoard`, `lib/pixel*`, history, layers data, import/export, persistence, keyboard shortcuts, `app/globals.css`, `lib/copy.ts`.

## WR0 — Audit (what the code actually is)

| Zone | Implementation | Notes |
|---|---|---|
| Top bar | `playground-header` in `PlaygroundForm` | back · title + size · zoom/grid/undo/redo (`md+`) · save (only when dirty) · More |
| Left toolbar | `playground-tool-rail` via `toolButtons` | 22 buttons, groups were mixed (fill between brushes and polygon, gradient with text, eyedropper with pan) |
| Stage | `playground-stage` + `PixelBoard` + `StudioMinimap` overlay | board has its own `ResizeObserver` |
| Right sidebar | `StudioInspector` → `LayerPanel` | single scrolling column |
| Bottom | `editor-status` bar only | **no timeline / frames / animation exists** |
| Reference images | **do not exist** | |
| State | React state in `PlaygroundForm` + refs in `PixelBoard`; no store | |

### Problems found

1. **Inspector was one scroll column**: shortcuts → colour row → palette (unbounded, up to 255 swatches) → tool options (variable height, brush dynamics ≈ 10 controls) → layers last. Layers were pushed out of reach and jumped whenever the tool changed.
2. **Horizontal overflow**: at `lg+` six 40px swatches + gaps = 270px inside a 256px content box.
3. **Empty Options section** rendered (padding + border) for tools with no options (pan, eyedropper, lasso, gradient).
4. **Redundant information**: current colour shown in the inspector row, the palette selection and the status bar; save status only in the bottom bar, far from the document name.
5. **Layout shift in the header**: the Save button mounted/unmounted with dirty state, moving the More button.
6. **Tool configuration in the toolbar**: symmetry toggle lived in the tool rail.
7. **Tool grouping** did not follow task (draw / shapes / fill & colour / selection & navigation).
8. **No way to reclaim the sidebar width** for the canvas on desktop.
9. Shortcut help took the most prominent slot of the inspector.

## WR1 — Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR  back · title · size · status │ zoom grid │ undo redo │ inspector ⏷ save more │
├────┬─────────────────────────────────────────┬───────────────┤
│ L  │                                         │ INSPECTOR     │
│ E  │            CANVAS (stage)               │  Palette  ▣   │ collapsible, capped, own scroll
│ F  │      PixelBoard + minimap overlay       │  Options  ▣   │ only when the tool has options
│ T  │                                         │  Layers       │ flexible, own scroll, min 8rem
│    │                                         │  Shortcuts    │ footer disclosure
├────┴─────────────────────────────────────────┴───────────────┤
│ STATUS  cursor · tool · edit flash                (desktop)   │
│ [TIMELINE slot — intentionally absent until M6]              │
└──────────────────────────────────────────────────────────────┘
```

* Canvas first, tools second, context third.
* Top bar = document + global actions only. Tool settings never enter it.
* Rail = tools only: **Draw** (brush, circle, eraser, text) · **Shapes** (line, rect, ellipse, polygon, bezier) · **Fill & colour** (fill, gradient, eyedropper) · **Select & navigate** (box, wand, colour, lasso, polygon-select, pan).
* Inspector: Palette (header carries current colour + hex) → Options (title carries active tool name; brush dynamics nested and collapsed by default) → Layers (takes remaining height).
* Preview = the existing minimap overlay (kept as overlay, not a panel).
* Timeline and reference images: **not built** (nothing to preserve, nothing to wire; faking either would violate "no mock controls").

## WR2 — Changes

| File | Change |
|---|---|
| `components/creations/StudioInspector.tsx` | Retained and restructured. New local `InspectorSection` (toggle with `aria-expanded`, fixed header, scrolling body). Palette + Options collapsible; Layers wrapped in its own scroll region; shortcuts moved to footer; colour row merged into palette header; fluid square swatches; Options panel only mounted when it has content; brush dynamics nested disclosure; new optional props `toolLabel`, `symmetryControl`, `symmetryStatus`. All control blocks and handlers are unchanged. |
| `components/creations/PlaygroundForm.tsx` | Tool regrouping (order only); symmetry removed from desktop rail (mobile dock unchanged) and passed to the inspector; header: stable Save slot (enabled exactly when it used to be visible), document status beside title (desktop), inspector toggle (`sliders`, `aria-pressed`), divider between view (zoom/grid) and history (undo/redo); status bar split into `desktop` / `mobile` surfaces (desktop drops save status; shows colour swatch only when the inspector is collapsed). |
| `tests/pixel-studio-redesign.test.ts` | New WR2 test (source-pattern, repo convention). |
| `docs/studio/*` | This report + tracker status. |

Created: none (no new component files). Removed: none. Consolidated: current-colour row → palette header.

## WR3 — Verification (what was and was not possible)

Environment had **no `node_modules` and no network**, so `npm run dev|build|test|typecheck` could not run.

Done:
* Source-pattern tests (the repo's style) executed with a stand-in runner over all `tests/*.test.ts`: **1119 pass / 1 fail — identical to the untouched repo**; the single failure (`works-home.test.ts`) is unrelated and pre-existing. Studio + mobile-chrome suites: 192/192, including the new WR2 test.
* TypeScript syntax parse of all changed files: OK. Semantic pass (strict, with stub React types because `node_modules` is absent; unresolved-module and implicit-any noise filtered): no errors beyond the stub artifacts that the untouched code also produces. *(An earlier revision of this note claimed "0 findings" from a run whose tsconfig had actually failed to load; it was re-run correctly and the checker was mutation-tested.)*
* Engine files byte-identical to the original (`PixelBoard.tsx`, `lib/pixel*`, `globals.css`, `copy.ts`).

**Not verified (needs a browser, please run):**
`npm ci && npm run typecheck && npm run lint && npm test && npm run dev`, then walk the checklist:
- [ ] every tool selects, draws, and its shortcut still works (B C E T L U O P Q G N I V W K S Y H)
- [ ] palette collapse/expand, colour pick, browse dialog
- [ ] Options appears/disappears per tool; brush dynamics disclosure; symmetry cycles X/Y/XY/off
- [ ] layers: add/merge/drag/context menu/opacity/blend/groups, scroll with 8 layers + open Options
- [ ] inspector toggle: canvas widens, zoom/fit still correct, minimap re-syncs
- [ ] Save disabled when clean, enabled when dirty; status text in header updates
- [ ] 1024×768, 1280×720, 1440×900: no horizontal overflow, no page scroll, no overlap
- [ ] mobile (<768px): dock, tabs, layer strip unchanged

## WR4 — Review vs proposal / remaining

* Matches proposal for top bar, rail, inspector, stage.
* Layers' top edge still moves when Options appears/disappears (content above is stable; layers scroll independently). A fixed-height options region would remove this at the cost of space.
* Panel open/closed state is not persisted across reloads (would need a hydration-safe storage hook).
* Inspector width is not user-resizable (collapse only).
* Mobile still has duplicate option surfaces (tabs vs. dock) — out of this pass.
* Timeline slot and reference images wait on M6 / a product decision; no UI was invented.
* `PlaygroundForm` is still ~2.3k lines; splitting it into `StudioHeader`/`StudioToolRail` is the natural next step once this chrome is accepted.
