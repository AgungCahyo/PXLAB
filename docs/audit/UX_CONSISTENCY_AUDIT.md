# PXLB — UX, UI & Interaction Consistency Audit

**Audit date:** 2026-11-25
**Scope:** All application routes, shared UI, social/auth/member/admin surfaces, and PXLB Studio as implemented at HEAD `2e51c4d`.
**Mode:** READ-ONLY AUDIT. No pages, CSS, components, dependencies or behavior were changed.
**Update 2026-11-25 (after this report):** The owner approved phased execution of `docs/audit/UI_INTERACTION_SPEC.md` with its recommended defaults; several P0 findings below were then fixed in source. See §11 — the tables in this report remain the audit-time snapshot.
**Evidence policy:** Every finding is based on source inspection. Behavioral claims are marked VERIFIED (source), PARTIAL, INCONSISTENT, NOT_APPLICABLE or UNVERIFIED. There was no browser, Playwright, jsdom or production run in this audit; source-level correctness is not runtime proof.
**Path shorthand:** `<ROOT>` = `C:\Users\cahyo\OneDrive\Desktop\Cuy\the commons`. Line numbers refer to the file as read on 2026-11-25.

---

## 1. Executive Summary

PXLB behaves as **one product with several overlapping interaction systems**, not as a single fully unified design system. The shared shell, bilingual copy, route loading files and a small set of primitives provide a real baseline, but parallel styling scopes and duplicated component families create user-visible drift.

Headline verdicts:

| Area | Verdict | Evidence |
| --- | --- | --- |
| Global shell and route structure | **CONSISTENT / PARTIAL** | One `[lang]` layout owns `<html>`, fonts and `PublicShell`; member header switches to sidebar + tab bar (`SiteHeader.tsx:37-44`). No `(public)` layout override exists. |
| Navigation active states | **PARTIAL** | `SiteNav` uses underline styling with `aria-current` (`SiteNav.tsx:57-61,78-85`); `SocialNav` uses pill backgrounds with `aria-current` (`SocialNav.tsx:126-155,235-239`). Both work, but are separate implementations. `AppTabBar` in `SiteNav.tsx:209-312` is dead code; `SiteHeader` renders `SocialTabBar` instead (`SiteHeader.tsx:37-44`). |
| Notification badge | **INCONSISTENT** | Desktop `SocialSidebar` hard-codes `count = 3` and `aria-label="3 notifikasi baru"` (`SocialNav.tsx:87-96`), while the real badge condition is boolean and the mobile tab bar uses localized unread text (`SocialNav.tsx:73,154,238,261-263`). |
| Buttons | **INCONSISTENT** | `ui/Button.tsx` and `social/socialButton.ts` duplicate geometry with different variant names; neither has a built-in loading state (`Button.tsx:34-39`, `socialButton.ts:26-31`). Studio and other pages add ad-hoc buttons. |
| Dialogs / menus | **PARTIAL** | `Dialog` uses native `<dialog>.showModal()`, `aria-labelledby`, `onClose` and backdrop click close (`Dialog.tsx:33-61`), but no explicit focus return or scroll lock was found. `StudioContextMenu` adds Escape/outside-click/focus-first (`StudioContextMenu.tsx:37-71`). |
| Forms | **PARTIAL** | `Input`/`Textarea` provide label/hint/error, `aria-invalid`, `aria-describedby`, `role="alert"` (`Input.tsx:27-55`, `Textarea.tsx:16-44`); `appearance` props are accepted but unused (`Input.tsx:8,17`, `Textarea.tsx:8,11`). Pending states are handled ad hoc by callers. |
| Visual tokens | **INCONSISTENT** | The design system documents Paper `#FFFDF7`, Ink `#282B35`, Brick `#E94B3C` (`docs/PIXEL-ART-DESIGN-SYSTEM.md:31-40`), while `:root` uses `#f8f9fc`, `#1e1b4b`, `#f43f5e` (`globals.css:5-16`). Additional social (`:root` at 962-968), auth (`.auth-flat` at 1019-1051) and Studio dark (`[data-chrome="playground"]` at 101-140) scopes coexist. |
| Loading / empty states | **PARTIAL / INCONSISTENT** | 15 `loading.tsx` files exist; `RouteSkeleton` exposes `role="status"`/`aria-busy` (`RouteSkeletons.tsx:8-15`), but multiple skeleton families and two empty-state families coexist (`EmptyState.tsx` pixel frame vs `SocialEmptyState.tsx` flat mascot). |
| Studio | **PARTIAL** | Rich, guarded keyboard shortcuts exist (`PixelBoard.tsx:3132-3355`), but the interaction layer is concentrated in two very large client components and is the centre of all 27 lint errors. No timeline exists; no browser proof exists. |
| Social feed behavior | **CONSISTENT** | Optimistic likes with rollback/toast, Ctrl/Cmd+Enter comment submit, progressive-enhancement infinite scroll and guarded pull-to-refresh are source-verified (`FeedPost.tsx:99-109`, `CommentPanel.tsx:203-239`, `ExploreInfinite.tsx:46-52,169-276`, `PullToRefresh.tsx:25-36,100-171`). |
| Auth presentation | **PARTIAL** | All auth pages share `AuthShell`, fields, `Alert`, `Button` and `.auth-flat` styling, but `AuthDoodlePad` is pointer-only with no keyboard drawing path (`AuthDoodlePad.tsx:35-146`). |
| PWA / offline | **PARTIAL** | SW registration is production-only and editor routes are excluded from caching (`PwaRegister.tsx:15-69`, `sw.js:49-96,98-133`), but `offline.html` is English-first with hard-coded colors (`offline.html:1-79`). |
| Accessibility | **PARTIAL / UNVERIFIED** | Several correct ARIA patterns are present; focus restoration, arrow-key menu navigation, loading-state announcements and contrast are not fully verified. The root fallback not-found hard-codes `lang = "id"` (`app/not-found.tsx:21-52`). |
| Runtime/browser behavior | **UNVERIFIED** | Phase 8 is explicitly `NOT EXECUTED` (`docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md:3`, `docs/evidence/phase8-20261122/RESULTS.md:3`). |

**Bottom line:** The highest-value standardization work is not visual polish. It is (1) one button/loading-state contract, (2) one token vocabulary, (3) one empty/loading/error contract, (4) explicit dialog/menu focus behavior, and (5) removal or correction of hard-coded UI state such as the notification badge. Studio should remain a deliberately separate chrome, but its shortcuts and focus rules need documentation before more features are added. Stale docs such as `INSTANT-INTERACTION-AUDIT.md` must not be used as current-state evidence: its claim that no `loading.tsx` exists is contradicted by source.

---

## 2. Route Inventory

All routes below were verified from `app/**` and `next.config.ts`; documentation was not treated as proof. `id` is the default locale via rewrite and `en` is URL-prefixed. Every listed page exports `instant = false` unless marked otherwise.

| Route (`id` / `en`) | Purpose | Layout & navigation | Shared components | Page-specific components | Main user actions | Responsive behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` / `/en` | Landing / discovery entry | `[lang]/layout.tsx` + `PublicShell`; guest header (`SiteNav`) + mobile tab bar | `PxlbMark`, `WorkTile`, `socialButtonClass`, `Skeleton`, `SocialEmptyState` | Landing rails in `(public)/page.tsx` | Browse works, sign in/up, continue as member | Mobile-first max-width column; guest CTA collapses on small screens | `<ROOT>\app\[lang]\(public)\page.tsx:1-19`; `SiteHeader.tsx:12-44`; `SiteNav.tsx:105-113` |
| `/home` / `/en/home` | Social home feed | Same shell; members get sidebar + bottom tab bar | `HomeFeed`, `FeedPost`, `CommentPanel`, `PullToRefresh`, `Toast`, `FeedPostSkeleton` | Feed tabs in `home/page.tsx` | Switch All/Following, infinite scroll, like, comment, pull-to-refresh | Desktop rail, mobile tab bar; feed column `max-w-xl` | `<ROOT>\components\social\HomeFeed.tsx:1-134`; `components\layout\SocialNav.tsx:100-239` |
| `/explore` / `/en/explore` | Browse/search creations and creators | Same shell | `ExploreGallery`, `ExploreSearch`, `SearchResults`, `CreatorCard`, `SocialEmptyState`, skeletons | Filter/feed/scope controls in `explore/page.tsx` | Search, filter by category/color, scope, paginate, follow creators | Two-context IA; separate Search All vs creator grid | `<ROOT>\app\[lang]\(public)\explore\page.tsx:189-361`; evidence reports in `docs/evidence/explore-*` |
| `/creators` / `/en/creators` | Creator directory | Same shell | `CreatorCard`, `socialButtonClass`, `ProfileAvatar` | Creator grid | Search creators, follow, open profile | Fluid card widths verified in evidence reports; one `<img>` lint warning remains | `<ROOT>\docs\evidence\creator-card-followup-20261123\RESULTS.md`; lint output |
| `/space` / `/en/space` | Secondary legacy Common Space SVG board | Same shell | `SiteFooter`, `Alert`, `Dialog`, `Button`, `Input`, `EmptyState`, `BackLink` | `SpaceBoard` | Add/move/delete own text/rect/circle, report element | Responsive SVG viewBox; no PixelBoard, tiles or realtime | `<ROOT>\components\canvas\SpaceBoard.tsx:1-60`; `lib\flags.ts:1-4`; `docs\TECHNICAL-SPEC.md:382` |
| `/creation/[id]` / `/en/creation/[id]` | Public artwork detail | Same shell | `CreationCommunity`, `CreationShareDialog`, `RemixStrip`, `SimilarWorksLazy`, `CreationMoreMenu`, `BackLink`, `Alert` | Detail hierarchy in `(public)/creation/[id]/page.tsx` | Comment, appreciate, follow, share, remix, download, report | Detail column and lazy recommendation rails | `<ROOT>\app\[lang]\(public)\creation\[id]\page.tsx:31-260` |
| `/u/[username]` / `/en/u/[username]` | Public creator profile | Same shell | `ProfileAvatar`, `SocialEmptyState`, `FollowButton`, `Skeleton`, `ProfileGridSkeleton` | Profile header/works grid | Follow, browse published works | Suspense fallbacks for counts and grid | `<ROOT>\app\[lang]\(public)\u\[username]\page.tsx:115,166,201,216` |
| `/login` | Sign in | `AuthShell` inside `PublicShell` | `Input`, `PasswordField`, `Button`, `Alert`, `GoogleAuthButton` | `LoginForm` | Email/password, Google OAuth, reset link | Flat auth layout, mobile-first | `<ROOT>\components\auth\AuthShell.tsx:20-83`; `(auth)\login\page.tsx:51` |
| `/register` | Sign up | Same auth layout | Same + `RegisterForm` | `RegisterForm` | Register, verification resend, Google OAuth | Flat auth layout | `<ROOT>\components\auth\RegisterForm.tsx` |
| `/forgot-password` | Request reset | Same auth layout | `Input`, `Button`, `Alert` | Request form | Submit email, see invalid-email warning | Flat auth layout | `<ROOT>\app\[lang]\(auth)\forgot-password\page.tsx:53` |
| `/reset-password` | Set new password | Same auth layout | `PasswordField`, `Button`, `Alert` | Reset form | Update password after recovery cookie | Flat auth layout | `<ROOT>\app\[lang]\(auth)\reset-password\page.tsx` |
| `/verify-email` | Verification result | Same auth layout | `Alert` | Status view | Read status, continue to app | Flat auth layout | `<ROOT>\app\[lang]\(auth)\verify-email\page.tsx:58,61` |
| `/dashboard` / `/en/dashboard` | Member's works | Member gate + shell | `SocialEmptyState`, `CreationCard`, `WorksSkeleton`, `socialButtonClass` | Dashboard rails | Open/create/edit creations | Member sidebar + mobile tab bar | `<ROOT>\app\[lang]\(member)\dashboard\page.tsx:191`; `loading.tsx` |
| `/create` / `/en/create` | Creation type/size picker | Member gate + shell | `PixelNewForm`, `CreateInspiration`, `PixelCatDecoration`, `CreateSkeleton` | Landing card grid | Choose pixel or legacy type, set dimensions | Responsive card grid | `<ROOT>\app\[lang]\(member)\create\page.tsx:1-81` |
| `/create/[id]` / `/en/create/[id]` | Pixel Studio editor (pixel) or legacy editor | Member gate; **fullscreen dark overlay** for pixel | `PlaygroundForm`, `PixelBoard`, `StudioInspector`, `LayerPanel`, dialogs, `StudioContextMenu` | `StudioForm` for legacy types | Draw, layers/groups, text, import/export, save/publish, undo/redo, zoom/pan | Fixed `inset-0 z-[60]`, own dark tokens, mobile toolbar `md:hidden` | `<ROOT>\app\[lang]\(member)\create\[id]\page.tsx:1-76`; `PlaygroundForm.tsx:1436-1437,1799`; `globals.css:101-140` |
| `/responses` / `/en/responses` | Responses inbox | Member gate + shell | `ResponsesInbox`, `SocialEmptyState`, `Alert` | Inbox list | Read/mark seen responses, open artwork | Member sidebar + mobile tab bar | `<ROOT>\app\[lang]\(member)\responses\page.tsx`; `components\community\ResponsesInbox.tsx` |
| `/settings` / `/en/settings` | Profile and account settings | Member gate + shell | `SettingsForm`, `AccountSecurity`, `Alert flat` | Settings sections | Edit profile, avatar, password/email, revoke sessions, delete account | Single-column, responsive | `<ROOT>\app\[lang]\(member)\settings\page.tsx:64,71,78`; `components\account\AccountSecurity.tsx:36-258` |
| `/welcome` / `/en/welcome` | Onboarding | Member gate; onboarding target | `WelcomeForm`, `GeneratedAvatar`, `Input`, `Button` | Welcome form | Complete username/display/avatar | Flat member page | `<ROOT>\app\[lang]\(member)\welcome\page.tsx`; `lib\auth\session.ts:needsOnboarding` |
| `/admin` / `/en/admin` | Moderation reports | Admin role gate + shell | `AdminReports`, `Alert`, `Dialog`, `Button` | Report table | Review/resolve/hide/restore | Responsive table/cards | `<ROOT>\app\[lang]\admin\page.tsx:11`; `components\moderation\AdminReports.tsx` |
| Root fallback not-found | Full-document 404 outside `[lang]` | Standalone HTML, no `PublicShell` | `buttonClassName` | Duplicated Google fonts, hard-coded `lang = "id"` | Return home | Standalone | `<ROOT>\app\not-found.tsx:21-52` — PARTIAL |
| Localized not-found / error | Localized fallback + client error boundary | `[lang]` layout, but no full `PublicShell` chrome | `buttonClassName`, localized copy | `useParams`, `console.error` | Home or explore recovery | Standalone | `<ROOT>\app\[lang]\not-found.tsx:10-33`; `app\[lang]\error.tsx:11-41` — PARTIAL |
| Metadata routes (`sitemap`, `robots`, `manifest`, `icon`) | SEO/PWA metadata | No UI layout | None | Route handlers | NOT_APPLICABLE | NOT_APPLICABLE | `<ROOT>\app\sitemap.ts:5-39`; `robots.ts:10-26`; `manifest.ts:1-44`; `icon.tsx:1-38` |
| `/auth/callback`, `/auth/recovery` | Auth route handlers | No UI layout | None | Route handlers | PKCE/OAuth/email-change, recovery cookie | NOT_APPLICABLE | `<ROOT>\app\auth\callback\route.ts`; `app\auth\recovery\route.ts` |
| `/api/og/creation/[id]`, `/api/qr/creation/[id]`, `/api/share-export/[id]`, `/api/pixel-cover/[id]`, `/api/pixel-download/[id]` | Image/export/download handlers | No UI layout | None | Route handlers | Generate OG/QR/share images, cover, permission-gated PNG | NOT_APPLICABLE | `<ROOT>\app\api\**` |

**Loading coverage:** 15 `loading.tsx` files exist. They use at least five skeleton families (`RouteSkeleton`, `AuthRouteSkeleton`, `WorksSkeleton`, `CreateSkeleton`, `ArtworkDetailSkeleton`, `FeedPostSkeleton`, `ProfileGridSkeleton`). `RouteSkeleton` exposes `role="status"` and `aria-busy="true"` (`RouteSkeletons.tsx:8-15`); equivalent attributes were not found on every alternative skeleton, so coverage is **PARTIAL**.

---

## 3. Component Inventory

### 3.1 Shared primitives

| Component | Source file | Variants | Styling / interaction | Keyboard & accessibility | Equivalent implementations |
| --- | --- | --- | --- | --- | --- |
| Button | `<ROOT>\components\ui\Button.tsx` | `primary`, `secondary`, `outline`, `ghost`; `sm`, `md`, `lg` | 4 variant class sets + 3 sizes; hover, active scale, disabled opacity (`:4-39`); no loading prop | Native `<button>` semantics; no `aria-busy` or spinner contract | `socialButton.ts` (below), plus ad-hoc buttons across Studio, nav and cards |
| Social button | `<ROOT>\components\social\socialButton.ts` | `solid`, `brand`, `soft`, `ghost`; `sm`, `md`, `lg` | Flat colors, `active:scale-[0.97]`, disabled opacity (`:3-31`) | Native button/link class; no loading contract | `ui/Button.tsx`; INCONSISTENT variant vocabulary |
| Input | `<ROOT>\components\ui\Input.tsx` | `appearance?: "default" | "social"` declared but unused (`:8,17`) | Label, hint, error text, `min-h-11`, focus ring, error ring (`:27-55`) | `aria-invalid`, `aria-describedby`, `role="alert"` on error (`:36-37,52`) | `PasswordField`, Studio inputs, auth-flat CSS overrides |
| Textarea | `<ROOT>\components\ui\Textarea.tsx` | Same unused `appearance` prop (`:8,11`) | Same field pattern, `min-h-28` (`:16-44`) | Same ARIA pattern (`:25-26,41`) | Studio text overlays, comment composer |
| Dialog | `<ROOT>\components\ui\Dialog.tsx` | `tone: default|social`, `size: default|lg` | Native `<dialog>`, `showModal()`/`close()`, `aria-labelledby`, backdrop click close (`:33-61`); pixel-frame or flat tone | Escape comes from native dialog; `onClose` wired; no explicit focus return or body scroll lock found | ReportDialog, ExportDialog, ImportDialog, CreationShareDialog all reuse it |
| Alert | `<ROOT>\components\ui\Alert.tsx` | `info`, `warning`, `error`; `flat?: boolean` | `pixel-frame` by default; flat social chrome when `flat` (`:4-33`) | `role="alert"` for error, `role="status"` otherwise (`:28`) | Inline field errors, Toast, auth warning text |
| EmptyState | `<ROOT>\components\ui\EmptyState.tsx` | `page`, `section` | Pixel frame, `pixel-title`, icon slot, action slot (`:14-45`) | Icon `aria-hidden`; heading is plain `<h2>` | `SocialEmptyState.tsx` (flat mascot) — INCONSISTENT |
| SocialEmptyState | `<ROOT>\components\social\SocialEmptyState.tsx` | Icon or PixelCat illustration | Flat centered layout, `py-12` (`:5-38`) | Decorative mascot `aria-hidden` | `EmptyState.tsx`; section-level empties in feed/profile |
| Card | `<ROOT>\components\ui\Card.tsx` | `Card`, `CardTitle`, `CardDescription` | `pixel-frame bg-card p-6` (`:4-29`) | Plain heading/paragraph semantics | `WorkTile`, `CreatorCard`, `CreationCard` |
| BackLink | `<ROOT>\components\ui\BackLink.tsx` | Single style | `next/link`, min-h-11, border, hover (`:6-25`) | Link semantics; no `aria-label` beyond children | In-page back buttons and browser back (runtime UNVERIFIED) |
| PageHeader | `<ROOT>\components\ui\PageHeader.tsx` | `PageHeader`, `SectionHeader` | `pixel-kicker`, `pixel-title`, action slot (`:4-59`) | Plain `<h1>`/`<h2>` | Ad-hoc page headers in landing/home/profile |

### 3.2 Navigation, feedback and status components

| Component | Source file | Variants / behavior | Keyboard & accessibility | Equivalents / verdict |
| --- | --- | --- | --- | --- |
| SiteHeader | `<ROOT>\components\layout\SiteHeader.tsx` | Guest top bar; member switches to desktop sidebar + mobile tab bar (`:15-44`) | `aria-label` on nav; brand link labeled | `SiteNav` + `SocialNav` are separate nav systems — PARTIAL |
| SiteNav | `<ROOT>\components\layout\SiteNav.tsx` | Desktop links, guest CTAs, account menu; active = underline (`:33-124`) | `aria-current`, `aria-expanded`, `aria-controls`, Escape/outside close (`:41-55,78-85`) | `SocialNav` active pill — PARTIAL |
| SocialNav | `<ROOT>\components\layout\SocialNav.tsx` | `SocialSidebar` (desktop `w-64`) + `SocialTabBar` (`md:hidden`) (`:100-239`); `AppTabBar` in `SiteNav.tsx:209-312` is unused | `aria-current`, `aria-label`; desktop badge hard-coded to 3 with Indonesian-only label (`SocialNav.tsx:87-96`) | Separate active-state logic from `SiteNav`; badge is INCONSISTENT — PARTIAL |
| LanguageSwitch | `<ROOT>\components\layout\LanguageSwitch.tsx` | Locale switch preserving path | Native control semantics | Used in both nav systems |
| Toast | `<ROOT>\components\social\Toast.tsx` | Context provider; tones `success|error|info`; max 2 visible, 2600 ms timer (`:6-35`) | `role="status"`, `aria-live="polite"` (`:42-45`); no manual dismiss | Inline `Alert`; PARTIAL because older messages can be dropped |
| Skeleton families | `<ROOT>\components\social\Skeleton.tsx`, `components\ui\RouteSkeletons.tsx`, `components\creations\PageSkeletons.tsx` | Multiple purpose-built skeletons | `RouteSkeleton` has `role=status`/`aria-busy`; others not consistently | INCONSISTENT |
| StudioContextMenu | `<ROOT>\components\creations\StudioContextMenu.tsx` | Fixed-position menu, separators, danger items; Escape + outside pointerdown + focus first button (`:37-71,75-111`) | `role="group"`, `role="separator"`, focus first enabled button; no arrow-key roving | `CreationMoreMenu` uses a different menu pattern — PARTIAL |
| CornerBusy | `<ROOT>\components\layout\CornerBusy.tsx` | Global busy indicator driven by `lib/global-busy.ts` | ARIA live/status not verified in inspected ranges | Ad-hoc form pending states — UNVERIFIED/PARTIAL |
| PullToRefresh | `<ROOT>\components\social\PullToRefresh.tsx` | Touch gesture wrapper for feed | Keyboard equivalent not found | Mobile-specific; NOT_APPLICABLE on desktop |
| Infinite list hook | `<ROOT>\components\social\useInfiniteList.ts` | Shared by HomeFeed and ExploreInfinite | Load-more button/link behavior | Reasonably consistent; runtime UNVERIFIED |
| Icons | `<ROOT>\components\ui\PixelIcon.tsx`, `pixelarticons/react`, `lucide-react`, inline SVGs | Multiple icon sets | Mostly `aria-hidden` on decorative icons | INCONSISTENT icon language |

### 3.3 Domain-specific components

| Area | Representative files | Consistency note |
| --- | --- | --- |
| Artwork cards | `CreationCard.tsx`, `WorkTile.tsx`, `CreatorCard.tsx` | Three card families with different borders, radii and action rows; `CreatorCard` has evidence-backed refinements but remains separate — PARTIAL |
| Creation forms | `PixelNewForm.tsx`, `PlaygroundForm.tsx`, `StudioForm.tsx` | Three entry/edit paths; only pixel path has the modern Studio — INCONSISTENT |
| Community | `CreationCommunity.tsx`, `CommentPanel.tsx`, `FollowButton.tsx`, `ReportDialog.tsx`, `ResponsesInbox.tsx` | Reuses Dialog/Alert/Button but maintains local optimistic state — PARTIAL |
| Auth / account | `AuthShell.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `PasswordField.tsx`, `AccountSecurity.tsx`, `SettingsForm.tsx` | Uses shared primitives but overrides them through `.auth-flat` CSS — INCONSISTENT |
| Share | `CreationShareDialog.tsx`, `ShareBrandIcons.tsx`, `lib/share-*` | One dialog with platform-specific branches; Discord is copy-link, Instagram is file export — PARTIAL |
| Moderation | `AdminReports.tsx` | Uses shared Dialog/Alert/Button; thin dedicated test coverage — PARTIAL |
| PWA | `PwaInstall.tsx`, `PwaRegister.tsx`, `public/sw.js`, `public/offline.html` | Conservative caching; editor excluded from page cache; offline shell English-first with hard-coded colors; no full offline editing — PARTIAL |
| Filter / tab chips | `ui/FilterChip.tsx`, `social/Pill.tsx` (`TabLink`) | `FilterChip` is square with `aria-current`; `Pill` is rounded and also uses `aria-current`. Same concept, two visual contracts — PARTIAL |
| Social action / list helpers | `social/socialAction.ts`, `MosaicGrid.tsx`, `CreatorLine.tsx` | Shared 44px focus-visible action class, two/four-column mosaic with list semantics, single identity row with `<time>` — CONSISTENT |
| Auth decoration | `components/auth/AuthDoodlePad.tsx` | Pointer-only 24×24 canvas with `aria-pressed` swatches; no keyboard drawing path — PARTIAL |
| Share dialog | `components/share/CreationShareDialog.tsx`, `ShareBrandIcons.tsx` | One `Dialog tone="social"` with platform branches, `aria-pressed`/`aria-expanded`, role=status errors; brand SVGs are intentionally non-pixel — PARTIAL |

---

## 4. Interaction Standards Currently Used

### 4.1 Navigation

- **VERIFIED:** Active state is derived from `usePathname()` plus `stripLang()` in both `SiteNav.tsx:26-30` and `SocialNav.tsx:101-104`. Prefix matching means `/create/[id]` keeps Create active.
- **INCONSISTENT:** `SiteNav` renders active links with `text-fg underline decoration-sky decoration-4` (`SiteNav.tsx:57-61`); `SocialNav` renders them with a filled purple pill (`SocialNav.tsx:129-134`). Same concept, different visual contract.
- **VERIFIED:** Member header is hidden at `md+` and replaced by a left rail; mobile keeps a bottom tab bar (`SiteHeader.tsx:18,37-44`; `SocialNav.tsx:228-230`). This is a deliberate two-navigation layout, not a duplicate by accident.
- **VERIFIED:** `AppTabBar` exists in `SiteNav.tsx:209-312` but is not rendered by `SiteHeader`; the active bottom tab bar is `SocialTabBar`. There is no duplicate bottom-nav issue, only dead code.
- **INCONSISTENT:** The desktop sidebar notification badge is hard-coded to `3` with an Indonesian-only `aria-label="3 notifikasi baru"` (`SocialNav.tsx:87-96`), while the real badge condition is boolean and the mobile tab bar uses localized unread text (`SocialNav.tsx:73,154,238,261-263`).
- **UNVERIFIED:** Browser back/forward behavior, scroll restoration and view-transition focus behavior. `instant = false` appears in 21 route files, but no runtime trace was captured.
- **PARTIAL:** `BackLink` is the only shared in-page back primitive (`BackLink.tsx:6-25`); some pages use their own back buttons or rely on browser history.

### 4.2 Buttons

- **INCONSISTENT:** Two official button style APIs coexist. `buttonClassName` has `primary/secondary/outline/ghost` (`Button.tsx:4-13`); `socialButtonClass` has `solid/brand/soft/ghost` (`socialButton.ts:3-8`). Geometry is intentionally different (pixel-frame vs flat social), but there is no shared token or size contract.
- **VERIFIED:** Both define `sm/min-h-9`, `md/min-h-11`, `lg/min-h-12` and disabled opacity (`Button.tsx:15-19,34-39`; `socialButton.ts:10-31`).
- **INCONSISTENT:** Neither has a loading variant. Callers use `useActionState` pending booleans with ad-hoc `disabled` and `opacity` (e.g., `AccountSecurity.tsx:50-53`), so loading feedback differs by page.
- **UNVERIFIED:** Focus-visible styling exists on inputs and Studio controls, but a uniform button focus ring across both button systems was not confirmed.

### 4.3 Modal & dialog

- **VERIFIED:** `Dialog` uses native `<dialog>` with `showModal()`/`close()`, `aria-labelledby`, `onClose`, and closes when the backdrop itself is clicked (`Dialog.tsx:33-61`).
- **PARTIAL:** Escape is supplied by native dialog behavior and triggers `onClose`; no explicit `keydown` handler was found in `Dialog.tsx`.
- **UNVERIFIED:** Focus restoration to the trigger after close and body scroll locking are not explicitly implemented. Native modal dialogs provide some top-layer behavior, but this was not browser-tested.
- **VERIFIED:** `StudioContextMenu` explicitly handles Escape, outside `pointerdown` (capture), viewport clamping, and focuses the first enabled button (`StudioContextMenu.tsx:37-71`).
- **PARTIAL:** No arrow-key roving focus is implemented; the menu uses `role="group"` rather than `role="menu"` (`StudioContextMenu.tsx:78`).

### 4.4 Dropdown & popover

- **VERIFIED:** `SiteNav` account menu closes on Escape and outside pointerdown (`SiteNav.tsx:41-55`) and exposes `aria-expanded`/`aria-controls` (`:118-120`).
- **VERIFIED:** Studio context menu has equivalent Escape/outside handling plus first-item focus.
- **INCONSISTENT:** `CreationMoreMenu`, share dialog "More options", and Studio context menu each implement their own open/close state and styling; no shared popover primitive exists.
- **UNVERIFIED:** Keyboard navigation order and focus return for each of those menus.

### 4.5 Forms

- **VERIFIED:** Shared fields render label, hint, error, `aria-invalid`, `aria-describedby`, and `role="alert"` (`Input.tsx:20-55`; `Textarea.tsx:12-44`).
- **VERIFIED:** Auth and account forms use React `useActionState` for pending/error state (`AccountSecurity.tsx:50-53`; `RegisterForm.tsx` per lint/evidence). Validation rules live in `features/*` and `lib/validations/*` with Zod schemas.
- **INCONSISTENT:** Feedback surfaces differ: inline field errors, `Alert` with `flat`, `Alert` with pixel frame, and Toast are all used for similar "something happened" messages (`Alert.tsx:14-33`; `Toast.tsx:42-62`).
- **UNVERIFIED:** Actual network-failure and offline submission behavior in a browser; source shows offline checks in Studio persistence only.

### 4.6 Keyboard shortcuts

- **VERIFIED (Studio only):** Global handler is installed only when `variant === "studio"` (`PixelBoard.tsx:3125-3126`). It ignores events when typing in input/textarea/select/contenteditable or when any `dialog[open]` exists (`:3132-3134`).
- **VERIFIED:** Modifiers: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z` redo, `Ctrl/Cmd+A/C/X/V` select-all/copy/cut/paste (`:3173-3206`).
- **VERIFIED:** Tool shortcuts: `b,c,e,h,i,g,p,l,u,o,q,t,n,v,w,k,s,y` map to pencil, circle, eraser, pan, eyedropper, fill, polygon, line, rect, ellipse, bezier, text, gradient, select, contiguous, color, lasso, polygon-select (`:3309-3327`). Plain `y` is polygon select while `Ctrl/Cmd+Y` is redo; the modifier disambiguates it.
- **VERIFIED:** Brush size `[`/`]`, grid `'`, selection grow/shrink with `Shift+[`/`Shift+]`, Space pan, Alt sample, arrow nudge (Shift = larger step), Escape/Enter/Delete context actions (`:3135-3142,3252-3270,3328-3344`).
- **VERIFIED:** Shortcut-driven tool changes tag the source so DOM focus can move to the new rail button (`:3307-3309`), which is explicit mouse/keyboard parity.
- **PARTIAL:** No in-app shortcut discoverability panel was found; documentation is `docs/studio/03_TOOL_DOCUMENTATION.md`, which itself is `PARTIAL`.
- **NOT_APPLICABLE:** No global application shortcuts outside Studio were found.

### 4.7 Application states

| State | Standard currently used | Verdict |
| --- | --- | --- |
| Loading | 15 `loading.tsx` files; several skeleton families; global busy event bus (`lib/global-busy.ts`) | PARTIAL |
| Empty | `EmptyState` (pixel frame) and `SocialEmptyState` (flat mascot) | INCONSISTENT |
| Error | `Alert` (`role=alert/status`), inline field errors, `app/error.tsx`, `app/not-found.tsx` | PARTIAL |
| Success | Toast (`role=status`, `aria-live=polite`, max 2, 2600 ms) plus inline alerts | PARTIAL |
| Offline / network failure | Service worker skips auth/api/editor paths; Studio checks `navigator.onLine` and keeps dirty state; local draft recovery exists | PARTIAL / UNVERIFIED runtime |

### 4.8 Social, auth and PWA interaction patterns

- **CONSISTENT:** Social interactions use explicit state contracts: optimistic like with rollback and toast (`FeedPost.tsx:99-109`), Ctrl/Cmd+Enter comment submit with viewer gating and retry (`CommentPanel.tsx:203-239`), progressive-enhancement infinite scroll with manual pagination fallback (`ExploreInfinite.tsx:46-52,169-276`), and pull-to-refresh guarded by scroll position and non-canvas targets (`PullToRefresh.tsx:25-36,100-171`).
- **CONSISTENT:** Route guards for member and admin areas are source-verified (`(member)/layout.tsx:10-30`, `(admin)/layout.tsx:11-27`).
- **PARTIAL:** Auth pages share `AuthShell`, fields, `Alert`, `Button` and `.auth-flat` styling, but `AuthDoodlePad.tsx:35-146` is pointer-only; no keyboard drawing path was found.
- **PARTIAL:** PWA registration is production-only, editor routes are excluded from page caching, and SW fetch policy is conservative (`PwaRegister.tsx:15-69`, `sw.js:49-96,98-133`); however `offline.html:1-79` is English-first with hard-coded colors, and the cover-cache shape guard is not auth-header-aware (`sw.js:85-96,146-177`).
- **UNVERIFIED:** PWA and Studio named tests are source assertions only, not browser execution (`tests/pwa.test.ts`, `tests/studio-camera-and-tool-focus.test.ts`).

---

## 5. Visual Consistency Findings

| Topic | Finding | Classification | Evidence |
| --- | --- | --- | --- |
| Typography | DM Sans for body/UI, Press Start 2P reserved for short titles/decoration; this matches the design system's intent | CONSISTENT | `globals.css:24-40`; `docs/PIXEL-ART-DESIGN-SYSTEM.md:11-25` |
| Color tokens | Documented palette and live CSS tokens use different hex values (Paper `#FFFDF7` vs `--bg #f8f9fc`; Ink `#282B35` vs `--fg #1e1b4b`; Brick `#E94B3C` vs `--brick #f43f5e`) | INCONSISTENT | `docs/PIXEL-ART-DESIGN-SYSTEM.md:31-40`; `globals.css:5-16` |
| Token scopes | Light `:root`, social `:root`, `.auth-flat` overrides, and Studio dark `[data-chrome="playground"]` coexist | INCONSISTENT | `globals.css:4-22,101-140,962-968,1019-1051` |
| Border radius | Mix of `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`, and pixel-frame borders | PARTIAL | `Button.tsx:15-19`; `Dialog.tsx:51-52`; `Card.tsx:7` |
| Shadows | `pixel-frame` hard border vs `shadow-sm` vs Studio multi-layer shadows | INCONSISTENT | `Card.tsx:7`; `Button.tsx:6-10`; `globals.css:134-136` |
| Icons | `PixelIcon`, `pixelarticons/react`, `lucide-react`, and inline SVG logout icon are all used | INCONSISTENT | `SocialNav.tsx:6,192-207`; `ui/PixelIcon.tsx`; `ShareBrandIcons.tsx` |
| Button dimensions | Common `min-h-11` baseline, but `min-h-9/10/12` variants and Studio `--studio-hit` 44px desktop / 36px mobile | PARTIAL | `Button.tsx:15-19`; `socialButton.ts:10-14`; `globals.css:101-114,149-157` |
| Component density | Social/auth surfaces are comfortable; Studio deliberately compacts spacing and controls | PARTIAL (intentional but undocumented as one system) | `globals.css:95-140`; `PlaygroundForm.tsx:1436-1437` |
| Responsive breakpoints | Tailwind `sm/md/lg` plus custom `48rem`, `767.98px`, `1023.98px` queries; mostly aligned but ad-hoc | PARTIAL | `globals.css:142-158,949-955`; `SiteHeader.tsx:18,39` |
| Light/dark theme | No global dark theme or user toggle found; `color-scheme: light`; dark chrome is scoped to the Playground overlay | NOT_APPLICABLE (not a supported global theme) | `globals.css:22,101-140` |
| Motion | `prefers-reduced-motion` rule exists globally and for `.auth-flat` | CONSISTENT (source) | `globals.css:911,1047` |
| Focus ring | Global `:focus-visible` uses a 3px Sky outline with offset; Studio overrides with a 2px accent outline | PARTIAL | `globals.css:558-562`; `globals.css:442-447` |
| Root fallback chrome | `app/not-found.tsx` duplicates fonts and hard-codes `lang = "id"` instead of using localized shell | PARTIAL | `app/not-found.tsx:21-52` |

**Most visible drift:** the product claims one visual identity, but the CSS actually contains four styling scopes. This is not a single broken page; it is a systemic mismatch between the written palette and the implemented tokens.

---

## 6. Cross-Page Consistency Matrix

Statuses follow the required vocabulary. "Layout" means shell/nav placement; "Interaction" means buttons/dialogs/forms/feedback; "Component" means reuse of shared primitives; "A11y" means source-visible ARIA/semantics, not WCAG certification.

| Route | Layout | Navigation | Interaction | Component | Responsive | A11y | Evidence note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | CONSISTENT | PARTIAL | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | Guest header + tab bar; social primitives |
| `/home` | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Two nav systems; feed-specific feedback |
| `/explore` | CONSISTENT | PARTIAL | PARTIAL | INCONSISTENT | PARTIAL | PARTIAL | Empty-state families differ; filters custom |
| `/creators` | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | UNVERIFIED | Fluid cards verified; `<img>` warning |
| `/space` | CONSISTENT | PARTIAL | INCONSISTENT | INCONSISTENT | PARTIAL | PARTIAL | Custom SVG board, secondary path |
| `/creation/[id]` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | CONSISTENT | PARTIAL | Shared detail chrome and dialogs |
| `/u/[username]` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Suspense/skeleton mix |
| `/login` | CONSISTENT | CONSISTENT | PARTIAL | INCONSISTENT | CONSISTENT | PARTIAL | `.auth-flat` overrides shared fields |
| `/register` | CONSISTENT | CONSISTENT | PARTIAL | INCONSISTENT | CONSISTENT | PARTIAL | Same auth scope; pending ad hoc |
| `/forgot-password` | CONSISTENT | CONSISTENT | PARTIAL | INCONSISTENT | CONSISTENT | PARTIAL | Alert warning + shared fields |
| `/reset-password` | CONSISTENT | CONSISTENT | PARTIAL | INCONSISTENT | CONSISTENT | PARTIAL | PasswordField + auth scope |
| `/verify-email` | CONSISTENT | CONSISTENT | PARTIAL | INCONSISTENT | CONSISTENT | PARTIAL | Alert status only |
| `/dashboard` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Member rail; SocialEmptyState |
| `/create` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Picker dialog; creation rails |
| `/create/[id]` (pixel Studio) | INCONSISTENT | NOT_APPLICABLE | PARTIAL | INCONSISTENT | PARTIAL | PARTIAL | Fullscreen dark overlay replaces shell chrome |
| `/create/[id]` (legacy) | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | `StudioForm` inside normal shell |
| `/responses` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Inbox-specific state |
| `/settings` | CONSISTENT | CONSISTENT | PARTIAL | INCONSISTENT | PARTIAL | PARTIAL | Flat alerts override pixel frame |
| `/welcome` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Onboarding gate route |
| `/admin` | CONSISTENT | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Admin gate; report table |
| Root not-found | PARTIAL | NOT_APPLICABLE | PARTIAL | PARTIAL | NOT_APPLICABLE | PARTIAL | Standalone HTML; hard-coded `lang="id"`; duplicated fonts |
| Localized not-found / error | PARTIAL | NOT_APPLICABLE | CONSISTENT | PARTIAL | PARTIAL | PARTIAL | Localized copy and recovery actions; no full shell chrome |
| Metadata routes | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | sitemap/robots/manifest/icon |
| `/auth/callback`, `/auth/recovery` | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | Route handlers |
| `/api/**` | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | Route handlers |

**Pattern:** public/auth/member pages are mostly `CONSISTENT` at the shell level but `PARTIAL` at the interaction level. The only route that is structurally `INCONSISTENT` with the rest is the pixel Studio; that is intentional chrome separation, but it needs an explicit contract.

---

## 7. Studio Interaction Findings

### 7.1 Tool selection and tool rail

- **VERIFIED:** `PlaygroundForm` owns the tool rail (`playground-tool-rail`) and passes tool changes to `PixelBoard`; `PixelBoard` handles shortcuts and calls `chooseTool(next, "shortcut")` (`PixelBoard.tsx:3307-3327`).
- **PARTIAL:** The current rail has 22 buttons with mixed grouping (documented in `docs/studio/04_WORKSPACE_REDESIGN_REPORT.md`), and mobile moves tools into a scrollable bottom toolbar capped at `45vh` (`PlaygroundForm.tsx:1799`).
- **PARTIAL:** Focus is moved to the rail button when a shortcut selects a tool (`:3307-3309`), which is a real mouse/keyboard parity measure.

### 7.2 Inspector, canvas and panels

- **VERIFIED:** Right side is `StudioInspector` + `LayerPanel` in one scrolling column; left is tool rail; stage is `PixelBoard` + `StudioMinimap`; bottom is a status bar only (`docs/studio/04_WORKSPACE_REDESIGN_REPORT.md`).
- **PARTIAL:** Layer panel supports one-level groups, rename, lock and style controls (`LayerPanel.tsx`, `lib/pixel-groups.ts`). Drag/pointer behavior is source-only and explicitly marked "needs browser" in `docs/studio/05_LAYER_GROUP_UX.md:48`.
- **NOT_IMPLEMENTED:** No timeline, frames, animation, or reference images (`docs/studio/04_WORKSPACE_REDESIGN_REPORT.md`).

### 7.3 Selection, text and editing

- **VERIFIED:** Selection supports rect/ellipse/lasso/wand/color/polygon and combine modes; arrows nudge selected content, Shift increases step (`PixelBoard.tsx:3252-3264`).
- **VERIFIED:** Enter finishes polygon selection or applies a shape draft; Escape cancels drafts/current move; Delete/Backspace removes selected text or polygon vertex (`:3294-3305,3209-3249,3266-3270`).
- **VERIFIED:** Text tool has dedicated handling when active: Escape deselects, Delete/Backspace deletes, Enter starts editing, arrows nudge (Shift = 8px) (`PixelBoard.tsx:3144-3171`). The overlay is `TextEditOverlay.tsx`; source round-trip is covered by `lib/pixel-text/persistence.test.ts`.
- **PARTIAL:** No browser verification of textarea overlay focus/IME behavior.

### 7.4 Undo/redo, zoom/pan, history

- **VERIFIED:** `lib/pixel-history.ts` caps history at 32 steps and 48 MiB of unique buffers; shortcuts are `Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` (`PixelBoard.tsx:3173-3181`).
- **VERIFIED:** Space enables temporary pan, Alt enables composited color sampling; grid toggles with `'`; brush size with `[`/`]` (`PixelBoard.tsx:3135-3142,3334-3344`).
- **PARTIAL:** Zoom/pan/minimap rendering is source-verified but not runtime-profiled.

### 7.5 Context menus and keyboard focus

- **VERIFIED:** `StudioContextMenu` closes on Escape and outside pointerdown, clamps itself to viewport, and focuses the first enabled button (`StudioContextMenu.tsx:37-71`).
- **PARTIAL:** It uses `role="group"` with `role="separator"` children instead of `role="menu"`/`menuitem`, and has no arrow-key roving focus (`:78-109`).
- **UNVERIFIED:** Focus return after menu dismissal.

### 7.6 Health signals specific to Studio

- **VERIFIED:** All 27 lint errors are in interaction-heavy components, with 12 in `PlaygroundForm.tsx` (`react-hooks/refs` reads during render and `set-state-in-effect`), 4 in `CreationMoreMenu.tsx`, 3 in `CornerBusy.tsx`, 2 in `CreationShareDialog.tsx`, and one each in `ColorPicker`, `DocumentPaletteDialog`, `ImportPixelArtDialog`, `RegisterForm`, `SettingsForm` and `PwaInstall`.
- **VERIFIED:** TypeScript and 842 tests pass, but tests are node/static-contract based; there is no DOM runner. Studio interaction correctness in a browser is **UNVERIFIED**.

---

## 8. Accessibility Findings

| Finding | Status | Evidence |
| --- | --- | --- |
| Nav links expose `aria-current` and icon links/buttons expose `aria-label` | CONSISTENT | `SiteNav.tsx:78-85,118-120`; `SocialNav.tsx:126-155,235-239` |
| Global `:focus-visible` ring and explicit 44px social action focus ring | CONSISTENT | `globals.css:558-562`; `socialAction.ts:1-6` |
| Desktop notification badge hard-codes a count and Indonesian-only label | INCONSISTENT | `SocialNav.tsx:87-96` vs `:73,154,238,261-263` |
| Auth doodle pad has `aria-pressed` swatches but no keyboard drawing path | PARTIAL | `AuthDoodlePad.tsx:35-146` |
| Root fallback not-found hard-codes `lang="id"` | PARTIAL | `app/not-found.tsx:21-52` |
| Toast is announced politely via `role="status"` / `aria-live="polite"` | CONSISTENT | `Toast.tsx:42-45` |
| Form fields expose labels, `aria-invalid`, `aria-describedby`, and `role="alert"` errors | CONSISTENT | `Input.tsx:20-55`; `Textarea.tsx:12-44` |
| Dialog has `aria-labelledby` and native modal semantics | PARTIAL | `Dialog.tsx:44-61`; no explicit focus return/scroll lock found |
| Studio context menu focuses first item but is not a full menu pattern | PARTIAL | `StudioContextMenu.tsx:68-71,78-109` |
| Buttons have no standard loading/`aria-busy` contract | INCONSISTENT | `Button.tsx:34-39`; `socialButton.ts:26-31` |
| `appearance` props on shared fields are dead API and may mislead implementers | PARTIAL | `Input.tsx:8,17`; `Textarea.tsx:8,11` |
| Reduced-motion handling exists globally and in auth scope | CONSISTENT | `globals.css:911,1047` |
| One `<img>` lint warning remains on the creators page | UNVERIFIED / PARTIAL | lint output for `(public)/creators/page.tsx` |
| Color/contrast of Studio dark chrome and social tokens | UNVERIFIED | no browser or contrast audit performed |
| Keyboard shortcut discoverability in-product | UNVERIFIED | only `docs/studio/03_TOOL_DOCUMENTATION.md`, itself `PARTIAL` |
| WCAG conformance overall | UNVERIFIED | no audit tool or browser run executed |

---

## 9. Critical UX Problems

Ordered by user impact, not by cosmetics.

1. **No single button/loading contract — INCONSISTENT.** Two button systems plus ad-hoc Studio/nav buttons; pending states are invented per form. Users see different disabled/loading affordances for equivalent actions.
2. **Four parallel styling scopes — INCONSISTENT.** Light root, social tokens, auth-flat overrides, and Studio dark chrome coexist, and live hex values do not match the documented palette.
3. **Duplicate empty/loading families — INCONSISTENT.** At least seven skeleton components and two empty-state components serve similar roles with inconsistent ARIA attributes.
4. **Dialog/menu focus behavior is incomplete — PARTIAL.** Native dialog helps, but no explicit focus return or scroll lock was found; Studio menu lacks full menu semantics and arrow-key navigation.
5. **Studio interaction layer is fragile — PARTIAL / UNVERIFIED.** Two very large client components own nearly all editor behavior; all 27 lint errors cluster in this area. Shortcuts are powerful but undocumented in-product.
6. **Form feedback is fragmented — PARTIAL.** Inline errors, flat alerts, pixel-frame alerts and toasts all communicate similar states without a decision rule.
7. **Navigation visual language is split — PARTIAL.** Header underline vs sidebar pill active states; both are accessible but teach different visual rules. `AppTabBar` is dead code (`SiteNav.tsx:209-312`).
8. **Hard-coded notification badge — INCONSISTENT.** The desktop sidebar always shows `3` with an Indonesian-only label (`SocialNav.tsx:87-96`) regardless of the real boolean unread state.
9. **Runtime proof is missing — UNVERIFIED.** Phase 8 and Studio browser checklists are open; no conclusion about actual focus, scroll, transition or offline behavior is supportable.
10. **Offline/network expectations are unclear — PARTIAL.** PWA explicitly excludes editor routes; local drafts are recovery-only, explicit-save is easy to miss, and the offline shell is English-first with hard-coded colors (`offline.html:1-79`).
11. **Icon language is mixed — INCONSISTENT.** PixelIcon, pixelarticons, lucide-react and inline SVGs are all present.
12. **Stale audit claims can mislead — INCONSISTENT.** `docs/INSTANT-INTERACTION-AUDIT.md:43-49` claims no `loading.tsx` exists, contradicted by 15 route loading files.

---

## 10. Recommended Standardization Priorities

Recommendations only. Nothing below was implemented during this audit.

1. **P0 — Define one action/loading contract.** Decide whether `Button` or `socialButtonClass` is canonical, or document exactly when each is valid. Add a single loading/pending convention (`aria-busy`, disabled, label preservation) before changing any component. Do not refactor first.
2. **P0 — Reconcile tokens on paper.** Decide whether `PIXEL-ART-DESIGN-SYSTEM.md` or `globals.css` is authoritative for hex values. Document Studio dark chrome as an intentional scoped exception, not a second theme.
3. **P0 — Close focus-management gaps.** Specify focus return, scroll lock and Escape behavior for dialogs, account menus, share menus and Studio context menus. Verify with a browser before claiming compliance.
4. **P0 — Complete the open runtime gates.** Phase 8 and the Studio WR/layer-group browser checklists must be run before any UX claim moves from `PARTIAL` to `CONSISTENT`.
5. **P0 — Correct or remove hard-coded UI state.** The notification badge must be driven by the same unread signal as the mobile tab bar and localized in both locales (`SocialNav.tsx:87-96`); remove dead `AppTabBar` only when touching that file.
6. **P0 — Mark stale audit claims as outdated.** `INSTANT-INTERACTION-AUDIT.md` must not be read as current state until its `loading.tsx` claim is corrected or the document is explicitly superseded.
7. **P1 — One loading/empty/error contract.** Choose one skeleton family and one empty-state family per surface class (page vs section vs feed), with consistent `role`/`aria-busy` usage.
8. **P1 — Document Studio as a separate chrome with shared rules.** Keep its dark tokens and dense controls, but specify which primitives it may reuse, how shortcut focus moves, and how `y`/`Ctrl+Y` and dialog guards behave.
9. **P1 — Unify form feedback decision rules.** Field error, form-level error, success and pending should each have one prescribed surface. Remove or implement the dead `appearance` prop only when touching those files.
10. **P1 — Decide the legacy creation path.** `StudioForm`, `PixelNewForm` and `PlaygroundForm` cannot remain equally "current" without confusing feature work. Freeze or migrate legacy types explicitly.
11. **P2 — Pick one icon set per surface class.** Pixel art for brand/Studio, one line/icon library for utility UI, with `aria-hidden` on decorative icons.
12. **P2 — Localize the offline shell and tokenise its colors.** `public/offline.html:1-79` is English-first and hard-codes colors instead of using product tokens.
13. **P2 — Resolve lint debt in interaction code.** Treat the React 19 hook errors as correctness work, not style cleanup, starting with `PlaygroundForm.tsx` and `CreationMoreMenu.tsx`.
14. **Do not touch:** running production, Supabase policies/migrations, signed-off specs, evidence records, pre-existing uncommitted work, or any A3–A5/B6/Challenge/Pixel Assets implementation without explicit founder authorization.

---

## Verification Notes

- "Source-verified" means the code path and attributes were inspected directly; it does not mean the behavior was observed in a browser.
- "UNVERIFIED" means this audit did not execute the user flow, production environment or an accessibility tool.
- This report is an audit artefact only. It contains no redesign, CSS, component or behavior changes.
- The final route/UI/interaction subagent report was received after the first draft and its source-verified findings (hard-coded badge, dead `AppTabBar`, social pattern strengths, pointer-only auth doodle, PWA/offline limitations, root fallback locale, stale `loading.tsx` doc claim) were integrated here.
- Two companion **PROPOSAL** specs were created from these findings: `docs/audit/UI_INTERACTION_SPEC.md` and `docs/audit/STUDIO_INTERACTION_SPEC.md`. They are not implementation authorization.

---

## 11. Post-audit execution addendum (2026-11-25, after this report)

The owner later approved phased execution of `docs/audit/UI_INTERACTION_SPEC.md` using its recommended defaults (UI spec only; Studio deliberately stays dark per owner decision). The tables above remain the audit-time snapshot; this section records what changed in source afterwards.

| Audit finding | Action taken | Evidence | Runtime |
| --- | --- | --- | --- |
| Hard-coded desktop notification badge (`count = 3`, Indonesian-only label) | Replaced with a boolean-driven decorative dot; unread text moved to a localized `aria-label` on the sidebar link | `SocialNav.tsx:87-94,126,152` | UNVERIFIED |
| Dead `AppTabBar` in `SiteNav.tsx` | Removed; tests now assert the single `SocialTabBar` | `SiteNav.tsx` (no `AppTabBar`); `tests/auth-next.test.ts`, `tests/ux-platform.test.ts`, `tests/works-home.test.ts` | n/a (source) |
| No loading contract on shared `Button` | Added `loading` prop → `disabled`, `aria-busy`, `data-loading` | `components/ui/Button.tsx` | UNVERIFIED |
| Dead `appearance` prop on `Input`/`Textarea` | Removed from both components and all call sites | `Input.tsx`, `Textarea.tsx`, 5 consumer files | n/a (source) |
| No dialog focus return or scroll lock | Trigger focus restoration on every close path, plus a shared counter-based body scroll lock | `components/ui/Dialog.tsx` | UNVERIFIED (no browser run) |
| Stale `loading.tsx` claim in `INSTANT-INTERACTION-AUDIT.md` | Document header marked OUTDATED / historical | `docs/INSTANT-INTERACTION-AUDIT.md:3` | n/a |

- New source-contract test: `tests/ui-standardisation.test.ts`.
- Checks after execution: `npm run typecheck` PASS; `npm test` PASS (106 files / 848 tests, including the new contract test); `npm run lint` unchanged at 27 errors / 21 warnings (no new issues introduced).
- At the end of phase 1, `next build` and browser / Phase 8 validation remained **NOT EXECUTED** (phase 2 build result below).
- Still open after Phase 1: token authority (U3), loading/empty/error families, success-feedback rules, offline shell localization, root not-found localization, custom menu focus patterns, icon-set choice, legacy creation path, lint debt, and all runtime verification.

### Phase 2 (2026-11-25, full scope including the menu rework)

| Audit finding | Action taken | Evidence | Runtime |
| --- | --- | --- | --- |
| Custom product menus had no ARIA menu semantics or roving focus (audit §2.2 / §10) | Full `role="menu"` + `menuitem`, arrow roving with wrap, Home/End, Escape + focus return, Tab closes without swallowing default movement; shared helper | `components/ui/menuKeyboard.ts`, `SiteNav.tsx`, `WorksRow.tsx`, `WorksDeleteButton.tsx` | UNVERIFIED (source-tested only) |
| Toast had no manual dismiss and could drop older messages (audit §8) | Localized dismiss button; dismiss clears the pending timer; max-2/2600 ms and polite live region unchanged | `components/social/Toast.tsx`, `PublicShell.tsx`, `lib/copy.ts` (`toastDismiss`) | UNVERIFIED |
| Offline shell was English-first with hard-coded colors (audit §4.8) | Static id/en localization via `navigator.language`; colors driven by CSS vars mirroring shipped tokens; `theme-color` kept at manifest value | `public/offline.html` | UNVERIFIED |
| Root not-found hard-coded `lang="id"` | Standalone document kept (pass-through root layout); locale from `Accept-Language` via async `headers()`; q-value-aware helper | `app/not-found.tsx`, `lib/i18n.ts` | UNVERIFIED |
| Palette doc diverged from live CSS (U3) | Doc table reconciled to shipped hexes with a dated note; no pixel change | `docs/PIXEL-ART-DESIGN-SYSTEM.md` §2 | n/a (docs) |
| Fragmented success feedback and competing empty-state families (audit §7 finding 6, §11 table) | U5 feedback rule + U7 two-family/scope rule adopted with complete call-site ticket lists; no call-site migration executed | `UI_INTERACTION_SPEC.md` §4.6.1–4.6.2 | n/a (contract) |
| Mixed icon sets and ambiguous legacy creation path (audit §10 findings 10–11) | Both **frozen** with per-surface rules; existing call sites explicitly not migrated | `UI_INTERACTION_SPEC.md` §4.9 | n/a (decision) |

- Contract tests extended with five Phase 2 source-contract tests plus one real `Accept-Language` unit test (`tests/ui-standardisation.test.ts`).
- Verification after Phase 2: `npm run typecheck` PASS; `npm test` PASS (106 files / 854 tests); `npm run lint` 27 errors / 20 warnings — errors unchanged, one dead phase-1 import warning removed, no new issues. `npm run build` PASS after opting the root not-found out of prerendering (`instant = false`) because request-time `headers()` blocks static shell generation.
- Browser / Phase 8 validation remain **NOT EXECUTED**; every runtime claim above stays `UNVERIFIED`.
- Still open after Phase 2: ticketed U5/U7 call-site migrations (including the third/bespoke empty state in `(member)/dashboard/page.tsx:205-230`), icon migration of existing mixed call sites, lint debt (27 errors / 20 warnings baseline), any legacy creation-type migration (open product decision for the owner), and all runtime verification.
