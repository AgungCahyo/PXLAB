# PXLB — UI & Interaction Standardisation Spec (PROPOSAL)

**Document:** `docs/audit/UI_INTERACTION_SPEC.md`  
**Status:** **PROPOSAL — owner approved phased execution on 2026-11-25 using the recommended defaults. Phase 1 (P0 source-safe items) executed; P1/P2 and the Studio spec still await a separate go-ahead.**  
**Created:** 2026-11-25  
**Audience:** Founder/owner, product design, frontend implementation (only after separate go-ahead).  
**Evidence base:** `docs/audit/REPOSITORY_DISCOVERY.md`, `docs/audit/UX_CONSISTENCY_AUDIT.md`, and direct source inspection recorded there.  
**Scope:** Product-wide shared UI and interaction rules for public, auth, member and admin pages. The pixel Studio is intentionally handled by `docs/audit/STUDIO_INTERACTION_SPEC.md`.  
**Non-goals:** No redesign, no component extraction, no dependency install, no Supabase/schema/config change. This document itself makes no changes; the owner-approved Phase 1 execution is logged in §10. Every other rule below remains a proposal until a separate implementation go-ahead.

> **Proof vocabulary:** `VERIFIED IN SOURCE` means a file/line was inspected. `PROPOSED` means a decision is requested, not that code exists. `UNVERIFIED` means no browser, accessibility tool, or production run was performed. Source proof is not runtime proof.

---

## 1. Status and authority

| Item | Status |
| --- | --- |
| Audit evidence | VERIFIED IN SOURCE — reports in `docs/audit/` |
| This spec | PROPOSAL — owner approved phased execution 2026-11-25 (recommended defaults) |
| Implementation authorization | **Phase 1 only** (the P0 source-safe items listed in §10). Everything else — P1/P2, routes, palette changes, dependencies, Supabase — remains **NO** until a separate go-ahead. |
| Runtime/browser validation | UNVERIFIED — Phase 8 remains `NOT EXECUTED` (`docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md:3`). |
| Existing source-of-truth docs | Unchanged: `README.md`, `PRODUCT-SPEC.md`, `TECHNICAL-SPEC.md`, `IMPLEMENTATION-PLAN.md`, `PIXEL-ART-DESIGN-SYSTEM.md`. This spec is a derived proposal, not a replacement. |

---

## 2. Verified baseline

### 2.1 CONSISTENT patterns worth preserving

- One localized shell: `app/[lang]/layout.tsx:63-83` owns `<html>`, fonts and `PublicShell`; `PublicShell.tsx:21-39` wraps header, `main#main`, footer, Toast, PWA and busy layers.
- One active mobile tab bar: `SiteHeader.tsx:37-44` renders `SocialSidebar` + `SocialTabBar`. `AppTabBar` in `SiteNav.tsx:209-312` is dead code, not a competing implementation.
- Shared fields expose labels, `aria-invalid`, `aria-describedby` and `role="alert"` errors (`Input.tsx:20-55`, `Textarea.tsx:12-44`).
- `Dialog` uses native `<dialog>` modal semantics, `aria-labelledby`, `onClose` and backdrop close (`Dialog.tsx:33-61`).
- Global `:focus-visible` uses a 3px Sky outline with offset (`globals.css:558-562`); `socialAction.ts:1-6` adds an explicit 44px action focus ring.
- Toast is `role="status"` / `aria-live="polite"` with a 2600 ms timer and at most two visible messages (`Toast.tsx:26-45`).
- Social interactions have explicit state contracts: optimistic like rollback, Ctrl/Cmd+Enter comment submit, progressive infinite scroll, guarded pull-to-refresh (`FeedPost.tsx:99-109`, `CommentPanel.tsx:203-239`, `ExploreInfinite.tsx:46-52,169-276`, `PullToRefresh.tsx:25-36,100-171`).
- Route guards for member/admin areas are source-verified (`(member)/layout.tsx:10-30`, `(admin)/layout.tsx:11-27`).

### 2.2 INCONSISTENT / PARTIAL findings to resolve

| Finding | Evidence | Current class |
| --- | --- | --- |
| Two button APIs with different variant names and no loading contract | `Button.tsx:4-39`, `socialButton.ts:3-31` | INCONSISTENT |
| `appearance` props on `Input`/`Textarea` are accepted but unused | `Input.tsx:8,17`, `Textarea.tsx:8,11` | INCONSISTENT |
| Live tokens differ from documented palette; four styling scopes coexist | `PIXEL-ART-DESIGN-SYSTEM.md:31-40` vs `globals.css:4-22,101-140,962-968,1019-1051` | INCONSISTENT |
| Two empty-state families and multiple skeleton families | `EmptyState.tsx:14-47`, `SocialEmptyState.tsx:6-39`, `RouteSkeletons.tsx:8-47`, `social/Skeleton.tsx:5-180` | PARTIAL |
| Dialog/menu focus return and scroll lock not explicitly implemented | `Dialog.tsx:33-61`, `StudioContextMenu.tsx:37-71` | PARTIAL |
| Desktop notification badge hard-coded to `3`, Indonesian-only label | `SocialNav.tsx:87-96` vs `:73,154,238,261-263` | INCONSISTENT |
| Navigation active states differ: underline vs filled pill | `SiteNav.tsx:57-61`, `SocialNav.tsx:129-134` | PARTIAL |
| Feedback surfaces overlap without a decision rule | `Alert.tsx:4-33`, `Toast.tsx:26-62`, inline field errors | PARTIAL |
| Auth doodle pad is pointer-only | `AuthDoodlePad.tsx:35-146` | PARTIAL |
| Root fallback not-found hard-codes `lang="id"` and duplicates fonts | `app/not-found.tsx:21-52` | PARTIAL |
| PWA offline shell is English-first with hard-coded colors | `public/offline.html:1-79` | PARTIAL |
| `INSTANT-INTERACTION-AUDIT.md:43-49` claims no `loading.tsx`, contradicted by source | 15 `app/**/loading.tsx` files | OUTDATED doc |

---

## 3. Problems this spec must solve

1. Equivalent actions look and behave differently because two button systems and ad-hoc pending states coexist.
2. Users cannot rely on one visual vocabulary because documented tokens, product tokens, social tokens, auth overrides and Studio chrome diverge.
3. Loading, empty, error and success states are chosen per page rather than by surface class.
4. Focus behavior after dialog/menu dismissal is unspecified and partly unverified.
5. Hard-coded UI state (notification badge) and stale docs teach incorrect current behavior.
6. Offline and PWA presentation are not locale- or token-complete.

---

## 4. Proposed standards

All entries below are **PROPOSED** unless explicitly marked `VERIFIED IN SOURCE`.

### 4.1 Surface classes

| Surface class | Current scope | Proposed canonical visual language | Notes |
| --- | --- | --- | --- |
| Product default | public detail/profile/admin/settings/forms | `ui/Button`, `Card`, `Alert` (pixel frame), `EmptyState` (page) | `VERIFIED IN SOURCE` for current primitives; canonical choice is PROPOSED. |
| Social flat | `/`, `/home`, `/explore`, `/creators`, feed/profile tiles | `socialButtonClass`, `socialActionClass`, `SocialEmptyState`, flat `Alert` | Retain flat chrome, but align size/loading/focus contracts with product default. |
| Auth flat | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | `AuthShell` + shared fields + `.auth-flat` overrides | Keep scoped overrides; document them as intentional, not accidental. |
| Studio | pixel `/create/[id]` | Separate spec: `STUDIO_INTERACTION_SPEC.md` | Deliberately outside this spec's button/token defaults. |

### 4.2 Button and action contract

**Recommended decision:** treat `components/ui/Button.tsx` as the canonical action primitive. Keep `socialButtonClass` only as a compact social-row action style until a later, separately authorized migration. This is a decision request, not a completed refactor.

| Requirement | Proposed rule | Status |
| --- | --- | --- |
| Variant names | One vocabulary: `primary`, `secondary`, `outline`, `ghost`, `danger` (danger added only if needed). Social aliases map to these, not replace them. | PROPOSED |
| Sizes | `sm` 36px, `md` 44px, `lg` 48px minimum height; one spacing scale. | PROPOSED (current source partially matches) |
| States | `hover`, `active`, `focus-visible`, `disabled`, `loading` must all be defined once. | PROPOSED |
| Loading | `loading?: boolean`; set `aria-busy="true"`, `disabled`, preserve label width, announce via existing live region or button text; no ad-hoc opacity-only pending states. | PROPOSED |
| Focus | Inherit global `:focus-visible` ring; social actions may use the explicit 44px ring in `socialAction.ts`. | PARTIAL → PROPOSED |
| Links-as-actions | Use a class helper for links; never render `<button>` inside `<a>` or vice versa. | PROPOSED |

### 4.3 Dialog, modal and menu contract

| Requirement | Proposed rule | Status |
| --- | --- | --- |
| Modal primitive | Native `<dialog>` with `showModal()` remains mandatory; keep `aria-labelledby`. | VERIFIED IN SOURCE / PROPOSED to standardize |
| Close paths | Escape, labeled close button, and backdrop click all call the same `onClose`. | PARTIAL → PROPOSED |
| Focus return | Store trigger element on open; restore focus on close. Must be implemented explicitly. | PROPOSED |
| Scroll lock | Define and implement one body-scroll-lock behavior for modals; verify in browser. | PROPOSED / UNVERIFIED |
| Menus/popovers | Full `role="menu"` + `menuitem` + arrow-key roving (ArrowUp/Down with wrap, Home/End), Escape closes and returns focus to the trigger, Tab closes without swallowing default focus movement, ArrowDown/Up on the closed trigger opens to first/last item. Product menus only — Studio menus follow `STUDIO_INTERACTION_SPEC.md`. Shared helper: `components/ui/menuKeyboard.ts`. | **ADOPTED (U4, phase 2)** — implemented in `SiteNav` account menu and `WorksRow` menu; source-tested, runtime UNVERIFIED |
| Nested overlays | Define whether nested dialog/menu is forbidden; default PROPOSED: forbidden. | PROPOSED |

### 4.4 Form contract

- Keep the current label/hint/error ARIA pattern (`VERIFIED IN SOURCE`).
- Decide and document whether `appearance` is implemented or removed; do not leave a dead prop (`PROPOSED`).
- One feedback surface per message type:

| Message type | Proposed surface | Current problem |
| --- | --- | --- |
| Field-level validation | Inline field error via `Input`/`Textarea` | Already mostly consistent |
| Form-level failure | `Alert` with `tone="error"`; `flat` only in social/auth | Flat vs pixel-frame currently ad hoc |
| Submission pending | Single button `loading` contract + optional live status | Currently per-form pending labels |
| Success | **U5 rule adopted:** transient action feedback → Toast; persistent page state → inline. Full contract and call-site ticket list in §4.6.1. | ADOPTED (phase 2); migration ticketed, not executed |

- Validation remains in `features/*` and `lib/validations/*`; this spec does not relocate it.

### 4.5 Navigation contract

- One active-state token per surface class; document that header underline and sidebar pill are separate until unified (`PROPOSED`).
- Notification badge must be derived from the same unread signal used by the mobile tab bar and localized in `id`/`en` (`SocialNav.tsx:87-96` is the defect) — **PROPOSED**.
- Remove or render dead `AppTabBar` only when touching that file; do not create a third bottom nav — **PROPOSED**.
- Root fallback not-found localizes from the `Accept-Language` header via `headers()` (server component, per bundled Next.js docs); no client hooks in the root not-found — **ADOPTED (U9, phase 2)**, `app/not-found.tsx` + `lib/i18n.ts:langFromAcceptLanguage`.

### 4.6 Loading / empty / error / success contract

| Contract | Rule |
| --- | --- |
| Route loading | Keep `loading.tsx`, but converge on one skeleton API per surface class with `role="status"` and `aria-busy="true"` on the wrapper. |
| Empty | Two families split by scope (page-level vs section/feed) with a mascot rule — **§4.6.2 (U7, ADOPTED phase 2)**. |
| Error | `Alert` for recoverable form/page errors; `app/error.tsx` and `app/[lang]/not-found.tsx` remain boundaries. |
| Success | Toast for transient feedback, inline for persistent state; toast gained manual dismiss — **§4.6.1 (U5/U6, ADOPTED phase 2)**. |
| Busy | `CornerBusy` remains the global route/server-action indicator; form pending uses the button contract. |

#### 4.6.1 U5 — feedback surface rule (ADOPTED, phase 2)

- **Transient action feedback** — the result of an interaction that does not
  change what the page shows (like rollback, copy link, follow toggle, import
  result) → **Toast**: max 2 visible, 2600 ms, `role="status"` +
  `aria-live="polite"`, tone `success|error|info`, **manual dismiss button**
  (U6) localized via `copy.toastDismiss`; dismissing clears the pending timer
  (`components/social/Toast.tsx`).
- **Persistent page state** — saved draft, published state, validation, result
  counts, "no results" → **inline** (`Alert` or status text next to the control
  it describes). Never a toast: it must outlive the toast window.
- One message lives on exactly one surface: a toast never repeats an inline
  message, and a toast never carries actions or information required to
  continue a task.
- `Alert` keeps `role="alert"` for errors and `role="status"` otherwise;
  `flat` stays scoped to social/auth chrome (existing scope, unchanged).

**Ticket list — review/migrate (not executed in phase 2):**

| Call site | Current surface | Disposition |
| --- | --- | --- |
| `components/social/FeedPost.tsx:93` (like rollback) | Toast `error` | Conforms — transient |
| `components/social/CommentPanel.tsx:139-144` | Toast `error` | Conforms — transient |
| `components/profiles/SettingsForm.tsx:256` | Inline saved text | Conforms — persistent |
| `components/creations/StudioForm.tsx:156`, `components/creations/PlaygroundForm.tsx:712` | Inline save status | Conforms — persistent |
| Success paths that only change a button label (no visible result message) | none | **TICKET (UNVERIFIED):** confirm each result is self-evident; add a Toast only when it is not |
| Any future "something happened" message | — | Must follow the rule above; no new ad-hoc surfaces |

No success-toned toast exists in source today (only `error` toasts) — the
success path of the contract is therefore greenfield, not a migration.

#### 4.6.2 U7 — empty-state families (ADOPTED, phase 2)

Two families stay, split by **scope**, not by page. No third family.

| Family | Scope | Rule |
| --- | --- | --- |
| `components/ui/EmptyState.tsx` (pixel frame, `page`/`section`) | Page-level empties on **non-social** surfaces | Heading plain `<h2>`, icon slot `aria-hidden`, action slot allowed |
| `components/social/SocialEmptyState.tsx` (flat + mascot) | Section/feed-level empties inside **social** surfaces (feed, explore, profile, dashboard, comments, search, inbox) | Flat, `py-12`, decorative mascot `aria-hidden` |

- Mascot art (`PixelCatEmptyState`) is allowed **only** in the social/flat
  family and only as decoration — heading text is always present; the mascot is
  never the sole content of an empty state.
- `PixelCatDecoration` on non-empty surfaces (create picker, settings) is
  illustration, not an empty state, and is out of scope for this rule.

**Ticket list — review/migrate (not executed in phase 2):**

| Call site | Family | Disposition |
| --- | --- | --- |
| `components/canvas/SpaceBoard.tsx:282` | `EmptyState` | Conforms — page-level, non-social |
| `components/moderation/AdminReports.tsx:49` | `EmptyState` | Conforms — page-level, non-social |
| `components/social/CommentPanel.tsx:173`, `components/search/SearchResults.tsx:139,151,163`, `components/creations/ExploreGallery.tsx:157,172,199`, `components/community/ResponsesInbox.tsx:78`, `components/creations/SimilarWorksLazy.tsx` | `SocialEmptyState` | Conforms — section-level, social |
| `app/[lang]/(public)/page.tsx:134`, `app/[lang]/(public)/creators/page.tsx:65,77`, `app/[lang]/(public)/u/[username]/page.tsx:201,216`, `app/[lang]/(member)/dashboard/page.tsx:191` | `SocialEmptyState` | Conforms — section-level, social |
| `app/[lang]/(public)/home/page.tsx:84,111,130` | `SocialEmptyState` | Conforms — **user-owned uncommitted file; excluded from execution** |
| `app/[lang]/(member)/dashboard/page.tsx:205-230` | **Bespoke third pattern** (inline rounded card + direct `PixelCat` + hard-coded `lang === "id"` ternaries instead of `copy.*`) | **TICKET:** migrate to `SocialEmptyState`; move strings to `lib/copy.ts` |

### 4.7 Visual token contract

- **Palette authority: live CSS tokens win (U3, ADOPTED phase 2).** `app/globals.css` `:root` is the source of truth; `PIXEL-ART-DESIGN-SYSTEM.md` §2 was reconciled to the shipped hexes with a reconciliation note (docs only, zero pixel change).
- Studio dark chrome and auth-flat/social scopes must be documented as intentional scoped exceptions, not parallel global themes. Studio dark is an owner decision (`STUDIO_INTERACTION_SPEC.md` §1).
- Icon set rule and freeze: **§4.9**.
- `prefers-reduced-motion` handling is already present globally and in auth scope (`globals.css:911,1047`) and must remain.

### 4.8 PWA / offline presentation

- `public/offline.html` localizes to `id`/`en` from `navigator.language` (static fallback = `DEFAULT_LANG` `id`, script upgrades to `en`) and uses CSS custom properties mirroring the shipped `globals.css` tokens — **ADOPTED (U8, phase 2)**. Static file, no locale-aware route (SW serves it directly; `middleware.ts` matcher excludes `offline.html`).
- Keep the current SW policy: production-only registration, no editor page caching, conservative same-origin GET handling (`PwaRegister.tsx:15-69`, `sw.js:49-96,98-133`) (`VERIFIED IN SOURCE`).
- Do not claim full offline editing; local Studio drafts are recovery-only and explicit-save remains the contract.

### 4.9 Scope freezes (phase 2 decisions)

Two audit findings (UX audit §10 findings 10–11) are resolved by **freezing**
rather than migrating; migration needs owner authorization and/or browser
validation and is not part of this phase.

1. **Legacy creation path — FROZEN (audit P1).** The pixel path
   (`PlaygroundForm`) is the only *current* creation path. `StudioForm` and the
   legacy panels (`text|visual|idea|story`, `lib/site.ts:
   LEGACY_CREATION_TYPES`) are frozen: no new legacy types, no new legacy
   features, and no new call sites into them. Existing legacy rows stay
   viewable/editable (view/update only). Whether `/create` (`PixelNewForm`)
   should stop *offering* legacy types is an open **product** decision for the
   owner — recorded, not decided here.
2. **Icon set — FROZEN (audit P2).** No new icon sources. Going forward:
   pixel marks (`ui/PixelIcon`, `pixelarticons/react`) for brand/Studio
   surfaces; `lucide-react` for utility UI; no new inline-SVG icons; decorative
   icons keep `aria-hidden`. Existing mixed call sites are **not** migrated in
   phase 2 (large, browser-visible) — deferred as its own ticket.

---

## 5. Acceptance criteria

### 5.1 Source-verifiable (can be checked without a browser)

- A single approved action/loading contract is documented and referenced by each surface class.
- No component exposes a dead prop such as `appearance` without a documented decision.
- Notification badge source contains no hard-coded count and uses localized labels.
- Dialog/menu code implements the chosen focus-return and scroll-lock behavior.
- Loading/empty/error wrappers use the agreed ARIA attributes consistently.
- Stale docs are relabeled `OUTDATED` or corrected; source wins.

### 5.2 Browser-verifiable (still UNVERIFIED until executed)

- Focus returns to the trigger after dialog/menu close.
- Escape, backdrop and close button produce the same state.
- Keyboard-only users can reach and activate every action and menu item.
- Pending states do not cause layout shift and are announced.
- Back/forward navigation and view transitions preserve focus and scroll predictably.
- Reduced-motion preference is honored on animated feedback.

These criteria are **not** evidence that the behavior currently works.

---

## 6. Proposed sequence (no work started)

1. Owner signs off or amends the decisions in §4.
2. Update `README.md` / source-of-truth index to reference this PROPOSAL and the Studio PROPOSAL without replacing existing authorities.
3. Convert each PROPOSED rule into an implementation ticket with its own go-ahead.
4. Implement one surface class at a time, starting with the button/loading contract.
5. Add source assertions, then run browser and accessibility checks.
6. Only then change any user-visible behavior.

---

## 7. Open decisions for owner

| ID | Decision | Recommended default | Status (2026-11-25) |
| --- | --- | --- | --- |
| U1 | Canonical button primitive | `ui/Button` canonical; social class retained temporarily | **RESOLVED** — default applied; `Button` gained the loading contract, `socialButtonClass` retained |
| U2 | `appearance` props | Implement once in shared fields or remove; do not leave dead API | **RESOLVED** — removed everywhere |
| U3 | Palette authority | Decide between design-system doc and live CSS; then align the other | **RESOLVED (phase 2)** — live CSS tokens win; `PIXEL-ART-DESIGN-SYSTEM.md` §2 reconciled with note (docs only, zero pixel change) |
| U4 | Menu semantics | Full `role="menu"` + arrow keys, or explicitly documented `group` limitation | **RESOLVED (phase 2)** — full menu semantics for product menus (§4.3); Studio excluded, own spec |
| U5 | Success feedback | Toast for transient actions; inline Alert for persistent page state | **RESOLVED (phase 2)** — rule adopted with call-site ticket list (§4.6.1) |
| U6 | Toast manual dismiss | Decide yes/no; current source has no dismiss | **RESOLVED (phase 2)** — yes; localized dismiss button added, dismiss clears the timer |
| U7 | Empty-state families | Page vs section/feed split with documented mascot usage | **RESOLVED (phase 2)** — two families by scope + mascot rule (§4.6.2); dashboard bespoke empty ticketed |
| U8 | Offline shell | Localize via route vs static bilingual file | **RESOLVED (phase 2)** — static bilingual file (static `id` = `DEFAULT_LANG`, script upgrades to `en` via `navigator.language`), CSS vars (§4.8) |
| U9 | Root not-found | Localize via shell vs keep standalone with explicit rationale | **RESOLVED (phase 2)** — standalone full document kept (root layout is a pass-through, so not-found owns `<html>`), locale from `Accept-Language` (§4.5) |

---

## 8. Non-authorization notice

This spec records a proposal. Its **only** implementation authority is the Phase 1 P0 list in §10, executed on 2026-11-25 under the owner's explicit go-ahead. It does **not** authorize anything beyond that list — no route changes, palette changes, dependency installs, Supabase configuration, migrations, or production systems — and it does not supersede signed-off master-plan specs. Everything else requires a separate, explicit founder go-ahead after the open decisions are resolved.

---

## 9. Evidence index

- `docs/audit/REPOSITORY_DISCOVERY.md` — repository structure, docs classification, health checks.
- `docs/audit/UX_CONSISTENCY_AUDIT.md` — route inventory, component inventory, interaction/visual findings, cross-page matrix.
- `components/ui/Button.tsx`, `components/social/socialButton.ts`, `components/ui/Input.tsx`, `components/ui/Textarea.tsx`, `components/ui/Dialog.tsx`, `components/ui/Alert.tsx`, `components/ui/EmptyState.tsx`, `components/social/SocialEmptyState.tsx`, `components/social/Toast.tsx`.
- `components/layout/SiteHeader.tsx`, `components/layout/SiteNav.tsx`, `components/layout/SocialNav.tsx`, `components/layout/CornerBusy.tsx`.
- `app/globals.css`, `app/not-found.tsx`, `app/[lang]/not-found.tsx`, `app/[lang]/error.tsx`.
- `components/auth/AuthDoodlePad.tsx`, `components/auth/AuthShell.tsx`, `public/offline.html`, `public/sw.js`, `components/pwa/PwaRegister.tsx`, `components/pwa/PwaInstall.tsx`.
- `docs/INSTANT-INTERACTION-AUDIT.md` — OUTDATED claim about `loading.tsx`.

---

## 10. Execution log — Phase 1 (2026-11-25)

Owner instruction: execute the UI spec in phases using the recommended defaults. The Studio intentionally stays dark (owner decision, recorded in `STUDIO_INTERACTION_SPEC.md` §1).

| # | Item | Change | File(s) |
| --- | --- | --- | --- |
| 1 | Hard-coded notification badge | Boolean-driven decorative dot; unread text moved to a localized `aria-label` on the sidebar link | `components/layout/SocialNav.tsx` |
| 2 | Dead `AppTabBar` | Removed; tests retargeted to the single `SocialTabBar` | `components/layout/SiteNav.tsx`; `tests/auth-next.test.ts`, `tests/ux-platform.test.ts`, `tests/works-home.test.ts` |
| 3 | Button loading contract (U1) | `loading` prop → `disabled`, `aria-busy`, `data-loading` | `components/ui/Button.tsx` |
| 4 | Dead `appearance` prop (U2) | Removed from shared fields and every call site | `components/ui/Input.tsx`, `components/ui/Textarea.tsx`, 5 consumer files |
| 5 | Dialog focus return + scroll lock (§4.3) | Trigger focus restore on every close path; counter-based body scroll lock for stacked modals | `components/ui/Dialog.tsx` |
| 6 | Stale audit claim | OUTDATED / historical banner | `docs/INSTANT-INTERACTION-AUDIT.md` |
| 7 | Contract tests | New source assertions covering items 1–6 | `tests/ui-standardisation.test.ts` |

**Verification:** `npm run typecheck` PASS; `npm test` PASS (106 files / 848 tests, including the new contract test); `npm run lint` unchanged at 27 errors / 21 warnings — all pre-existing, none introduced here. Browser / Phase 8 validation remains **NOT EXECUTED**: focus return, scroll lock and the loading state are source-verified only.

**Not done in Phase 1 (needs phase 2+):** U3 palette authority, U4 menu semantics, U5–U7 feedback and empty-state families, U8 offline shell, U9 root not-found, icon-set choice, legacy creation path, lint debt, and every browser-verifiable acceptance criterion in §5.2.

## 11. Execution log — Phase 2 (2026-11-25)

Owner instruction: full phase 2 including the menu rework (U4); recommended defaults applied. Studio stays dark and untouched (owner decision, `STUDIO_INTERACTION_SPEC.md` §1). No browser validation in this phase.

| # | Item | Change | File(s) |
| --- | --- | --- | --- |
| 1 | U4 menu semantics | Product menus reworked to full `role="menu"`/`menuitem` with Arrow roving (wrap), Home/End, Escape + focus return, Tab closes without swallowing focus movement, ArrowDown/Up on the trigger opens to first/last item. Shared keyboard helper added. | `components/ui/menuKeyboard.ts` (new), `components/layout/SiteNav.tsx`, `components/creations/WorksRow.tsx`, `components/creations/WorksDeleteButton.tsx` |
| 2 | U6 toast dismiss | Localized manual dismiss button; dismissing clears the pending timer; provider gets `lang` from the shell. `role="status"`/`aria-live="polite"` and max-2/2600 ms unchanged. | `components/social/Toast.tsx`, `components/layout/PublicShell.tsx`, `lib/copy.ts` |
| 3 | U8 offline shell | Static file localized: Indonesian fallback (`DEFAULT_LANG`) upgraded to English from `navigator.language`, `<html lang>` updated; all page colors replaced with CSS custom properties mirroring shipped tokens; `theme-color` kept at the manifest value. | `public/offline.html` |
| 4 | U9 root not-found | Standalone full document kept (root layout is a pass-through); locale now from `Accept-Language` via `headers()` in an async Server Component, per bundled Next.js docs. New q-value-aware helper; root not-found stays hook-free. `instant = false` added after `next build` flagged request-time data outside `<Suspense>` — the 404 is fine to render on demand (bundled docs: "allow blocking route"). | `app/not-found.tsx`, `lib/i18n.ts` |
| 5 | U3 palette authority | Palette table reconciled to shipped `globals.css` hexes with a dated reconciliation note; docs only, zero pixel change. | `docs/PIXEL-ART-DESIGN-SYSTEM.md` |
| 6 | U5/U7 contracts | Feedback-surface rule and empty-state families adopted with full call-site ticket lists (dashboard bespoke empty flagged; user-owned uncommitted home page excluded). | `docs/audit/UI_INTERACTION_SPEC.md` §4.6.1–4.6.2 |
| 7 | Freezes | Legacy creation path frozen (audit P1; open product question recorded); icon set frozen with a per-surface rule (audit P2); existing mixed call sites explicitly not migrated. | `docs/audit/UI_INTERACTION_SPEC.md` §4.9 |
| 8 | Contract tests | Five new source-contract tests plus one real `Accept-Language` unit test (q-values/subtags); suite 848 → 854 | `tests/ui-standardisation.test.ts` |

**Verification:** `npm run typecheck` PASS; `npm test` PASS (106 files / 854 tests); `npm run lint` 27 errors / 20 warnings in 21 files — errors unchanged and one dead `PixelIconName` import left over from phase 1 removed (no new issues). `npm run build` PASS after adding `instant = false` to the root not-found (request-time `headers()` otherwise blocks prerendering under Cache Components). Browser / Phase 8 validation remains **NOT EXECUTED**, so every runtime claim (focus movement, toast dismissal, offline locale switch, 404 locale) stays `UNVERIFIED`.

**Still deferred:** lint debt (27 errors / 20 warnings baseline), migration of ticketed U5/U7 call sites, icon migration of existing call sites, any legacy creation-type migration, and all browser-verifiable criteria in §5.2.
