# PXLB Studio — Complete Editor Workspace Redesign

**Workstream:** WR  
**Status:** IMPLEMENTED — see `04_WORKSPACE_REDESIGN_REPORT.md`  
**Date added:** 23 Nov 2026  
**Master plan:** `docs/master-plan/PXLB-STUDIO-MASTER-EXECUTION-PLAN.md` §11  
**Current implementation facts:** `docs/studio/01_SYSTEM_AUDIT.md`  
**M1 chrome already shipped:** `docs/studio/02_WORKSPACE_LAYOUT.md`

This is a **structural** redesign of the editor workspace. It is not a skin, not a colour pass, and not a rewrite of the drawing engine.

---

## 0. How this relates to work already done

| Already true in the repo | Implication for WR |
|---|---|
| M0 audit of Studio exists | WR0 starts from `01_SYSTEM_AUDIT.md`, then re-inspects chrome only |
| M1 shipped header undo/grid, quieter publish, minimap, mobile tabs, create dialog | Keep those behaviours; re-house them into the five-zone architecture |
| `PlaygroundForm` is still the chrome monolith (~2300 lines) | Split only as far as WR1 names components |
| `PixelBoard` is the engine (`chrome={false}`) | Do not move chrome back into the board |
| No animation timeline / frame model | Bottom zone is a **reserved slot**. Do not invent playback UI |
| Indexed document, 8 layers, inspector, tool rail | Preserve; reorganize presentation |

---

## 1. Primary objectives

1. Establish a clear and consistent workspace architecture.
2. Improve visual hierarchy and information organization.
3. Eliminate unnecessary visual clutter and redundant UI.
4. Improve panel efficiency and available canvas space.
5. Make the editor easier to navigate and understand.
6. Ensure the architecture can accommodate future features without accumulating UI complexity.
7. Preserve all existing editor functionality and behavior.

## 2. Proposed workspace architecture

Evaluate and redesign around these regions.

### A. Top bar

Global actions and project-level information:

- Project name and document status.
- File operations.
- Undo and redo.
- Global editor actions.
- View and workspace controls where appropriate.

Do **not** put frequently changing tool-specific settings here.

**Today:** `playground-header` — back, title, size (locked dialog), zoom + grid/undo/redo (`md+`), save-if-dirty, More. Publish lives in More.

### B. Left toolbar

Exclusive to direct canvas interaction. Group tools, for example:

- Selection and navigation.
- Drawing tools.
- Shape tools.
- Fill and color manipulation.
- Editing and transformation tools.

Requirements: consistent icon size/spacing; clear active/hover/disabled/selected; grouping and separators; tooltips for icon-only controls; **no** tool configuration inside the rail.

**Today:** `playground-tool-rail` (`md:flex`) already lists the live tools with dividers. Options live in `StudioInspector` / mobile tabs.

### C. Center workspace

The canvas is the primary visual focus.

- Maximize canvas space.
- Keep centering and zoom.
- Preserve checkerboard (`copyRgbaWithCanvasChecker`).
- Avoid extra nested frames.
- Respond when side panels collapse or resize.
- No accidental overflow or layout shift.

**Today:** `playground-stage` + `PixelBoard` + floating `StudioMinimap`.

### D. Right sidebar

Contextual settings and supporting information. Evaluate:

- Tool options.
- Layers.
- Color and palette.
- Preview (minimap / export preview).
- Reference images (**do not exist** — do not add a fake panel).

Requirements: hierarchy; collapsible sections or tabs; frequent panels first; no extra nested boxes; independent scroll; no duplicated controls.

Not every panel must always be visible.

**Today:** `StudioInspector` (desktop) — shortcuts, color, palette, tool options, layers. Mobile: Opsi / Warna / Lapisan tabs.

### E. Bottom timeline

Animation and frame management **when that product exists**.

- Distinct from drawing.
- Preserve existing animation behaviour (**none today**).
- Optimize vertical space.
- Collapsible / resizable when implemented.

**Today:** status bar only (`editor-status`). GIF export uses layers-as-frames. Real frames are M6, not WR.

## 3. Design system and visual hierarchy

- Canvas first, tools second, supporting information third.
- Consistent spacing, alignment, type, icons.
- Restrained borders, shadows, background shifts.
- Clear interactive vs informational chrome.
- Consistent states.
- No decoration for its own sake.

Use the existing PXLB identity (Paper, Earth 3px, Brick, `PixelIcon`, studio density tokens). Do not replace the design language.

## 4. Required codebase audit (WR0)

Inspect before changing. Identify:

- Main editor entry: `app/[lang]/(member)/create/[id]/page.tsx` → `PlaygroundForm`.
- Workspace layout: `PlaygroundForm` (no `StudioShell` files yet).
- Toolbar: `toolButtons` in `PlaygroundForm`.
- Right sidebar: `StudioInspector`, `LayerPanel`, `BrushOptionsPanel`, `FillPatternPicker`.
- Canvas: `components/canvas/PixelBoard.tsx`.
- Timeline: **missing**.
- State: React state in the form + refs in the board. No global store.
- Responsive: `md` rail/inspector; mobile dock + tabs; density tokens in `app/globals.css`.
- Duplicates: mobile vs inspector options; More vs header actions.

Decide retain / reorganize / refactor / split / consolidate. Do not replace components without understanding them.

## 5. Strict functionality preservation

Do **not** unintentionally modify:

- Drawing engine, compositor, pixel math.
- Layer data structures, undo/redo.
- Animation engine / frame management (none — do not stub).
- Import/export, persistence.
- Keyboard shortcuts, existing state behaviour.

No mock controls. If shared logic must change, explain the dependency and make the smallest change.

## 6. Implementation strategy

| Phase | Mode | Deliverable |
|---|---|---|
| **WR0 Audit** | No chrome rewrite | Short architecture note: current regions, clutter, duplicates |
| **WR1 Proposal** | No code (or tokens-only if needed) | Named regions, collapse rules, what is always visible |
| **WR2 Implement** | Incremental | Rehouse chrome; keep `PixelBoard` API |
| **WR3 Verify** | Tests + manual checklist | Tools, panels, zoom, overflow, no overlap |
| **WR4 Review** | Docs | Diff vs WR1; remaining issues |

Work order inside WR2 (suggested):

1. Name and split chrome (`StudioHeader`, `StudioToolRail`, `StudioStage`, `StudioInspector` already exists, status).
2. Top bar: document vs tool settings.
3. Rail grouping only (no new tools).
4. Inspector: collapsible sections; kill duplicate controls.
5. Stage: maximise canvas; minimap as overlay, not a competing panel.
6. Timeline slot: CSS reserved / hidden until M6. **Empty, not fake.**

## 7. Working rules

- Inspect before modifying.
- Do not guess component responsibilities.
- Do not rewrite working systems unnecessarily.
- Do not remove functionality only to simplify layout.
- No unnecessary dependencies.
- Avoid excessively fragmented components.
- Keep existing conventions.
- No unrelated refactoring.
- Do not declare done without verification.

## 8. Expected deliverables (when WR is complete)

1. Summary of original layout problems.
2. New workspace architecture.
3. Components modified, created, consolidated, or removed.
4. Explanation of the new visual hierarchy.
5. Functionality preservation and regression test results.
6. Remaining issues or recommended improvements.

## 9. Final design principle

Every UI element must have a clear purpose, a logical position, and an appropriate level of visual importance.

The canvas is the workspace. The toolbar provides tools. The right sidebar provides context and configuration. The timeline manages animation **when it exists**. The top bar handles global actions.

Build a cohesive editor where the interface supports creativity instead of competing for attention.

---

**Next action when this workstream is started:** WR0 audit of chrome only (no engine). Do not skip WR1.
