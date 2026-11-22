# Explore final refinement — validation report

Date: 2026-11-22  
Scope: `/explore` only. No commit created.

## Summary

Explore now has one frame and two contexts:

- **Discovery mode** (`/explore` without `q`): explicit `Karya`, `Kreator baru`, and `Karya yang masih sepi` sections.
- **Search mode** (`/explore?q=…`): one `Hasil pencarian` section with `Semua / Kreator / Karya` scope tabs; no discovery sections.

One shared `CreatorCard` is used by `Kreator baru`, Search All, and Search Creators. It has a 40px avatar, display name, `@username`, compact Follow, and up to three square artwork previews in a single row. Previews are batched through one `listCreatorWorkPreviews` query rather than one request per creator.

## Information architecture

### Discovery mode

Order is fixed in `app/[lang]/(public)/explore/page.tsx`:

1. `Karya` — the existing published artwork feed, `WorkTile`, `ExploreInfinite`, pagination, category/size filters, and scroll restoration.
2. `Kreator baru` — horizontal rail of compact Creator Cards, with the existing `Lihat semua` link to `/creators`.
3. `Karya yang masih sepi` — horizontal rail of existing `WorkTile` items with the quiet-work eligibility/ranking unchanged.

The creator and quiet sections are only rendered on the unfiltered first page (`page === 1`, `feed === "all"`, `category === "all"`, no active query), matching the previous interlude availability. Search mode never renders them.

### Search mode

- Search bar stays in the same position and keeps the active query.
- `Semua / Kreator / Karya` is the only navigation shown with a query.
- `Semua` shows creators, tags, and creations.
- `Kreator` shows only creators.
- `Karya` shows only creations and the size/category filter.
- Discovery feed navigation (`Semua / Mengikuti`) is never combined with scope tabs.

Contextual navigation was already correct before this refinement and remains unchanged.

## Discovery sections

| Section | Before | After |
| --- | --- | --- |
| `Karya` | Feed tiles with no explicit section heading | Explicit heading; existing feed, gallery, pagination, and quiet-work behavior preserved |
| `Kreator baru` | Avatar-only interlude; no Follow, no artwork preview | Shared Creator Card rail with 40px avatar, name, `@username`, Follow, and up to 3 square previews |
| `Karya yang masih sepi` | Rail labeled `Tulis catatan pertama` | Correct heading plus quiet hint; same tiles and eligibility |

Each section has its own local loading skeleton and quiet empty/failed note. An empty creator rail does not suppress the quiet rail; an empty quiet rail does not suppress creators. This is covered by `tests/creator-card.test.ts` with rendered empty and failed states. The current dataset has data in both rails, so browser evidence confirms the populated state and component tests confirm independent empty behavior.

`Lihat semua` remains only on `Kreator baru` because `/creators` is the existing supported destination. Neither `Karya` nor `Karya yang masih sepi` gained a new navigation action.

## Search state

Search keeps the contextual navigation introduced earlier and now uses the same Creator Card:

- Search All (`q=rs`): 3 creator cards and 4 creation links at 390px and 1440px.
- Search Creators (`q=rs&scope=creators`): same 3 creator cards; no creation gallery.
- Search Creations (`q=rs&scope=creations`): no creator cards; size/category filter present; one empty creation note for the no-match case.
- No result (`q=zzzznotfound`): exactly one empty state and no discovery sections.
- Clear search returns to `/explore` with all three discovery sections and the input reset.
- Positive work search (`q=Waterfall`) renders the work section without a creator empty state, validating a one-section-empty Search All case.

No search ranking RPC, search query, cache, or pagination logic was changed.

## Visual hierarchy

- Artwork remains the dominant element: the main mosaic is first, and creator previews are compact 1:1 thumbnails.
- Creator identity is secondary: one line for name and one for `@username`; no bio.
- Section navigation is a heading plus lightweight actions, not dashboard cards.
- Search and filters remain in the existing top bar.
- Extra information is limited to the quiet hint; no decorative containers or repeated headings were added.

The card header is a flat row of sibling links and Follow; previews are separate sibling links. There are no nested interactive elements. Guests get a compact `Masuk` login action.

## Responsive behavior

Capture matrix: 375px, 390px, 440px, and 1440px × normal, Following, Search All, Search Creators, Search Creations, and no-result search (24 after states).

- No horizontal page overflow at any captured viewport.
- Search input widths track viewport: 275px at 375px, 290px at 390px, and full width at desktop.
- Creator rail is swipeable at 375/390/440px and fits without scrolling at 1440px in the current dataset.
- Card measures 256×143px with a 40px avatar and 76px Follow target on all captured widths; it does not enlarge on desktop.
- First preview is eager; the remaining two are lazy. The preview box is square.

Screenshots: `before/` and `after/`. DOM metrics: `before/snapshot.json`, `after/snapshot.json`, `after/summary.txt`.

## Browser validation

`after/interactions.json` records, on both mobile 390px and desktop 1440px:

- **Clear Search** — clicked and returned to `/explore` with the three section IDs and empty input.
- **Detail navigation** — clicked a creator-card preview; reached `/creation/…`.
- **Back** — returned to `/explore`; the three discovery sections and cards were present again. A separate direct-navigation check also returned the clean three-section state.
- **`Lihat semua`** — clicked in `Kreator baru`; reached `/creators` with the expected `Kreator baru` heading.
- **Typing** — no database request during keystrokes; submit navigated once to `?q=Water` and switched to Search Mode.
- **Search scopes** — all scope states captured in the screenshot matrix.

Additional catalog checks: `q=rs` has creator and work results; `q=Waterfall` has a work result; `q=zzzznotfound` is empty. There is no tagged published work in the current dataset, so the positive tag shortcut could not be validated in the browser.

## Validation commands

- `npm run typecheck` — passed.
- `npm test` — passed: 98 files / 725 tests.
- `npm run build` — passed.
- Scoped ESLint on changed Explore/Creator Card files — passed except the pre-existing `pendingRef.current = pending` rule in `components/community/FollowButton.tsx`; that line is unchanged from `HEAD`.
- `git diff --check` — no new whitespace errors (only pre-existing CRLF notices).

## Potential regressions and limitations

- Discovery creator/quiet sections remain restricted to the unfiltered first page, as before. Category-, Following-, or page-scoped browsing still shows only `Karya`; this is intentional and preserves the existing query behavior.
- `listCreatorWorkPreviews` now fetches all published pixel works for the supplied creator IDs in one query and groups to three per creator in memory. The earlier global `limit(ids.length * 3)` was removed because it could starve later creators when one creator had many works. Creator batches are bounded by existing callers (12 new creators; existing search result limit).
- Follow state is seeded from the page-level following set; each card keeps its own optimistic toggle, matching the existing FollowButton behavior.
- Browser validation is headless desktop/mobile emulation, not a physical-device gesture test.
- No commit was created.
