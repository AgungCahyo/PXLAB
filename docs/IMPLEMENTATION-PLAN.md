# PXLB — Implementation Plan

**Document:** IMPLEMENTATION-PLAN.md  
**Status:** Pixel Art Community migration. B0–B5 and **B7 QA** are in the codebase. Launch gates A/B/C/E pass at build, policy, and public-surface level. Operator must still apply `supabase/migrations` and do a logged-in Playground pass on the live project. Do not start B6. B6 is not a launch requirement.  
**Source of truth:** `PRODUCT-SPEC.md` and `TECHNICAL-SPEC.md`  
**Visual identity:** `PIXEL-ART-DESIGN-SYSTEM.md`

> **Document purpose:** Implementation sequencing, launch gates and operator handoff for the existing PXLB application.
> **Status:** Current / source of truth for sequencing. B7 code/policy gates pass; operator and runtime proof remain open. B6 is not started.
> **Updated:** 2026-11-24.
> **Implementation evidence:** VERIFIED IN CODE — `supabase/migrations/` through `20261123000000_interaction_guardrails.sql`, `features/creations/actions.ts`, `lib/auth/permissions.ts`; VERIFIED BY TEST — community, download, pixel, interaction-guardrail and route suites. OPERATOR ACTION REQUIRED — apply migrations, production smoke tests, domain/redirect checks, Phase 8 browser run.
> **Completed:** Original MVP 0–5, B0–B5, B7 code/policy work, Artwork Conversation, pixel fork, community metadata, reports/admin, interaction guardrails in source.
> **Open:** migration application, signed-in live walkthrough, production domain/redirect verification, Phase 8 runtime evidence, WR/layer-group browser checklists, B6 (vision only).
> **Dependencies:** `PRODUCT-SPEC.md`, `TECHNICAL-SPEC.md`, `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md`, `docs/evidence/` results.
> **Next action:** Operator works through §14; no agent should start B6 or realtime.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION.

Original MVP Phases 0–5 are complete (apply `supabase/migrations` on the Supabase project if not already applied). Playground owns PixelBoard. `/space` is a secondary later-canvas page with the SVG board archived in place. **Do not run original Phase 6 or B6 as a Common Space launch.** Product languages: Indonesian (default) and English.

---

## 1. Execution strategy

Migrate THE COMMONS in small, verifiable phases. Do not ask an AI coding agent to generate a new application. Do not rebuild auth, profiles, Explore, comments, appreciation, or admin.

For every phase:

1. Inspect the repository and current implementation.
2. Read PRODUCT-SPEC, TECHNICAL-SPEC, this plan, and PIXEL-ART-DESIGN-SYSTEM.
3. Propose a short implementation plan.
4. Implement only the approved scope.
5. Run type checks, lint, tests, and build.
6. Review security and responsive behavior where relevant.
7. Update documentation and report changed files.
8. Do not proceed to the next phase if critical checks fail.

If implementation reveals a conflict with the specs, stop, record options, and wait for a product decision.

---

## 2. Current codebase (do not treat as greenfield)

| Area | State |
|---|---|
| Next.js App Router, i18n ID/EN, public shell | Done |
| Auth, profiles, RLS, settings, dashboard | Done |
| Creations studio (`text` / `visual` / `idea` / `story`), Explore, detail | Done |
| SVG Common Space (`space_elements`, SpaceBoard) | Done; **legacy** |
| Comments, appreciate, fork, reports, admin | Done |
| Pixel prototype (`lib/pixel.ts`, PixelBoard, flag on `/space`) | Local only; in-memory |
| Pixel type, editor source + PNG, Playground at `/create` | **Done in repo** (apply Storage migration on the project) |
| Colorful Paper identity across the site | **Done** (Classic Pixel Adventure) |
| Sparse unlimited Common Space | **Not done; after community MVP** |

### Keep / adapt / defer

| Module | Decision |
|---|---|
| Auth, profiles, username, roles | Keep |
| i18n, `lib/copy.ts`, middleware, Cache Components `connection()` | Keep; update copy when identity phase runs |
| Explore pagination, public creation pages | Adapt for pixel thumbnails and default filter |
| Comments, appreciate, reports, admin hide/restore | Keep; confirm they work for `pixel` |
| Fork | Adapt: copy pixel raster into a new draft |
| `/create` studio | Adapt into Pixel Art Playground |
| `VisualCanvas` and writing types | Keep in schema/code; hide from primary new-draft UX |
| `SpaceBoard`, `space_elements` | Defer removal; do not drop |
| PixelBoard + `lib/pixel.ts` | Adapt: move primary use to Create |
| `NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE` | Retired for `/space`; Playground owns PixelBoard |
| Landing two-mode copy; nav treating Space as co-hero | Adapt |
| PIXEL-CANVAS-MIGRATION-PLAN Phase 2 (fixed 512 shared tiles) | **Do not implement as next work** |
| Giant sparse Common Space | Defer to post-community phase |

---

## 3. Phase overview

| Phase | Scope | Code? |
|---|---|---|
| B0 | Blueprint docs (this rewrite) | Docs only — complete |
| B1 | Identity and story (Paper tokens, landing, primary nav) | Yes — implemented; audit before B2 |
| B2 | Pixel Playground at Create (`pixel` type, source + PNG, draft/preview/publish/unpublish) | Yes, after approval |
| B3 | Showcase (Explore/detail/profile thumbnails) | Yes — implemented; audit before B4 |
| B4 | Community fit (comments, appreciate, fork raster, admin) | Yes, after approval |
| B5 | Demote Common Space in UI; archive SVG path in place | Yes — implemented; audit before B7 |
| B6 | Giant sparse Common Space | Later; **not community MVP; not a launch gate** |
| B7 | QA and community launch | Yes — recorded below; **does not wait on B6** |

Estimates are omitted on purpose; each phase is approved separately.

B0–B5 and B7 are in the repo. Common Space tiles remain out of scope. Do not start B6.

---

## 4. Phase B0 — Blueprint documents

### Tasks

- Rewrite PRODUCT-SPEC around Pixel Art Community.
- Rewrite TECHNICAL-SPEC around Playground vs later sparse Space.
- Rewrite this plan from the existing app.
- Reclassify PIXEL-* docs and update README.

### Deliverables

- Specs that agents can follow without treating Common Space as the product center.
- Recorded defaults for `pixel` type, editor source + rendered PNG, Playground 512, unpublish, Common Space out of MVP.

### Acceptance criteria

- Docs agree with each other.
- Keep/adapt/defer is explicit.
- No application code, migrations, or token CSS changed in B0.

---

## 5. Phase B1 — Identity and story

**Status:** Implemented (tokens, landing, primary nav, light-first). Awaiting audit before B2.

### Tasks

- Map PIXEL-ART-DESIGN-SYSTEM tokens onto `--bg`, `--fg`, `--muted`, `--line`, `--card`, `--accent` (Paper/Ink/accents). Light-first.
- Update landing copy: community of pixel art; Create + Explore CTAs; Common Space secondary.
- Primary nav: Explore, Create, Profile. Space is not co-hero.
- Gradual heading shift toward bold sans; do not restyle every component unreviewed.
- Keep bilingual copy in `lib/copy.ts`.

### Acceptance criteria

- Light Paper background; colorful accents without drowning artwork.
- Landing no longer sells two equal modes.
- `typecheck`, `lint`, and `build` pass.
- Auth and existing pages still render.

---

## 6. Phase B2 — Pixel Art Playground at Create

**Status:** Persistence implemented. **B2.1 canvas size selection** and **B2.2 clean Playground UI** are the audit refinements — not B3. Apply `20261116100000_pixel_creations.sql` on the Supabase project before persistence works in a live environment.

### Tasks

- Additive migration: `creations.type` includes `pixel`.
- Zod schema for pixel **header** plus **editor source** (`rle-index` palette indices). PNG is not the document.
- Storage: `{user_id}/{creation_id}/source.json` and `cover.png`; draft vs published policies.
- Extract/adapt PixelBoard for `/create/[id]`; owner-only; local undo/redo.
- Loop: Create → save draft (source + auto PNG) → preview → publish. Owner can edit published work, **unpublish** to draft without delete, or delete.
- Reload hydrates the canvas from **source**, never by sampling the PNG.
- Default new draft at `/create` is `pixel`. Hide writing/visual type picker from the primary UX without deleting legacy editors.
- Tests for schema, reopen-from-source, unpublish, ownership, and payload rejection.

### Acceptance criteria

- Member can draw, save, leave, reopen, and see the same pixels from source.
- Preview and automatic thumbnail exist before publish.
- Unpublish hides the work from Explore without deleting source or PNG.
- Anonymous cannot persist.
- Member A cannot write Member B’s objects.
- Draft source and draft PNG are not publicly listed.
- Grid is not stuffed into the 32KB JSONB column.
- Existing non-pixel creations still load.

### B2.1 — Canvas size selection

- `/create` shows preset + custom size cards before the editor. Size is resolution, not display size.
- Header `width` / `height` and `source.json` use those integers. RLE decodes to `width * height`.
- PNG buffer, pointer math, and zoom use the same dimensions. Zoom range high enough that 16 × 16 cells are drawable.

### B2.2 — Clean Playground UI

- Header: back, title, save status, explicit Save draft, Preview, Publish; undo/redo on desktop. No server autosave; browser-local recovery only. VERIFIED IN CODE (`components/creations/PlaygroundForm.tsx:431`).
- Icon toolbar: pencil, circle, eraser, pan, eyedropper, fill, shapes, selection, text, gradient; undo/redo. Active tool is Brick. VERIFIED IN CODE (`lib/pixel.ts:85-104`).
- Compact horizontally scrolling document palette + Palette control that opens a custom picker (free color, HEX, recent, favorites). Colors used are stored in source; changing the active color does not rewrite drawn pixels.
- Canvas is the largest region on mobile. Keep original aspect on detail; do not crop.

---

## 7. Phase B3 — Showcase

**Status:** Implemented. Explore defaults to `pixel` (legacy types via Semua / type filters). Cards are artwork-first PNG thumbnails. Detail and profile use CSS nearest-neighbor presentation. Creation metadata uses the cover PNG for Open Graph / Twitter. Do not start B4 until this is audited.

### Tasks

- Explore cards use the **rendered PNG** (display only); artwork-first layout.
- Default Explore emphasis on `pixel`; legacy types remain filterable.
- Creation detail renders the pixel image crisply (nearest-neighbor).
- Public profile lists pixel works with thumbnails.
- Metadata / social preview uses the PNG where practical.

### Acceptance criteria

- Published pixel works appear after refresh and can be shared.
- Hidden and draft works stay private.
- Pagination still works.
- Mobile gallery remains usable.

---

## 8. Phase B4 — Community fit (Artwork Conversation)

**Status:** Implemented in the codebase. Apply `20261116110000_artwork_conversation.sql` on the Supabase project. Do not start B5 until this phase is audited.

Comments, appreciation, reports, and admin already exist. This phase **reshapes the detail community into Artwork Conversation**, proves it on pixel works, and adapts fork. Do not change B3 gallery/detail image presentation. Do not add realtime or notifications.

### Tasks

- Replace the blog-style comment column on `/creation/[id]` with Artwork Conversation (PRODUCT-SPEC §6.4): artwork → Appreciate / Share → Conversation list → collapsed composer.
- Keep appreciate as a one-per-member toggle on the **work**. Do not require a comment to appreciate. No per-comment likes.
- Additive `parent_id` for **one-level** replies only. Edit own comment; delete own comment; report stays.
- Optimistic post (no full reload); load earlier/more instead of dumping the whole thread. Relative timestamps.
- Identity: @username + pixel mark (photo avatars still deferred).
- Fork copies **editor source** (then regenerates PNG) into a new owner draft with `forked_from`. Quiet control — not in the Appreciate/Share cluster. Do not fork from PNG alone.
- Reports and admin hide/restore still apply to creations and comments.
- Rate limits unchanged unless a pixel-specific write limit is approved.

### Acceptance criteria

- Artwork remains visually primary; conversation is secondary and airy (thin rules, not a card stack).
- Unique appreciate per member/creation; visitors can appreciate without commenting.
- A reply cannot spawn another reply level.
- Owner can edit and delete their notes; others can report.
- New notes appear immediately for the author; refresh/revalidate still matches the server.
- Forked work links to its origin, reopens in the Playground from copied source, and is editable only by the new owner.
- Non-admins cannot hide content.
- Hidden creations leave public Explore and public Storage read as specified.
- B3 Explore/profile/OG/detail scaling unchanged.

---

## 9. Phase B5 — Demote Common Space

**Status:** Implemented in the codebase. `/space` is a later-canvas page; PixelBoard is not mounted there; `SpaceBoard` stays archived in place. Do not start B6.

This phase is **UI/copy only**. It is not the start of the giant canvas. Community launch does not depend on a working shared world.

### Tasks

- `/space` remains reachable but secondary in nav and landing.
- Do not add `canvas_tiles`, stroke RPCs, world viewport, or realtime.
- Do not delete `SpaceBoard`, `space_elements`, or old migrations.
- After Playground owns PixelBoard, stop presenting the `/space` prototype as the product.
- Copy explains Common Space as a later giant canvas if shown.

### Acceptance criteria

- Community MVP can launch without a persistent shared pixel world.
- No giant-canvas engineering leaked into B1–B5.
- Legacy SVG data is intact.
- No agent treats PIXEL-CANVAS-MIGRATION-PLAN Phase 2 as next work.

---

## 10. Phase B6 — Giant Common Space (later)

**Not community MVP. Not a launch gate.** Open only after the community loop works, B7 is allowed to proceed without this phase, and the owner explicitly approves. Sparse tiles, viewport, conflicts, and realtime are large; they must not stall the gallery/Playground launch.

### Tasks (outline, not current work)

- Sparse `canvas_tiles` + `canvas_actions`.
- Viewport camera; load nearby tiles.
- Trusted batched stroke RPC; rate limits; revision.
- Own-action undo that cannot clobber later pixels.
- Admin recovery.
- Realtime **after** persistence.
- Practical extent ±32,768 pixels per PRODUCT-SPEC.

### Acceptance criteria

To be detailed when the phase is opened. Community launch must not wait on this phase.

---

## 11. Phase B7 — QA and community launch

**Status:** QA recorded 16 Nov 2026. Automated checks and public browser surfaces passed. Live logged-in Playground persist, pixel fork, and admin hide still need an operator pass after migrations are applied.

### Functional QA

- Registration, login, logout, session refresh.
- Profile editing and username uniqueness.
- Pixel draft, persist source + PNG, reopen from source, preview, publish, unpublish, edit, delete.
- Explore, detail, profile thumbnails (PNG display).
- Comments, appreciate, fork from source.
- Report and admin hide.
- Bilingual landing and nav.

### Security QA

- RLS on application tables and Storage.
- Anonymous writes rejected.
- Cross-user edits rejected.
- Role escalation rejected.
- Drafts and draft objects inaccessible publicly.
- Service role key absent from client bundle.

### Responsive QA

- Small mobile, typical Android, tablet, desktop.
- Playground drawing does not scroll the page accidentally.
- Keyboard focus and reduced-motion.

### Launch gates

| Gate | Meaning |
|---|---|
| A Foundation | Build, landing, nav, env documented |
| B Identity | Auth, profiles, RLS |
| C Pixel creation | Save source, reopen, preview, publish, unpublish, discover, draft privacy |
| E Safety | Reports and admin |
| ~~D Collective space~~ | **Not a community-MVP blocker. Not a launch requirement. B6 is optional after launch.** |

Do not launch to a broad audience until A, B, C, and E pass. Do not wait for B6.

### Recorded results (this pass)

| Gate | Result | Evidence |
|---|---|---|
| A Foundation | **Pass** | `npm run build` succeeded. Landing/nav ID+EN. `.env.example` documents env. Skip link and reduced-motion CSS present. |
| B Identity | **Pass (code/policy)** | Auth pages render; `/create` redirects guests to login. RLS tests cover profiles, two-member edits, no `role` grant. Live register/login/logout not re-run in this pass. |
| C Pixel creation | **Pass (code/policy)** | Pixel source/PNG tests and Storage policies. Explore/detail show published PNG. Drafts are not public-select. Operator must apply `20261116100000_pixel_creations.sql` and confirm save/reopen/unpublish while signed in. |
| E Safety | **Pass (code/policy)** | Comments/reactions/reports RLS tests; Artwork Conversation grants do not include `status`. Admin hide stays on `admin_set_*`. Live report→hide not re-run in this pass. |
| D Collective | **Not required** | `/space` is secondary. B6 not started. |

Also this pass: header language no longer comes from `usePathname()` (hydration). Playground shell uses `overscroll-none`. Launch-gate tests assert no `SUPABASE_SERVICE_ROLE_KEY` in app source; it is absent from `.next` after build. Next.js warns that `middleware.ts` should become `proxy.ts` — do not migrate that in this phase.

**Before a broad audience:** apply remaining migrations on the Supabase project, then walk Playground save/publish/unpublish, conversation while signed in, pixel fork, and one admin hide.

---

## 12. Historical original MVP (complete)

Kept so agents do not re-do finished work.

| Original phase | Scope | Status |
|---|---|---|
| 0 | Repository audit | Complete |
| 1 | Foundation, design system, landing | Complete |
| 2 | Auth and profiles | Complete |
| 3 | Creation Studio and Explore | Complete (legacy types) |
| 4 | SVG Common Space | Complete (now legacy) |
| 5 | Comments, appreciation, moderation | Complete |
| 6 | QA as Common Space-centered launch | **Cancelled as written** |
| Pixel prototype 1 | Local PixelBoard on `/space` | Complete; engine moved to Create; `/space` demoted in B5 |

---

## 13. Suggested AI coding-agent workflow

Use one task per prompt. Ask the agent to report:

- What it inspected.
- What it plans to change.
- Files changed.
- Database migrations added.
- Tests and commands executed.
- Results of typecheck, lint, and build.
- Known limitations and risks.
- Any product decision that needs approval.

Do not accept claims such as "secure" or "complete" without concrete tests or policy inspection.

### Prompt template

```text
You are implementing THE COMMONS.

Before coding:
1. Read docs/PRODUCT-SPEC.md.
2. Read docs/TECHNICAL-SPEC.md.
3. Read docs/IMPLEMENTATION-PLAN.md.
4. Read docs/PIXEL-ART-DESIGN-SYSTEM.md.
5. Inspect the existing repository and identify relevant existing components and conventions.
6. Work only on the phase/task specified below.

Do not treat docs/PIXEL-CANVAS-MIGRATION-PLAN.md or docs/PIXEL-CANVAS-AGENT-PROMPT.md as the product center. Those documents are superseded for sequencing.

Task:
[INSERT ONE TASK]

Rules:
- Treat PRODUCT-SPEC and TECHNICAL-SPEC as the product source of truth.
- Do not expand scope or invent product features.
- Reuse existing components and conventions.
- Do not overwrite working auth, profiles, comments, appreciation, or admin without explaining why.
- Use additive migrations for database changes.
- Enforce authorization server-side and with Supabase RLS.
- Never expose secrets to the browser.
- Include loading, empty, success, and error states.
- Make the experience responsive and accessible.
- Add or update tests for changed behavior.

Before finishing:
- Run relevant tests, typecheck, lint, and build.
- Report exact commands and results.
- List changed files and migrations.
- Identify incomplete work and risks.
- Do not claim a check passed unless it was actually run.
- Stop after the requested task; do not start the next phase.
```

---

## 14. Next implementation task (after B7)

B7 QA is recorded. There is no B8. Do not start **B6 Giant Common Space**, and do not add realtime, `canvas_tiles`, stroke RPCs, presence, broadcast, or `postgres_changes`.

No item in the table below was executed by the documentation agent. All are manual operator or runtime tasks. `VERIFIED IN CODE` / `VERIFIED BY TEST` does not change their status.

| # | Pekerjaan | Dokumen terkait | Kondisi saat ini | Tindakan diperlukan | Bukti yang dikumpulkan | Status |
|---|---|---|---|---|---|---|
| 1 | Apply migrasi Supabase | `IMPLEMENTATION-PLAN.md` §11/§14; `COMMUNITY-EXPERIENCE.md:119`; `ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md:288-294` | 22 migration files exist in repo through `20261125120000_saved_and_archive.sql`; no repo proof they are applied to the project. | Apply pending migrations in order. Do not rewrite old migrations. | Supabase migration history + RLS/policy smoke notes. | READY FOR OPERATOR |
| 2 | Signed-in launch walkthrough | `IMPLEMENTATION-PLAN.md:310,316` | Code/policy gates pass; live logged-in pass not re-run. | Save/reopen/publish/unpublish pixel source; fork; conversation/reply; admin hide; verify draft privacy. | Dated checklist with account, project, observations and screenshots. | READY FOR OPERATOR |
| 3 | Download permission validation | `docs/ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md` | DL1–DL3 VERIFIED IN CODE/BY TEST; production behavior unproven. | Smoke anon vs member, draft vs published, `allow_png_download` OFF/ON, `no-store`, audit log, redirect behavior. | Request/response table for each case. | READY FOR OPERATOR |
| 4 | Community Experience validation | `docs/COMMUNITY-EXPERIENCE.md` | Fase A–C shipped with regression tests; migration application and live walkthrough pending. | Follow one-way, Following filter, ResponsesInbox, one-level reply, report→admin hide, rate-limit RPC behavior. | Signed-in checklist per Fase A–C. | READY FOR OPERATOR |
| 5 | Domain and redirect verification | `docs/PXLB-REBRANDING.md` | Canonical `pxlb.fun` and PXLB mark VERIFIED IN CODE; DNS/Vercel/env/Supabase redirect allowlist unproven. | Check DNS cutover, Vercel domain, legacy redirect, `NEXT_PUBLIC_SITE_URL`, auth callback URLs, OG/canonical output. | DNS/domain screenshots, login result, canonical/OG inspection. | READY FOR OPERATOR |
| 6 | Phase 8 runtime validation | `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md`; `docs/evidence/phase8-20261122/RESULTS.md` | Evidence file is still a template: `NOT EXECUTED`. Do not claim completion. | Run production build + browser scenarios, record measured values and screenshots. | Completed `RESULTS.md`, build output, browser evidence. | NOT STARTED |
| 7 | Workspace Redesign browser verification | `docs/studio/04_WORKSPACE_REDESIGN_REPORT.md:74-83` | Source-pattern/unit evidence only; browser checks explicitly not verified. | Run the WR browser checklist for chrome, minimap, tabs and panels. | Signed-off browser checklist with viewport notes. | NOT STARTED |
| 8 | Layer/Group UX browser verification | `docs/studio/05_LAYER_GROUP_UX.md:48-54` | Model, UI wiring and unit/source tests exist. Drag/keyboard and follow-ups are not browser-verified. | Run drag/keyboard checks; then decide on Ctrl+G, draggable group headers and multi-pick bulk. | Browser checklist + decision notes for follow-ups. | NOT STARTED |

Status definitions used here: **NOT STARTED** — no evidence collected; **BLOCKED** — cannot proceed without owner/operator decision or access; **READY FOR OPERATOR** — code is ready, manual work can begin; **VERIFIED** — production/browser evidence collected and attached.

Deploy only after items 1–5 are verified. Item 6 is a separate runtime gate. Do not wait on B6.

---

## 15. Change control

If implementation reveals a conflict:

1. Stop the affected task.
2. Explain the conflict and its impact.
3. Offer the smallest safe options.
4. Update the relevant specification only after a product decision.
5. Continue from the approved version.

Keep this document set synchronized with actual implementation. If a feature is deferred, mark it deferred rather than silently deleting it from scope.
