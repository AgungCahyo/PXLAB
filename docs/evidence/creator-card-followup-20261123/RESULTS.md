# Creator card follow-up: self exclusion, no-work fallback, and search orientation

Date: 2026-11-23

## Requested changes

1. The signed-in user should not appear in creator search results.
2. A creator without published artwork should show a `Belum ada karya` fallback.
3. Search All keeps creator cards on a horizontal rail; the Creators tab uses vertical scrolling.

All three changes are implemented. The earlier compact design, follow mutation, authentication, ranking RPC, and horizontal-rail containment fix remain intact. No commit was made.

## Implementation

### Viewer excluded from creator search

- `app/[lang]/(public)/explore/page.tsx` filters `creatorSearch.items` by `creator.id !== viewer.id` before previews are fetched and before `SearchOverview` renders.
- `total` is adjusted to the filtered item count when a viewer is present, so a self-only match correctly produces the single creator empty state.
- `components/creations/CreatorCard.tsx` still receives `currentUserId` and returns `null` if `creator.id === currentUserId`, so a stale or cached self row can never render.
- Identity is still compared only by user id. `features/profiles/queries.ts`, the `search_creators_ranked` RPC, and its fallback query were not changed.

### No-artwork fallback

- Added `creatorCardNoWork` to `lib/copy.ts`: `Belum ada karya` / `No artwork yet`.
- `CreatorCard` renders the quiet muted fallback when `previews.length === 0`; cards with artwork still render at most three 1:1 previews in one row.
- The previous `creatorCardSelf` / `Profil kamu` copy was removed because self cards are no longer rendered.

### Scope-aware orientation

- `components/search/SearchResults.tsx` derives `const creatorsVertical = scope === "creators"`.
- Search All: horizontal `flex` rail with `overflow-x-auto`, snap, and nowrap.
- Search Creators: vertical `grid` with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; no inner horizontal or vertical scroll container, so the page scrolls naturally.
- `NewCreatorsStrip` remains a horizontal discovery rail.

## Changed files

- `app/[lang]/(public)/explore/page.tsx`
- `components/creations/CreatorCard.tsx`
- `components/search/SearchResults.tsx`
- `lib/copy.ts`
- `tests/creator-card.test.ts`
- `tests/explore-scope.test.ts`
- Evidence under `docs/evidence/creator-card-followup-20261123/`

## Static validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 98 files / 731 tests passed |
| `npm run build` | Passed |
| `git -c core.safecrlf=false diff --check` | Clean |
| Scoped ESLint on changed source/tests | Clean |

## Browser validation

Production build on `http://127.0.0.1:3100`, Chrome CDP, authenticated test profile `rsdy`. Viewports: 390×844 mobile and 1440×900 desktop.

| Assertion | Result |
| --- | --- |
| Self absent from All, Creators, fallback search, and self-only query | Pass |
| Self-only query shows `Tidak ada kreator yang cocok.` | Pass |
| Search All uses horizontal rail (`display: flex`, `overflow-x: auto`, same card top) | Pass |
| Creators tab uses vertical grid (`display: grid`, no inner overflow, stacked cards on mobile) | Pass |
| `chyprsty_` with 0 published works shows `Belum ada karya` | Pass |
| `chyprsty__` with 3 previews does not show the fallback | Pass |
| No page overflow at either viewport | Pass |

Observed geometry:

- 390px Search All: rail `scrollWidth 520 / clientWidth 366`, two 256px cards with the same top.
- 390px Creators: single-column grid `366px`, card tops 291px and 386px.
- 1440px Creators: responsive grid, no horizontal overflow.

Evidence:

- `validation.json` — full CDP measurements
- `summary.json` — concise assertion output
- `390-all-rs.png`
- `390-creators-rs.png`
- `390-creators-chyprsty.png`
- `1440-creators-rs.png`

## Follow-up: fluid Creators cards

A later refinement added a `fluid` prop so Search Creators cards fill their grid column while rails stay compact at 256px. It was validated at 375/390/440/1440px: Search All remained a horizontal rail with 256px cards, Search Creators matched its grid column (336/351/401px on mobile, 3 × 352px at 1440px), and no page-level overflow appeared. See `fluid/RESULTS.md` and `fluid/validation.json`.
