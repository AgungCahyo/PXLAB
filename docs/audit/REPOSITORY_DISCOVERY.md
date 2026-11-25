# PXLB — Repository Discovery & Structural Audit

**Audit date:** 2026-11-25
**Scope:** Entire repository at `main` (HEAD `2e51c4d`), excluding `node_modules`, `.next`, `.tmp`
**Mode:** READ-ONLY AUDIT. No application source, configuration, schema, migration or existing documentation was modified. Only this report was created.
**Evidence policy:** Statements below are marked VERIFIED when checked against source, commands, or the repository itself; UNVERIFIED / UNKNOWN where they were not. Roadmap documents are not treated as implementation proof.

---

## 1. Executive Summary

PXLB is a **Next.js 16.4.6 App Router / React 19 / TypeScript (strict) / Tailwind CSS 4 / Supabase SSR** pixel-art community application. It is one deployable application — not a monorepo — with route handlers in `app/api`, server actions in `features/*/actions.ts`, and a large client-side pixel editor in `components/canvas/PixelBoard.tsx`.

The product centre is the **Pixel Art Playground / Studio** at `/create` and `/create/[id]`. "Common Space" (`/space`) still exists but is a secondary, SVG-based prototype; current product documentation explicitly demotes it. There is **no separate `/studio` route** — Studio is the editor embedded in the create/edit routes.

Structural highlights:

- 257 non-test TypeScript/TSX source files, 54 Markdown documents under `docs/`, 105 test files (842 tests) and 21 Supabase migrations.
- Routing is a single `[lang]` dynamic segment (`id` default via rewrites, `en` prefix), with route groups `(public)`, `(member)`, `(auth)` plus `admin`.
- Data access is organised by **feature module** (`features/auth`, `features/creations`, `features/community`, `features/feed`, `features/explore`, `features/moderation`, `features/profiles`, `features/space`), each with `actions.ts` and usually `queries.ts`. There is no Redux/Zustand store: state is React local state + refs, two `useSyncExternalStore` singletons, one React Context (`ToastProvider`), and a tiny global busy event bus (`lib/global-busy.ts`).
- Supabase has three client factories (server cookie client, browser client, cookie-less public anon client) plus middleware session refresh. RLS and storage policies live only in `supabase/migrations`.

Health at audit time (read-only commands executed, no installs or config changes):

| Check | Result |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit --incremental false`) | PASS — no diagnostics |
| `npm test -- --reporter=dot` | PASS — 105 files, 842 tests, ~15.9 s |
| `npm run lint` | FAIL — 48 problems (27 errors, 21 warnings) |
| `npm audit --omit=dev --audit-level=low` | 0 vulnerabilities |
| `npm outdated` | 9 packages behind latest; 5 are major-version jumps available |
| `next build` | NOT EXECUTED (would write `.next`; outside audit scope) |
| Production runtime, Supabase policies in production, DNS cutover | UNVERIFIED |

Top findings:

1. **Editor is monolithic.** `PixelBoard.tsx` is ~158 KB (~3,800 lines) and `PlaygroundForm.tsx` ~100 KB (~2,200 lines). They are not automatically "bad", but they concentrate input, engine, camera, selection, history, layers and UI orchestration in two files.
2. **Three creation entry forms coexist.** `PixelNewForm` (creation picker), `PlaygroundForm` (pixel studio) and `StudioForm` (legacy text/visual/idea/story edit) are separate implementations with overlapping responsibilities.
3. **Documentation is large and mostly self-labelled.** The repository already has a working hierarchy; a new hierarchy is unnecessary. Most stale docs carry explicit `SUPERSEDED` / `HISTORICAL SNAPSHOT` banners.
4. **Lint is red**, dominated by React 19 `react-hooks/set-state-in-effect` and `react-hooks/refs` errors in studio-related components.
5. **A2 fork/remix is implemented and signed off; A3–A5, B6, Challenge and Pixel Assets are explicitly planned but NOT AUTHORIZED.** No code should be written for those from this audit.

**Do not touch:** running production Supabase project, RLS/storage policies, migrations already applied, the `docs/evidence/` record, the signed-off master-plan specs, and the pre-existing uncommitted work noted in §7.6.

---

## 2. Actual Project Structure

```
the commons/
├── app/                         Next.js App Router — routes, layouts, API handlers, global CSS
│   ├── layout.tsx               Root layout; intentionally returns children only
│   ├── globals.css              Tailwind 4 import + design tokens + studio chrome + social/auth overrides
│   ├── [lang]/                  id/en locale segment; owns <html>, fonts, metadata, PublicShell
│   │   ├── (public)/            Guest-readable pages: /, /home, /explore, /creators, /space,
│   │   │                        /creation/[id], /u/[username]
│   │   ├── (member)/            Auth + onboarding-gated: /dashboard, /create, /create/[id],
│   │   │                        /responses, /settings, /welcome
│   │   ├── (auth)/              /login, /register, /forgot-password, /reset-password, /verify-email
│   │   └── admin/               /admin, gated by profile role
│   ├── api/                     Route handlers: og, qr, pixel-cover, pixel-download, share-export
│   ├── auth/                    /auth/callback (PKCE/OAuth/email-change), /auth/recovery
│   ├── icon.tsx, manifest.ts, robots.ts, sitemap.ts, not-found.tsx, error.tsx
│   └── (loading.tsx per major route group/page)
├── components/                  Presentational + client behaviour components
│   ├── ui/                      Small shared primitives: Button, Dialog, Input, Textarea, Card,
│   │                            Alert, EmptyState, BackLink, PageHeader, PixelIcon, FilterChip,
│   │                            SizeSlider, RouteSkeletons, PixelDecor
│   ├── layout/                  PublicShell, SiteHeader, SiteNav, SocialNav, SiteFooter,
│   │                            LanguageSwitch, CornerBusy, PixelWorldBackdrop, marks
│   ├── canvas/                  PixelBoard (studio engine), SpaceBoard (SVG prototype),
│   │                            TextEditOverlay, text-tool controller
│   ├── creations/               Studio chrome + artwork UI (forms, inspector, layers, dialogs, cards)
│   ├── social/                  HomeFeed, FeedPost, CommentPanel, ExploreInfinite, Toast, Skeleton,
│   │                            PullToRefresh, WorkTile, WorkTile actions, infinite-list hook
│   ├── community/               CreationCommunity, FollowButton, ReportDialog, ResponsesInbox
│   ├── auth/                    Auth forms, AuthShell, Google button, password field, doodle pad
│   ├── profiles/                SettingsForm, WelcomeForm, avatars
│   ├── share/                   CreationShareDialog, share brand icons
│   ├── moderation/              AdminReports
│   ├── account/                 AccountSecurity
│   ├── brand/                   PixelCat / logo assets
│   ├── pwa/                     PwaInstall, PwaRegister
│   └── search/                  SearchResults
├── features/                    Server-side domain modules (Server Actions + queries)
│   ├── auth/actions.ts
│   ├── creations/{actions,queries,recommendation-actions}.ts
│   ├── community/{actions,queries,activity,follows}.ts
│   ├── feed/{actions,queries}.ts
│   ├── explore/actions.ts
│   ├── moderation/{actions,queries}.ts
│   ├── profiles/{actions,queries}.ts
│   └── space/{actions,queries}.ts
├── lib/                         Cross-cutting pure logic, integrations and utilities
│   ├── supabase/                env, server (cookies), browser, public anon, middleware session
│   ├── auth/                    session, permissions, errors, recovery, rate-limit, verification,
│   │                            account-security, session-cookie
│   ├── validations/             Zod schemas for creation/community/profile/space/password
│   ├── pixel-text/              Text object model, geometry, layout, rasterisation, fonts
│   ├── pixel*.ts                Engine: core, brush, groups, history, transform, selection,
│   │                            import, export engine/worker/canvas, palette, PNG scale, GIF, ZIP
│   ├── copy.ts / copy-social.ts Monolithic bilingual UI copy dictionaries (86 KB + 6.6 KB)
│   └── i18n, paths, meta, site, share*, social-*, format, avatar-*, global-busy, flags, utils
├── supabase/                    migrations (21 SQL files), Auth email templates, Edge Function
│   └── functions/delete-account/index.ts   (excluded from tsconfig)
├── tests/                       80+ Vitest files: pixel engine, RLS, routes, UX, auth, community
├── public/                      PWA icons, pixel-cat SVGs, sw.js, offline.html
├── scripts/                     PWA icon generator, OG sample renderer
├── docs/                        54 Markdown documents under audit (see §4)
├── middleware.ts                Delegates to lib/supabase/middleware.ts; excludes static assets
├── next.config.ts               cacheComponents, partialPrefetching, staleTimes, Tailwind
│                                Turbopack loader, id-default rewrites, sw/manifest headers
├── tsconfig.json                strict: true, paths @/* -> ./*, includes tests, excludes Edge Function
├── vitest.config.ts             node environment; tests/**/*.test.ts + lib/**/*.test.ts
├── eslint.config.mjs            nextVitals + nextTs flat config
├── .env.example                 Documents required Supabase/site/auth-recovery configuration
└── package.json                 No runtime state-management library; 10 runtime deps
```

### Route map (verified from `app/**` and `next.config.ts`)

| Canonical path (id) | English path | File | Access |
| --- | --- | --- | --- |
| `/` | `/en` | `app/[lang]/(public)/page.tsx` | Public; members redirected to `/dashboard` or `/welcome` |
| `/home` | `/en/home` | `(public)/home/page.tsx` | Public (member home variant exists) |
| `/explore` | `/en/explore` | `(public)/explore/page.tsx` | Public |
| `/creators` | `/en/creators` | `(public)/creators/page.tsx` | Public |
| `/space` | `/en/space` | `(public)/space/page.tsx` | Public; secondary SVG prototype |
| `/creation/[id]` | `/en/creation/[id]` | `(public)/creation/[id]/page.tsx` | Public / owner draft handling |
| `/u/[username]` | `/en/u/[username]` | `(public)/u/[username]/page.tsx` | Public profile |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | `/en/...` | `(auth)/*` | Public |
| `/dashboard` | `/en/dashboard` | `(member)/dashboard/page.tsx` | Member + onboarding gate |
| `/create` | `/en/create` | `(member)/create/page.tsx` | Member + onboarding gate |
| `/create/[id]` | `/en/create/[id]` | `(member)/create/[id]/page.tsx` | Owner only; pixel -> PlaygroundForm, legacy -> StudioForm |
| `/responses` | `/en/responses` | `(member)/responses/page.tsx` | Member + onboarding gate |
| `/settings` | `/en/settings` | `(member)/settings/page.tsx` | Member + onboarding gate |
| `/welcome` | `/en/welcome` | `(member)/welcome/page.tsx` | Member, onboarding target |
| `/admin` | `/en/admin` | `admin/page.tsx` | Admin role only (`notFound()` otherwise) |
| `/api/og/creation/[id]`, `/api/qr/creation/[id]`, `/api/share-export/[id]`, `/api/pixel-cover/[id]`, `/api/pixel-download/[id]` | same | `app/api/**` | Route handlers |
| `/auth/callback`, `/auth/recovery` | same | `app/auth/**` | Auth route handlers |

`next.config.ts` rewrites bare paths to `/id/...` and redirects `/id/...` to canonical bare paths; the sitemap intentionally indexes only `/`, `/explore`, `/creators`, `/space`.

---

## 3. Major Module Responsibilities

| Directory / file group | Responsibility | Notable detail |
| --- | --- | --- |
| `app/[lang]/layout.tsx` | Owns `<html lang>`, fonts (`DM_Sans`, `Press_Start_2P`), metadata, viewport and `PublicShell` | `generateStaticParams` for `id`/`en`; invalid lang -> `notFound()` |
| `app/[lang]/(member)/layout.tsx` | Server gate: session + onboarding redirect via `x-pathname` header set in middleware | exports `instant = false` |
| `app/[lang]/admin/layout.tsx` | Server gate: admin role check | Uses `lib/auth/permissions.ts` |
| `components/layout/PublicShell.tsx` | Global chrome: header/sidebar/tab bar, footer, backdrop, toast, PWA, busy indicator | `AuthHeader` fetches profile + unseen responses in a Suspense boundary |
| `components/ui/*` | Cross-surface primitives | Two button systems exist (`ui/Button`, `social/socialButtonClass`); `Dialog` uses native `<dialog>` + `showModal()` |
| `components/canvas/PixelBoard.tsx` | The studio engine: tool state, pointer input, drawing, selection, camera, layers/groups, text, history, canvas rendering | ~158 KB; `variant="studio"` enables full keyboard shortcuts |
| `components/canvas/text-tool.ts`, `TextEditOverlay.tsx` | Text-object tool controller and transparent textarea overlay | Text is rasterised by `lib/pixel-text/*` and persisted in source |
| `components/creations/PlaygroundForm.tsx` | Full-screen pixel studio chrome: top bar, tool rail, inspector, layer panel, dialogs, save/publish state, local draft | ~100 KB; owns most studio React state |
| `components/creations/StudioForm.tsx` + legacy panels | Edit form for legacy creation types (text/visual/idea/story) | Legacy path retained for existing rows |
| `components/creations/PixelNewForm.tsx` | Creation-type/size picker used by `/create` | Dialog variant; then routes into studio |
| `components/creations/LayerPanel.tsx`, `StudioInspector.tsx`, `TextInspector.tsx` | Layer/group list, style inspector, text properties | LayerPanel ~42 KB |
| `components/creations/ColorPicker.tsx`, palette dialogs, import/export/transform dialogs | Studio ancillary interaction surfaces | Many lint `set-state-in-effect` errors here |
| `components/social/*` | Social feed, artwork tiles, comments, infinite scroll, pull-to-refresh, skeleton states, toast, mosaic logic | `ToastContext` is the only React Context in the app |
| `components/community/*` | Artwork conversation, follow, report, responses inbox | Conversation is one-level replies |
| `components/share/*` + `lib/share*.ts` + `app/api/share-export`, `qr`, `og` | Sharing UI, brand icons, share images, QR codes, OG images | Server-rendered image/export handlers |
| `features/*/actions.ts`, `queries.ts` | Server Actions and data reads; domain boundary for mutations | 8 action modules; RLS enforced in Supabase |
| `lib/supabase/*` | Three client factories + session refresh middleware | `createPublicSupabase()` is cookie-less; used for public reads |
| `lib/auth/*` | Identity, permissions, recovery tickets, rate limiting, verification, session cookies | Rate limiting is in-process (see `.env.example`) |
| `lib/pixel*.ts`, `lib/pixel-text/*` | Pure engine: RLE source V1–V4, brush, blend, groups, history, selection, transform, import/export, GIF/ZIP | `lib/pixel.ts` ~103 KB; `pixel-groups.ts` imports only its type back |
| `lib/copy.ts`, `copy-social.ts`, `i18n.ts` | All bilingual strings and locale helpers | Copy is centralised but very large (~86 KB) |
| `lib/global-busy.ts` | Module-level busy depth + subscriber set for global activity UI | Not a React store; `useSyncExternalStore` consumers |
| `supabase/migrations/*` | Tables, indexes, RLS policies, storage buckets, RPCs for guardrails | 21 files; additive history, no rewrites by convention |
| `tests/*`, `lib/*.test.ts` | Node-environment Vitest suites; many are static/source-contract tests rather than browser tests | 842 tests passing |

### Oversized / multi-responsibility files (verified size, not automatically a defect)

| File | Size | Observation |
| --- | --- | --- |
| `components/canvas/PixelBoard.tsx` | 158.3 KB | Engine + input + camera + history + layers + text + rendering in one client component |
| `lib/pixel.ts` | 103.2 KB | Core document model, brush/fill/shape/selection/RLE/export serialisation |
| `components/creations/PlaygroundForm.tsx` | 100.4 KB | Studio chrome, state orchestration, persistence and many dialogs |
| `lib/copy.ts` | 86.1 KB | All UI copy in one generated-looking dictionary |
| `components/creations/LayerPanel.tsx` | 41.6 KB | Desktop + mobile layer UI, group UX, rename/inline edit |
| `components/community/CreationCommunity.tsx` | 32.2 KB | Conversation/comment tree with composer state |
| `components/creations/ColorPicker.tsx` | 25.1 KB | Palette library, custom colours, document colours, keyboard handling |

### Duplicate / overlapping implementations

1. **Button styling:** `components/ui/Button.tsx` (`buttonClassName`) and `components/social/socialButton.ts` (`socialButtonClass`) define separate variants/sizes with near-identical geometry; additional ad-hoc buttons appear throughout `PixelBoard` and `PlaygroundForm`. Not necessarily wrong — one is "pixel frame", one is "flat social" — but they are two unshared standards.
2. **Three creation entry points:** `PixelNewForm`, `PlaygroundForm`, `StudioForm`. They serve different creation types today, but only the pixel path has the modern editor.
3. **Loading/empty states:** `components/ui/EmptyState.tsx`, `components/ui/RouteSkeletons.tsx`, `components/social/Skeleton.tsx`, `components/creations/PageSkeletons.tsx`, `components/creations/GallerySkeleton.tsx`, `components/social/SocialEmptyState.tsx` all provide overlapping skeleton/empty patterns.
4. **Navigation:** `SiteNav` (header desktop + account dropdown) and `SocialNav` (member sidebar + bottom tab bar) implement separate active-state logic.
5. **Local pixel drafts:** `lib/creation-metadata-local.ts` plus `lib/virgin-draft.ts` and in-component refs — a small local persistence layer, intentionally separate from the DB.
6. **Two export paths:** `lib/pixel-export-engine.ts` + `lib/pixel-export.worker.ts` + `lib/pixel-export-canvas.ts` + `app/api/pixel-download/[id]` (server cover download). Distinct purposes, but the naming makes boundaries unclear.

### Circular dependencies

A static import-graph scan of 257 source files found **one cycle**:

```
lib/pixel.ts  ->  lib/pixel-groups.ts  ->  lib/pixel.ts
```

`lib/pixel-groups.ts:2` imports `type PixelLayerRuntime` from `./pixel`, and lines 13–14 explicitly document that the module must not import **values** from `pixel.ts`. This is a **type-only** cycle; no runtime value cycle was found. Risk is low, but it is a real boundary violation against the file's own comment.

### Unclear module boundaries

- `components/creations/` mixes public artwork cards, creator rails, studio chrome, dialogs and legacy forms; no further grouping.
- `lib/pixel*.ts` holds both pure engine logic and browser-facing export helpers (`pixel-export-canvas.ts`, worker entry).
- `features/explore/actions.ts` and `features/feed/*` overlap conceptually with `components/social/ExploreInfinite.tsx` and `HomeFeed.tsx`.
- `app/api/*` duplicates some permission logic that also lives in `features/creations/queries.ts` and `lib/auth/permissions.ts` (for example the pixel download route re-checks `canDownloadCreationPng`). This is defence in depth, not necessarily a bug, but it is easy to drift.

---

## 4. Documentation Inventory

54 Markdown files exist under `docs/` plus `README.md` and `AGENTS.md`. Statuses below are predominantly **self-declared in the documents** and cross-checked against `README.md`, the current specs and source code. "Conflict" means a current-code conflict, not merely a different topic.

### Root documentation and declared source of truth

| File | Purpose / subject | Status | Conflicts / outdated architecture | Relevant? |
| --- | --- | --- | --- | --- |
| `README.md` | Entry point; run instructions; declares canonical docs | **ACTIVE** | None found; correctly labels migration plan superseded and agent prompt "do not use" | Yes — start here |
| `AGENTS.md` | Agent rules; points to `RTK.md` and Next.js version-specific docs | **ACTIVE** | Generated/maintained by `next dev`; do not remove from diffs | Yes, for contributors |
| `docs/PRODUCT-SPEC.md` | Product source of truth; Pixel Art Community baseline; decisions K1–K9 defaults | **ACTIVE** (updated 2026-11-25) | Supersedes dual-mode "individual + Common Space" MVP framing | Yes |
| `docs/TECHNICAL-SPEC.md` | Architecture and data-model source of truth | **ACTIVE** (updated 2026-11-25) | Corrected factual drift; no realtime / `canvas_tiles`; A2 fork gate done | Yes |
| `docs/IMPLEMENTATION-PLAN.md` | Sequencing, launch gates A/B/C/E, operator handoff | **ACTIVE** (updated 2026-11-24) | Supersedes `IMPLEMENTATION-ROADMAP.md` for sequencing; B6 explicitly not started / not a launch requirement | Yes |
| `docs/PIXEL-ART-DESIGN-SYSTEM.md` | Global visual identity source of truth | **ACTIVE** | None found; CSS comment at `globals.css:3` cites it | Yes |
| `docs/PXLB-REBRANDING.md` | Brand cutover, domain, Supabase/Vercel checklist | **ACTIVE (PARTIAL)** | DNS/production cutover explicitly NOT verified | Yes, checklist |

### Engine, architecture and studio docs

| File | Purpose / subject | Status | Conflicts / outdated architecture | Relevant? |
| --- | --- | --- | --- | --- |
| `docs/PIXEL-CANVAS-SPEC.md` | Playground vs later Common Space engine notes | **ACTIVE REFERENCE** | Explicitly "not the product center"; facts corrected 2026-11-24 | Yes, engine context |
| `docs/PIXEL-CANVAS-MIGRATION-PLAN.md` | Historical migration phases | **SUPERSEDED** | Sequencing replaced by `IMPLEMENTATION-PLAN.md` | Archive only |
| `docs/PIXEL-CANVAS-AGENT-PROMPT.md` | Old agent prompt treating shared canvas as the product | **SUPERSEDED** | README says "do not use"; wrong product framing | No |
| `docs/STUDIO-ENGINE-AUDIT.md` | Studio engine audit + roadmap (19 Nov) | **OUTDATED REFERENCE** | Claims "no opacity/blend modes", "canvas size locked", `PixelBoard` 3777 lines; current code has V3/V4 layer opacity, blend modes, groups and custom H×W. Do not use as current inventory | Historical only |
| `docs/WPLACE-STUDIO-FEATURE-AUDIT.md` | Wplace-inspired feature inventory | **SUPERSEDED** | Explicitly named stale by current studio tracker; "Belum" rows no longer match code | No |
| `docs/PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` | Playground feature audit/roadmap | **SUPERSEDED** | Replaced by `docs/studio/01_SYSTEM_AUDIT.md` + `PXLB_STUDIO_EXECUTION.md` | No |
| `docs/PIXEL-EDITOR-TECHNICAL-ARCHITECTURE.md` | Wplace adaptation compatibility analysis | **ARCHIVE (HISTORICAL SNAPSHOT)** | Retired palette-64 and V1-only constraints; do not restore | No |
| `docs/PIXEL-EDITOR-IMPLEMENTATION-ROADMAP.md` | Historical priority list | **ARCHIVE (HISTORICAL SNAPSHOT)** | Not an implementation backlog; superseded by current studio docs | No |
| `docs/PIXEL-EDITOR-UI-UX-REDESIGN.md` | Recommended studio redesign | **SUPERSEDED** | Superseded first by redesign blueprint, then by shipped Studio work | No |
| `docs/PIXEL-STUDIO-REDESIGN-BLUEPRINT.md` | Studio workspace design blueprint | **SUPERSEDED** | Explicit instruction: not an implementation target; retired constraints | Historical reasoning only |
| `docs/PIXEL-RENDER-EXPORT-BLUEPRINT.md` | Render/export plan | **PARTIAL / DECISION RECORD** | Self-reports stages 0–3 and 5 implemented, 4 and 6 awaiting separate decision | Yes, as decision record |
| `docs/studio/01_SYSTEM_AUDIT.md` | Current studio feature inventory | **ACTIVE REFERENCE / AUDIT ONLY** | Refreshed 2026-11-24; browser/runtime claims explicitly unverified | Yes — studio inventory |
| `docs/studio/02_WORKSPACE_LAYOUT.md` | Workspace layout milestone M1 | **DONE (chrome only)** | Engine behaviour explicitly unchanged | Yes, milestone record |
| `docs/studio/03_TOOL_DOCUMENTATION.md` | Tool behaviour M2 | **PARTIAL** | Gradient second colour, brush ghost, 45° bezier, pen pressure remain open | Yes |
| `docs/studio/04_WORKSPACE_REDESIGN_REPORT.md` | WR0–WR4 chrome redesign report | **ACTIVE REPORT** | States no timeline/frames and no reference images; no engine changes | Yes |
| `docs/studio/05_LAYER_GROUP_UX.md` | Layer/group UX design (WR3) | **ACTIVE REPORT** | One-level groups, flat stack | Yes |
| `docs/studio/WORKSPACE-REDESIGN.md` | Redesign proposal | **IMPLEMENTED** | Points to `04_WORKSPACE_REDESIGN_REPORT.md` | Low — historical proposal |
| `docs/studio/PXLB_STUDIO_EXECUTION.md` | Studio milestone tracker | **ACTIVE TRACKER** | M0/M1 DONE; M2/M3 PARTIAL; WR pending browser verification | Yes — studio process source |

### UX / journey / community audits

| File | Purpose / subject | Status | Conflicts / outdated architecture | Relevant? |
| --- | --- | --- | --- | --- |
| `docs/COMPREHENSIVE-UX-AUDIT.md` | Point-in-time UX audit at commit `66503eb` | **ARCHIVE (HISTORICAL SNAPSHOT)** | Explicitly not current feature status | No, except issue history |
| `docs/PRODUCT-UX-AUDIT.md` | 16 Nov product UX checklist | **ARCHIVE (HISTORICAL SNAPSHOT)** | Not current acceptance criteria | No |
| `docs/PRODUCTION-READINESS-UIUX-AUDIT.md` | 18 Nov production/UI polish audit | **ARCHIVE (HISTORICAL SNAPSHOT)** | Not current UI status | No |
| `docs/INSTANT-INTERACTION-AUDIT.md` | Interaction responsiveness evaluation | **OUTDATED** | Interaction-debt history only; its "no `loading.tsx`" claim is contradicted by 15 route loading files | Yes, for interaction debt history |
| `docs/USER-JOURNEY.md` | 16 Nov flows | **ARCHIVE (HISTORICAL SNAPSHOT)** | Routes/UI may have drifted; re-check before use | No |
| `docs/INFORMATION-ARCHITECTURE.md` | Recommended IA (Discover/Create/Showcase/Connect) | **PROPOSAL** | "Tidak menambah rute pada irisan pertama"; not a current route map | Low |
| `docs/COMMUNITY-EXPERIENCE.md` | Community/create experience audit, Fase A–C | **ACTIVE (HISTORICAL IMPLEMENTATION NOTE)** | Says code/migrations/UI already follow recommendations; do not redo Fase A–C | Yes, as history |
| `docs/ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md` | PNG download permission blueprint | **PROPOSAL / HISTORICAL** | Written when no download endpoint existed; current code has `allow_png_download` + `/api/pixel-download/[id]` — implementation-status claims are stale | Decisions only |
| `docs/ARTWORK-METADATA-EXPLORE-AUDIT.md` | Metadata, palette and Explore decisions | **ACTIVE REFERENCE (PARTIAL)** | Locked decisions still relevant; implementation-status snapshot historical; corrected 2026-11-24 | Yes, decisions only |
| `docs/REDESIGN-BLUEPRINT.md` | 16 Nov experience blueprint | **ARCHIVE (HISTORICAL SNAPSHOT)** | Do not implement autosave/layout details without revalidation | No |
| `docs/auth/auth-audit-report.md` | Phase 1 auth audit | **OUTDATED AUDIT** | Critical findings (recovery session hijack, no rate limiting, no CSRF, no reauth) are addressed in current source (`lib/auth/recovery.ts`, `rate-limit.ts`, `account-security.ts`) or need re-test; do not treat as current status | Historical only |
| `docs/auth/auth-system.md` | Phase 1 auth system notes | **SUPERSEDED** | Explicitly superseded by current specs/migrations | No |
| `docs/PXLB-REBRANDING.md` | Covered above | — | — | — |

### Master plan, strategy and evidence

| File | Purpose / subject | Status | Conflicts / outdated architecture | Relevant? |
| --- | --- | --- | --- | --- |
| `docs/master-plan/arah-pengembangan-pxlb.md` | Backlog/vision for community collaboration | **PROPOSAL / BACKLOG** | Explicitly not implementation authorisation; A3–A5, B2–B6, C2–C6 need separate go-ahead | Do not implement |
| `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md` | Decision prep, K1–K9, staged plan | **ACTIVE DECISION RECORD** | Specs signed off; A2 done; A3–C6 not authorised | Yes, as gate record |
| `docs/master-plan/SPEC-REMIX.md` | Remix spec S0.4 (K1/K2) | **PROPOSAL — APPROVED/SIGNED OFF** | A2 implemented; A3–A5 blocked | Yes, spec only |
| `docs/master-plan/SPEC-CHALLENGE.md` | Challenge spec S0.4 | **PROPOSAL — APPROVED/SIGNED OFF** | "IMPLEMENTATION NOT AUTHORIZED — NO CODE WRITTEN" | Spec only |
| `docs/master-plan/SPEC-PIXEL-ASSETS.md` | Pixel Assets spec S0.4/C1 | **PROPOSAL — APPROVED/SIGNED OFF** | "IMPLEMENTATION NOT AUTHORIZED — NO CODE WRITTEN" | Spec only |
| `docs/master-plan/PXLB-STUDIO-MASTER-EXECUTION-PLAN.md` | Studio master execution plan | **PROPOSAL (Initial Planning)** | Process source for `PXLB_STUDIO_EXECUTION.md`; not a build backlog | Yes, process context |
| `docs/master-plan/NAVIGATION-RENDERING-AUDIT.md` | Navigation/rendering audit Phase 1 | **ACTIVE AUDIT (PARTIAL)** | Says implementation partial; verify against current code before acting | Yes, as audit |
| `docs/master-plan/ROADMAP #U2014 Native-like Navigation & Interaction.md` | Native-like navigation roadmap | **PROPOSAL** | Status "Proposed"; not proof of implementation | No, unless authorised |
| `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md` | Manual runtime validation plan | **PROPOSAL — NOT EXECUTED** | No browser proof available | Yes, as open gate |
| `docs/evidence/phase8-20261122/RESULTS.md` | Phase 8 results template | **ARCHIVE / EMPTY** | Explicit "NOT EXECUTED" | No proof of runtime |
| `docs/evidence/explore-redesign-20261122/RESULTS.md` | Explore redesign browser validation | **ACTIVE EVIDENCE** | Point-in-time browser results | Yes, evidence |
| `docs/evidence/explore-contextual-20261122/RESULTS.md` | Explore contextual navigation before/after | **ACTIVE EVIDENCE** | Point-in-time browser results | Yes, evidence |
| `docs/evidence/explore-final-refinement-20261122/RESULTS.md` | Explore final refinement validation | **ACTIVE EVIDENCE** | Point-in-time browser results | Yes, evidence |
| `docs/evidence/creator-card-self-follow-overflow-20261122/RESULTS.md` | CreatorCard self-follow/overflow fix | **ACTIVE EVIDENCE** | Point-in-time fix report | Yes, evidence |
| `docs/evidence/creator-card-followup-20261123/RESULTS.md` | CreatorCard follow-up validation | **ACTIVE EVIDENCE** | Point-in-time fix report | Yes, evidence |
| `docs/evidence/creator-card-followup-20261123/fluid/RESULTS.md` | Fluid CreatorCard width validation | **ACTIVE EVIDENCE** | Point-in-time fix report | Yes, evidence |
| `docs/evidence/interaction-guardrails-20261123/RESULTS.md` | Like/follow spam, races, follow-status sync | **ACTIVE EVIDENCE** | Correlates with migration `20261123000000_interaction_guardrails.sql` and tests | Yes, evidence |
| `docs/strategy/PXLB-Community&Growth-Strategy.md` | Community and growth strategy | **PROPOSAL / VISION** | Explicitly not an implementation plan or signed-off spec | Context only |

`docs/audit/` did not exist before this audit; these two reports are the first files in it.

---

## 5. Source-of-Truth Mapping

| Domain | Trusted source | Supporting / evidence | Do not use for current truth |
| --- | --- | --- | --- |
| Product direction and decisions | `README.md`, `docs/PRODUCT-SPEC.md` | `docs/PXLB-REBRANDING.md` (domain), `docs/ARTWORK-METADATA-EXPLORE-AUDIT.md` (locked decisions only) | `docs/PIXEL-CANVAS-AGENT-PROMPT.md`, dual-mode MVP framing |
| Technical architecture / data model | `docs/TECHNICAL-SPEC.md` | `supabase/migrations/*`, `lib/supabase/*`, `features/*` | `docs/PIXEL-EDITOR-TECHNICAL-ARCHITECTURE.md`, `docs/auth/auth-system.md` |
| Sequencing / launch gates | `docs/IMPLEMENTATION-PLAN.md` | `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md`, `docs/evidence/*` | `docs/IMPLEMENTATION-ROADMAP.md`, `PIXEL-CANVAS-MIGRATION-PLAN.md` |
| Visual identity | `docs/PIXEL-ART-DESIGN-SYSTEM.md` | `app/globals.css`, `components/ui/*`, `docs/PXLB-REBRANDING.md` | Historical redesign blueprints |
| Studio current inventory / milestones | `docs/studio/01_SYSTEM_AUDIT.md`, `docs/studio/PXLB_STUDIO_EXECUTION.md` | `docs/studio/02..05`, `tests/pixel-studio-redesign.test.ts` | `STUDIO-ENGINE-AUDIT.md`, `WPLACE-STUDIO-FEATURE-AUDIT.md`, `PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` |
| Navigation / interaction debt | `docs/master-plan/NAVIGATION-RENDERING-AUDIT.md`, `docs/INSTANT-INTERACTION-AUDIT.md` | `tests/back-navigation.test.ts`, `tests/route-transitions.test.ts`, `UX_CONSISTENCY_AUDIT.md` (this audit) | `ROADMAP --- Native-like...` as status proof |
| Future A/B/C roadmap (remix/challenge/assets) | `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md` + signed specs | `SPEC-REMIX.md`, `SPEC-CHALLENGE.md`, `SPEC-PIXEL-ASSETS.md` | Treating signed-off specs as implementation authorisation |
| Runtime/browser proof | `docs/evidence/*/RESULTS.md` | Tests present in repo | `docs/evidence/phase8-20261122/RESULTS.md` (empty template) |

**Rule for agents:** a status label inside a historical document (`HISTORICAL SNAPSHOT`, `SUPERSEDED`, `NOT EXECUTED`, `NOT AUTHORIZED`) overrides any feature-status table in that document. Verify implementation claims in source.

---

## 6. Feature Implementation Inventory

Statuses: **IMPLEMENTED**, **PARTIALLY IMPLEMENTED**, **PLANNED**, **DEPRECATED**, **BROKEN/UNVERIFIED**. Evidence is source code unless stated otherwise.

| Feature | Status | Evidence / notes |
| --- | --- | --- |
| Email/password auth, registration, login, logout | IMPLEMENTED | `features/auth/actions.ts`, `(auth)/login`, `(auth)/register`, `components/auth/*`, `tests/auth-*.test.ts` |
| Google OAuth + callback handling | IMPLEMENTED | `components/auth/GoogleAuthButton.tsx`, `app/auth/callback/route.ts`, OAuth profile metadata migration |
| Email verification / verify-email | IMPLEMENTED | `(auth)/verify-email`, `lib/auth/verification.ts`, callback redirect logic |
| Password reset / recovery tickets | IMPLEMENTED (production secret required) | `app/auth/recovery/route.ts`, `lib/auth/recovery.ts`, `supabase/templates/reset-password.html`, `.env.example` `AUTH_RECOVERY_SECRET` |
| Onboarding gate / welcome | IMPLEMENTED | `(member)/welcome`, `lib/auth/session.ts:needsOnboarding`, layout redirects, `unified_onboarding` migration |
| Account security (password/email change, other-device revocation) | IMPLEMENTED | `components/account/AccountSecurity.tsx`, `lib/auth/account-security.ts`, session-cookie helpers |
| Rate limiting for auth / interactions | IMPLEMENTED (in-process only) | `lib/auth/rate-limit.ts`, `interaction_guardrails` migration; counters reset on deploy; host/proxy limits required |
| Session handling / RLS identity | IMPLEMENTED | `middleware.ts` -> `lib/supabase/middleware.ts`, `lib/auth/session.ts` (React `cache()` request-scoped) |
| Pixel creation, draft save, publish, edit | IMPLEMENTED | `(member)/create`, `(member)/create/[id]`, `features/creations/actions.ts`, PlaygroundForm, RLE source in Storage |
| Studio drawing tools (brush, eraser, shapes, fill, gradient, eyedropper, polygon, bezier) | IMPLEMENTED | `PixelBoard.tsx` tool list + shortcuts at lines 3310–3327; `lib/pixel.ts`, `lib/pixel-brush.ts` |
| Layers, groups (one level), opacity, blend, lock | IMPLEMENTED | Source V3/V4 in `lib/pixel.ts` (`PIXEL_SOURCE_VERSION_V4 = 4`), `lib/pixel-groups.ts`, `lib/pixel-blend.ts`, `LayerPanel.tsx`, `LayerStyleControls.tsx`; tests `pixel-layers-v3`, `pixel-groups` |
| Text tool with editable text objects | IMPLEMENTED | `lib/pixel-text/*`, `components/canvas/text-tool.ts`, `TextEditOverlay.tsx`, `TextInspector.tsx`, persistence tests |
| Selection (rect, ellipse, lasso, wand, color, polygon, combine), transform, copy/cut/paste | IMPLEMENTED | `lib/pixel.ts`, `lib/pixel-transform.ts`, `TransformDialog.tsx`, `PixelBoard` keyboard handler |
| Undo/redo | IMPLEMENTED | `lib/pixel-history.ts` (32 steps, 48 MiB unique-buffer cap), `PixelBoard` `Ctrl/Cmd+Z/Y` |
| Zoom, pan, minimap, grid | IMPLEMENTED | `PixelBoard` camera code + `StudioMinimap.tsx`, `[` toggles grid |
| Import PNG/GIF/etc. and palette library | IMPLEMENTED | `lib/pixel-import.ts`, `lib/pixel-gif*`, `ImportPixelArtDialog.tsx`, `lib/pixel-palette-library.ts`, `tests/pixel-import.test.ts` |
| Export PNG (scaled), GIF, ZIP, owner/server download | IMPLEMENTED | `lib/pixel-export-engine.ts`, `pixel-export.worker.ts`, `pixel-png-scale.ts`, `pixel-zip.ts`, `ExportDialog.tsx`, `app/api/pixel-download/[id]` |
| Creator-controlled PNG download permission | IMPLEMENTED | `allow_png_download` migration, `lib/auth/permissions.ts:canDownloadCreationPng`, `tests/download-permission.test.ts` |
| Fork / Remix A2 (server source fork gate) | IMPLEMENTED | `features/creations/actions.ts`, `lib/auth/permissions.ts`, `SPEC-REMIX.md` marks A2 done; A3–A5 blocked |
| Legacy creation types (text, visual, idea, story) | PARTIALLY IMPLEMENTED / LEGACY | `lib/site.ts:LEGACY_CREATION_TYPES`, `StudioForm.tsx`; new creation path is pixel-first; docs rebrand them as legacy |
| Artwork detail, tags, caption, color usage, similar works | IMPLEMENTED | `(public)/creation/[id]`, `features/creations/queries.ts`, `CreationTagInput`, `CreationColorPalette`, `SimilarWorks*` |
| Explore, search, category/color filters, infinite scroll | IMPLEMENTED | `(public)/explore`, `ExploreGallery`, `ExploreSearch`, `ExploreInfinite`, `SearchResults`, `search_ranking` migration, `tests/explore-*, search-*` |
| Recommendations / discovery rails | IMPLEMENTED (PARTIAL coverage) | `features/creations/recommendation-actions.ts`, `RecommendationRack`, `SimilarWorksLazy`, `DiscoveryNote` |
| Home feed, comments/replies, appreciations | IMPLEMENTED | `components/social/HomeFeed.tsx`, `FeedPost.tsx`, `CommentPanel.tsx`, `features/feed/*`, `features/community/*`, `tests/feed-*`, `tests/social-interactions.test.ts` |
| Follows + responses inbox + activity seen | IMPLEMENTED | `features/community/follows.ts`, `activity.ts`, `FollowButton.tsx`, `ResponsesInbox.tsx`, `follows` + `activity_seen_at` migrations |
| Reports and admin moderation | IMPLEMENTED | `components/moderation/AdminReports.tsx`, `app/[lang]/admin`, `features/moderation/*`, `reports` policies |
| Interaction guardrails (like/follow spam, races) | IMPLEMENTED | `20261123000000_interaction_guardrails.sql`, `tests/interaction-guardrails.test.ts`, `docs/evidence/interaction-guardrails-20261123/RESULTS.md` |
| Creator profiles, avatars (generated + uploaded) | IMPLEMENTED | `(public)/u/[username]`, `components/profiles/*`, `lib/avatar-gen.ts`, `avatars_bucket` migration, `tests/profile-avatar.test.ts` |
| Sharing dialog, QR, OG image, share-export | IMPLEMENTED | `components/share/*`, `lib/share*.ts`, `app/api/qr|og|share-export`, `tests/social-share.test.ts` |
| Common Space (`/space`) | PARTIALLY IMPLEMENTED / DEPRECATED AS CENTRE | `SpaceBoard.tsx` is SVG-based with add/move/delete text/rect/circle; `features/space/*`; migration exists; README/PRODUCT-SPEC explicitly secondary; `lib/flags.ts` says prototype flag retired |
| PWA install, offline page, service worker | IMPLEMENTED | `components/pwa/*`, `public/sw.js`, `public/offline.html`, `app/manifest.ts`, `tests/pwa*.test.ts` |
| Bilingual UI (id/en) | IMPLEMENTED | `lib/i18n.ts`, `lib/copy.ts`, `lib/copy-social.ts`, `[lang]` routing, `tests/copy-keys.test.ts` |
| Studio timeline / frames / animation | NOT IMPLEMENTED | No timeline component or frame model; `docs/studio/04_WORKSPACE_REDESIGN_REPORT.md` explicitly says slot empty |
| Reference images in studio | NOT IMPLEMENTED | Same studio report states they do not exist |
| Realtime collaboration / canvas tiles | PLANNED / NOT AUTHORIZED | `docs/TECHNICAL-SPEC.md` open list explicitly says no realtime or `canvas_tiles` |
| Remix A3–A5, Challenge, Pixel Assets | PLANNED / NOT AUTHORIZED | Signed specs exist; implementation explicitly not authorised |
| Phase 8 browser/runtime validation | BROKEN/UNVERIFIED (not executed) | `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md` and empty `docs/evidence/phase8-20261122/RESULTS.md` |
| Production Supabase policies / DNS cutover | UNVERIFIED | Rebranding doc says DNS not verified; migrations must be applied by operator (`IMPLEMENTATION-PLAN.md`) |

**Notable:** tests in this repository are largely static/source-contract tests (they inspect file contents and exported helpers). They are strong evidence that intended code exists, but they are **not browser or production proof**.

---

## 7. Technical Health

### 7.1 TypeScript — PASS

`npm run typecheck` produced no output beyond the script header. `tsconfig.json` uses `strict: true`, `moduleResolution: "bundler"`, path alias `@/*`, and explicitly includes test files. `supabase/functions` is excluded (the Edge Function is deployed separately). `tsconfig.tsbuildinfo` is present but the check ran with `--incremental false`, so no incremental file was written by this audit.

### 7.2 ESLint — FAIL (27 errors, 21 warnings)

`npm run lint` output, grouped by file:

| File | Errors | Warnings |
| --- | ---: | ---: |
| `components/creations/PlaygroundForm.tsx` | 12 | 1 |
| `components/creations/CreationMoreMenu.tsx` | 4 | 0 |
| `components/layout/CornerBusy.tsx` | 3 | 0 |
| `components/share/CreationShareDialog.tsx` | 2 | 0 |
| `components/auth/RegisterForm.tsx`, `ColorPicker.tsx`, `DocumentPaletteDialog.tsx`, `ImportPixelArtDialog.tsx`, `profiles/SettingsForm.tsx`, `pwa/PwaInstall.tsx` | 1 each | 0 |
| `components/canvas/PixelBoard.tsx` | 0 | 6 |
| `app/[lang]/(member)/dashboard/page.tsx` | 0 | 2 |
| `components/community/ResponsesInbox.tsx` | 0 | 2 |
| `app/[lang]/(public)/creators/page.tsx` | 0 | 1 |
| `components/creations/CreationCard.tsx`, `ExploreGallery.tsx` | 0 | 1 each |
| `components/social/Pill.tsx`, `components/ui/Input.tsx`, `components/ui/Textarea.tsx`, `lib/pixel-import.ts`, `lib/pixel.ts`, `lib/pixel-gif-decode.testutil.ts` | 0 | 1 each |

Error categories:

- `react-hooks/set-state-in-effect` — synchronous `setState` inside `useEffect` (17 occurrences across 10 files).
- `react-hooks/refs` — reading refs during render, all in `PlaygroundForm.tsx` (10 occurrences).
- `react-hooks/exhaustive-deps` warnings, mostly `PixelBoard.tsx`.
- Unused imports/variables and one `<img>` LCP warning.

This is a real health issue but concentrated in studio/async-UI code; it does not currently break TypeScript or tests.

### 7.3 Tests — PASS

`npm test -- --reporter=dot`: **105 test files, 842 tests passed** in ~15.9 s. Coverage areas include pixel engine, history, groups, export, import, RLS policies, auth, community, navigation, route rewrites, interaction guardrails, typography and PWA. Note that the Vitest environment is `node`; there is no DOM/browser test runner configured. Static-contract assertions (`toMatch(/useSyncExternalStore/)` etc.) are common.

### 7.4 Dependency health

- Runtime dependencies (10): `@supabase/ssr` ^0.12.7, `@supabase/supabase-js` ^2.119.0, `lucide-react` ^0.552.0, `next` 16.4.6 (pinned), `pixelarticons` ^2.4.2, `qrcode` ^1.5.4, `react`/`react-dom` ^19.3.1, `zod` ^4.6.7.
- Dev dependencies (9): Tailwind 4.3.3 with Turbopack plugin, TypeScript 5.9.3, ESLint 9.39.5 + next config 16.4.6, Vitest 3.2.7, Node/React types.
- `npm audit --omit=dev --audit-level=low`: **0 vulnerabilities**.
- `npm outdated`: within-range updates available for Supabase JS, React types, Tailwind; major upgrades available for `@types/node` 26, `eslint` 10, `lucide-react` 1, `typescript` 7, `vitest` 5, Tailwind 4.3.5. No upgrades were installed (audit restriction).
- No runtime state-management library, no component library, no browser test framework.

### 7.5 Performance and risk observations (verified code facts, not profiling)

- **61 `"use client"` files under `components/`** and no `next/dynamic` usage anywhere. `PixelBoard`, `PlaygroundForm`, `LayerPanel`, `ColorPicker` and social feeds are all client components loaded as part of their route chunk.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and pins `staleTimes.dynamic = 0` to prevent cross-account cache reuse. This is a deliberate security choice.
- `PixelBoard` uses rAF-scheduled rendering with dirty-rect invalidation (documented in `docs/STUDIO-ENGINE-AUDIT.md` and visible in the render scheduling code); camera moves do not recomposite. This mitigates, but does not remove, the cost of a 158 KB component.
- `lib/copy.ts` is a single 86 KB module imported widely for bilingual strings; every consumer imports the whole dictionary.
- `PublicShell.AuthHeader` performs two awaited data calls (`getCurrentProfile`, `hasUnseenCreationResponses`) on every page render, behind Suspense.
- In-process rate limits (`lib/auth/rate-limit.ts`) reset on deploy and are not shared across instances — acceptable only with host/proxy limits, as `.env.example` warns.
- No browser/runtime profiling was performed: **UNVERIFIED**.

### 7.6 Repository hygiene

- `git status --short` at audit time showed **pre-existing** changes not made by this audit: `M docs/master-plan/arah-pengembangan-pxlb.md` and an untracked `docs/strategy/` directory. These are treated as user work and left untouched.
- `.env.local` exists locally and is ignored by Git; values were not read or modified.
- `docs/audit/` was created solely for the two audit reports.

---

## 8. Architectural Risks

1. **Editor monolith risk (HIGH).** `PixelBoard.tsx` + `PlaygroundForm.tsx` own nearly all studio behaviour. Any change to input, rendering, persistence or shortcuts has a large blast radius; 27 lint errors cluster there. This is not "large = bad" by itself — the engine is cohesive and heavily tested — but the boundary between engine and chrome is unclear.
2. **Divergent creation flows (HIGH).** Pixel creations use PlaygroundForm; legacy types use StudioForm; `/create` uses PixelNewForm. New feature work can easily be implemented in only one path.
3. **Documentation drift (HIGH).** 54 docs, many explicitly historical, still contain feature-status tables and "roadmap" language. An agent that reads the wrong doc will implement retired constraints (palette 64, Common Space as centre, no opacity/blend, B6/realtime).
4. **Lint debt (MEDIUM-HIGH).** React 19 rules flag cascade-render patterns and ref reads during render in user-facing components. These are correctness/performance signals, not mere style.
5. **Data-access duplication (MEDIUM).** Permission checks are repeated in route handlers and server actions (`canDownloadCreationPng` in `app/api/pixel-download/[id]` and elsewhere). Drift would create security inconsistencies.
6. **Client bundle weight (MEDIUM).** No dynamic imports; heavy editor and social components are statically imported. Full impact UNVERIFIED without a build/profile.
7. **Centralised copy file (MEDIUM).** `lib/copy.ts` at 86 KB is a maintenance hotspot for bilingual changes.
8. **Operational gap (MEDIUM).** Migrations, production storage/RLS verification, DNS cutover and Phase 8 browser run remain open per `IMPLEMENTATION-PLAN.md`. Code passing tests does not prove production readiness.
9. **Testing shape (MEDIUM).** Node-environment static tests dominate; no Playwright/jsdom/browser suite. Interaction and visual behaviour are asserted from source text, not runtime.
10. **Type-only cycle (LOW).** `pixel.ts` ↔ `pixel-groups.ts` violates the latter's own "must not import from pixel.ts" comment, though the import is type-only.

---

## 9. Documentation Conflicts

| Conflict | Documents | Resolution |
| --- | --- | --- |
| Product centre: pixel playground vs giant shared Common Space | `PRODUCT-SPEC.md` / `README.md` vs `PIXEL-CANVAS-AGENT-PROMPT.md` (superseded) and dual-mode MVP language in older docs | Trust `PRODUCT-SPEC.md`; `/space` is secondary. Do not treat the old prompt as truth |
| Sequencing: B0–B5/B7 current vs older phase plans | `IMPLEMENTATION-PLAN.md` vs `IMPLEMENTATION-ROADMAP.md`, `PIXEL-CANVAS-MIGRATION-PLAN.md` | Trust `IMPLEMENTATION-PLAN.md`; older plans are archives |
| Studio feature inventory: "many tools missing / no opacity-blend / locked canvas" vs current source | `STUDIO-ENGINE-AUDIT.md`, `WPLACE-STUDIO-FEATURE-AUDIT.md`, `PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` vs `docs/studio/01_SYSTEM_AUDIT.md`, `PXLB_STUDIO_EXECUTION.md`, `lib/pixel.ts` (V4, groups, blend) | Trust `docs/studio/*`; archive the older audits |
| Studio redesign target | `PIXEL-STUDIO-REDESIGN-BLUEPRINT.md`, `PIXEL-EDITOR-UI-UX-REDESIGN.md` vs shipped `04_WORKSPACE_REDESIGN_REPORT.md` | Shipped work wins; do not restore retired constraints |
| Auth risk status: "critical recovery hijack, no rate limit" vs current code | `docs/auth/auth-audit-report.md` vs `lib/auth/recovery.ts`, `rate-limit.ts`, `account-security.ts` | Treat audit report as historical; re-test if needed |
| Download permission: "no download feature" vs implemented endpoint | `ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md` vs `allow_png_download` migration + `app/api/pixel-download/[id]` | Use the blueprint only for decisions; verify implementation in code |
| UX audit checklists as acceptance criteria | `COMPREHENSIVE-UX-AUDIT.md`, `PRODUCT-UX-AUDIT.md`, `PRODUCTION-READINESS-UIUX-AUDIT.md`, `USER-JOURNEY.md`, `REDESIGN-BLUEPRINT.md` | All self-declare HISTORICAL SNAPSHOT; use for issue history only |
| Future features: signed-off specs vs implementation | `SPEC-REMIX.md`, `SPEC-CHALLENGE.md`, `SPEC-PIXEL-ASSETS.md`, `arah-pengembangan-pxlb.md` | Signed off ≠ authorised. Only A2 was implemented; A3–A5, B6, Challenge, Pixel Assets remain blocked |
| Production proof: Phase 8 planned vs results | `master-plan/PHASE-8-RUNTIME-VALIDATION.md` vs `evidence/phase8-20261122/RESULTS.md` ("NOT EXECUTED") | Runtime validation is still an open gate |
| Loading-state claim: "no `loading.tsx`" vs current source | `INSTANT-INTERACTION-AUDIT.md:43-49` vs 15 `app/**/loading.tsx` files | Treat the audit as OUTDATED history; use source for current loading coverage |

No conflicting document was modified during this audit.

---

## 10. Recommended Cleanup Priorities

These are recommendations only — nothing here was executed.

1. **P0 — Establish a single doc index.** Add a short status column/link map from `README.md` to the already-declared source-of-truth set and to `docs/studio/*`. Do not create a second hierarchy; do not delete archives. This prevents agents from implementing retired constraints.
2. **P0 — Resolve lint errors in studio interaction code.** Start with `PlaygroundForm.tsx` (10 ref-during-render errors), `CreationMoreMenu.tsx`, `CornerBusy.tsx`, `CreationShareDialog.tsx`. These are user-facing and testable.
3. **P0 — Close the operator/runtime gates** from `IMPLEMENTATION-PLAN.md` and `PHASE-8-RUNTIME-VALIDATION.md` (apply migrations, production RLS/storage check, signed-in Playground walkthrough, DNS) before claiming production readiness.
4. **P1 — Define the editor boundary on paper.** Document which concerns belong in `PixelBoard` (engine/input/camera/history) vs `PlaygroundForm` (chrome/persistence) before extracting anything. Do not refactor first.
5. **P1 — Unify button/loading/empty standards.** `Button` + `socialButtonClass` + ad-hoc buttons, and four skeleton/empty implementations, are the clearest UX-standardisation wins. See `UX_CONSISTENCY_AUDIT.md`.
6. **P1 — Decide the legacy creation-type strategy.** Either finish migrating `StudioForm` users to pixel or explicitly freeze legacy types. Today `PARTIALLY IMPLEMENTED / LEGACY` is ambiguous.
7. **P2 — Re-check `STUDIO-ENGINE-AUDIT.md` and `auth-audit-report.md` labels.** Add a one-line "historical; see X" banner if they will be retained; do not rewrite their content in this audit.
8. **P2 — Evaluate code splitting for editor routes** after a build/profile. No `next/dynamic` exists today; this is a measurement task, not a refactor mandate.
9. **P2 — Break the type-only `pixel.ts` ↔ `pixel-groups.ts` cycle** when touching group code, by moving shared runtime types to a neutral module.
10. **Do not touch:** migration history, RLS policies, signed-off specs, evidence records, pre-existing uncommitted changes, and any A3–A5/B6/Challenge/Pixel Assets implementation without explicit founder authorisation.

---

## Verification Notes

- All file paths in this report are relative to the repository root unless absolute paths are shown.
- "UNVERIFIED" means the audit did not execute or inspect the relevant runtime/production environment.
- This report is an audit artefact only. It contains no implementation instructions that authorise code changes.
- Two companion **PROPOSAL** specs were added later at the owner's explicit request: `docs/audit/UI_INTERACTION_SPEC.md` and `docs/audit/STUDIO_INTERACTION_SPEC.md`. They are not implementation authorization.
