# Explore redesign — browser validation (2026-11-22)

Environment: local production build (`npm run start -- -p 3100`), headless Chrome 157 via CDP, Supabase project from `.env.local`. No production write and no benchmark were performed.

Screenshots are in this folder:
- `after/desktop-default.png` (1440×900)
- `after/desktop-search-all.png` (1440×900)
- `after/desktop-search-creators.png` (1440×900)
- `after/desktop-search-creations.png` (1440×900)
- `after/mobile-default.png` (390×844)
- `after/mobile-search-all.png` (390×844)

Baseline screenshots before the redesign are in `before/`.

## Scenario matrix

| # | Scenario | Desktop 1440 | Mobile 390 | Result |
|---:|---|---|---|---|
| 1 | Explore without query | `/explore`, gallery visible, no tabs | same | PASS |
| 2 | Creator result | `q=rsdy`, 1 creator card | same | PASS |
| 3 | Creation result | `q=Waterfall`, work tile visible | same | PASS |
| 4 | All sections state | sections Kreator / Tag / Karya render in the same Explore chrome | same | PASS structurally; dataset has no query matching both creator and creation |
| 5 | Tag query | `q=pixel` shows search empty state | same | PASS; no published creation currently has tags |
| 6 | Empty query result | `q=zzzznotfound` shows “Tidak ada hasil untuk pencarian ini.” | same | PASS |
| 7 | Creators tab | `scope=creators`, only Kreator section, no work tile | same | PASS |
| 8 | Creations tab | `scope=creations`, only Karya section, no creator card | same | PASS |
| 9 | Clear search | back to `/explore`, tabs hidden, input empty | same | PASS |
| 10 | Following | `feed=following`, guest notice rendered | same | PASS |
| 11 | Category filter | `category=icon` from a size pill | same | PASS |
| 12 | Detail → Back | detail URL opened, Back restored `q` + `scope=creations` + active tab | same | PASS |

## Interaction checks

- Typing `Water` without submitting kept URL at `/explore` and produced **0** browser-side `/rest/v1/` or `/rpc/` requests.
- `requestSubmit()` moved URL to `/explore?q=Water` and rendered the result area.
- Search input bounding box was identical before and after submit:
  - 390 px: `{top:82,left:12,width:290,height:48}`
  - 1440 px: `{top:90,left:177,width:975,height:48}`
- Submitting a new query while the Creators tab is active keeps that tab: `/explore?q=rsdy&scope=creators` → `/explore?q=rsdy2&scope=creators`, with active tab “Kreator”. Submitting from the default state stays on All (`/explore?q=Waterfall`, no `scope` param).
- Real tab clicks from `q=rsdy`:
  - All → `scope=creators`: only Kreator section, 1 creator card.
  - Creators → `scope=creations`: only Karya section.
  - Creations → All: Kreator / Tag / Karya restored.
  - Browser Back restored the previous `scope=creations` and active Karya tab.
- Responsive sweep at 375, 390, 768 and 1440 px showed no horizontal overflow (`scrollWidth <= clientWidth`).

## Data limitations

- The current published dataset has no tags, so a positive tag shortcut could not be exercised.
- No query in the current dataset matches both a creator and a creation; scenario 4 was validated structurally only.
- Headless viewport validation does not replace physical-device gesture testing.
