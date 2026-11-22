# Fluid CreatorCard width validation

Date: 2026-11-23

## Scope

Validated the `fluid` prop added to `CreatorCard`: Search Creators cards fill their grid column, while Search All and the discovery rails keep the compact 256px card. No body-level overflow hiding was used.

## Environment

Production build on `http://127.0.0.1:3100`, authenticated test profile `rsdy`, Chrome via CDP on port 9228. Viewports: 375, 390, 440, and 1440px.

## Results

| Viewport | State | List layout | Card width(s) | Document scroll/client | Result |
| --- | --- | --- | --- | --- | --- |
| 375 | Search All | `flex`, horizontal rail | 256 / 256 | 360 / 360 | Pass |
| 375 | Search Creators | `grid`, 1 column | 336 / 336 | 360 / 360 | Pass |
| 390 | Search All | `flex`, horizontal rail | 256 / 256 | 375 / 375 | Pass |
| 390 | Search Creators | `grid`, 1 column | 351 / 351 | 375 / 375 | Pass |
| 440 | Search All | `flex`, horizontal rail | 256 / 256 | 425 / 425 | Pass |
| 440 | Search Creators | `grid`, 1 column | 401 / 401 | 425 / 425 | Pass |
| 1440 | Search All | `flex`, horizontal rail | 256 / 256 | 1425 / 1440 | Pass |
| 1440 | Search Creators | `grid`, 3 × 352px | 352 / 352 | 1425 / 1440 | Pass |

`scrollWidth <= clientWidth` is the overflow assertion; the 1440px document reports a 15px scrollbar gutter, which is not overflow. The viewport override reports 360/375/425px client widths on small screens for the same scrollbar-gutter reason.

At every step: self was absent, no page-level horizontal overflow was observed, Search All kept 256px compact cards, and Search Creators cards exactly matched their grid column width.

## Evidence

- `validation.json` — full CDP measurements and assertions
- `375-all.png`, `375-creators.png`
- `390-all.png`, `390-creators.png`
- `440-all.png`, `440-creators.png`
- `1440-all.png`, `1440-creators.png`
