# THE COMMONS — Agent prompt (superseded)

**Status:** Do not use.  
**Why:** This prompt told agents to evolve THE COMMONS into one shared pixel canvas and to treat that canvas as the product. That is no longer true.

**Use instead:**

1. [PRODUCT-SPEC.md](PRODUCT-SPEC.md)
2. [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md)
3. [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) (prompt template in §13)
4. [PIXEL-ART-DESIGN-SYSTEM.md](PIXEL-ART-DESIGN-SYSTEM.md)
5. [PIXEL-CANVAS-SPEC.md](PIXEL-CANVAS-SPEC.md) only for Playground vs later Common Space engine notes

Pixel Art Playground (Create) is the community drawing surface. Common Space is a later giant sparse canvas, not the center.

## Non-negotiable rules (still valid; also in the current specs)

1. This is an existing app; do not scaffold a new one.
2. Do not rewrite authentication, profiles, comments, appreciation, or admin without cause.
3. Do not delete existing tables, migrations, or data.
4. Do not apply destructive schema changes without approval.
5. Never create one database row or one network request per pixel.
6. Never trust client-supplied user IDs, coordinates, colors, or undo payloads.
7. Never expose the Supabase service-role key to browser code.
8. Do not add features outside the approved IMPLEMENTATION-PLAN phase.
9. Visual direction is colorful, playful, readable, light Paper; artwork remains the hero.
10. Reuse existing components. Support desktop and mobile.

## Do not follow from this file

- “One shared pixel canvas” as the new behavior of the whole product.
- Phase 0 audit-only task below as current work (already done).
- PIXEL-CANVAS-MIGRATION-PLAN as the implementation sequence.
- Realtime shared drawing as a community-MVP requirement.

---

## Archived original prompt (historical only)

You are working on an existing THE COMMONS MVP. The owner approved evolving Common Space into a colorful, collaborative pixel-art canvas.

### Read first (historical)

Read the original PRODUCT-SPEC, TECHNICAL-SPEC, IMPLEMENTATION-PLAN, then PIXEL-CANVAS-SPEC, PIXEL-ART-DESIGN-SYSTEM, PIXEL-CANVAS-MIGRATION-PLAN. The addendum was meant to supersede text/shape Common Space only.

### Historical new behavior (retired as product center)

- One shared pixel canvas.
- Any authenticated member may draw anywhere.
- Visitors can view, zoom, and pan but cannot draw.
- Pencil, eraser, palette, zoom, pan, fit.
- Batched strokes, persistence, realtime after confirmation.

Those bullets may inform **phase B6 Common Space**, not phases B1–B5.

### Historical task: Phase 0 audit only — DO NOT CODE

Already completed. Do not run it again as current work.
