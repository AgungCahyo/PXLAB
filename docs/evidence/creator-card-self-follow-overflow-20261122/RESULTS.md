# CreatorCard self-follow and overflow bug fix

Date: 2026-11-23 (continuation of the 2026-11-22 Explore refinement)

> Follow-up on 2026-11-23: the signed-in user is now fully excluded from creator search results, and the `Profil kamu` label has been replaced by a `Belum ada karya` fallback for creators without published work. See `docs/evidence/creator-card-followup-20261123/RESULTS.md`. The details below describe the earlier intermediate state.

## Summary

Fixed two defects in the shared `CreatorCard` used by Explore `Kreator baru`, Search All, and Search Creators:

1. The signed-in user could be rendered with a Follow button in search results and was still included in `Kreator baru`.
2. Horizontal rails leaked scroll width into the document, and the card had no explicit containment for long identities or preview grids.

The compact visual design was preserved: 40px avatar, three 1:1 previews maximum in one row, compact Follow button, no bio, 256px card, no bio, dense padding. The search result set, ranking RPC, follow mutation, RLS/auth, pagination, and identity mechanism were not changed. No commit was made.

## Root causes

### Self-follow UI

- `app/[lang]/(public)/explore/page.tsx` already resolves `viewer.id` from `getCurrentProfile()`, but that id was never passed to `SearchOverview` or `CreatorCard`.
- The shared card therefore treated every result as "other" and rendered the real `FollowButton` for the viewer. `followCreatorAction` still rejected self-follow server-side, but the UI was incorrect.
- `listNewCreators(limit)` had no viewer parameter, so the viewer's own newly published work could surface in `Kreator baru`.

Fix:

- Added `currentUserId` to `CreatorCard`, `SearchOverview`, and `NewCreatorsStrip`.
- Ownership is compared only by `creator.id === viewer.id`; username/display name are never used.
- Search results initially kept the viewer with a non-interactive `Profil kamu` label; the follow-up now removes the viewer entirely before cards render.
- `listNewCreators(limit, excludeUserId?)` filters by `user_id <> excludeUserId` in the single existing query and keeps a defensive in-memory check. Explore passes `viewer?.id ?? null`.
- No changes were made to `searchCreators`, ranking RPC, pagination, or `features/profiles/queries.ts`.

### Horizontal overflow

Two separate contributors were found in the DOM audit:

- The creator rails used negative side margins (`-mx-3 ... px-3`) so the section itself reported `scrollWidth > clientWidth`; the card also lacked `max-w-full` / `overflow-hidden`, and the preview grid used a fixed `grid-cols-3` that can let grid items keep intrinsic width.
- The real document leak came from `FollowButton`: its screen-reader-only username span is `position: absolute`. Because the button wrapper was static, the span's containing block was outside the scrollable rail, so hidden text in the last card extended `document.documentElement.scrollWidth` (786px at a 390px viewport). Setting the wrapper to `relative` contains the text inside the card/rail.

Fix:

- Rails in `SearchResults` and `NewCreatorsStrip` are now `w-full min-w-0 max-w-full` with no negative margins; list items are `min-w-0 max-w-full shrink-0`.
- `CreatorCard` is `w-64 max-w-full shrink-0 min-w-0 overflow-hidden`; identity link and preview links are bounded; preview grid is `grid-cols-[repeat(3,minmax(0,1fr))]`.
- `CreatorRailSkeleton` uses the same bounded rail geometry.
- `FollowButton`'s wrapper is `relative`, preserving the accessible username text and all existing mutation/pending/error behavior.
- No global `overflow-x: hidden` was added to `body`; `app/globals.css` was not changed.

## Changed files

- `lib/copy.ts` — initially added `creatorCardSelf`; replaced in the follow-up by `creatorCardNoWork` (`Belum ada karya` / `No artwork yet`).
- `components/creations/CreatorCard.tsx` — viewer id prop, self label, containment and bounded preview grid.
- `components/creations/NewCreatorsStrip.tsx` — passes viewer id; bounded rail and items.
- `components/search/SearchResults.tsx` — passes viewer id; bounded rail and items.
- `app/[lang]/(public)/explore/page.tsx` — threads `viewer.id` into search and New Creators; excludes viewer from recommendations.
- `features/creations/queries.ts` — `listNewCreators(limit, excludeUserId?)`.
- `components/community/FollowButton.tsx` — `relative` wrapper for the sr-only label; existing action wiring untouched.
- `components/social/Skeleton.tsx` — matching bounded rail skeleton.
- `tests/creator-card.test.ts` — self/label/id ownership, viewer propagation, recommendation exclusion, containment, and sr-only containment guards.

Evidence added:

- `docs/evidence/creator-card-self-follow-overflow-20261122/before-layout.json`
- `docs/evidence/creator-card-self-follow-overflow-20261122/after/validation.json`
- `docs/evidence/creator-card-self-follow-overflow-20261122/after/preview-edge.json`
- `docs/evidence/creator-card-self-follow-overflow-20261122/after/390-normal.png`
- `docs/evidence/creator-card-self-follow-overflow-20261122/after/1440-search-creators.png`

## Static validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 98 files / 729 tests passed |
| `npm run build` | Passed |
| `git diff --check` | Passed (only pre-existing CRLF warnings) |
| Scoped ESLint | 1 pre-existing error in `FollowButton.tsx:40` (`pendingRef.current = pending`), unchanged by this fix |

## Browser validation

Production build on `http://127.0.0.1:3100`, Chrome via CDP on port 9228. Authenticated session used the existing test profile `rsdy` (id `a501da4e-6fe2-496c-968e-04398a67756d`). Guest state was tested by clearing the Supabase auth cookie and restoring it afterward.

### Layout matrix

| Viewport | State | Document width | Card width | Rail width / internal scroll width | Result |
| --- | --- | --- | --- | --- | --- |
| 375 | Explore normal | 375 / 375 | 256 | 351 / 351 | Pass |
| 375 | Search All | 375 / 375 | 256 | 351 / 784 | Pass |
| 375 | Search Creators | 375 / 375 | 256 | 351 / 784 | Pass |
| 390 | Explore normal | 390 / 390 | 256 | 366 / 366 | Pass |
| 390 | Search All | 390 / 390 | 256 | 366 / 784 | Pass |
| 390 | Search Creators | 390 / 390 | 256 | 366 / 784 | Pass |
| 440 | Explore normal | 440 / 440 | 256 | 416 / 416 | Pass |
| 440 | Search All | 440 / 440 | 256 | 416 / 784 | Pass |
| 440 | Search Creators | 440 / 440 | 256 | 416 / 784 | Pass |
| 1440 | Explore normal | 1425 / 1425 | 256 | 1072 / 1072 | Pass |
| 1440 | Search All | 1425 / 1440 | 256 | 1072 / 1072 | Pass |
| 1440 | Search Creators | 1425 / 1440 | 256 | 1072 / 1072 | Pass |

The rail scroll width above 784px on mobile is intentional internal horizontal scrolling; the document no longer grows. Before the fix, search states reported document width 786px at 390px.

### Functional states

| State | Result |
| --- | --- |
| Explore `Kreator baru`, signed in | 0 self cards; signed-in `rsdy` excluded by user id |
| Search All, signed in | Self initially rendered with `data-self="true"` and `Profil kamu`; follow-up now excludes it |
| Search Creators, signed in | Same as Search All; other creators keep normal Follow buttons |
| Other creator, not followed | `Ikuti`, `aria-pressed="false"` |
| Follow action | Optimistic `Mengikuti`, `aria-pressed="true"`, persisted after reload |
| Unfollow action | `Ikuti`, `aria-pressed="false"`, persisted after reload |
| Guest search | 0 Follow buttons, 3 login actions, 0 self labels, no page overflow |
| Long username (80 chars injected) | Card stayed 256px; identity `scrollWidth === clientWidth === 104`; document stayed 390px |
| No artwork | Card stayed 256px, empty preview list height 0, no overflow |
| Three previews | Card stayed 256px, 236px list, one row, 75×75 square thumbnails, no overflow |
| Component cap | `previews.slice(0, 3)` retained and unit-tested; simulated fourth preview wraps but production never renders more than three |

## Boundaries preserved

- Search results for other users are unchanged; only self presentation differs.
- Follow mutation, optimistic state, pending state, rollback/error alert, guest login redirect, and `user_id` FormData wiring are unchanged.
- Existing `FollowButton` remains the only follow control; no decorative button was introduced.
- Avatar remains `size="sm"` (40px); compact Follow classes remain `min-w-[4.75rem] px-2 text-[12px]`.
- Artwork previews remain at most three, 1:1, one row; compact padding and no bio remain unchanged.
- No commit was created.
