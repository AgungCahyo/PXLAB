# PXLB — Modern Pixel Playground

**Status:** Global visual source of truth (Production Readiness polish onward).  
**Direction:** Modern Pixel Playground — a cheerful pixel-art creative platform, not a game level and not a generic SaaS dashboard.  
**Product:** Pixel art community first. Common Space is a later, secondary giant canvas.

PXLB should feel like **one product**: Landing invites, Create invites making, Editor makes drawing joyful, Explore invites browsing, Profile makes creators proud, Dashboard feels like coming home.

This language applies to **every surface**: landing, Explore, Create, detail, profile, dashboard, admin, navigation, buttons, cards, inputs, and dialogs — not only Create.

**Supersedes:** “Classic Pixel Adventure” full sky-stage presentation. Palette accents (sky / grass / brick / coin / earth) stay; atmosphere is Paper-first and selective.

---

## 1. Identity

Inspired by the **color climate** of classic pixel games (sky, grass, brick, coin, earth), but **PXLB is not a Mario clone** and **not a theme-park level**.

- No Nintendo characters, logos, question-mark blocks, pipes-as-brand, mushrooms, or copied sprites.
- No “this is a game level” chrome on the Playground. The editor stays a comfortable studio.
- Bright colors are **accents**. **Paper** stays the main background so **user artwork is the hero**.
- Pixel borders and hard shadows are **selective** — on controls, frames, and cards that need object-ness — not on every text block.
- Do not color every component at once. One strong accent per cluster is enough.

Avoid: generic SaaS dashboards, glassmorphism, pill-everything UI, dark hacker skins, rainbow pages, unreadably tiny pixel body text, full-bleed artificial sky stages behind long reading.

---

## 2. Palette

| Token | Hex | Use |
|---|---|---|
| Sky | `#59BCEB` | Identity, links, focus, highlights |
| Grass | `#45A849` | Positive / secondary buttons |
| Brick | `#E94B3C` | Primary CTA, important actions |
| Coin | `#FFD447` | Badges, appreciation, small highlights |
| Earth | `#936037` | Borders, frames, decorative detail |
| Paper | `#FFFDF7` | Main background |
| Ink | `#282B35` | Text, hard shadows, contrast |
| Soft | `#F4F1E8` | Secondary surface inside frames |

### Color rules

- Paper (or Soft) behind long reading. Never Brick/Sky/Grass as a full-page wash.
- Atmosphere may tint Paper with a **light Sky wash** at the top only — still readable Ink on Paper.
- Ink on Paper for body copy. White text only on Brick, Grass, or Ink fills — check contrast.
- Coin is for small marks (appreciation, badges), not large fills behind text.
- Tool/selection state is never color alone (border + marker).
- Drawing palette on the canvas may be wider than this UI palette.
- Do not invent off-token stage colors (no unrelated `#5c94fc` sky / `#c84c0c` ground).

---

## 3. Six visual characters (use all six, consistently)

1. **Pixel borders** — 3px Earth (or Ink) strokes. Square corners. No oversized modern radii. No pill buttons.
2. **Block shadows** — hard offset (`4px 4px 0` Ink) on interactive objects and framed art. No blur shadows. Pressed controls shift down-right and shrink the shadow.
3. **Pixel icons** — original 8-bit style glyphs (crispEdges / nearest-neighbor). Not generic outline icon sets as the brand voice.
4. **Retro buttons** — feel like objects: fill + Earth border + block shadow. Primary = Brick. Secondary = Grass. Outline = Paper + Earth.
5. **Sparse pixel atmosphere** — soft Paper stage + light decorative pixels/clouds when helpful. Never a wallpaper of decorations. Never Nintendo IP. Hide entirely on Playground chrome.
6. **Pixel typography** — pixel font for short titles, kickers, and brand. DM Sans for paragraphs, forms, user-generated titles, and instructions.

---

## 4. Type and motion

- Pixel font: short titles and labels only. Line-height ≥ 1.45. Do not use it for body, hints, comments, or form fields.
- Page product titles use `.pixel-title`. Long user artwork titles use `.page-heading-sans`.
- Body: highly legible sans (~15px) and muted Ink for secondary text.
- Reduced motion: no press-shift or atmosphere animation; keep borders and colors.
- Focus: 3px Sky offset outline, square.

---

## 5. Canvas and studio

The Playground and (later) Common Space viewport are **tools**, not minigames.

- Square pixels, nearest-neighbor, Paper empty color.
- Neutral/Earth frame and block shadow around the canvas. Do not put clouds or coins on the drawing surface.
- Toolbar uses original pixel icons. The active tool is Brick.
- The canvas is the largest region, especially on a phone.
- Public presentation upscales with nearest-neighbor CSS so small works still read as art.

---

## 6. Page direction

| Page | Character |
|---|---|
| Home | Brand-first entrance: PXLB + one headline + one line + CTA + **community art as the visual anchor**. Not two equal product-mode cards. |
| Explore | Gallery of framed works. Filters quiet; artwork first. Breathing room above the fold. |
| Create | Clear product title + invite, then size/setup. Same chrome language. |
| Detail | Artwork is the focus. Meta and Artwork Conversation secondary. |
| Profile | Personal pixel gallery — pride, not a settings dump. No public follower counts. |
| Dashboard | Creator home in the **same gallery language** as Explore/Profile (not a SaaS file table). |
| Common Space | Secondary destination. |
| Auth / admin | Same Paper + pixel chrome — a desk in the playground, not a separate theme. |

---

## 7. Atmosphere (`PixelWorldBackdrop`)

- Mounted behind `PublicShell` content; disabled on Playground / studio chrome.
- **Soft Paper stage**: light Sky tint, Soft/Grass ground band using theme tokens, sparse SVG deco at low opacity.
- Scene mapping by route remains (home / explore / create / …) for subtle variation — not a different product skin per page.

---

## 8. Responsive and QA

- Touch targets ~44px (studio may compact to ≥36px on small screens).
- Hard shadows must not clip awkwardly on small screens (allow padding).
- Test text contrast on Brick, Grass, Coin, and Sky.
- Artwork stays the visual hero.
- UI feels like one modern pixel playground without becoming noisy or unreadable.
