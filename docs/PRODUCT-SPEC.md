# PXLB — Product Specification

**Document:** PRODUCT-SPEC.md  
**Status:** Pixel Art Community baseline (supersedes the dual-mode “individual + Common Space” MVP)  
**Product:** PXLB (formerly THE COMMONS)  
**Positioning:** A creative playground for pixel art.  
**Tagline:** Create. Explore. Share. / Buat. Jelajah. Bagikan.  
**Portfolio owner:** Agung Cahyo  
**Product type:** Pixel art community  
**Canonical domain:** https://pxlb.fun  
**Canonical concept:** Creators make, showcase, discover, and appreciate pixel art. Common Space is a later, secondary giant shared canvas — not the product center.

This document is the product source of truth. [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md) covers architecture. [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) covers how the existing app migrates. Visual identity lives in [PIXEL-ART-DESIGN-SYSTEM.md](PIXEL-ART-DESIGN-SYSTEM.md).

The application already exists (original MVP Phases 0–5 plus a local pixel prototype). This spec describes the **target product**, not a greenfield rebuild.

---

## 1. Product vision

PXLB is a creative playground for pixel art. Members draw in a personal Pixel Art Playground, publish finished works, and meet other people’s art through a gallery. One-way follows may help members find new work from creators they care about; the product still rejects public follower counts, rankings, and algorithmic feeds.

The product owner provides the space. Members determine what the gallery becomes.

**Core loop:** make a pixel artwork → save a draft → keep developing it in the Playground → preview → publish → others find it, comment, and appreciate it → return to the same work or make another.

PXLB is not an image dump. Making, saving, developing, and showing work is one continuous experience.

Common Space remains in the product as a later layer: one giant, practically unbounded collaborative pixel world. It is not the hero of the landing page, **not a launch requirement** for the community MVP, and not the reason people first join. Tile storage, world coordinates, edit conflicts, and realtime must not delay the community loop.

### Product positioning

PXLB is not intended to be:

- A conventional social network.
- A discussion forum.
- A traditional writing or mixed-media portfolio.
- A professional illustration or animation suite.
- A real-time multiplayer design tool in the community MVP.
- An r/place clone as the entire product.

It is a **pixel art community** with two unequal layers:

1. **Community works (primary, community MVP):** Playground → save draft → preview → publish → Explore / profile → comments and appreciation. Members can reopen, edit, unpublish, or delete their own works.
2. **Common Space (vision only until a later phase):** one sparse, giant pixel canvas. Explicitly **out of the community MVP**. Community launch does not wait on it.

### What changed from the previous spec

Do not continue these retired assumptions:

- Personal Creation and Common Space as equal product modes.
- Creation types `text`, `visual`, `idea`, and `story` as the primary Create path.
- Common Space as a text-and-shape SVG board at the center of the product.
- “THE COMMONS is one shared pixel canvas” (the pixel-canvas addendum’s previous framing; brand is now PXLB).

Keep working product surface that already exists: authentication, profiles, Explore, comments, appreciation, reports, admin, bilingual public browse.

---

## 2. Product decisions

These decisions are the current source of truth:

| Decision | Baseline |
|---|---|
| Brand relationship | Independent brand (PXLB) within Agung Cahyo's portfolio — not an expansion of “Pixel Base/Lab” |
| Product name | PXLB |
| Experience | Pixel art community first; giant Common Space later |
| Create | In-app Pixel Art Playground at `/create` (not a separate app) |
| Account model | Account required to save, publish, comment, appreciate, fork, or draw on Common Space |
| Public discovery | Public visitors can view published works and browse Common Space |
| Hosting | Vercel |
| Application | Next.js App Router + TypeScript |
| Backend services | Supabase |
| Canonical domain | `https://pxlb.fun` (DNS/Vercel cutover required; legacy `commons.agungcahyo.my.id` redirects until retired) |
| Community MVP collaboration | Asynchronous publish and gallery; not live multiplayer editing |
| Common Space collaboration | Later phase; sparse giant canvas; realtime only after persistence works |
| Languages | Indonesian (default, unprefixed URLs) and English (`/en`) |
| Visual identity | Colorful pixel-art UI on a light/white Paper background; see PIXEL-ART-DESIGN-SYSTEM.md |
| Tagline | Create. Explore. Share. / Buat. Jelajah. Bagikan. |

---

## 3. Target users

### Primary

People who want to make and show pixel art without professional tools: hobbyists, beginners, and anyone who enjoys small colorful drawings.

### Secondary

Visitors who browse, comment, and appreciate published work. Later: people who want to leave a mark on the giant Common Space canvas.

### User needs

- A simple pixel editor that works in the browser, including on a phone.
- A place to publish work without chasing followers.
- A gallery that treats artwork as the visual focus.
- Comments and a single appreciation, not a popularity contest.
- Later: a meaningful way to contribute to one giant shared artwork.

---

## 4. Product principles

1. **Contribution over popularity.** Avoid likes-as-ranking, public follower counts, or leaderboards as the central experience. Optional one-way follow is a path to more work, not a popularity score.
2. **Low-friction creation.** A first published pixel artwork should be achievable quickly.
3. **Artwork is the hero.** Interface color is deliberate; it must not compete with the canvas.
4. **Attribution and respect.** Works and later Common Space marks stay attributed to their creators.
5. **Safety by design.** Public content needs reporting, moderation, rate limits, and clear ownership.
6. **Mobile-first.** Viewing, drawing, and publishing must work on mobile.
7. **Scope discipline.** Do not add features outside the current community MVP without explicit product approval.
8. **Migrate, do not rebuild.** Change the existing app in phases. Do not scaffold a new product.
9. **Studio, not a gallery-only site.** Saving source so a work can be reopened and continued is as important as showing a PNG.

The previous principle “visible collective progress as the center” is retired. Collective progress belongs to Common Space when that layer ships. It is not a community-MVP principle.

---

## 5. Core concepts and terminology

- **Member:** an authenticated user with a profile.
- **Pixel Art Playground:** the in-app personal pixel editor at `/create` and `/create/[id]`.
- **Editor source:** the grid, palette, size, and pixel structure used to reopen and keep editing a work. Not the public PNG.
- **Rendered image:** a PNG generated from source for thumbnails, Explore, profile, detail, and social previews.
- **Creation:** an individual work. The primary type for new work is `pixel`. Status is `draft` or `published` for the owner (plus admin `hidden`).
- **Explore:** the public gallery of published creations.
- **Appreciation:** one fixed reaction type per member per creation; not a ranking.
- **Fork:** a new personal draft copied from a published creation, retaining `forked_from`.
- **Common Space:** one later shared giant pixel world. Not the product center.
- **Legacy creation:** an existing `text`, `visual`, `idea`, or `story` work. Kept in the database and still viewable; not the primary Create path.
- **Report:** a member-submitted safety/moderation report.

---

## 6. MVP capabilities (community)

The community MVP is satisfied when a member can make a pixel artwork, save it as an editable draft, preview it, publish it, reopen it later, and other people can find and appreciate the published work — using the auth, profile, Explore, comment, appreciation, and admin systems that already exist.

Common Space (sparse tiles, world viewport, conflicts, moderation of strokes, realtime) is **out of this MVP** and is **not a launch gate**.

### 6.1 Authentication and profile

Already implemented; keep.

Required:

- Email-based registration and login using Supabase Auth.
- Logout.
- Unique username.
- Display name.
- Optional short bio.
- Optional avatar (upload UI still deferred unless a later phase adds it).
- Public profile page.
- Profile editing by the profile owner.

Rules:

- A member must be authenticated to create, comment, react, fork, or (later) draw on Common Space.
- Public visitors may view public profiles and published creations.
- Username uniqueness must be enforced in the database, not only in the UI.
- Never expose private authentication data.

### 6.2 Pixel Art Playground (Create)

Create is the Playground. It is not a separate product and not a type picker for writing.

Canonical publish loop:

**Create → Save draft → Preview → Publish → Explore / profile**

Required:

- Open `/create` while authenticated.
- Start a `pixel` draft (or open an existing own draft or published work).
- Choose a canvas **resolution** before the editor opens (presets plus custom width × height). Size is the artwork grid, not the on-screen display; a 16 × 16 work still zooms while drawing.
- Draw on a personal canvas of that chosen size (8–512 per side, max area 512 × 512). Size is fixed after the draft is created.
- Pencil, eraser, custom color picker (free color, HEX, recent, favorites; curated swatches as shortcuts), pan, local undo/redo. Zoom is pinch (mobile) and scroll (desktop); Fit lives in a overflow menu.
- Studio chrome is header + icon toolbar + compact palette. The canvas is the largest surface, especially on a phone.
- **Autosave draft** — persist **editor source** so the owner can leave and continue later. Generate (or refresh) the rendered PNG at the same time. Publish remains an explicit action.
- **Preview** before publishing (how the public work will look, including the thumbnail).
- **Publish** — `status = published`; work appears on Explore and the public profile.
- **Edit** own draft or published pixel work in the Playground, loaded from **source**, not by sampling the PNG.
- **Unpublish** without deleting — owner sets `status = draft`; the work leaves Explore and the public profile; source and PNG stay; the owner can keep editing.
- **Delete** own creation (source, PNG, and row).
- Automatic thumbnail from the rendered PNG.
- Public detail page for published creations only.

Tools deferred until explicitly approved: eyedropper, fill bucket, layers, animation, image import.

Playground rules:

- Only the owner can edit their Playground canvas.
- Empty pixels use Paper `#FFFDF7`. Eraser restores Paper.
- Drawing color is free: a custom color picker (native picker + HEX), recent colors, and favorite colors. Curated swatches remain shortcuts. Colors used in a work are stored in that work’s source palette. Changing the active color does not rewrite pixels already drawn.
- Pixels stay square; nearest-neighbor scaling; no anti-aliased freehand brush.
- Auth is required to persist Playground work. The old ungated `/space` PixelBoard prototype is retired (B5).
- Every saved work has two artifacts: **editor source** (reopen/edit) and **rendered PNG** (display). A PNG alone is not enough to continue a work.

### 6.3 Explore and profiles

Required:

- Public gallery of published creations.
- Default emphasis on `pixel` works. Legacy types may remain filterable so existing rows stay reachable.
- Sort newest first.
- Pagination or cursor-based loading.
- Creation cards led by the automatic PNG thumbnail; title, creator, and date are secondary. Do not make appreciation counts the visual hierarchy. Thumbnails are display-only; editing still uses editor source.
- Detail route `/creation/[id]`.
- Public profile lists that member’s published works.

Only published and non-hidden content may appear publicly.

### 6.4 Community interaction (Artwork Conversation)

Community around a work is a **small conversation beside the art**, not a blog comment column, news thread, or old forum. The artwork stays the hero. Conversation grows underneath it.

**Artwork Conversation (B4).** **Default recorded:**

- Under the artwork: Appreciate (♥, count) and Share (copy public URL; `navigator.share` when available). Then a thin separator. Then **Conversation (n)**. Then the thread. Then a collapsed composer.
- Do not open with a large labeled textarea and Submit. Idle composer is one quiet line: ID *“Bagaimana menurutmu tentang karya ini?”* / EN *“What do you think about this artwork?”* Clicking it opens avatar mark, textarea, send, and a visible character count. On a phone the composer must stay usable without filling the viewport.
- **Appreciate ≠ comment ≠ reply.** Hearts are for liking the work. Comments are opinion or a question to the maker. Replies answer one comment. Members must not have to comment in order to appreciate.
- Appreciation remains one `appreciate` reaction per member per creation (toggle). Grass for that control. Count sits with the artwork, not as an Explore ranking.
- Replies are **one level only**. A reply points at a root comment on the same work. You cannot reply to a reply. No unbounded nested threads. No “popular comment” ranking.
- Identity is **@username** plus a small pixel mark (initials or Commons mark). Optional photo avatars stay deferred.
- Each root comment: mark, @username, relative time, body, Reply, report. Owner: edit and delete. Replies indent once (`↳ @user`). Thin separators and space — not a pixel-frame card per comment.
- Empty state is friendly, not a forum void: ID *“Belum ada percakapan. Sampaikan kesanmu pada karyanya.”* / EN *“No conversation yet. Leave a note about the artwork.”*
- New comments appear without a full page reload. Optimistic UI: the member sees their note immediately; the server remains authoritative. Load earlier / load more (latest slice first, newest at the bottom). Do not dump hundreds of comments. Do not add realtime or a notification system in this phase.
- Remix (fork of editor source, then PNG) sits with Appreciate / Share on the detail engagement row. Lineage and remix strips stay visible both ways.
- Per-comment likes, nested threads beyond one level, comment ranking, and complex notifications are **out**.

Keep working: reports on creations and comments, admin hide/restore, rate limits, unique appreciate, one-way follow without public counts, Following filter on Explore, responses inbox.

Avoid:

- Public follower counts or follow-as-score.
- Direct messages.
- Public popularity rankings.
- Complex notification systems.
- Points, levels, badges, or leaderboards.
- Forum chrome (always-open composer, deep threads, card-per-comment).

### 6.5 Moderation

Already implemented for creations, comments, and legacy space elements; keep.

Required:

- Members can report creations and comments. Reporting Common Space content returns when that layer ships; the existing `space_element` report target stays in the schema.
- Admin can review reports.
- Admin can hide content.
- Hidden content must not be publicly visible.
- Admin actions must be protected server-side.
- Rate-limit contribution and reporting endpoints to reduce spam.

Moderation states:

- Report: `pending`, `reviewed`, `resolved`.
- Creation: `draft`, `published`, `hidden`. Owner unpublish uses `draft`. Admin moderation uses `hidden`.
- Legacy space element: `active`, `hidden`.

Appeals stay manual with the project owner; there is no in-app appeal form.

### 6.6 Common Space (vision; not community MVP; not a launch requirement)

Common Space is a **later** product layer: people make giant pixel art on one shared canvas that can grow without a small fixed world size.

It is **not** part of the community MVP. Do not let tile storage, a world viewport, coordinate systems, edit conflicts, stroke moderation, or realtime delay B1–B5 or community launch (B7).

It is also **not**:

- The landing hero or equal primary nav item.
- A 512 × 512 shared replica of the Playground.
- The SVG text/shape board as the long-term model.
- A gate in the community launch checklist.

When a dedicated later phase ships it:

- Public visitors can view, zoom, and pan.
- Authenticated members can draw and erase.
- The world is a sparse tile map: tiles exist only where someone has drawn.
- “Unlimited” means grow-on-demand with a documented practical bound so abuse has a ceiling.
- Any authenticated member may draw anywhere (no personal territories by default).
- Server is authoritative; overlapping pixels use last accepted server commit.
- Realtime follows reliable persistence; it is not the first Common Space milestone.

Until that phase: keep the `/space` route as a secondary page (placeholder, prototype, or quiet link). Do not add `canvas_tiles`, stroke RPCs, or realtime. Do not drop `space_elements`, `SpaceBoard`, or old migrations.

---

## 7. Site map and routes

Routes already exist. This table restates **roles**, not a new App Router tree.

| Route | Purpose | Access |
|---|---|---|
| `/` | Landing: pixel art community; Create and Explore CTAs; Common Space is secondary | Public |
| `/explore` | Public gallery, pixel-first | Public |
| `/create` | Pixel Art Playground — new draft and own-work list | Authenticated |
| `/create/[id]` | Pixel Art Playground — edit one work | Authenticated owner |
| `/creation/[id]` | Creation detail, comments, appreciation | Public if published |
| `/u/[username]` | Member profile and published works | Public |
| `/space` | Common Space (secondary; later giant canvas) | Public read; member write when that layer ships |
| `/login` | Login | Public |
| `/register` | Registration | Public |
| `/dashboard` | Member activity and shortcuts | Authenticated |
| `/settings` | Profile settings | Authenticated |
| `/admin` | Moderation dashboard | Admin only |

English uses the same paths under `/en`. Indonesian is the default and stays at the root. The language switcher lives in the main navigation.

**Primary navigation:** Explore, Create, Profile (when signed in).  
**Secondary:** Common Space — present in the sitemap, not an equal hero next to Create and Explore.

---

## 8. Main user journeys

### First-time visitor

1. Opens the landing page.
2. Understands PXLB as a pixel art community.
3. Browses Explore and opens a published work.
4. Registers in order to make or appreciate work.

### New member

1. Registers and verifies email if configured.
2. Chooses a unique username.
3. Completes basic profile.
4. Opens the Playground and draws a first pixel artwork.
5. Saves a draft, previews, then publishes. The work appears on Explore and their public profile. They can reopen it later from editor source.

### Individual pixel creation

1. Opens `/create` and starts or continues a work.
2. Draws in the Playground.
3. Saves a draft (source + thumbnail PNG). Can leave and reopen the same draft.
4. Previews.
5. Publishes. The work appears on Explore and the public profile.
6. Can return to `/create/[id]`, keep developing, and publish again.
7. Can unpublish (back to draft, not deleted) or delete.

### Appreciation

1. Opens a published work.
2. Signs in if needed.
3. Comments and/or appreciates.
4. Optionally forks into a new Playground draft.

### Common Space (later; not on the community launch path)

Do not treat this journey as required for the first public community release.

1. Opens `/space`.
2. Pans and zooms the giant canvas.
3. Signs in if they want to draw.
4. Draws; the stroke persists; others see it after the documented sync model.

### Moderation

1. Member reports content.
2. Report is stored as pending.
3. Admin reviews it.
4. Admin resolves the report and, if necessary, hides the target.
5. Public queries exclude hidden content.

---

## 9. Experience and design direction

**Direction:** colorful, playful pixel-art community on a light Paper surface. Full tokens, type, canvas, and page notes live in [PIXEL-ART-DESIGN-SYSTEM.md](PIXEL-ART-DESIGN-SYSTEM.md).

Principles:

- Paper/Soft surfaces and Ink text; saturated color for controls, chips, and small accents.
- Artwork is the visual focus. UI must not become a rainbow that competes with drawings.
- Crisp borders and clear geometry. Pixel motifs only as small accents.
- Pixel fonts only for short decorative labels — never body copy, forms, or essential instructions.
- Migrate headings from editorial serif (Cormorant) toward a friendly bold sans **gradually**.
- Light-first. Dark `prefers-color-scheme` is not a community-MVP launch requirement.
- Responsive navigation; useful empty, loading, success, and error states.
- Accessible contrast, keyboard focus, labels, and reduced-motion support.

Suggested primary navigation:

- Explore
- Create
- Profile

Common Space is secondary navigation or a quieter landing mention, not a co-hero.

---

## 10. Non-functional requirements

- TypeScript strictness should remain enabled.
- Validate user input on server boundaries.
- Enforce authorization in database policies and server operations.
- Use pagination for public feeds.
- Pixel assets use a defined Storage path with MIME and size limits — not arbitrary user uploads.
- Provide useful error messages without leaking secrets.
- Avoid unnecessary realtime subscriptions in the community MVP.
- Add basic analytics only with privacy-conscious configuration.
- Include metadata and social sharing previews for public creation pages.
- Ensure core flows work on mobile browsers.

---

## 11. Out of scope

Explicitly excluded from the community MVP:

- Direct messages.
- Voice or video calls.
- Public follower counts, follow rankings, or algorithmic follow feeds (one-way follow + chronological Following filter on Explore are in scope).
- Real-time multiplayer canvas editing.
- The giant/unlimited Common Space world, tile persistence, world viewport, stroke conflict handling, and canvas realtime. These stay vision-only until a post-launch phase. Community launch must not wait on them.
- Multiple rooms/worlds.
- Professional image editor, layers, animation timeline.
- Eyedropper and fill bucket unless separately approved.
- AI generation.
- Mobile native app.
- Complex notification center.
- Gamification and leaderboards.
- Monetization and payments.
- Writing-first Create (`text` / `idea` / `story` as the main path).
- Replacing the app from scratch.

Legacy writing and SVG visual types stay in the schema so existing rows are not destroyed. They are hidden from the primary Create UX.

---

## 12. Success metrics

Initial experiment targets (not growth forecasts):

- 30 registered members.
- 15 members publish at least one pixel artwork.
- 30 published pixel creations.
- Meaningful comments and appreciations on published works.
- At least 20% returning members who create or appreciate again during the initial measurement window.

Primary product metric:  
**Returning creators** — members who return and publish or substantially edit another pixel artwork.

Common Space contribution counts are **not** a community-MVP release metric and **not** a launch gate.

Track activation and retention without turning metrics into public popularity rankings.

---

## 13. Product decisions requiring confirmation before implementation

The following are implementation details that should be decided deliberately. **Recorded defaults** below are the approved starting point for the community migration. Do not silently invent behavior when a decision affects security, data model, or UX.

- Email verification requirement and allowed auth providers. **Default recorded:** email + password only; confirmation follows the Supabase project setting.
- Whether public visitors can browse without an account (baseline: yes). **Recorded:** yes.
- Primary creation type. **Default recorded:** new type `pixel`. Add it with a new migration; do not rewrite old migrations. Legacy types remain in the check constraint until a later cleanup is explicitly approved.
- Playground canvas. **Default recorded:** member picks resolution before drawing. Presets: Icon 16×16, Small 32×32, Sprite 64×64, Medium 128×128, Large 256×256, Poster 512×512, plus custom width×height. Each side 8–512 integers; area ≤ 512×512. Size is artwork resolution, not display size; locked after the draft exists. Paper `#FFFDF7`; eraser restores Paper; drawing color is any `#RRGGBB` stored in the document palette (curated swatches are shortcuts); zoom Fit plus 1 / 2 / 4 / 8 / 12 / 16 / 24 / 32 / 48 (pinch/scroll; extra menu for Fit); grid from 8×; Bresenham paths; HTML Canvas 2D; nearest-neighbor. `width` / `height` in source are the document size — do not assume 512. Matches `lib/pixel.ts`.
- Playground studio chrome (B2.2). **Default recorded:** header (back, title, save status, Preview, Publish); icon toolbar (pencil, eraser, pan, undo, redo); one-row scrollable **document** palette plus a Palette control that opens a **custom color picker** (free color, HEX input, recent, favorites). No dominant Save if autosave is on. Artwork must occupy more screen than the controls. Public detail, preview, Explore, and profile **present** pixel works by CSS nearest-neighbor upscaling (`object-fit: contain`, `image-rendering: pixelated`) inside a shared stage — display size is independent of PNG intrinsic resolution. Keep original aspect; no crop. Thumbnails sit in a uniform frame.
- Playground colors. **Default recorded:** `palette[0]` is Paper. Further entries are `#RRGGBB` used in that work, append-only, max 64. Indices never remap when the active color changes. Recent (12) and favorites (24) live in the browser only. Server accepts any valid hex in the document palette; it does not restrict drawing to the UI swatch list.
- Pixel persistence (two artifacts). **Default recorded:** every `pixel` creation stores **editor source** and a **rendered PNG**. They are not interchangeable. The Playground always reopens from source. PNG is display-only (thumbnail, Explore, profile, detail, OG). `creations.content` holds versioned headers (`version`, `width`, `height`, palette, encoding, source object key). Source pixels are palette indices with RLE compression in a Storage object (`…/{id}/source.json`). The 32KB JSONB cap stays for legacy types and for this header; it is not the pixel grid store. On every successful save and on publish, the server (or a validated client blob checked on the server) regenerates an indexed-color PNG from source into `…/{id}/cover.png`, referenced by `cover_url`. This is a **narrow exception** to “no generic file uploads,” not an open media library. Draft source and draft PNG are not publicly listable; published covers may be read publicly. Source objects stay owner-readable (and admin); they are not the public gallery asset.
- Editor source validation (B2, not B1). **Default recorded:** format `version` is an integer; current version is `1`. On load, reject unsupported versions with a clear error; **keep v1 readable** after later format changes (additive fields only, or an explicit migrator). Encoded source ≤ **512 KiB**. RLE must decode to exactly `width * height` pixels from the source document (no truncate, no overrun, no assumed 512). Every index must be in `[0, palette.length)`. Palette entries are `#RRGGBB`; `palette[0]` is Paper; max 64 colors. `width` / `height` must be integers in 8–512 with area ≤ 512×512, and must match the creation header. Integrity on load: verify version, size ceiling, decoded length, and index bounds before painting the canvas. Do not open a work from PNG if source fails these checks.
- Unpublish. **Default recorded:** owner-only action sets `status = draft`. Does not delete the row, source, PNG, comments, or appreciations. Public queries still require `status = published`, so the work leaves Explore, public profile, and public detail. `published_at` remains the last publish time. Re-publish sets `status = published` and updates `published_at`. Distinct from admin `hidden`. Members still cannot set `hidden`.
- Fork of pixel work. **Default recorded:** copies **editor source** (then regenerates PNG) into a new owner draft with `forked_from` set. Do not fork from PNG alone. Source creation must be published.
- Common Space world. **Default recorded (phase B6 only, after community launch is allowed to proceed without it):** sparse tiles; tiles exist only where drawn; camera/viewport loads nearby tiles; not a single 512 world. “Unlimited” is grow-on-demand with a practical anti-abuse extent of **±32,768 pixels** on each axis (subject to revision before that phase). Tile size 32 × 32 remains the storage chunk. Any authenticated member may draw anywhere. Last accepted server commit wins. Realtime after persistence. Rate limits, max pixels per stroke, and action retention are specified in that later phase — not now. **Not a community-MVP task.**
- Common Space during the community MVP. **Default recorded:** do not add tile tables, stroke RPCs, or realtime. Do not treat `/space` as a launch gate. Keep the route as a secondary later-canvas page. Do not drop `space_elements` or `SpaceBoard`. Playground owns PixelBoard; `NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE` no longer mounts a drawing product on `/space`.
- Reactions. **Default recorded:** one type `appreciate`, unique per member and creation. Count is shown on the work (Artwork Conversation cluster); Explore is not sorted by it. Not a substitute for a comment. No per-comment likes in B4.
- Artwork Conversation (B4). **Default recorded:** conversation under the artwork, not a blog/forum column. Collapsed composer until focused. One-level replies only (`parent_id` on a root comment; cannot nest further). Owner edit and delete; report remains. Optimistic post + load more; no realtime and no notification system in B4. Photo avatars stay deferred; show @username plus a pixel mark. B3 gallery/detail presentation stays as recorded.
- Legacy Create types. **Default recorded:** keep rows and editors in the codebase; hide `text` / `visual` / `idea` / `story` from the primary new-draft UX. Explore may still filter them.
- Visual SVG payload (legacy). **Default recorded (unchanged):** versioned JSON `{ version: 1, elements: [...] }` with `rect`, `circle`, and `text`; coordinates 0–1000; fill allowlist; max 24 elements. Not the Playground.
- Legacy Common Space SVG (unchanged until replaced). **Default recorded:** viewBox `0 0 1000 1000`; fill-only allowlist; shapes `rectangle` and `circle`; text 1–120 characters; max 40 active elements per member, 8 inserts per hour, 800 active on the canvas. Hidden is admin-only.
- Text and community limits (unchanged). **Default recorded:** title 80; text body 8000; idea body 2000 / context 1000; story body 12000 / continuation prompt 280; visual text 80; JSON payload 32KB for non-pixel types; 100 creations per member. Comments 1–1000 characters, 12 per hour, 100 published per creation. Conversation loads a latest slice (20 roots) with load-earlier; newest visible at the bottom. Reports: reasons `spam` / `harassment` / `illegal` / `off_topic` / `other`; details optional 500 characters; 8 per hour; one pending report per member and target.
- Admin account provisioning. **Default recorded:** trusted SQL update on `profiles.role`; members cannot self-assign admin. Hide/restore of creations, comments, and legacy space elements runs through security definer functions. Restore: creation returns to `published` if it has `published_at`, otherwise `draft`; comments to `published`; space elements to `active`.
- Theme. **Default recorded:** Classic Pixel Adventure (PIXEL-ART-DESIGN-SYSTEM.md). Paper `#FFFDF7`, Ink `#282B35`, Sky `#59BCEB` (identity), Grass `#45A849` (secondary), Brick `#E94B3C` (CTA), Coin `#FFD447` (badges/appreciate), Earth `#936037` (borders). Pixel font for titles and kickers; sans for body. Square frames, hard block shadows. Not a Mario clone; no Nintendo IP. Dark mode is not required. The Playground stays a comfortable studio, not a minigame.
- Data retention and content deletion policy. Still to be written before public launch; do not invent a silent purge.

Do not silently invent product behavior when one of these decisions materially affects security, data model, or UX. Propose a default and document it for approval.
