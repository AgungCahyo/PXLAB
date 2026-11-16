# THE COMMONS — Technical Specification

**Document:** TECHNICAL-SPEC.md  
**Status:** Pixel Art Community baseline (migrates the existing app; does not replace it)  
**Stack:** Next.js App Router, TypeScript, Supabase, Vercel  
**Product source of truth:** [PRODUCT-SPEC.md](PRODUCT-SPEC.md)

---

## 1. Technical objectives

Maintain the existing Next.js + Supabase application while changing Create into a personal Pixel Art Playground and treating Common Space as a later sparse world.

Priorities:

1. Secure data access (RLS + server validation).
2. Reuse working auth, profiles, Explore, comments, appreciation, and admin.
3. Persist pixel art as **editor source** (reopen/edit) plus a **rendered PNG** (display). Do not treat PNG as the editor document. Do not stuff grids into the 32KB JSONB cap.
4. Clear boundary between the personal Playground and the later giant Common Space. Common Space work must not block community launch.
5. Mobile drawing performance.
6. No premature realtime or unbounded storage for the community MVP.

Do not scaffold a second app. Do not drop old tables or rewrite applied migrations.

---

## 2. Recommended stack

| Concern | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI primitives | Existing project components |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage (editor source JSON + rendered PNG per pixel creation) |
| Hosting | Vercel |
| Validation | Zod |
| Forms | React Hook Form where useful |
| Pixel rendering | HTML Canvas 2D, nearest-neighbor, one ImageData buffer (or equivalent) per view |
| Legacy visual / SVG space | Keep existing SVG generators; not the community-MVP Create path |
| Icons | Lucide |
| Tests | Vitest for unit tests; Playwright for critical end-to-end flows when added |

Use current versions already in the repository. Do not upgrade major dependencies casually during implementation.

---

## 3. High-level architecture

```text
Browser
  |
  v
Vercel / Next.js
  |-- Server Components: public page reads
  |-- Server Actions: validated mutations
  |-- Client Components: Pixel Art Playground (and later Common Space viewport)
  |
  v
Supabase
  |-- Auth
  |-- PostgreSQL + Row Level Security
  |-- Storage (per-creation source.json + cover.png; draft vs published policies)
```

Two pixel surfaces share drawing math (`lib/pixel.ts`) and must **not** share world models:

| Surface | When | Model |
|---|---|---|
| Pixel Art Playground | Community MVP | Owner-chosen resolution (8–512 per side), persisted as editor source + rendered PNG |
| Common Space | After community MVP | Sparse tiles, camera/viewport, grow-on-demand with a documented extent cap |

### Architectural rules

- Prefer Server Components for read-only page rendering.
- Use Client Components only for interactivity requiring browser state or APIs.
- Mutations must cross a trusted server boundary or use Supabase policies that fully enforce authorization.
- RLS is mandatory and is not replaced by hiding UI controls.
- Never expose the Supabase service role key to client code.
- Use the Supabase publishable/anon key only with RLS correctly configured.
- Keep secrets in Vercel environment variables and local `.env.local`.
- Do not put secrets in `NEXT_PUBLIC_*` variables.
- Do not create a custom server or VPS for the MVP.
- Never create one database row or one network request per pixel.
- Never trust client-supplied user IDs, coordinates, colors, or undo payloads.
- Cache Components: `cookies()`, `Date.now()`, and `new Date()` cannot prerender. Use `await connection()` before request-time clock or auth. `instant = false` does not clear `Date.now()` errors.

---

## 4. Suggested project structure

Adapt in place. Do not restructure blindly.

```text
the commons/
├── app/[lang]/
│   ├── (public)/          landing, explore, creation, u, space
│   ├── (auth)/            login, register
│   ├── (member)/          dashboard, create, settings
│   └── admin/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── creations/         Studio forms; VisualCanvas is legacy
│   ├── canvas/            PixelBoard (Playground), SpaceBoard (legacy SVG)
│   └── community/
├── features/
│   ├── auth/
│   ├── profiles/
│   ├── creations/         extend for type pixel + Storage
│   ├── common-space/      legacy SVG writes; later sparse tiles
│   └── moderation/
├── lib/
│   ├── pixel.ts           shared pixel math (keep)
│   ├── supabase/
│   ├── validations/
│   └── copy.ts
├── supabase/migrations/   additive only
└── docs/
```

Keep feature-specific queries, schemas, and actions close to their feature.

---

## 5. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE=
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and public anon/publishable key may be exposed to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and should be avoided where user-scoped RLS operations suffice.
- Never commit `.env.local`.
- Provide `.env.example` with empty placeholders.
- `NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE` is retired for `/space` (B5). Playground owns PixelBoard. The variable may still exist in env files; `/space` ignores it.
- Validate required environment variables at the point of use.

---

## 6. Database model

Use UUID primary keys and `timestamptz` timestamps. Add indexes for common filters and foreign keys. Use database constraints for uniqueness and valid states. **Additive migrations only.**

### 6.1 `profiles`

Unchanged.

- `id uuid primary key references auth.users(id) on delete cascade`
- `username text not null`
- `display_name text`
- `bio text`
- `avatar_url text`
- `role text not null default 'member'`
- `created_at` / `updated_at` timestamptz

Constraints: unique `lower(username)`; format `^[a-z0-9_]{3,20}$`; `role` in `member`, `admin`. Members cannot self-assign admin.

### 6.2 `creations`

Existing columns stay. Community MVP extends `type`.

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references profiles(id) on delete cascade`
- `title text not null`
- `type text not null`
- `content jsonb not null`
- `cover_url text`
- `status text not null default 'draft'`
- `forked_from uuid references creations(id) on delete set null`
- `created_at` / `updated_at` / `published_at`

**Migration in repo:** `20261116100000_pixel_creations.sql` allows `type` in `text`, `visual`, `idea`, `story`, `pixel`. Do not rewrite `20261116030000_creations.sql`. Operator must still apply it on the Supabase project.

Indexes remain: `(status, published_at desc)`, `(user_id, created_at desc)`, `(type, status, published_at desc)`.

Pixel `content` JSON is the **header** for editor source, not the public image, for example:

```json
{
  "version": 1,
  "width": 64,
  "height": 64,
  "palette": ["#FFFDF7", "#20202A", "#FF5C5C"],
  "encoding": "rle-index",
  "source_path": "{user_id}/{creation_id}/source.json"
}
```

`palette[0]` is Paper. `source.json` stores RLE of palette indices covering `width * height`. The Playground **reopens from this source**. The 32KB JSONB check constraint remains for legacy types and for this header. Do not store the grid in `content`. Do not reopen a work by decoding the PNG.

The **rendered PNG** is a separate Storage object (see §11), generated from source on save and publish, referenced by `cover_url`. Explore, profile, detail, and OG use the PNG only.

Legacy payloads stay as recorded in Phase 3 (`text` / `idea` / `story` / `visual` SVG primitives).

### 6.3 `space_elements` (legacy)

Keep the table. Do not drop. Public SVG Common Space remains the flag-off `/space` path until a later sparse-tile phase replaces the interaction.

Columns and constraints remain as implemented in `20261116040000_space_elements.sql`.

### 6.4 Later Common Space tables (do not create in community MVP; not a launch gate)

Do not design, migrate, or implement these tables while B1–B5 or B7 are open. Community launch proceeds without them.

When phase B6 is explicitly approved, prefer sparse tiles — not a fixed 16 × 16 world of 512 pixels:

**`canvas_tiles` (proposed)**

- unique `(tile_x, tile_y)`
- `pixel_data` compact (bytea or equivalent), never one row per pixel
- `revision bigint not null default 0`
- rows exist only for tiles that have been drawn

**`canvas_actions` (proposed)**

- `user_id`, compact stroke payload, timestamps, status
- enough history for attribution, own-action undo, and admin recovery
- bounded retention, specified in that phase

Practical world extent: ±32,768 pixels on each axis (PRODUCT-SPEC default). Tile size 32 × 32. Viewport loads tiles around the camera. Empty Paper is implicit (missing tile = Paper).

Do not start this schema until IMPLEMENTATION-PLAN Common Space phase is approved.

### 6.5 `comments`, `reactions`, `reports`

They already attach to `creations` and work for `pixel` rows. **B4 Artwork Conversation** adapts the detail UI and adds one-level replies. Do not rebuild the tables. Additive migration only:

- `comments.parent_id` nullable UUID, references `comments(id)` on delete cascade (or reject delete of a root that still has published replies — pick cascade of replies with the root, or block delete until replies are gone; **default: cascade replies when the root is deleted by its owner**).
- A reply must share `creation_id` with its parent. Parent must itself have `parent_id` null. Reject deeper nesting in the action and with a constraint/trigger.
- Owner **update** of `content` (and `updated_at` if added) for own published comments. Do not grant `status` updates to members. Show an edited hint when `updated_at` is after `created_at`.
- Do not rewrite `20261116050000_community.sql`.

Load: latest slice of **root** comments (`parent_id` is null), newest at the bottom, page size 20; include each root’s replies in the same payload. “Load earlier” prepends older roots. Public select remains published comments on published creations.

Reactions unchanged: `appreciate`, unique `(user_id, creation_id)`. No comment-level reactions in B4.

Client: collapsed composer; optimistic insert of the member’s comment/reply; server action still validates session, published creation, rate limits, and parent rules. No realtime channel. No notification tables.

Share is client-only (clipboard / `navigator.share` of the public `/creation/[id]` URL). Not a database feature.

Reports still allow `target_type` `creation` | `comment` | `space_element`. A later canvas-action target is added only with the giant-canvas phase.

---

## 7. Authentication and profile lifecycle

Unchanged from Phase 2:

- Supabase Auth, email + password only.
- Profile rows via `security definer` trigger on `auth.users`.
- Username collision: requested names inserted as-is; unique index rejects duplicates; suffix only when metadata has no valid username.
- Protect member routes with server-side session validation.
- Derive identity from `getUser()`, never cookie-only `getSession()`.
- Public profile reads may use a cookie-less anon client so Cache Components can prerender public pages.
- Avoid leaking whether arbitrary email addresses are registered in public error messages.

---

## 8. RLS policy design

Enable RLS on every application table. Existing policies stay. New pixel Storage objects need matching storage policies (see §11).

### Profiles

- Public can select only fields intended to be public.
- Authenticated users can update only their own profile.
- Users cannot update their own role.
- Insert is handled through the trusted profile-creation trigger.

### Creations

- Public select: only `status = 'published'`.
- Owner select: own drafts and own creations.
- Owner insert: `user_id = auth.uid()`, `status = draft`.
- Owner update/delete: only own rows. Members cannot set `hidden` or change `user_id` / `type`.
- Admin moderation through security definer functions.

### Space elements (legacy)

- Public select: `status = 'active'`.
- Authenticated insert as self with `active`.
- Owner update/delete own elements.
- Admin hide via trusted function.

### Comments / reactions / reports

Unchanged from Phase 5.

**Important:** test policies using at least two ordinary accounts and one admin account. Verify both allowed and denied operations.

---

## 9. Server-side operations

Use Server Actions consistently. Do not duplicate the same mutation logic in multiple places.

Required mutation operations (existing, keep):

- Register/profile initialization.
- Create/update/publish/delete creation.
- Add/update/delete own legacy space element (until the route is demoted).
- Add/delete comment.
- Add/remove reaction.
- Fork creation.
- Submit report.
- Admin review/hide/restore content.

Community-MVP additions (implementation phase, not this docs pass):

- Create `pixel` draft.
- Persist **editor source** (validated RLE JSON) and regenerate **PNG** from that source. Server checks ownership, `#RRGGBB` palette (max 64, Paper at index 0), indices, MIME, and size.
- Reopen Playground from source, never from PNG.
- Preview, publish, unpublish (`published` → `draft` without delete), delete.
- Fork pixel work by copying **source** (then regenerating PNG), not by trusting a client-supplied PNG.

For each mutation:

1. Validate session.
2. Validate input with Zod or equivalent.
3. Derive user identity from session.
4. Verify ownership/authorization.
5. Execute using user-scoped Supabase client where possible.
6. Return a typed success/error result.
7. Revalidate relevant pages or update UI safely.

---

## 10. Pixel Art Playground and Common Space

### 10.1 Playground (community MVP)

Reuse `lib/pixel.ts` and adapt `components/canvas/PixelBoard.tsx` into `/create` / `/create/[id]`.

Behavior:

- Logical canvas uses `width` × `height` from the creation header / source (not a hardcoded 512).
- Size picker at `/create` before the editor; size is immutable after insert.
- Owner-only edits.
- Local undo/redo is allowed (personal document, not a shared world).
- Pencil/eraser, document palette + custom color picker (native picker, HEX, recent, favorites), pan, Pointer Events, Bresenham `walkLine`. Zoom via pinch and wheel; Fit in an extra menu.
- Studio layout: header, canvas (flex), icon toolbar, compact document palette. Autosave drafts. Changing the active color does not rewrite existing indices.
- Disable image smoothing when scaling.
- Persist on save/publish through Server Actions, not one request per pixel.
- Save writes **source first**, then derives the PNG from that source (client may propose both blobs; server validates source and may ignore a PNG that does not match).
- Reload `/create/[id]` hydrates the canvas from source.
- Unpublish is an owner status change to `draft`; objects remain.

Do not use the shared-canvas undo rule (“cannot restore over later contributors”) on the Playground.

### 10.2 Legacy SVG Common Space

`SpaceBoard` + `space_elements` remain in the tree. `/space` is a later-canvas placeholder; the SVG board is archived below that copy. This is not the long-term Common Space model and is not a community-MVP feature. PixelBoard is not mounted on `/space`.

SVG is generated from validated primitives. Do not accept arbitrary user SVG markup.

### 10.3 Later giant Common Space

Out of community MVP. Not a launch requirement. When B6 is approved:

- HTML Canvas 2D viewport over a sparse tile map.
- Pan/zoom camera; fetch tiles around the view.
- Batched strokes; server applies atomically; increment tile revision.
- Last accepted server commit wins for overlapping pixels.
- Own-action undo only if affected pixels have not been changed by a later action.
- Realtime transports **committed** tile/action updates only, after persistence is reliable.
- Rate limits, max pixels per stroke, action retention: specify in that phase.

The previous PIXEL-CANVAS-MIGRATION-PLAN assumption of a single 512 × 512 shared prototype as the product center is **not** the architecture to implement next.

---

## 11. Storage

Community MVP **does** use Storage for two pixel artifacts per creation. This is a narrow, validated exception — not generic user media.

Recorded default:

- Bucket dedicated to pixel creations: `pixel-creations` (private).
- Object keys use owner UUID plus creation UUID (never a user filename):
  - `{user_id}/{creation_id}/source.json` — editor source (palette + RLE indices). **Required to reopen.**
  - `{user_id}/{creation_id}/cover.png` — rendered thumbnail/detail image, generated from source.
- Public display URL is `/api/pixel-cover/{creation_id}` (status-checked). Stored on `cover_url`.
- Source: JSON, `version` integer (current `1`), encoding `rle-index`, palette entries `#RRGGBB` (`palette[0]` Paper, max 64, append-only — not the UI swatch allowlist), indices in range, decoded length `width * height`. Ceiling **512 KiB**. On load (B2): reject unknown versions; keep v1 readable; reject truncated/overlong RLE and out-of-range indices before hydrating the canvas.
- Cover: MIME `image/png` only. Ceiling **512 KiB** for a 512 × 512 indexed PNG.
- Draft source and draft PNG: readable by owner (and admin); not publicly listable.
- Published covers: public read so Explore/detail/OG images work.
- Source objects are not the public gallery asset. Owner/admin always read their own objects. Authenticated members may SELECT published `source.json` so fork can copy editor source; the gallery still never links it.
- On unpublish, keep both objects; revoke public cover if the policy is status-based, or rely on `creations.status` so public pages never link a draft.
- On delete of a creation, delete both objects server-side.
- `cover_url` stores the URL used for published display.
- Automatic thumbnail: rewrite `cover.png` on every successful save and on publish.

Avatars remain deferred. Do not open the bucket to arbitrary JPEG/WebP uploads in this phase.

Legacy note: Phase 3 deferred cover uploads for SVG visuals; pixel type is the first cover path. PNG is still not a substitute for editor source.

---

## 12. Security and abuse prevention

Minimum safeguards:

- RLS enabled and tested.
- Server-side validation for every mutation.
- Admin role cannot be self-assigned.
- Rate limits for account creation, comments, reports, and (later) canvas strokes.
- Maximum text, JSON, PNG, and pixel-count sizes.
- Safe rendering of user-generated content.
- Report and hide workflow.
- No service-role secret in client bundle.
- Avoid logging passwords, tokens, or sensitive user data.
- Use secure session handling recommended by the current Supabase SSR integration.
- Protect admin routes server-side, not merely by hiding navigation.

---

## 13. Performance and reliability

- Paginate Explore and comments.
- Thumbnails: use the stored PNG; do not blit 512 × 512 ImageData on the Explore server render for every card if a smaller derivative can be produced later. First implementation may show the same PNG with CSS sizing and nearest-neighbor.
- Avoid fetching every creation or every canvas tile without limits.
- Later Common Space: load only tiles intersecting the viewport (plus a small prefetch margin).
- Add indexes for actual query patterns.
- Use loading skeletons and empty states.
- No realtime subscriptions required for the community MVP.
- Add error boundaries and actionable error states.
- Verify production environment variables before deployment.

---

## 14. SEO and sharing

- Public landing, Explore, profile, and published creation pages should have metadata.
- Creation detail pages should have title, description, canonical URL, and social preview (pixel PNG as OG image where practical).
- Do not index private drafts, hidden content, admin pages, or account settings.
- Provide a useful not-found state for missing or inaccessible creations.

---

## 15. Testing requirements

Unit tests:

- Zod schemas, including `pixel` metadata.
- Username validation.
- Legacy visual and space-element schemas (keep while those paths exist).
- Pixel helpers in `lib/pixel.ts` (already present).
- Permission helper logic.

Integration tests:

- Authenticated pixel draft → persist **source + PNG** → reopen from source → preview → publish.
- Unpublish returns to draft without deleting source or PNG; public reads stop.
- Ownership checks.
- Public visibility rules for published pixel covers vs drafts; source objects not publicly listed.
- Reaction uniqueness.
- Report submission and admin moderation.
- Fork copies **editor source** (then PNG) and does not let the client set `user_id`.

End-to-end tests (community MVP):

- Register/login.
- Create, save draft, reopen, preview, and publish a pixel work.
- Unpublish and confirm it leaves Explore.
- Explore and open creation detail.
- Comment and appreciate.
- Report content and verify admin workflow.

Common Space giant-canvas e2e is **not** a community-MVP gate and **not** a launch requirement.

Security tests:

- Anonymous cannot create.
- Member A cannot modify Member B's content or draft PNG.
- Member cannot elevate own role.
- Hidden content is not publicly returned.
- Drafts and draft Storage objects are not publicly returned.
- Admin functions reject non-admin sessions.

---

## 16. Deployment

- Deploy Next.js on Vercel.
- Configure production Supabase URL and public key.
- Keep service role key server-only if needed.
- Configure custom domain and DNS when ready.
- Apply database migrations in a controlled sequence (`supabase/migrations` must be applied on the project; the operator still does this).
- Configure the pixel Storage bucket and policies before Playground persistence ships.
- Test auth redirect URLs and email templates.
- Verify RLS in production before inviting users.
- Keep a rollback plan for migrations and deployments.

---

## 17. Technical decisions to document

Before implementation, record:

- Exact package versions (see below).
- Supabase SSR/auth approach (see below).
- Server Actions vs Route Handler conventions.
- Username format.
- Pixel source schema (`rle-index`), PNG generation, and Storage policies.
- Playground canvas constants (already in `lib/pixel.ts`).
- Common Space sparse-tile schema — only when that phase starts.
- Rate limits and content limits.
- Admin provisioning procedure.
- Data deletion and retention behavior.

Do not make security-sensitive assumptions silently.

### Recorded at Phase 1 setup

Package versions in this repository:

- Next.js `16.4.6`
- React / React DOM `19.3.0`
- Tailwind CSS `4.3.3` via `@tailwindcss/turbopack`
- TypeScript `^5` (strict mode enabled)
- ESLint `^9` with `eslint-config-next` `16.4.6`
- lucide-react `0.552.0`

Theme (Phase 1 setup, superseded by B1): DM Sans + Cormorant Garamond; agungcahyo-v2 tokens; light and dark via `prefers-color-scheme`.

### Recorded at B1 identity

- Classic Pixel Adventure (see PIXEL-ART-DESIGN-SYSTEM.md). Light-first Paper `#FFFDF7`, Ink `#282B35`. UI palette: Sky `#59BCEB`, Grass `#45A849`, Brick `#E94B3C`, Coin `#FFD447`, Earth `#936037`. No `prefers-color-scheme` dark palette.
- Pixel font: Press Start 2P for titles, kickers, and short accents (`--font-pixel`). DM Sans for body, forms, and instructions. Cormorant is not loaded.
- Chrome: 3px Earth borders, square corners, hard `4px 4px 0` Ink shadows, retro Brick/Grass buttons. Original pixel decorations (clouds, grass, coin, bricks) — not Nintendo assets.
- Primary nav: Explore, Create, Profile (signed in), in the header. App pages do not repeat that nav in a marketing footer. Common Space is a quiet landing note, not a footer destination.
- Independent product mark (four color blocks); no glass vial / Three.js pour animation.
- Editor source RLE validation (version, size, decode length, index bounds, keep v1 readable) is recorded for **B2**, not implemented in B1.

Languages: Indonesian is the default at `/`. English lives at `/en`. Internally all pages are `app/[lang]/...`. Rewrites map unprefixed public routes to `/id/...`; `/id` is redirected so it is never shown. Copy lives in `lib/copy.ts`. Do not hard-code user-facing English or Indonesian in page components.

### Recorded at Phase 2 setup

- Auth: email + password via Supabase Auth. No extra OAuth providers.
- Email verification follows the Supabase project setting. If confirmation is on, register shows a generic “if this address can be used” message and `/auth/callback` exchanges the code.
- SSR: `@supabase/ssr` with `getAll`/`setAll` cookies. `middleware.ts` refreshes the session with `getUser()`. Identity on the server uses `getUser()`, never cookie-only `getSession()`.
- Mutations: Server Actions. Session identity is derived from the authenticated user.
- Username: `^[a-z0-9_]{3,20}$`, stored lowercase, unique on `lower(username)`. Reserved names are blocked in Zod and in a table check. A requested username that is already taken is rejected; the trigger does not rename the member. Fallback unique usernames are generated only when metadata has no valid username.
- Profile insert: `security definer` trigger on `auth.users`. Clients cannot insert profile rows.
- Public profile reads use a cookie-less anon client so Cache Components can prerender public pages. Session identity stays on the SSR cookie client. The header member state streams behind `Suspense`. Login, register, and member routes set `instant = false`.
- Role: `member` | `admin`. Members cannot update `role` (column not granted). Admin is assigned with trusted SQL.
- Avatar uploads are deferred; `avatar_url` exists but has no UI yet.
- `.env.example` placeholders: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Service role stays server-only and is unused by the app.

### Recorded at Phase 3 setup

- Creations table with RLS: public select `status = 'published'` only; owner select/update/delete own rows; insert as self with `status = draft`; members cannot set `hidden` or change `user_id` / `type`. Admins may select all rows. Hide/restore is `admin_set_creation_status` (Phase 5).
- Explore: newest `published_at` first, optional `?type=` filter, 12 per page. Public profile lists that member's published works.
- Studio: `/create` starts a draft; `/create/[id]` edits, previews, publishes, or deletes. Public URL is `/creation/[id]`. Community migration turns this studio into the Pixel Art Playground; legacy type forms remain in code until explicitly removed.
- Visual payload v1 as recorded in PRODUCT-SPEC (legacy). Cover uploads were deferred for visual SVG; pixel type uses Storage.
- Payload limits as recorded in PRODUCT-SPEC. Validation is Zod `.strict()` plus a 32KB JSON check constraint for non-pixel types.

### Recorded at Phase 4 setup

- One public SVG canvas at `/space`. No realtime. Members add text or shapes; only the owner can change `position_x` / `position_y` or delete. `status` cannot be set to `hidden` from the client.
- Coordinates and payload limits as recorded in PRODUCT-SPEC. Content JSON is versioned and fill-allowlisted. SVG is generated from primitives.
- RLS: public select `status = 'active'`; owner select/update/delete own; insert as self with `active`. Admins may select all rows. Hide/restore uses `admin_set_space_element_status`.
- This SVG board is **legacy**. Do not extend it as the community-MVP center.

### Recorded at Phase 5 setup

- Comments: public select only `published` comments on `published` creations. Insert as self on published creations. Owner delete. Owner update of `content` is a B4 additive (Artwork Conversation edit). Admin hide via `admin_set_comment_status`. One-level `parent_id` is a B4 additive; do not rewrite the Phase 5 migration. Limits as recorded in PRODUCT-SPEC.
- Reactions: one type `appreciate`, unique `(user_id, creation_id)`. Public select on published creations; owner insert/delete. Toggle in the app.
- Reports: target `creation` | `comment` | `space_element`. Insert as self with `pending`. Reporter select own; admin select all. Target existence is validated on insert. Duplicate pending reports are unique-indexed and treated as success.
- Admin dashboard `/admin` is server-gated (`role = 'admin'`). Non-admins get not-found. Mutations go through `admin_set_*` functions; members have no grant to change report or hide status columns.
- Fork insert may set `forked_from`; a trigger rejects sources that are not published. Members still cannot set creation status to `hidden`.

### Recorded at pixel-canvas Phase 1 prototype

- `/space` once rendered a local HTML Canvas 2D board when `NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE=true`. No new tables, no stroke writes, no realtime. `space_elements` and `SpaceBoard` stay in the tree.
- Renderer: one 512 × 512 `ImageData` buffer, nearest-neighbor blit, Pointer Events, Bresenham paths. Constants live in `lib/pixel.ts`.
- That prototype was **engine reuse for the Playground**, not proof that Common Space is the product center. Do not implement the old PIXEL-CANVAS-MIGRATION-PLAN Phase 2 (fixed 512 shared tiles) as the next architecture.

### Recorded at B5

- `/space` is a later-canvas page. PixelBoard is not mounted there. `SpaceBoard` stays archived below the later-canvas copy. The prototype flag is ignored.
