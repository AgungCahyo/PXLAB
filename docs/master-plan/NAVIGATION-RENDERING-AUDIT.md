# THE COMMONS — Navigation & Rendering Audit (Phase 1)

**Document:** `docs/master-plan/NAVIGATION-RENDERING-AUDIT.md`  
**Roadmap:** `docs/master-plan/ROADMAP — Native-like Navigation & Interaction.md`  
**Status:** Phase 1 complete. Implementation not started.  
**Date:** 22 Nov 2026  
**Scope:** NAV-01–NAV-10  
**Basis:** current working tree (includes the uncommitted auth, studio, and nav fixes). All line numbers refer to this tree.

---

## A. Executive summary

The application already has the most important architectural prerequisite: a single persistent `PublicShell` mounted by the `[lang]` layout. There is **no** route-group layout that would force the whole shell to remount when moving between public and member routes, and there are **no Supabase Realtime subscriptions** to leak.

The disruptive navigation symptoms come from a smaller set of concrete causes:

| Rank | Cause | Evidence | Impact |
|---:|---|---|---|
| 1 | Server work is deliberately opted out of instant navigation on 21 route files, with no `staleTimes` policy | `next.config.ts:25-27`, `instant = false` in 21 files, `connection()` in dynamic queries | Client navigation can block on server rendering; skeletons replace content instead of keeping old content visible |
| 2 | Auth/profile reads are duplicated across shell, layouts, pages, actions, and activity badge | 40 `getCurrentProfile()` call sites; `lib/auth/session.ts:60-75` is not request-cached | Repeated `auth.getUser()` + profile query per route render |
| 3 | React `ViewTransition` retains the old route until `viewTransition.finished` | `components/layout/PageTransition.tsx:5-21`, 9 page usages | Historical nav-loss after studio exit; required the `navigating → null` workaround in `PlaygroundForm` |
| 4 | Feed state is intentionally reset by keys and only Explore restores scroll/items | `home/page.tsx:65,148`, `ExploreGallery.tsx:148`, `ExploreInfinite.tsx:65-128` | Returning to Home resets context; Explore restore can race with smooth scrolling |
| 5 | Full document reloads still exist for language switch and Explore search GET form | `LanguageSwitch.tsx:20-33`, `ExploreGallery.tsx:36` | Shell, Toast state, and scroll state reset |
| 6 | Loading coverage is partial | 8 `loading.tsx` files exist; missing on landing, creators, space, settings, welcome, auth, admin | Blank `main` is plausible on routes with awaited auth/data |
| 7 | Header chrome can briefly flip guest → member | `PublicShell.tsx:27-29` fallback + `:45-59` real header | Visible nav flash and rail-padding change |
| 8 | Studio exit has two capture-phase click participants and a broad click block | `PlaygroundForm.tsx:582-623`, `CornerBusy.tsx:143-179` | Clicks can feel dead while a save/discard is in flight |
| 9 | View-transition animation is mostly unused directionally | only `CreationCard.tsx:46` sets `nav-forward`; no `nav-back` producer | Overhead with little product value; owner already wants it removed |

**Conclusion:** the shell is stable; the perceived reload is primarily a **data/loading/transition** problem, not a missing persistent layout. Phase 1’s exit criterion ("main causes understood and documented") is met. The recommended next implementation is **Phase 6 (remove route transitions) before Phases 3–5**, because transition retention is the direct cause of the reported studio-exit regression.

> Cross-check: `docs/INSTANT-INTERACTION-AUDIT.md` states that no `loading.tsx` exists. That was true when it was written; the current tree has 8 route-level loading files and the earlier statement is now outdated.

---

## B. Route and layout map (NAV-01)

### Actual layout tree

```
app/layout.tsx                      passthrough (returns children)
└── app/[lang]/layout.tsx:63-87     owns <html>/<body>, globals.css, PublicShell
    └── PublicShell.tsx:21-42      ToastProvider, ViewTransitionGuard, backdrop,
                                   header, main, footer, PWA, CornerBusy
        ├── (public)               /, /home, /explore, /creators,
        │                          /space, /creation/[id], /u/[username]
        ├── (auth)                 login, register, forgot/reset/verify
        └── (member)               dashboard, responses, settings, welcome,
                                   create, create/[id]
```

- `app/layout.tsx:3-5` returns `children` and does **not** emit document tags.
- `app/[lang]/layout.tsx:73-85` is the real document owner; `<html data-scroll-behavior="smooth">` at `:77`.
- There is **no** `(public)/layout.tsx` and **no** `(auth)/layout.tsx`. Those route groups add no remount boundary.
- `app/[lang]/(member)/layout.tsx:10-29` and `app/[lang]/admin/layout.tsx:11-26` are guards only; both return `children`.
- `app/[lang]/error.tsx:11-41` and `app/[lang]/not-found.tsx:10-33` render inside `PublicShell`; root `app/not-found.tsx:22-51` has its own `<html>/<body>` and no shell.
- URL strategy: `next.config.ts:37-52` rewrites bare paths to `/id...`; `:53-58` redirects `/id` → `/`. `lib/i18n.ts:9-17` emits `/en...` only for English and `stripLang()` strips `/en|/id`.

### Cache/navigation configuration

- `next.config.ts:25-27`: `cacheComponents: true`, `partialPrefetching: true`.
- Local Next docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`) confirm `instant = false` opts a route out of instant-navigation validation.
- 21 route files set `instant = false`, including `[lang]/layout` indirectly via `(member)/layout.tsx:8`, `admin/layout.tsx:9`, all feed/detail/profile pages, all auth pages, and both create routes.

**Finding NAV-01:** layout ownership is sound. Do not add a public/auth layout wrapper solely to preserve state; it would introduce a new boundary without solving the server/data causes.

---

## C. Navigation mechanisms (NAV-02)

### Client navigation

- `next/link` is used broadly (42 files), including persistent nav:
  - `components/layout/SiteHeader.tsx:27-35`
  - `components/layout/SiteNav.tsx:78-113,150-194,274-307`
  - `components/layout/SocialNav.tsx:108-160,180-214`
- `useRouter().push()` locations:
  - `components/creations/PlaygroundForm.tsx:440-443` (`go()`), leave flow `:445-494`
  - `components/creations/StudioForm.tsx:100-119`
  - `components/profiles/SettingsForm.tsx:100-119`
  - `components/social/FeedPost.tsx:76-80` (guest like → login)
  - `components/canvas/SpaceBoard.tsx:79-83` (`router.refresh()` in `startTransition`)
- No `router.back()`, `.forward()`, `.replace()`, or `.prefetch()` found.

### Full-document navigations

- `components/layout/LanguageSwitch.tsx:20-33` is a plain `<a href>`; switching ID/EN reloads the document and remounts the `[lang]` shell.
- `components/creations/ExploreGallery.tsx:36` is `<form action={href(lang, "/explore")} method="get">`; search/filter submits are document GET navigations.
- Other raw anchors are in-page/share/detail links (e.g. `PlaygroundForm.tsx:1317`, `StudioForm.tsx:296`).

### Server redirects

`redirect()` is used in auth actions (`features/auth/actions.ts:190,243,297,302,386,402,...`), creation actions (`features/creations/actions.ts:244,470,475,489,577,598,621`), route guards (`(member)/layout.tsx:23,27`, `admin/layout.tsx:23`), and callbacks (`app/auth/callback/route.ts:57-110`, `app/auth/recovery/route.ts:26,91`). `notFound()` is also used as control flow in many pages.

**Finding NAV-02:** Link prefetching is available on most content, but its benefit is reduced when the target is `instant = false` and blocks on the server. Language and Explore search remain full loads.

---

## D. Persistent shell (NAV-03)

Owner: `components/layout/PublicShell.tsx:21-42`.

| Element | Mount | Behavior across client route changes |
|---|---|---|
| `ToastProvider` | `:22,41` | Persists; lost only on full document load |
| `ViewTransitionGuard` | `:24` | Always mounted; installer is idempotent |
| `PixelWorldBackdrop` | `:25` | Returns `null` for `/create/[id]` (`PixelWorldBackdrop.tsx:22-44,352-356`); CSS hides it for `[data-chrome="studio"]` (`globals.css:491-494`) |
| Header / nav / rail | `:27-29` via `SiteHeader.tsx:12-48` | Suspense fallback is guest chrome (`:27`); real member chrome resolves in `AuthHeader` (`:45-59`) |
| `SiteFooter` | `:33` | Always mounted; hidden for `[data-chrome="studio"]` |
| `CornerBusy` | `:35-37` | Portals to `document.body`; decorative mark hidden on playground (`globals.css:498-500`) |
| `PwaRegister`, `PwaInstall` | `:38-39` | Always mounted |

`AppTabBar` in `SiteNav.tsx:209-313` is unused; `SiteHeader` renders `SocialTabBar` instead.

**Finding NAV-03:** no nested layout unmounts global UI during normal client navigation. The only shell instability is the deliberate guest fallback in `PublicShell.tsx:27` and full loads from NAV-02.

---

## E. Mount/unmount findings (NAV-04)

### State is preserved by default, but keys force resets

Local Next docs (`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md:15-21`) state that Cache Components uses `<Activity>` to hide rather than unmount routes, preserving state up to 3 routes; an explicit `key` resets a subtree.

Intentional resets in the current tree:

- `app/[lang]/(public)/home/page.tsx:65` — `<Suspense key={`${feed}-${page}`}>`
- `app/[lang]/(public)/home/page.tsx:148` — `key={`${feed}|${page}`}` on `HomeFeed`
- `components/creations/ExploreGallery.tsx:148` — `key={`${feed}|${category}|${q}|${page}`}`

Explore’s outer Suspense boundary is unkeyed (`explore/page.tsx:98-108`) while the key lives on the inner `ExploreInfinite`. This is inconsistent with Home and can retain the outer boundary while resetting the child.

### Transitions live inside page bodies

`components/layout/PageTransition.tsx:5-21` wraps content in React `ViewTransition`. It is used by 9 pages:

- `home/page.tsx:53-69`, `explore/page.tsx:92-111`, `creation/[id]/page.tsx:207-284`
- `u/[username]/page.tsx:74-165`, `creators/page.tsx:46-122`
- `dashboard/page.tsx:51-106`, `responses/page.tsx:47-55`, `settings/page.tsx:52-84`, `welcome/page.tsx:53-58`

Shared chrome is outside these wrappers, so animations apply only to page bodies.

### Studio overlays

- Pixel: `PlaygroundForm.tsx:439-443` sets `navigating = true` then `router.push`; `:1300-1308` returns `null` so the `fixed inset-0 z-[60]` overlay stops covering the destination during a retained transition.
- Text/idea: `StudioForm.tsx:45-54` owns router/dirty/preview state; `:100-103` uses plain `router.push` and does **not** use the same overlay-drop pattern.
- CSS deliberately avoids body-level nav/scroll hiding for playground (`globals.css:79-84`); only decorative and text-studio rules remain body-scoped (`:489-500`).

**Finding NAV-04:** actual remounts are limited and mostly key-driven. The retained-route behavior of `ViewTransition` is the special case that required the studio workaround.

---

## F. Data fetching and cache findings (NAV-05)

### Request caching is narrow

- React `cache()` is used on only four public reads in `features/creations/queries.ts:224,287,429,456`.
- `use cache` appears only in `components/layout/SiteFooter.tsx:4-12`.
- At audit time no `unstable_cache`, `revalidateTag`, `cacheTag`, `staleTimes`, or tag-based invalidation existed in app source. Section U now pins explicit `staleTimes`.
- One external fetch has a time cache: `lib/share-server.ts:88-95` (`revalidate: 3600`).

### Dynamic reads dominate

- `features/creations/queries.ts:174-222`: `await connection()` at `:182`, creations query at `:207`, second `attachCommentCounts()` query at `:211`.
- `features/feed/queries.ts:62-82`: `listPublishedCreations()` then `getEngagement()`; `:18-48` performs a head-count query per creation plus a viewer-like query.
- `features/community/activity.ts:35-158`: `connection()` at `:44`, `getCurrentProfile()` at `:45`, own-creations query at `:56-62`, three activity queries in `Promise.all` at `:69-99`.

### Auth/profile reads are the largest duplicate source

`lib/auth/session.ts:42-49` (`getSessionUserId`) and `:60-75` (`getCurrentProfile`) each create a server Supabase client and call `auth.getUser()`; `getCurrentProfile` then queries `profiles`.

Call sites:

- 40 `getCurrentProfile()` call sites, including `PublicShell.tsx:46`, `(member)/layout.tsx:19`, `home/page.tsx:75`, `explore/page.tsx:131`, `u/[username]/page.tsx:64`, `creation/[id]/page.tsx:94`, `dashboard/page.tsx:44`, `responses/page.tsx:41`, `landing/page.tsx:45`, and many actions.
- 23 `getSessionUserId()` call sites.
- `PublicShell.tsx:46-47` calls `getCurrentProfile()` then `hasUnseenCreationResponses()`, which calls `getCurrentProfile()` again in `activity.ts:45`.

A single member route render can therefore repeat `auth.getUser()` + profile lookup several times before page data is even fetched.

### Detail page

`creation/[id]/page.tsx:40-47` calls `getPublishedCreation(id)` for metadata and `:82-108` calls it again in the page body; the duplicate is intentionally deduped by the React `cache()` wrapper at `queries.ts:456`. Other account-dependent reads on that page are not cached.

### Infinite scroll

- `features/explore/actions.ts:18-62` and `features/feed/actions.ts:16-41` re-run dynamic queries and session/profile work per page, without dedupe against the server-rendered first page.

### Invalidation

`revalidatePath` is used throughout actions (`features/auth/actions.ts:180,186,300,384,401,460,514,533,592`; `features/creations/actions.ts:58-65`; community/profile/space/moderation actions). `features/community/actions.ts:296-298` deliberately skips revalidation because optimistic UI already applied.

**Finding NAV-05:** the problem is not "no cache anywhere"; it is **no explicit cross-navigation stale-content policy** and **no request-scope dedupe for identity reads**. Keep server rendering; add targeted dedupe and define staleness before considering a client-cache library.

---

## G. Scroll behavior (NAV-06)

- Global smooth scrolling: `globals.css:63-67` plus `<html data-scroll-behavior="smooth">` at `[lang]/layout.tsx:77`; reduced-motion override at `globals.css:717-720`. Next detects that attribute and disables smooth scrolling only during its own route-transition scroll.
- Default Next Link scroll behavior still applies everywhere except opted-in Explore links (`scroll={false}`); no `history.scrollRestoration` and no global route scroll reset were added.
- Explore is the only page with explicit restoration:
  - `components/social/ExploreInfinite.tsx` reads `sessionStorage` and restores with `window.scrollTo({ top: saved.y, left: 0, behavior: "instant" })` inside nested `requestAnimationFrame`s (Section V).
  - It saves items/page/scroll on scroll, `pagehide`, and unmount.
  - The resume marker is now set only for links carrying `data-explore-resume` (opted-in tiles and Explore interludes), not for any anchor in the grid.
  - `components/social/useInfiniteList.ts:64-81` provides `restore()` and IntersectionObserver.
- Home feed has no equivalent (`HomeFeed.tsx:57-103`) and is remounted by `home/page.tsx:148`; this is intentional — no generic keeper was added.
- Container scroll locks are local to studio dialogs/rails; `globals.css:79-84` explicitly forbids body-level playground scroll locking.

**Finding NAV-06:** Explore restoration is now scoped to opted-in links and restores with an explicit non-smooth scroll, removing the race with Next's default scroll and CSS smooth scrolling (Section V). Home/Profile/Notifications still have no bespoke restoration, as decided in the change plan.

---

## H. State ownership (NAV-07)

| State | Owner | Notes |
|---|---|---|
| Home feed, page, Explore category/q/feed/page | URL via `searchParams` | `home/page.tsx:37-49,56-62`; `explore/page.tsx:52-67`; good for Back/Forward |
| Loaded infinite-list pages | `useInfiniteList` local state | `components/social/useInfiniteList.ts:16-34,42-58` |
| Explore resume + scroll | `sessionStorage`, 10-minute TTL | `ExploreInfinite.tsx:19-30,68-70,83-128` |
| Similar works | module-level `Map` | `SimilarWorksLazy.tsx:12-16,60-92,119`; public data only, not user-scoped, can be stale |
| Toast | Context in `PublicShell` | `components/social/Toast.tsx:10-29,51-53` |
| Global busy | module store | `lib/global-busy.ts:3-27` |
| Studio drafts/preferences | localStorage/IndexedDB | `lib/creation-metadata-local.ts:87-124`, `lib/pixel-color-memory.ts:6-27`, `lib/pixel-palette-library.ts:215-225` |

No large global store exists. No account-private data was found in public React-cached queries; logout revalidates the full layout (`features/auth/actions.ts:401`).

**Finding NAV-07:** URL-first state is correct. The gap is restoration of non-URL state (Home loaded pages, scroll) and staleness of the module-level similar-works cache. No Keep-Alive library is justified by current evidence.

---

## I. Loading UI (NAV-08)

Route-level `loading.tsx` files now exist for:

- `(public)/home`, `(public)/explore`, `(public)/creation/[id]`, `(public)/u/[username]`
- `(member)/dashboard`, `(member)/responses`, `(member)/create`, `(member)/create/[id]`

Missing route-level fallbacks (at audit time): landing `/`, `/creators`, `/space`, all `(auth)` pages, `/admin`, `(member)/settings`, `(member)/welcome`. These were added in Section T; all 19 page routes now have fallback coverage.

Suspense/skeleton usage:

- Shell guest-header fallback: `PublicShell.tsx:27-29`
- Explore discovery bands with `fallback={null}`: `explore/page.tsx:75-87`
- Explore results: `:98-108` (`TileGridSkeleton`)
- Home results: `home/page.tsx:65` (`FeedSkeleton`)
- Profile: `u/[username]/page.tsx` (`ProfileGridSkeleton`) — at audit time the boundary was too late because works were awaited at `:65`; Section T moves works into async Suspense children
- Detail slots: `creation/[id]/page.tsx:248-273` (conversation, other works, remix)
- Skeleton library: `components/social/Skeleton.tsx:5-84`, `components/creations/PageSkeletons.tsx:8-189`

`useFormStatus` is used in `WorksDeleteButton.tsx:4,13`, `StudioForm.tsx:4,36-42`, `PlaygroundForm.tsx:5,94-100`; `useActionState` is used widely.

**Finding NAV-08:** loading coverage is materially better than the earlier audit claimed, but still partial. The highest-value gaps are profile’s late boundary and the member/auth routes that await identity directly.

---

## J. Realtime and global listeners (NAV-09)

### No Supabase Realtime

No application source uses `.channel()`, `.subscribe()`, `removeChannel`, `postgres_changes`, `presence`, `broadcast`, or `track()`. `lib/supabase/client.ts:4-8` defines a browser client that is effectively unused; `@supabase/realtime-js` is only transitive (`package-lock.json:2255-2257`). Docs treat "no realtime" as deliberate (`docs/TECHNICAL-SPEC.md:569,584`; `docs/PRODUCT-SPEC.md:287,418,468`).

**Finding NAV-09:** the roadmap’s original subscription-leak concern does not exist today. Do not add realtime infrastructure as part of this roadmap.

### Global listener hygiene

| Concern | Install | Cleanup / assessment |
|---|---|---|
| View-transition abort filter | `lib/view-transition-abort.ts:33-60` | No teardown, but idempotent `installed` guard at `:26-31`; pre-hydration install in `instrumentation-client.ts:1-3` |
| `window.fetch` patch | `CornerBusy.tsx:168-177` | Restored at `:180-185` |
| Document click capture | `CornerBusy.tsx:179`; `PlaygroundForm.tsx:614` | Removed at `CornerBusy.tsx:181`; `PlaygroundForm.tsx:618-621` |
| Busy timers | `CornerBusy.tsx:117,137` | Cleared at `:183-185` |
| Studio click guard | `PlaygroundForm.tsx:582-609` | Removed on unmount; broad block while `leavingRef.current` is true |
| Canvas observers/listeners | `PixelBoard.tsx:2793-2849,2931-3133` | Cleaned at `:2821,:2848,:3130-3131` |
| Explore/infinite observers and rAF | `ExploreInfinite.tsx:83-128`, `useInfiniteList.ts:64-75` | Cleaned |
| PWA events | `PwaRegister.tsx:36-56`, `PwaInstall.tsx:36-59` | Cleaned |
| Palette cross-tab listener | `lib/pixel-color-memory.ts:16-27` | Cleaned |

Minor unrelated gaps: `PixelBoard.tsx:872-878` has no `cancelAnimationFrame`; `Toast.tsx:18-23` and `LayerPanel.tsx:473-489` have no found timer cleanup. Neither explains shell nav loss.

---

## K. Transition inventory (NAV-10)

- `components/layout/PageTransition.tsx:5-21`: React `ViewTransition` with `nav-forward`, `nav-back`, default `fade`, `default="none"`.
- 9 page usages listed in Section E.
- Shared art morph: `CreationCard.tsx:51-54` (`name={`creation-art-${id}`}`, `share="morph"`), `CreationBody.tsx:36-39`.
- Named shell groups: `site-header` (`SiteHeader.tsx:20`), `site-sidebar` (`SiteHeader.tsx:41`), `site-tabbar` (`SiteNav.tsx:269`, `SocialNav.tsx:175`).
- CSS: `globals.css:608-715` (duration tokens, `::view-transition { pointer-events: none }`, frozen shell groups, morph, fade, forward/back, keyframes); reduced-motion overrides at `:717-742`.
- Only `transitionTypes` producer: `CreationCard.tsx:44-49` (`nav-forward`). No `nav-back` producer and no transition types on `router.push`.
- Abort suppression: `lib/view-transition-abort.ts:7-24,26-60`, installed by `instrumentation-client.ts:1-3` and `ViewTransitionGuard.tsx:10-13` (mounted at `PublicShell.tsx:24`).

**Finding NAV-10:** the roadmap’s Phase 6 decision ("animation no longer needed") is supported by the code: the animation is inconsistent, mostly directional-no-op, and directly contributed to the studio-exit bug via retained old routes.

---

## L. Root-cause ranking for reported symptoms

### 1. Nav disappears / page not interactive after leaving studio

| Confidence | Cause |
|---|---|
| High (fixed in working tree) | `body:has([data-chrome="playground"])` hid `.site-header`, `.app-tabbar`, and locked `overflow`; React retained the old route until `viewTransition.finished`, so the selector stayed true on the destination. Removed at `globals.css:79-84`; guarded by `tests/mobile-chrome.test.ts:32-44`, `tests/footer.test.ts:20-31`, `tests/pixel-world.test.ts:49-52`. |
| Medium-high (residual) | `PlaygroundForm.tsx:439-443,1300-1303` drops the overlay immediately via `navigating`; if `router.push` is delayed or fails, the user briefly sees shell-without-studio with no reset path. |
| Medium | `guardChromeNav` at `PlaygroundForm.tsx:582-609` blocks *all* unmodified left clicks while `leavingRef.current` is true, before checking that the target is a link. |
| Medium | `ViewTransition` retention/abort behavior (`PageTransition.tsx:5-21`, `lib/view-transition-abort.ts:42-60`) keeps old route DOM live; no runtime test covers an aborted transition. |
| Low | Guest/member header fallback with duplicate transition names (`PublicShell.tsx:27-29`; `SiteHeader.tsx:20,41`) can flash chrome. |

### 2. Explore/Home feel like a full reload

- URL state is retained, but feed subtrees are deliberately remounted (`home/page.tsx:65,148`, `ExploreGallery.tsx:148`).
- All data reads are dynamic (`connection()` in `queries.ts:182` etc.) and no `staleTimes`/tag cache keeps old content visible.
- `getCurrentProfile()` repeats across shell, layout, page, and activity.
- Explore search uses a document GET form (`ExploreGallery.tsx:36`).
- Explore scroll restore could fight Next's default scroll-to-top and global smooth scrolling; fixed in Section V with opt-in `scroll={false}` and `behavior: "instant"`. Runtime measurement is still a Phase 8 deliverable.

### 3. Detail/profile show blank or slow content

- `instant = false` plus awaited server data and no `loading.tsx` on some paths.
- Profile awaits profile + works + following before its Suspense boundary (`u/[username]/page.tsx:57-70,152-161`), so the skeleton cannot stream early.
- Detail awaits creation/profile/reaction/following before the page shell, although community slots are streamed (`creation/[id]/page.tsx:248-273`).

### 4. Realtime leaks

None found; deprioritize NAV-09.

---

## M. Recommended architecture (no unnecessary refactor)

### Keep

- Single `[lang]` shell and `PublicShell` as the persistent app shell.
- URL as source of truth for feed/category/search/page.
- Server Components for public content; React `cache()` for public read dedupe.
- `instant = false` where auth/preview correctness requires it — but pair it with loading UI.
- Existing static guards that prevent playground body-level nav/scroll rules from returning.
- No realtime layer, no Keep-Alive library, no blanket TanStack Query migration.

### Change

1. **Remove route animations first (Phase 6 ahead of 3–5).** Delete `PageTransition` wrappers from the 9 pages, the `creation-art-*` morphs, named shell transition CSS, `nav-forward`/`nav-back` CSS, the abort filter, and its instrumentation — only after confirming no other `ViewTransition` consumer exists. This removes the retained-route condition that forced the studio workaround.
2. **Simplify studio exit after transitions are gone.** Remove `PlaygroundForm`’s `navigating → null` early return; rely on normal route unmount. Narrow `guardChromeNav` to `a[href]` targets only and never block unrelated clicks. Apply the same exit treatment to `StudioForm` if runtime testing shows the same symptom there.
3. **Deduplicate identity reads request-scoped.** Introduce a request-scoped accessor for `getCurrentProfile()`/`getSessionUserId()` so shell, layout, page, and activity share one `auth.getUser()` + profile query. Verify cache semantics with local Next docs before implementation because these helpers read cookies.
4. **Define stale-content policy.** Add explicit `staleTimes` where safe, keep `instant = false` where auth correctness matters, and ensure loading boundaries show a skeleton rather than blank `main`. Do not cache private data by public keys.
5. **Finish loading coverage.** Add `loading.tsx` or an early Suspense boundary for landing, creators, space, settings, welcome, auth routes, admin, and move the profile boundary before the awaited data.
6. **Unify scroll restoration.** For Explore, disable Link's automatic scroll (`scroll={false}`) where manual restore is used and call `window.scrollTo` with an explicit non-smooth behavior. Decide whether Home/Profile need the same; do not add a generic keeper. (Done — Section V; Home/Profile intentionally unchanged.)
7. **Eliminate full loads where safe.** Convert `LanguageSwitch` to a client navigation only after verifying `<html lang>` updates correctly; convert Explore search to a client-side URL push only after verifying Back/Forward and filter state.
8. **Add runtime validation before claiming done.** Current tests are static/SSR only. Add a browser-level test (or documented manual measurement) for studio exit → nav clickable/scroll unlocked → Back/Forward → Explore restore. Do not install a browser-test stack solely for this audit; decide when Phase 8 starts.

---

## N. Implementation sequence

The roadmap’s order is adjusted because transition retention is the confirmed studio bug mechanism.

| Order | Work | Roadmap phase | Depends on | Exit check |
|---:|---|---|---|---|
| 1 | Phase 1 audit (this doc) | 1 | none | Causes documented with file/line evidence |
| 2 | Remove `PageTransition`, morphs, transition CSS, abort filter | 6 (pulled forward) | 1 | No `ViewTransition`/`transitionTypes`/orphan CSS; navigation has no flashes |
| 3 | Simplify studio exit + narrow click guard | 2 / unblock 1 | 2 | Nav clickable immediately, page interactive without refresh, no broad click block |
| 4 | Request-scope identity dedupe | 4 | 1 | One `auth.getUser()` per request path; no cross-account leak |
| 5 | Loading coverage + early profile boundary | 2 / 4 | 1 | No blank `main` on audited routes; skeleton appears early |
| 6 | Stale policy / cache ownership | 4 | 4,5 | Old content stays visible where safe; invalidation predictable |
| 7 | Scroll + state restoration | 3 | 2,6 | Explore restore stable; Home/Profile decision documented |
| 8 | Language/Explore full-load removal | 2 | 7 | Shell and scroll state survive; Back/Forward correct |
| 9 | Pull-to-Refresh | 5 | 6 | Gesture does not touch canvas/modals/horizontal controls |
| 10 | Rendering/memory/network optimization | 7 | 2–9 | No accumulating listeners/requests; mobile responsive |
| 11 | Browser-level tests + measurements | 8 | all | Real timings and interaction results recorded |

Phases 3 and 4 of the original roadmap can still run in parallel after step 2, provided state and cache ownership remain separate.

---

## O. Test inventory and gaps

### Existing guards

- `tests/mobile-chrome.test.ts` — studio chrome locality, no `playground-open`, no body playground nav/scroll selector, no `navigating` early return.
- `tests/footer.test.ts` — footer not hidden by playground body selector; studio CSS still route-scoped.
- `tests/pixel-world.test.ts` — backdrop mount, scene mapping, no playground body selector.
- `tests/back-navigation.test.ts` — static studio/settings back strings, save/discard guards, narrowed chrome-link guard.
- `tests/route-transitions.test.ts` — static guard that no transition consumer or orphan CSS returns (Phase 6).
- `tests/session-identity.test.ts` — static guard for the single request-scoped `auth.getUser()` primitive (Section S).
- `tests/instant-interaction.test.ts` — key loading skeletons, full page-route fallback coverage, shared auth fallback, and the profile's early Suspense boundary (Section T).
- `tests/cache-policy.test.ts` — static owner/TTL policy, blocking private segments, and mutation invalidation (Section U).
- `tests/scroll-restoration.test.ts` — opt-in Explore resume links, explicit instant scroll, and no generic scroll keeper (Section V).
- `tests/explore-layout.test.ts:63-69`, `tests/explore-render.test.ts:44-87`, `tests/feed-render.test.ts:37-73` — static/SSR shape.
- `tests/pwa.test.ts:37-58`, `tests/pwa-dev.test.ts:7-25` — SW strategy and dev cleanup.

### Gaps

No test currently covers:

- real shell mount identity across client navigation;
- `popstate`, `history.back()`, `router.back()`, or direct/back-across-route-group loads;
- actual network request counts at runtime (the dedupe source shape is guarded statically in `tests/session-identity.test.ts`);
- studio exit with slow/failing/successful save and post-exit clickability/scroll unlock (happy path confirmed manually by the user);
- scroll restoration timing in a real browser (static guards now cover the opt-in marker and explicit `instant` restore — Section V);
- listener/fetch-patch lifecycle counts;
- account-switch cache isolation at runtime;
- runtime transition behavior (transition machinery is removed and guarded statically by `tests/route-transitions.test.ts`);
- before/after performance measurements.

Test infrastructure is `vitest` with `environment: "node"` (`package.json:11`, `vitest.config.ts:4-8`); there is no browser-test dependency. These gaps are expected for Phase 1 and become mandatory inputs to Phase 8; the manual checklist is `docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md` (Section W).

---

## P. Phase 1 exit criteria verdict

| Roadmap deliverable / exit criterion | Status |
|---|---|
| Navigation and rendering audit report | This document |
| Route and layout map | Section B |
| Component mount/unmount findings | Sections D–E |
| Data-fetching and cache findings | Section F |
| Recommended architecture and implementation sequence | Sections M–N |
| Main causes of slow/disruptive navigation understood and documented | Yes — Sections A, L |
| Real measurements before/after | Not Phase 1; tracked in Phase 8 |

**Phase 1 is complete.** The audit itself made no code changes. The auth/nav/studio fixes present when it was written were committed in `d63dda3` before implementation began.

---

## Q. Implementation status — Phase 6

Completed on 22 Nov 2026, ahead of Phases 2–5, because `ViewTransition` retention was the confirmed mechanism behind the studio-exit regression (Section L).

| Step | Result |
|---|---|
| `PageTransition` wrappers | Removed from all 9 pages; component deleted |
| `creation-art-*` morphs | Removed from `CreationCard`/`CreationBody`; `artTransition` and `creationId` transition-only props removed with their callers updated |
| Shell transition metadata | `viewTransitionName` removed from `SiteHeader`, `SiteNav`, `SocialNav` |
| Route-transition CSS | Duration tokens, `::view-transition` rules, `.fade`/`.nav-forward`/`.nav-back`/`.morph` rules, and `vt-*` keyframes removed; reduced-motion overrides for other animations kept |
| Abort filter | `lib/view-transition-abort.ts`, `ViewTransitionGuard`, and `instrumentation-client.ts` deleted; `PublicShell` mount removed |
| Regression guard | `tests/route-transitions.test.ts` scans `app`, `components`, `features`, `lib` for any reintroduced transition consumer or orphan CSS |
| Roadmap | Phase 6 implementation note added |

All Section N implementation steps are now addressed. Browser-level measurement remains a Phase 8 deliverable; runtime studio-exit verification was confirmed safe by the user (see Section R).

---

## R. Implementation status — studio exit simplification

Completed on 22 Nov 2026, directly after Phase 6 (Section N step 3).

| Step | Result |
|---|---|
| `navigating` state | Removed from `components/creations/PlaygroundForm.tsx`; the overlay now unmounts naturally when the route commits |
| `go()` wrapper | Removed; all three leave paths call `router.push()` directly |
| `guardChromeNav` | Still defers a chrome link while a save/discard is in flight, but now resolves `a[href]` in `header.fixed`/`.app-tabbar` first and only swallows that navigation — unrelated clicks and same-page links stay interactive |
| Regression guards | `tests/mobile-chrome.test.ts` asserts no `navigating` early return; `tests/back-navigation.test.ts` asserts the narrowed guard and direct `router.push` exit |

`StudioForm` was left unchanged: it already uses a plain `router.push` and has no overlay-drop workaround. The user confirmed in-browser that navigation returns immediately after leaving the pixel studio and the destination stays interactive, including save/discard paths.

---

## S. Implementation status — request-scoped identity dedupe

Completed on 22 Nov 2026 (Section N step 4). Verified against the local Next.js guides before coding: `01-app/02-guides/authentication.md:1137-1181` recommends React `cache()` for a request-scoped DAL, and notes that it dedupes within a render pass only — Server Actions and Route Handlers are outside a render pass and still read fresh state.

| Step | Result |
|---|---|
| Shared primitive | `getCurrentAuthUser()` is now the single `cache()`-wrapped accessor that calls `auth.getUser()` |
| Derived accessors | `getSessionUserId()` and `getCurrentProfile()` call `getCurrentAuthUser()` instead of each running their own `getUser()`; both are also `cache()`-wrapped so the profile query dedupes too |
| Cross-request safety | React `cache()` scopes memoization to one render pass, so no result is shared across requests or accounts; `getProfileByUsername()` stays on the cookie-less public client |
| Actions | No behavior change: `cache()` is a no-op in Server Actions/Route Handlers, where fresh post-login/post-revalidation state is required |
| Regression guard | `tests/session-identity.test.ts` asserts a single `auth.getUser()`, the shared primitive usage, and independent public reads |

A single member render (shell + layout + page + activity badge + query helpers) now performs one `auth.getUser()` and one profile query instead of repeating them per caller. No cross-navigation client cache was introduced.

---

## T. Implementation status — loading coverage and early profile boundary

Completed on 22 Nov 2026 (Section N step 5). Checked against the local Next.js `loading` and `instant` references before coding: a `loading.tsx` wraps `page.js` in a Suspense boundary, and `instant = false` still allows prerendering and streaming, so the new fallbacks are compatible with the existing blocking auth routes.

| Step | Result |
|---|---|
| Shared fallbacks | `components/ui/RouteSkeletons.tsx` adds `RouteSkeleton` and `AuthRouteSkeleton` built on the existing `Skeleton` primitive |
| New route fallbacks | `loading.tsx` added for landing, creators, space, settings, welcome and admin; one `(auth)/loading.tsx` covers all five auth pages |
| Coverage | All 19 `page.tsx` routes now resolve to a fallback in their own or an ancestor segment; the 8 pre-existing bespoke skeletons are unchanged |
| Profile boundary | `u/[username]/page.tsx` no longer awaits works before rendering: `ProfileWorks` and a new `ProfileWorksCount` are async children behind real Suspense boundaries, sharing one cached `loadProfileWorks(profileId)` query via a stable options object |
| Auth layout caveat | `(member)` and `admin` layouts intentionally still await identity for redirects; their page fallbacks therefore appear after that gate, which preserves auth correctness |

`tests/instant-interaction.test.ts` now enumerates every page route and asserts fallback coverage, verifies the auth group has a single shared loading file, and checks the profile's async Suspense structure. No visual design changes were made to the real pages.

---

## U. Implementation status — stale-content policy and cache ownership

Completed on 22 Nov 2026 (Section N step 4). Checked against the local Next.js `staleTimes`, `cacheLife`, `loading` and Client Cache references first.

| Layer | Owner | Policy |
|---|---|---|
| Client Cache (RSC payload) | `next.config.ts` | `experimental.staleTimes = { dynamic: 0, static: 180 }` — dynamic/private routes are never reused across navigations; static non-personalized segments keep the 5-minute default. Pinned explicitly because Next 15 changed the `dynamic` default from 30s to 0s, so a future default change cannot silently cache account data. |
| Request-scope dedupe | `lib/auth/session.ts`, `features/creations/queries.ts` | React `cache()` only; scoped to one render pass, never shared across requests |
| Server output cache | `components/layout/SiteFooter.tsx` | The only `'use cache'` consumer; static site name and copyright year. No private data is cached by a public key |
| Auth gates | `(auth)`, `(member)`, `admin` segments | All still export `instant = false`; redirects and viewer-specific reads stay blocking |
| Invalidation | Server Actions | `revalidatePath` in auth/creation actions and `router.refresh()` in `SpaceBoard` clear the client cache immediately; no blanket cache library was added |

The policy is enforced statically by `tests/cache-policy.test.ts`. No client-cache library, `unstable_cache`, or new `'use cache'` consumer was introduced. This keeps the audit's rule that private data must never be served from a public cache key.

---

## V. Implementation status — unified Explore scroll restoration

Completed on 22 Nov 2026 (Section N step 6). Checked against the local Next.js `link` and `use-router` references: `scroll={false}` / `{ scroll: false }` disables Next's automatic scroll to the new page, while `data-scroll-behavior="smooth"` lets Next temporarily set `scroll-behavior: auto` during its own route transition.

| Step | Result |
|---|---|
| Opt-in links | `WorkTile` and `NewCreatorsStrip` accept `preserveScroll`; when true they set `scroll={false}` and `data-explore-resume="true"` on their links. Other usages are unchanged |
| Explore feed | `ExploreInfinite` passes `preserveScroll` to grid tiles and now marks resume only for `a[data-explore-resume]`, not any anchor in the grid |
| Interludes | `QuietRack` forwards the prop; the Explore-only `NewCreatorsSlot` and `QuietRackSlot` enable it, so band links follow the same policy |
| Restore call | `window.scrollTo({ top: saved.y, left: 0, behavior: "instant" })` replaces the previous two-argument call, so global CSS smooth scrolling cannot animate the restore |
| Scope | No `history.scrollRestoration`, no global route scroll reset, and no changes to Home/Profile. No Keep-Alive library or generic scroll keeper was introduced |

The local Next smooth-scroll helper only wraps Next's own transition scroll; this manual restore happens in a later `requestAnimationFrame`, which is why the explicit `instant` behavior is still required. `tests/scroll-restoration.test.ts` guards the opt-in marker, the explicit scroll call, and the absence of a generic keeper. Browser timing measurement remains Phase 8 work.

---

## W. Phase 8 runtime validation plan

All Section N implementation steps are complete; the remaining deliverable is
runtime proof, not more source changes. The manual checklist is in
`docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md`. It covers shell identity after
studio exit, Explore restore (all opt-in link types), loading boundaries,
account-switch cache isolation, runtime `auth.getUser()` counts, Back/Forward
and direct URLs, auth regression smoke, repeated-navigation memory, and
Pull-to-Refresh/offline.

No browser-test stack was installed, and no evidence was generated yet. The
plan explicitly keeps the current uncommitted tree untouched and treats a
`HEAD` worktree baseline as optional.
