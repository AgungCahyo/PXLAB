# Phase 8 — Runtime validation plan (manual)

**Status:** planned, not executed. Prepared 22 Nov 2026.
**Scope:** navigation, rendering, cache isolation and scroll behavior after the
AUTH-01–AUTH-05 and NAV-01–NAV-08 work. This is a documentation-only deliverable:
no runtime code changes, no browser-test dependency, and no commit are part of
this plan.

## 0. Preparation

- Work on the current uncommitted tree. Do not stash or commit it just to run
  this plan unless the user explicitly asks.
- Prefer a production build for measurements:

  ```powershell
  npm run build
  npm start
  ```

  Use `npm run dev` only for the Console probes; dev overlays distort timing.
- Browsers: one Chromium-based desktop browser plus one mobile emulation
  (device toolbar). If available, repeat the scroll/auth checks in Safari or
  Firefox.
- Test data:
  - two accounts, `A` and `B`, both signed in at least once;
  - at least **two pages** of published pixel creations so Explore loads page 2;
  - one creation with comments, one profile with works;
  - Supabase project with auth/recovery/verification already configured
    (see `docs/auth/auth-audit-report.md` for the manual setup items).
- DevTools: keep **Network → Preserve log** on, disable cache for the first
  run, open **Performance**, **Rendering → Paint flashing**, **Application →
  Session Storage**, and the Console.
- Save evidence under `docs/evidence/phase8-<YYYYMMDD>/` (screenshots, JSON
  measurements, notes). Do not commit evidence unless asked.

### Optional baseline

The current tree is already post-fix, so it provides the "after" numbers. A
true before/after comparison requires a separate checkout of `HEAD`:

```powershell
git worktree add ..\pxlb-phase8-baseline HEAD
```

Run the same scenarios there, label the results `baseline @ HEAD`, then remove
the worktree. This must not disturb the uncommitted working tree. If the
baseline run is skipped, record the current run as `current only` rather than
claiming a measured improvement.

## 1. Already covered by static guards (recap, not runtime proof)

| Check | Command |
|---|---|
| All tests | `npm test` (93 files / 696 tests at time of writing) |
| Types | `npm run typecheck` |
| Changed-file lint | `npx eslint <changed files>` |
| Whitespace | `git diff --check` |

Relevant guards: `tests/route-transitions.test.ts`, `tests/session-identity.test.ts`,
`tests/instant-interaction.test.ts`, `tests/cache-policy.test.ts`,
`tests/scroll-restoration.test.ts`, `tests/full-load-removal.test.ts`,
`tests/pull-to-refresh.test.ts`, `tests/resource-cleanup.test.ts`,
`tests/mobile-chrome.test.ts`, and `tests/back-navigation.test.ts`. They prove
source shape, not timing or DOM identity; the scenarios below close that gap.

## 2. Runtime scenarios

### 2.1 Shell identity and studio exit — audit Section R

1. Open `/en/explore`. In Console, pin the shell node:

   ```js
   window.__shellHeader = document.querySelector('header.fixed')
   ```

2. Open a creation, enter the pixel studio, then leave via **Save** and again
   via **Discard** (two separate runs).
3. Immediately after the destination renders, check:

   ```js
   document.querySelector('header.fixed') === window.__shellHeader
   getComputedStyle(document.body).overflow
   ```

4. Click a nav link without refreshing.

**Pass:** identity is `true`, body `overflow` is not `hidden`, nav is clickable,
and no full reload occurs. **Fail:** nav missing, page unclickable, scroll
locked, or identity `false` (shell remounted).

### 2.2 Explore scroll restore — audit Section V

1. On `/en/explore`, scroll until page 2 has loaded (watch the Network panel
   for the `loadMoreExploreAction` request).
2. Stop at a stable position and record:

   ```js
   window.__restoreY = Math.round(window.scrollY)
   performance.mark('explore-back')
   ```

3. Click a large work tile, wait for the detail page, then press **Back**.
4. After the feed settles:

   ```js
   Math.abs(window.scrollY - window.__restoreY)
   performance.now() - performance.getEntriesByName('explore-back')[0].startTime
   ```

5. Repeat for: a default work tile, a tile's author link, a "New creators"
   avatar, and a "Quiet rack" tile. These are the `data-explore-resume` links.
6. Separately click Explore pagination and confirm it still scrolls to the top
   (default Next behavior preserved for non-opt-in links).

**Pass:** final Y within **50 px** of `__restoreY`, no visible jump to top, no
smooth animation during restore, loaded page-2 items still present, and
pagination still scrolls to top. **Fail:** top flash, animated restore, lost
items, or Y error > 50 px. Record the measured delta and settle time for every
link type.

### 2.3 Loading boundaries and profile data — audit Section T

1. Throttle Network to **Fast 3G**. Navigate Home → `/creators` → `/space` →
   a profile → `/dashboard` → `/settings` → `/admin` (as an admin).
2. Watch for a skeleton in `main` before content, never a blank `main`.
3. On the profile, confirm the header renders before the works grid and that
   the works count and grid settle on the same number.
4. Visit an unknown `/u/<missing>` and confirm `notFound()` behavior is
   unchanged.

**Pass:** every route shows a fallback; profile header is not blocked by the
works query; 404 still renders. **Fail:** blank content area, works count that
never resolves, or profile header delayed by works data.

### 2.4 Cache isolation and stale policy — audit Section U

1. Sign in as `A`, open `/en/explore?feed=following` and scroll to load page 2.
2. Sign out, then sign in as `B` in the **same tab**.
3. Open the same URL and check `Application → Session Storage`:

   ```js
   Object.keys(sessionStorage).filter((k) => k.startsWith('pxlb:explore:'))
   ```

4. Use Back/Forward twice between the feed and a detail page.
5. Repeat with `remember me` checked and unchecked on a fresh profile.

**Pass:** no `A` items, following set, or profile data appears for `B`; session
storage contains at most `B`'s keys; Back/Forward never resurrects `A`. **Fail:**
any cross-account data or retained private RSC payload.

### 2.5 Identity dedupe at runtime — audit Section S

1. Hard-reload `/en/dashboard` and filter Network by `/auth/v1/user` (adjust to
   the actual Supabase host).
2. Count requests for that single full navigation, then navigate
   Dashboard → Responses → Settings and count again.

**Pass:** one `auth.getUser()` call per navigation/pass, not one per shell,
layout, badge and page. **Fail:** repeated calls in the same pass. Treat a
full reload or Server Action as a new pass; do not expect a cross-navigation
cache.

### 2.6 Browser history and direct access — roadmap Phase 8 matrix

- Back/Forward across `(public)` → `(member)` → `admin` boundaries.
- Direct URL load and hard refresh on `/en/creation/<id>`, `/en/u/<username>`,
  `/en/settings`, `/en/admin`.
- Change Explore `category`, `q`, `feed`, and `page`; navigate away; return via
  Back and via a fresh link. URL and visible controls must agree.
- Explore search now uses `router.push`: submit a query, check the URL, then go
  Back and confirm the input text matches the restored `q`.
- Language switch now uses `next/link` with `scroll={false}`. Switch ID → EN →
  ID without refreshing, then check:

  ```js
  document.documentElement.lang
  ```

**Pass:** URL, visible filter state and shell stay consistent; `<html lang>`
matches the active locale; no refresh is required to restore nav. **Fail:**
stale filters, stale `lang`, missing nav, or wrong route group after history
navigation.

### 2.7 Auth regression smoke (do not expand scope)

Only the flows touched by AUTH-01–AUTH-05:

- login with and without `remember me`, then hard reload;
- resend-verification path for an unverified account, with no account-existence
  hint on duplicate signup;
- recovery link → reset → global sign-out;
- re-auth prompt before a sensitive settings action.

**Pass:** generic messaging preserved, no email enumeration, sessions and
recovery behave as documented. Do **not** test AUTH-06 or SEC-06/07/09 here.

### 2.8 Repeated navigation, memory and scroll responsiveness — Phases 7–8

1. Loop Home → Explore → Profile 20 times. Use DevTools Performance monitor
   for JS heap; force garbage collection between three rounds.
2. Watch Console for duplicate Supabase subscription/listener warnings and
   check `getEventListeners(document)` in Chromium if available.
3. Scroll the Explore feed continuously during the loop; note jank or forced
   layout warnings. With no scrolling, confirm automatic loading stops after 3
   pages and a manual button appears; the next user scroll should resume it.
4. Test Pull-to-Refresh at the top of Home and Explore with mobile emulation.
   Confirm the indicator, that existing content stays visible, that the list
   updates after release, and that a canvas/modals/horizontal filter row do not
   trigger it.
5. Repeat with `Offline` after a successful load and with a throttled/failing
   request. The 8 s fallback should show the failure message and retry button.

**Pass:** no monotonic heap growth across rounds, no accumulating listeners or
fetches, feed scrolling stays responsive, refresh failure is visible/retryable,
and offline shows already-loaded content where the service worker supports it.
**Fail:** steady growth, duplicate subscriptions, blank feed after offline, or
a silent hung refresh.

## 3. Result template

Copy this into the evidence folder for each run:

```text
Date / browser / build (current or baseline @ HEAD):
Network profile:
Account(s) used:

| # | Scenario | Pass/Fail | Measured value | Evidence file | Note |
|---|----------|-----------|----------------|---------------|------|
| 1 | Shell identity + studio exit |           |                |               |      |
| 2 | Explore tile restore (large) |           | ΔY=, settle=ms  |               |      |
| 3 | Explore tile restore (default) |         | ΔY=, settle=ms  |               |      |
| 4 | Explore author/interlude links |         | ΔY=, settle=ms  |               |      |
| 5 | Explore pagination scroll-to-top |       |                |               |      |
| 6 | Loading skeletons / profile boundary |  |                |               |      |
| 7 | Account-switch isolation |             |                |               |      |
| 8 | auth.getUser calls per navigation |     | count=          |               |      |
| 9 | Back/Forward + direct URL |             |                |               |      |
|10 | Auth regression smoke |                |                |               |      |
|11 | Repeated nav memory/listeners |         | heap= MB       |               |      |
|12 | Pull-to-Refresh / offline |             |                |               |      |
|13 | Language switch + Explore search |       | lang=          |               |      |
```

## 4. Exit criteria

Phase 8 can be marked done only when every **Pass** rule above holds in a
production build, the evidence folder is populated, and any failure has a
tracked follow-up. Subjective "feels fast" notes are not sufficient; record the
numbers. Do not install a browser-test stack solely for this plan — if the team
later wants automation, that is a separate decision.

## 5. Known limitations

- Manual checks cannot guarantee every viewport/device combination; mobile
  emulation is a smoke check, not full device coverage.
- The 50 px scroll tolerance is a practical manual threshold, not a product
  SLA. Adjust it in the evidence note if the design team sets a stricter one.
- Language switch and Explore search are now client navigations, but their
  runtime behavior (Back/Forward input state and `<html lang>`) is only guarded
  statically by `tests/full-load-removal.test.ts`; this plan records the browser
  check rather than claiming it was measured.
- Pull-to-Refresh is also static-only right now. Native overscroll, iOS Safari
  touch behavior, the 8 s timeout, and cross-browser reduced-motion rendering
  need real devices/emulation before Phase 8 can close.
- Cache bounds, the 3-page automatic-load cap, and timer cleanup are statically
  guarded but not measured as heap/listener counts in a real browser.
- Supabase-hosted changes (Reset Password template, Edge Function secrets,
  redirect allow-list, rate limits) remain manual setup items outside this
  repository.
