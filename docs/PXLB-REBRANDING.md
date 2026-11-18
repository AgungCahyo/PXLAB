# PXLB Rebranding Report

**Date:** 2026-11-18  
**From:** THE COMMONS  
**To:** PXLB  
**Canonical domain (code):** `https://pxlb.fun`  
**Legacy domain:** `https://commons.agungcahyo.my.id`  
**DNS status:** Not verified in this change set. Do not treat `pxlb.fun` as live until DNS + Vercel assignment succeed.

---

## 1. Audit — branding surfaces found

### Public identity & SEO (changed in app)

| Area | Previous | Action |
| --- | --- | --- |
| `lib/site.ts` | `SITE_NAME = "THE COMMONS"`, `SITE_URL = https://commons.agungcahyo.my.id` | → PXLB / `https://pxlb.fun` + `LEGACY_SITE_URL` |
| `lib/copy.ts` | Tagline “Made together.” / “Dibuat bersama.”; short “Public pixel art.” | → Create. Explore. Share. + creative playground positioning |
| `components/layout/CommonsMark.tsx` | Wordmark companion SVG | Renamed conceptually to `PxlbMark` (alias kept) |
| `components/layout/SiteHeader.tsx` | Brand mark + `SITE_NAME` | Uses `PxlbMark` |
| `app/icon.tsx` | Dark purple vial grid | Four Classic Pixel Adventure blocks on Paper |
| `app/[lang]/layout.tsx` | `metadataBase` / titles via `SITE_*` | Inherits new constants |
| `lib/meta.ts` | OG / Twitter / canonical via `SITE_URL` | Inherits new constants |
| Landing / footer / profile meta | Via `SITE_NAME` / copy | Inherits |
| `VisualEditor` watermark | `"THE COMMONS"` | → `"PXLB"` |
| Reserved usernames | `commons`, `thecommons` | Kept + added `pxlb` |
| `package.json` name | `the-commons` | → `pxlb` |
| README / PRODUCT-SPEC / TECHNICAL-SPEC / design system / implementation plan headers | THE COMMONS | Updated to PXLB |

### Intentionally unchanged (data / product safety)

| Surface | Why kept |
| --- | --- |
| `localStorage` keys `commons:creation-meta:*`, `commons:creation-source:*` | Draft recovery; renaming would orphan in-progress work |
| IndexedDB `commons-pixel-drafts` | Same — client draft store name is not user-facing brand |
| Feature name **Common Space** | Product feature, not the company brand |
| Creation URL shape `/creation/:id`, `/create/:id`, `/u/:username` | No unsafe public URL migration |
| Database schema, RLS, user IDs, autosave/publish paths | Out of rebrand scope |
| Historical audit docs under `docs/*AUDIT*`, blueprints titled THE COMMONS | Archival; product identity is PXLB going forward |

### Color memory keys (migrated safely)

- New: `pxlb.pixel.recent-colors`, `pxlb.pixel.favorite-colors`
- Legacy dual-read: `the-commons.pixel.*` → copied into new keys on first read

### Domain / auth / deploy (manual — not claimed done)

| System | Finding |
| --- | --- |
| Vercel | No project domain file in repo; domains must be attached in Vercel UI |
| Supabase Auth | Callbacks built as `${NEXT_PUBLIC_SITE_URL ?? SITE_URL}/auth/callback` in `features/auth/actions.ts` |
| Env | `.env.example` documents production canonical `https://pxlb.fun` |
| robots / sitemap / webmanifest | No dedicated files found; metadata comes from Next `metadata` / `pageMeta` |
| Email templates | No branded HTML email templates in repo |

### Risks

1. **Auth breaks** if production `NEXT_PUBLIC_SITE_URL` or Supabase redirect allow-list still only list the legacy host after traffic moves to `pxlb.fun`.
2. **OG previews** keep showing old brand until the new deployment is the one crawlers hit (and cache expires).
3. **Draft keys** must stay as `commons:*` unless a one-time client migrator is added later.
4. **DNS not verified here** — code points at `pxlb.fun` before the hostname may resolve.

---

## 2. Files changed (this cutover)

- `lib/site.ts`
- `lib/copy.ts`
- `lib/meta.ts` (unchanged API; consumes new site constants)
- `lib/pixel-color-memory.ts`
- `lib/validations/profile.ts`
- `lib/auth/permissions.ts` (comment only)
- `components/layout/PxlbMark.tsx` (new)
- `components/layout/CommonsMark.tsx` (re-export alias)
- `components/layout/SiteHeader.tsx`
- `components/creations/VisualEditor.tsx`
- `app/icon.tsx`
- `package.json`
- `.env.example`
- `README.md`
- `docs/PRODUCT-SPEC.md`
- `docs/TECHNICAL-SPEC.md`
- `docs/PIXEL-ART-DESIGN-SYSTEM.md`
- `docs/IMPLEMENTATION-PLAN.md`
- `docs/PXLB-REBRANDING.md` (this file)

---

## 3. New brand identity applied

| Token | Value |
| --- | --- |
| Brand name | **PXLB** (standalone; not an acronym expansion) |
| Positioning | A creative playground for pixel art. |
| Tagline (EN) | Create. Explore. Share. |
| Tagline (ID) | Buat. Jelajah. Bagikan. |
| Canonical URL | `https://pxlb.fun` |
| Mark | Four pixel blocks (sky / grass / coin / brick) |
| Favicon | Same four blocks on Paper `#fffdf7` |
| Visual system | Existing Classic Pixel Adventure / Paper UI retained |

---

## 4. Manual domain configuration (required)

Do **not** remove the legacy domain until the new one is tested.

1. Register / point DNS for `pxlb.fun` (and preferably `www.pxlb.fun`) to Vercel per Vercel’s DNS instructions.
2. In the Vercel project: **Settings → Domains** → add `pxlb.fun` (and `www` if used).
3. Keep `commons.agungcahyo.my.id` attached.
4. Configure the legacy host to **301 redirect** to `https://pxlb.fun` (same path) once `pxlb.fun` serves the app correctly.
5. Set production env `NEXT_PUBLIC_SITE_URL=https://pxlb.fun` on Vercel (this drives auth email links and should match canonical).
6. Redeploy after env + domain changes.

DNS readiness was **not** verified in this session.

---

## 5. Manual Supabase configuration (required)

In Supabase → Authentication → URL configuration:

1. **Site URL:** `https://pxlb.fun`
2. **Redirect URLs** (add, do not drop legacy until cutover is proven):
   - `https://pxlb.fun/auth/callback`
   - `https://pxlb.fun/**` (if you use wildcard patterns)
   - `https://commons.agungcahyo.my.id/auth/callback` (keep temporarily)
   - `http://localhost:3000/auth/callback` (local)
3. OAuth providers (Google/GitHub/etc. if enabled): update authorized redirect / JavaScript origins to include `https://pxlb.fun`.
4. Confirm email templates do not hardcode the old product name if customized outside the repo.

---

## 6. Manual Vercel checklist

- [ ] Primary domain = `pxlb.fun`
- [ ] Legacy domain still responds or redirects
- [ ] `NEXT_PUBLIC_SITE_URL=https://pxlb.fun`
- [ ] Supabase env vars unchanged (URL + anon key)
- [ ] Production deploy green after domain attach

---

## 7. Testing

### Automated (this change set)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (Next.js 16.4.6) |
| `npm run lint` | Fail — 23 errors / 7 warnings in existing studio/auth UI files (`PlaygroundForm`, `PixelBoard`, `LayerPanel`, etc.). No new issues on rebrand files (`site.ts`, `copy.ts`, `PxlbMark`, `icon.tsx`). |
| `npm run test` | 272 passed / 7 failed. Failures are pre-existing source-string expectations (`mobile-chrome`, `explore-layout`, `typography` create page, `pixel-world` shell, `back-navigation` aria-live) — unrelated to brand string changes. `tests/footer.test.ts` passed. |

### Manual (after DNS + Supabase + Vercel)

- [ ] Landing shows **PXLB** + new tagline (desktop + mobile)
- [ ] Favicon / header mark match four-block identity
- [ ] Login / logout / magic-link or OAuth callback on `pxlb.fun`
- [ ] Create → save draft → publish
- [ ] Open an existing published creation by id
- [ ] Share link preview (OG title/siteName = PXLB)
- [ ] Canonical / `metadataBase` use `https://pxlb.fun`
- [ ] Legacy host redirects without breaking `/auth/callback` during transition
- [ ] Existing local drafts still restore (`commons:` keys)

Claims about live DNS, production auth, or real OG crawlers are **not** made here — those require dashboard/DNS work outside this repo.

---

## 8. Open / unresolved

1. DNS for `pxlb.fun` not verified.
2. Supabase Auth Site URL / Redirect URLs not updated from this repo (dashboard-only).
3. Vercel domain assignment / legacy 301 not applied from this repo.
4. Historical `docs/*` audits still say THE COMMONS in titles/body (archival).
5. Client draft storage still uses `commons:` / `commons-pixel-drafts` by design.
6. No dedicated `robots.ts` / `sitemap.ts` / `manifest` existed; add later if SEO inventory requires them.
7. Pre-existing ESLint / Vitest failures remain; not introduced by the rebrand string/asset cutover.
