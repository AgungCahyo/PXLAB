# PXLB Studio — M2 Toolbar & Drawing Tools

**Status:** PARTIAL  
**Date:** 23 Nov 2026  
**Depends on:** `01_SYSTEM_AUDIT.md`

Engine tools stay in `PixelBoard` + `lib/pixel.ts`. No new dependencies.

## Shipped — M2.1

| Change | Where |
|---|---|
| Eyedropper / Alt-sample reads the **composited** pixel, not the active-layer buffer | `sampleColorAt` → `compositeImage()` |
| Gradient drag preview is the fill (same 8 stops as apply), not a 1px line | `paintShapePreview` |
| Gradient stops shared as `linearGradientStops` | `lib/pixel.ts` |
| Shift snaps **line** and **gradient** to H / V / 45° | `constrainAxisEnd` |

Palette adoption for gradient colours still happens on pointer-up only, so dragging does not fill the 256-colour palette.

## Remaining M2

| Item | Priority |
|---|---|
| Gradient second colour (not only current → Paper) | Medium |
| Brush ghost / footprint at cursor | Low |
| 45° bezier handles | Low |
| Browser/pen verification of pressure | M9 |

## Test

`npx vitest run lib/pixel.test.ts`
