# PXLB Studio — M1 Workspace & Layout

**Status:** DONE (chrome only; engine behavior unchanged)  
**Date:** 23 Nov 2026  
**Depends on:** `01_SYSTEM_AUDIT.md`

`PixelBoard` gained a small **read/pan API** for the minimap (`getViewSnapshot`, `drawPreview`, `centerOnCell`, `onViewChange`). No document format, tools, or persist changes.

## Shipped

### M1.1 Desktop document chrome
- Header on `md+`: zoom + grid + undo + redo
- Loading skeleton matches
- `md`–`lg` header uses denser `--studio-hit` so the extra buttons fit

### M1.2 Quieter publish
- Publish is a full-width action inside **More**, not a permanent header CTA
- Save-if-dirty stays in the header

### M1.3 Minimap
- `StudioMinimap` floating bottom-right of the stage (`hidden` below `md`)
- Click/drag pans the camera; collapse toggle
- Preview is the existing composite buffer (nearest-neighbour)

### M1.4 Mobile inspector tabs
- Dock keeps view controls + tool rail
- Tabs: **Opsi** / **Warna** / **Lapisan** so brush, palette, and layers are not stacked

### M1.5 Create as dialog
- `/create` still hosts `PixelNewForm` + inspiration
- `variant="dialog"` opens the form in `Dialog` (`createNewHeading`); close/backdrop → `/dashboard`
- Title, presets, and `createDraftAction` are unchanged

Not done (out of M1 / later milestones):

- Splitting `PlaygroundForm` into `StudioShell` files (low value until chrome is stable)
- Canvas resize/crop (M3)
- Animation (M6)

## Tests

`npx vitest run tests/pixel-studio-redesign.test.ts tests/mobile-chrome.test.ts tests/create-edit.test.ts tests/copy-keys.test.ts`
