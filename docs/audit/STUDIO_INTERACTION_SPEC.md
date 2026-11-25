# PXLB — Studio Interaction Standardisation Spec (PROPOSAL)

**Document:** `docs/audit/STUDIO_INTERACTION_SPEC.md`  
**Status:** **PROPOSAL — AWAITING OWNER DECISION. NOT IMPLEMENTATION AUTHORIZATION.**  
**Created:** 2026-11-25  
**Audience:** Founder/owner, Studio product/engineering (only after separate go-ahead).  
**Evidence base:** `docs/audit/REPOSITORY_DISCOVERY.md`, `docs/audit/UX_CONSISTENCY_AUDIT.md`, `docs/studio/01_SYSTEM_AUDIT.md`, `docs/studio/03_TOOL_DOCUMENTATION.md`, `docs/studio/04_WORKSPACE_REDESIGN_REPORT.md`, `docs/studio/05_LAYER_GROUP_UX.md`, and direct source inspection.  
**Scope:** Pixel Art Playground / Studio chrome on the pixel path of `/create/[id]`. Legacy `StudioForm` creation types remain outside this spec.  
**Non-goals:** No engine rewrite, no component extraction, no new tools, no timeline/animation/reference-image feature, no persistence or Supabase change, no dependency install, and no behavior change from this document. Everything below is a proposal until the owner signs off and gives a separate implementation go-ahead.

> **Proof vocabulary:** `VERIFIED IN SOURCE` means a file/line was inspected. `PROPOSED` means a decision is requested. `UNVERIFIED` means no browser, pointer/IME, performance or production run was performed. Source-level shortcut maps are not runtime proof.

---

## 1. Status and authority

| Item | Status |
| --- | --- |
| Audit evidence | VERIFIED IN SOURCE — see `docs/audit/UX_CONSISTENCY_AUDIT.md` §7 |
| Studio system audit / workspace report | Existing reference docs; execution claims remain `UNVERIFIED` where they depend on browser behavior |
| This spec | PROPOSAL — AWAITING OWNER DECISION; **not yet executed** (the UI spec phase ran first) |
| Owner decision (2026-11-25) | **Studio dark chrome is intentional** — it is a user requirement, not a defect. Do not re-theme Studio tokens or treat the dark scope as drift. |
| Implementation authorization | **NO.** This file does not authorize code, CSS, route or config changes. |
| Runtime/browser proof | UNVERIFIED — Phase 8 and Studio browser checklists are open. |

---

## 2. Verified baseline

### 2.1 Route and chrome boundary

- `app/[lang]/(member)/create/[id]/page.tsx:32-76` renders `PlaygroundForm` for pixel creations and `StudioForm` inside `data-chrome="studio"` for other types (`VERIFIED IN SOURCE`).
- Pixel Studio is a fixed `inset-0 z-[60]` fullscreen overlay with its own dark tokens under `[data-chrome="playground"]` (`PlaygroundForm.tsx:1436-1437,1799`; `globals.css:101-140`) (`VERIFIED IN SOURCE`).
- Shell footer/backdrop are hidden and the shell busy mark is suppressed for studio chrome; a Studio-local busy mark is pinned (`globals.css:795-812`) (`VERIFIED IN SOURCE`).
- Studio uses a 2px accent focus outline instead of the global 3px Sky outline (`globals.css:442-447`) (`VERIFIED IN SOURCE`).

### 2.2 Input, tools and focus

- Global shortcuts are installed only for `variant === "studio"` and skip default-prevented events, open `dialog[open]`, and typing targets such as input/textarea/select/contenteditable (`PixelBoard.tsx:3125-3134`) (`VERIFIED IN SOURCE`).
- All draw tools are mapped to `b,c,e,h,i,g,p,l,u,o,q,t,n,v,w,k,s,y` (`PixelBoard.tsx:3309-3327`) (`VERIFIED IN SOURCE`).
- Shortcut-selected tools are tagged so DOM focus moves to the new rail button (`PixelBoard.tsx:3307-3309`) (`VERIFIED IN SOURCE`).
- Rail buttons expose `data-tool`, `aria-label`, `title`, `aria-pressed` and localized shortcut labels (`PlaygroundForm.tsx:821-875`) (`VERIFIED IN SOURCE`).
- `docs/studio/01_SYSTEM_AUDIT.md:142` claim that listed tools have rail buttons and shortcuts is source-confirmed; execution is still UNVERIFIED.

### 2.3 Editing, layers and menus

- Undo/redo: `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Ctrl/Cmd+Shift+Z`; history is capped at 32 steps and 48 MiB of unique buffers (`PixelBoard.tsx:3173-3181`; `lib/pixel-history.ts`) (`VERIFIED IN SOURCE`).
- Select-all/invert/copy/cut/paste: `Ctrl/Cmd+A`, `Ctrl/Cmd+Shift+I`, `Ctrl/Cmd+C/X/V` (`PixelBoard.tsx:3182-3206`) (`VERIFIED IN SOURCE`).
- Escape chains cancel polygon select, shape draft, move/resize/rotate, floating selection and text edit; Enter commits polygon/shape; Delete/Backspace removes text or selected vertex (`PixelBoard.tsx:3144-3171,3209-3270,3294-3305`) (`VERIFIED IN SOURCE`).
- Arrow keys nudge selection; Shift increases step; text tool uses Shift = 8px (`PixelBoard.tsx:3163-3171,3252-3264`) (`VERIFIED IN SOURCE`).
- Brush size `[`/`]`, grid `'`, Space pan, Alt sample, combined select shortcuts (`PixelBoard.tsx:3135-3142,3328-3344`) (`VERIFIED IN SOURCE`).
- Layer panel supports one-level groups, rename with Enter, cancel with Escape, and lock controls; drag/pointer behavior is `UNVERIFIED` in browser and documented as such in `docs/studio/05_LAYER_GROUP_UX.md:48`.
- `StudioContextMenu` closes on Escape and outside pointerdown, clamps to viewport, focuses the first enabled button, and uses `role="group"` with separators (`StudioContextMenu.tsx:37-71,75-111`) (`VERIFIED IN SOURCE`).
- `TextEditOverlay` uses a native `<textarea>` for caret/IME/clipboard/undo, focuses on mount and stops Escape propagation (`TextEditOverlay.tsx:6-14,80-121`) (`VERIFIED IN SOURCE`).
- No timeline, frames, animation or reference images exist (`docs/studio/04_WORKSPACE_REDESIGN_REPORT.md`) (`VERIFIED IN SOURCE` as absence in report; feature status is NOT_IMPLEMENTED).

### 2.4 Health and persistence

- Interaction logic is concentrated in two very large client components: `PixelBoard.tsx` (~158 KB / ~3,800 lines) and `PlaygroundForm.tsx` (~100 KB / ~2,200 lines).
- All 27 ESLint errors are in interaction-heavy components, with 12 in `PlaygroundForm.tsx`, 4 in `CreationMoreMenu.tsx`, 3 in `CornerBusy.tsx`, 2 in `CreationShareDialog.tsx`, and one each in `ColorPicker`, `DocumentPaletteDialog`, `ImportPixelArtDialog`, `RegisterForm`, `SettingsForm`, `PwaInstall`.
- TypeScript and 842 tests pass, but tests are node/static-contract based; there is no DOM runner in this audit.
- Studio checks `navigator.onLine`, retains dirty state and has local draft recovery. Service worker deliberately excludes `/create` and `/create/*` from page caching (`sw.js:98-133`). There is no server autosave or full offline editing claim (`VERIFIED IN SOURCE` for source behavior; runtime UNVERIFIED).

---

## 3. Problems this spec must solve

1. The Studio chrome is deliberately separate, but the boundary between shared rules and Studio-local rules is not written down.
2. Shortcuts are extensive but not discoverable in-product; documented mapping is partial and runtime behavior is unverified.
3. Context menus and layer interactions are usable in source but use inconsistent semantics (`group` vs full menu pattern) and lack roving focus/focus-return proof.
4. Interaction debt (React 19 hook errors) is concentrated in the same components that own input, focus and persistence orchestration.
5. Offline/save expectations are easy to misread: explicit save + recovery drafts, not server autosave or full offline editing.
6. Browser proof for pointer, IME, focus, zoom/pan and drag interactions is still missing.

---

## 4. Proposed Studio contract

All entries are **PROPOSED** unless marked `VERIFIED IN SOURCE`.

### 4.1 Chrome and component boundary

| Concern | Proposed owner | Status |
| --- | --- | --- |
| Editor engine, pointer input, camera, selection, history | `PixelBoard` | PROPOSED boundary, based on current source concentration |
| Studio chrome, tool rail, inspector/layer layout, persistence orchestration | `PlaygroundForm` | PROPOSED boundary |
| Shared primitives allowed inside Studio | Decide explicitly per primitive (`Dialog`, `Input`, `Button`, icons, busy indicator) | PROPOSED |
| Studio-local tokens | `[data-chrome="playground"]` remains the only dark scope | VERIFIED IN SOURCE / PROPOSED to document |
| Global shell chrome | Hidden for Studio; must not leak back during view transitions | VERIFIED IN SOURCE / UNVERIFIED at runtime |

> Do not extract components until this boundary is signed off. This spec defines the contract on paper only.

### 4.2 Tool rail contract

- Every tool button must keep `data-tool`, localized `aria-label`, `title`, `aria-pressed`, icon and shortcut label (`VERIFIED IN SOURCE` requirement to preserve).
- Grouping of the current 22 tools must be documented; mobile bottom toolbar remains capped at `45vh` (`PlaygroundForm.tsx:1799`) (`VERIFIED IN SOURCE`).
- Shortcut-driven tool changes must continue to move DOM focus to the corresponding rail button (`VERIFIED IN SOURCE` requirement).
- Owner decision: whether the rail is a `toolbar` with arrow-key navigation or remains a set of buttons. **PROPOSED**: `role="toolbar"` with arrow-key roving, only if browser-verified.

### 4.3 Keyboard shortcut contract

| Category | Proposed rule | Status |
| --- | --- | --- |
| Guard | Shortcuts apply only in Studio, skip typing targets, skip open dialogs, respect `defaultPrevented` | VERIFIED IN SOURCE / preserve |
| Modifier conflicts | `y` = polygon select; `Ctrl/Cmd+Y` = redo; document this explicitly | VERIFIED IN SOURCE / PROPOSED doc |
| Tool keys | `b,c,e,h,i,g,p,l,u,o,q,t,n,v,w,k,s,y` remain the canonical map | VERIFIED IN SOURCE / PROPOSED freeze |
| Editing | Undo/redo, select all, invert, copy/cut/paste, nudge, cancel/commit chains remain canonical | VERIFIED IN SOURCE / PROPOSED freeze |
| Discoverability | Add an in-app shortcut panel or help affordance | PROPOSED — currently only partial docs |
| Global shortcuts | None outside Studio | VERIFIED IN SOURCE / NOT_APPLICABLE elsewhere |

### 4.4 Canvas, selection and text interaction

- Preserve guarded Escape/Enter/Delete chains and arrow nudging (`VERIFIED IN SOURCE`).
- Preserve native `<textarea>` for text overlays; focus-on-mount and Escape exit must be browser-tested before being called complete (`VERIFIED IN SOURCE`, runtime UNVERIFIED).
- Define the expected pointer-keyboard parity table: select, move, resize, rotate, text edit, zoom, pan, eyedropper and brush sizing must each have a documented mouse path and keyboard path.
- IME, clipboard and caret behavior remain UNVERIFIED until a browser run.

### 4.5 Layers and groups

- Keep one-level groups, rename Enter/Escape, lock and style controls as the supported model (`VERIFIED IN SOURCE`).
- Drag/reorder behavior stays `UNVERIFIED` until browser-tested (`docs/studio/05_LAYER_GROUP_UX.md:48`).
- Owner decision: whether nested groups are in scope. **PROPOSED default**: no nested groups in this spec.

### 4.6 Context menus and focus management

- Preserve Escape/outside-pointer close, viewport clamping and first-enabled-button focus (`VERIFIED IN SOURCE`).
- Owner decision: full `role="menu"`/`menuitem` with arrow-key roving and focus return, or explicitly retained `role="group"` with documented limitations. **PROPOSED**: full menu semantics after browser verification.
- Focus return to the invoking button/context target is mandatory in the proposed contract; it is currently UNVERIFIED.

### 4.7 Persistence, offline and history

- Keep history cap at 32 steps / 48 MiB (`VERIFIED IN SOURCE`).
- Keep explicit save/publish as the primary contract; local draft recovery is recovery-only, not autosave (`VERIFIED IN SOURCE` for source behavior).
- Keep SW exclusion of editor routes; do not promise full offline editing (`VERIFIED IN SOURCE`).
- Any future autosave/offline-edit capability requires its own spec and owner decision; it is outside this proposal.

### 4.8 Health contract

- Treat React 19 hook errors in `PlaygroundForm.tsx`, `CreationMoreMenu.tsx`, `CornerBusy.tsx` and `CreationShareDialog.tsx` as correctness debt in interaction code, not cosmetic lint cleanup.
- No refactor is authorized by this spec. A later implementation ticket must first pass the §4.1 boundary decision.

---

## 5. Mouse / keyboard parity matrix (proposed)

| Operation | Mouse/pointer source | Keyboard source | Current source status |
| --- | --- | --- | --- |
| Choose tool | Rail click | Tool letter keys + focus transfer | VERIFIED IN SOURCE |
| Draw | Pointer on canvas | No equivalent drawing key | NOT_APPLICABLE — pointer-native |
| Select | Rect/ellipse/lasso/wand/color/polygon tools | `v/w/k/s/y` tools, `Ctrl/Cmd+A`, `Ctrl/Cmd+Shift+I` | VERIFIED IN SOURCE |
| Nudge selection | Drag | Arrow keys, Shift = larger step | VERIFIED IN SOURCE |
| Text edit | Double-click / text tool | `t`, Enter to edit, Escape exit, arrows move | VERIFIED IN SOURCE; IME UNVERIFIED |
| Undo/redo | UI controls | `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, `Ctrl/Cmd+Shift+Z` | VERIFIED IN SOURCE |
| Zoom/pan | Wheel/gesture, Space+drag | Space pan, grid `'`, brush `[`/`]` | VERIFIED IN SOURCE; runtime performance UNVERIFIED |
| Layer rename | Panel interaction | Enter commits, Escape cancels | VERIFIED IN SOURCE |
| Context menu | Right-click | First-item focus; full arrow navigation not implemented | PARTIAL |
| Save/publish | Form buttons | Native focus activation | VERIFIED IN SOURCE |

---

## 6. Acceptance criteria

### 6.1 Source-verifiable

- The chrome/component boundary in §4.1 is recorded and referenced by implementation tickets.
- Shortcut guards, tool map, history cap, text overlay semantics and SW editor exclusion remain present.
- Rail buttons keep `data-tool`, labels, `aria-pressed` and shortcut text.
- Context-menu semantics and focus-return behavior match the owner's §4.6 decision.
- Lint debt in interaction components is addressed only after explicit go-ahead.

### 6.2 Browser-verifiable (still UNVERIFIED)

- Mouse and keyboard tool selection produce identical tool state and focus behavior.
- Escape/Enter/Delete chains behave identically for pointer and keyboard users.
- Text overlay works with IME, caret navigation, clipboard and undo.
- Layer drag/reorder, group rename and lock behave predictably.
- Context menu supports the chosen semantics and returns focus.
- Zoom/pan/minimap remain responsive under large canvases.
- Offline/dirty-state recovery does not lose work and does not imply autosave.

---

## 7. Open decisions for owner

| ID | Decision | Recommended default |
| --- | --- | --- |
| S1 | Confirm `PixelBoard` vs `PlaygroundForm` boundary | Engine/input/camera/history in `PixelBoard`; chrome/persistence in `PlaygroundForm` |
| S2 | Which shared primitives are allowed in Studio chrome | Dialog/Input/Button/icons may be reused only with documented Studio token overrides |
| S3 | Tool rail semantics | `role="toolbar"` with arrow-key roving after browser verification |
| S4 | Context menu semantics | Full `role="menu"` with arrow keys and focus return |
| S5 | In-product shortcut discoverability | Add a help/shortcut panel, not just docs |
| S6 | Nested groups | Not in scope |
| S7 | Timeline/animation/reference images | Not in scope |
| S8 | Autosave / full offline editing | Not in scope; explicit save + recovery stays |
| S9 | Lint debt sequencing | Correctness fixes before any extraction/refactor |

---

## 8. Non-authorization notice

This spec records a proposal only. It does **not** authorize editing application source, CSS, components, routes, dependencies, Supabase configuration, migrations, or production systems. It does not supersede signed-off master-plan specs or existing `docs/studio/*` reports. Any implementation requires a separate, explicit founder go-ahead after the open decisions are resolved.

---

## 9. Evidence index

- `docs/audit/UX_CONSISTENCY_AUDIT.md` §7 — Studio interaction findings.
- `docs/audit/REPOSITORY_DISCOVERY.md` §§2,4,7,8 — structure, health and module boundaries.
- `app/[lang]/(member)/create/[id]/page.tsx`, `components/creations/PlaygroundForm.tsx`, `components/canvas/PixelBoard.tsx`, `components/canvas/TextEditOverlay.tsx`, `components/creations/LayerPanel.tsx`, `components/creations/StudioContextMenu.tsx`.
- `app/globals.css:101-140,442-447,795-812`.
- `lib/pixel-history.ts`, `public/sw.js:98-133`.
- `docs/studio/01_SYSTEM_AUDIT.md`, `docs/studio/03_TOOL_DOCUMENTATION.md`, `docs/studio/04_WORKSPACE_REDESIGN_REPORT.md`, `docs/studio/05_LAYER_GROUP_UX.md`.
- `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md`, `docs/evidence/phase8-20261122/RESULTS.md` — runtime gate remains open.
