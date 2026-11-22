# Explore contextual navigation — before/after (2026-11-22)

Local production build (`npm run start -- -p 3100`), headless Chrome via CDP, Supabase project from `.env.local`. No production write, schema change, or commit.

Screenshots:
- `before/` — current layout before this correction.
- `after/` — corrected layout.
- Files: `{mobile,desktop}-{normal,search-all,search-creators,search-creations,search-empty}.png`
- Raw DOM snapshots: `before/snapshot.json`, `after/snapshot.json`

Queries used: `q=rs` (creator match, no work match), `q=zzzznotfound` (no match), `q=Waterfall` (work match, extra check).

## Browser comparison (mobile 390×844; desktop 1440×900 showed the same structure)

| State | Before — primary navs | After — primary navs | Before — repeated empty text | After — empty text |
|---|---|---|---|---|
| Explore normal | Sumber jelajah + Saring ukuran | Sumber jelajah + Saring ukuran | none | none |
| Search All | scope tabs + Sumber jelajah + Saring ukuran | **scope tabs only** | `Tidak ada hasil.` ×2, `Belum ada karya`, `Tidak ada tag yang cocok.` | none (creator result only) |
| Search Creators | scope tabs + Sumber jelajah + Saring ukuran | **scope tabs only** | none | none (one creator card) |
| Search Creations | scope tabs + Sumber jelajah + Saring ukuran | scope tabs + **Saring ukuran only** | `Tidak ada hasil untuk pencarian ini.`, `Tidak ada hasil.` ×2, `Belum ada karya` | **one** `Tidak ada karya yang cocok.` |
| Search empty (All) | scope tabs + Sumber jelajah + Saring ukuran | scope tabs only | `Tidak ada hasil untuk pencarian ini.`, `Tidak ada hasil.` ×2, `Belum ada karya` | **one** `Tidak ada hasil untuk pencarian ini.` |

Additional observations:
- Visible heading stacks went from `Hasil pencarian → Kreator → Karya → Belum ada karya` to `Hasil pencarian → Kreator` in Search All, and from `Hasil pencarian → Karya 0 → Belum ada karya` to a single `Tidak ada karya yang cocok.` in Search Creations.
- `Untuk “rs”` summary and the `Lihat semua` action no longer appear in search states. `Hasil pencarian` is now an `sr-only` landmark; the search input remains the visible query control.
- Section headings use one compact `13px` style. Creator cards are single-line with avatar + name + `@username`/bio instead of taller cards with counts.
- Positive work check (`q=Waterfall`): one `Karya` section, 1 work tile, no empty phrase, scope-tabs-only navigation on both viewports.
- No horizontal overflow in any state (`scrollWidth <= clientWidth`). Search input box is unchanged across states: mobile `{top:82,left:12,width:290,height:48}`, desktop `{top:90,left:177,width:975,height:48}`.

## Interaction checks after the change

- Clicking `Karya` from `?q=rs` → `?q=rs&scope=creations`; only the creation filter row appears, no Following row.
- Clicking a size pill in that scope → `?category=small&q=rs&scope=creations`; query and scope are preserved.
- Browser Back restores `?q=rs&scope=creations` and the active `Karya` tab.
- Typing `Water` produced **0** `/rest/v1/` or `/rpc/` requests; explicit submit moved to `?q=Water`.
- Submitting from `?q=rs&scope=creators` kept the tab: `?q=rsdy&scope=creators`.

## Notes

- Dataset still has no tagged published work, so a positive tag shortcut was not exercised.
- Headless viewport testing does not replace physical-device gesture testing.
- Static guards, typecheck, 97 test files / 717 tests, production build, and scoped ESLint all passed; no commit was made.
