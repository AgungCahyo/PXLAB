# PXLB Studio — Layers panel & Group UX (WR3)

Scope: layer list interaction only. Drawing engine, compositor, history, file format and every other panel are unchanged.

## Audit (what existed)

* Groups are one level deep. Layers stay in **one flat stack**; membership is `layer.group`; a group is a **contiguous run** (`lib/pixel-groups.ts`). Persisted in source V4; `normalizeGroups` removes empty groups on load.
* Undo: every board mutation calls `pushUndo()`; history frames already snapshot `groups`.
* Group creation existed only as `New group from this layer` inside a **"Group" `<select>`** under layer opacity/blend/lock. Group name, opacity, blend, move, ungroup lived in the same block, visible only while a member layer was active.
* Group header row already supported expand/collapse, visibility and drop-to-assign. No rename, no group menu, single active layer only (no multi-select), mobile strip showed no groups.

## Design

**Layers toolbar** (above the list): `[+ layer] [📁+ group] [⋯]` and a `n/8` counter.
* Group button is one click. Tooltip explains the current behaviour; with ≥2 layers picked it shows a count badge and says "Group N selected layers".
* `⋯` holds secondary actions: Merge visible, Expand all, Collapse all (moved/added; Merge visible is no longer a permanent button).

**Creating**
* Nothing picked → a new group **holding one fresh blank layer** (see deviation below).
* Ctrl/Cmd+click toggles a layer into the pick; Shift+click picks the range from the active layer. Only ungrouped layers can be picked. Picked layers are gathered at the topmost one in their relative order; a contiguous range reorders nothing; existing groups are never split.
* Layer menu / `⋯` on a row: *New group from this layer*, *Remove from group*, *Move to group X*.

**Managing**
* Group row: chevron (expand/collapse), name (click = show group properties, double-click = rename inline), member count, eye, `⋯` menu (Rename, Move up/down, Ungroup). Right-click works too.
* Drag a layer onto a group header to put it in; while dragging a member, a dashed "drop here to leave the group" zone appears under the group.
* Layer ↔ group properties share one area: clicking a layer shows layer opacity/blend/lock, clicking a group shows group opacity/blend. The "Group" dropdown and its hint text are gone.
* Mobile (no drag and drop): strip gets a Create-group button; the layer sheet has a Group section (new group / remove / move to group) and group properties when the layer is grouped.

## Code

| Where | Change |
|---|---|
| `lib/pixel-groups.ts` | `createGroupFromLayers` (new); `createGroupFromLayer` now delegates to it. No other model change. |
| `components/canvas/PixelBoard.tsx` | `createGroup` replaced by `createGroupFromLayers(ids, name?)`: one `pushUndo`, keeps the same layer active. |
| `components/creations/LayerGroupControls.tsx` | Dropdown removed. Now `GroupStyleControls` (opacity/blend), `LayerGroupActions` (mobile), `nextGroupName`, `LayerGroupApi`. |
| `components/creations/LayerPanel.tsx` | Toolbar, selection, group rows, menus, drop-out zone, mobile strip/sheet. |
| `components/creations/PlaygroundForm.tsx`, `lib/copy.ts` | Wiring and strings (2 unused keys removed, 13 added). |
| `lib/pixel-groups.test.ts`, `tests/pixel-studio-redesign.test.ts` | 4 model tests, 1 UI-structure test. |

## Deliberate deviation: "no layer picked → empty group"

A truly empty group cannot exist in this document model: the group is defined by its member run, `normalizeGroups` deletes empty groups on load, and many operations prune them. Supporting it means a format/normalisation change (outside the stated constraints: persistence, no second system). So "empty" is implemented as a group containing one new blank layer (nothing painted, one undo step). Consequence: it consumes one of the 8 layer slots, and the button is disabled at 8/8. If real empty groups are required, that is a separate, schema-level change.

## Verification

Run here: model tests (`pixel-groups`, `pixel-group-render`, `pixel-merge`: 44 pass), repo source-pattern tests (1157 pass, 1 pre-existing unrelated failure), strict type pass with stub React types (no non-stub errors; checker mutation-tested).

**Not run (needs browser):** all pointer/drag/keyboard behaviour. Checklist: create with nothing picked (blank layer inside), Ctrl/Shift multi-pick then create, undo/redo of create (one step) and redo, rename (Enter/Escape/blur), collapse/expand incl. active layer inside a collapsed group, drag in / out / drop-out zone, move group up/down, ungroup, group opacity/blend/visibility rendering, save → reload → groups intact, 8/8 limit, mobile sheet actions, no overflow in the 17.5rem panel.

## Not done / follow-ups
* Group header is not draggable (reorder via menu).
* No Ctrl+G shortcut (shortcuts live in `PixelBoard`; out of scope).
* Multi-pick is for grouping only (not bulk visibility/lock/delete).
* Panel and group states (focused group, expanded) are not persisted except `collapsed`, which already was.
