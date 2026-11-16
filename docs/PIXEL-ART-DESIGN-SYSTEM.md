# THE COMMONS — Classic Pixel Adventure

**Status:** Global visual source of truth (B1 and later).  
**Direction:** Classic Pixel Adventure — a pixel-art world, not a modern dashboard that happens to host an editor.  
**Product:** Pixel art community first. Common Space is a later, secondary giant canvas.

THE COMMONS is a studio and community that should feel like stepping into an original 8-bit world. Visitors come to find work. Creators come to make work. The community grows from appreciation.

This language applies to **every surface**: landing, Explore, Create, detail, profile, dashboard, admin, navigation, buttons, cards, inputs, and dialogs — not only Create.

---

## 1. Identity

Inspired by the **color climate** of the Super Mario Bros era (sky, grass, brick, coin, earth), but **THE COMMONS is not a Mario clone**.

- No Nintendo characters, logos, question-mark blocks, pipes-as-brand, mushrooms, or copied sprites.
- No “this is a game level” chrome on the Playground. The editor stays a comfortable studio.
- Bright colors are **accents**. Paper stays the main background so **user artwork is the hero**.
- Do not color every component at once. One strong accent per cluster is enough.

Avoid: generic SaaS dashboards, glassmorphism, pill-everything UI, dark hacker skins, rainbow pages, unreadably tiny pixel body text.

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
- Ink on Paper for body copy. White text only on Brick, Grass, or Ink fills — check contrast.
- Coin is for small marks (appreciation, badges), not large fills behind text.
- Tool/selection state is never color alone (border + marker).
- Drawing palette on the canvas may be wider than this UI palette.

---

## 3. Six visual characters (use all six, consistently)

1. **Pixel borders** — 3px Earth (or Ink) strokes. Square corners. No oversized modern radii. No pill buttons.
2. **Block shadows** — hard offset (`4px 4px 0` Ink). No blur shadows. Pressed controls shift down-right and shrink the shadow.
3. **Pixel icons** — original 8-bit style glyphs (crispEdges / nearest-neighbor). Not generic outline icon sets as the brand voice.
4. **Retro buttons** — feel like objects in a world: fill + Earth border + block shadow. Primary = Brick. Secondary = Grass. Ghost = Paper with Earth border.
5. **Pixel decorations** — original clouds, grass, bricks, coins, stones. Sparse. Never a wallpaper of decorations. Never Nintendo IP.
6. **Pixel typography** — pixel font for titles, kickers, and short accents. DM Sans (or equivalent) for paragraphs, forms, and essential instructions.

---

## 4. Type and motion

- Pixel font: short titles and labels only. Line-height ≥ 1.45. Do not use it for body, hints, comments, or form fields.
- Body: highly legible sans. Comfortable size (~15px) and muted Ink for secondary text.
- Reduced motion: no press-shift animation; keep borders and colors.
- Focus: 3px Sky offset outline, square.

---

## 5. Canvas and studio

The Playground and (later) Common Space viewport are **tools**, not minigames.

- Square pixels, nearest-neighbor, Paper empty color.
- Neutral/Earth frame and block shadow around the canvas. Do not put clouds or coins on the drawing surface.
- Toolbar uses original pixel icons (pencil, eraser, pan, undo, redo). The active tool is Brick. Zoom is pinch/scroll; Fit sits in an extra menu.
- Compact one-row document palette; Palet opens a custom picker (free color, HEX, recent, favorites). The canvas is the largest region, especially on a phone.
- Plenty of Paper around the canvas. Canvas size is artwork resolution, not display size. Public presentation (detail, preview, Explore, profile) upscales with nearest-neighbor CSS so a 16×16 work fills the same stage as a 512×512 work.

---

## 6. Page direction

| Page | Character |
|---|---|
| Home | Entrance to the pixel world: sky kicker, pixel title, one Brick CTA, sparse clouds/grass. Not two equal product modes. |
| Explore | Gallery as a collection of “levels” — framed artwork cards, not a SaaS table. |
| Create | Clean studio. Same chrome language, minimal decoration, maximum drawing comfort. |
| Detail | Artwork is the focus, inside a pixel frame. Meta and **Artwork Conversation** stay secondary: thin separators, not a forum of cards. Grass for appreciate; Brick for delete/report. |
| Profile | Personal pixel gallery. No follower counts. |
| Common Space | Wide pixel world, still a **secondary** destination. |
| Dashboard / admin | Same language as the public site — a control panel in that world, not a separate admin theme. |

---

## 7. Responsive and QA

- Touch targets ~44px. Hard shadows must not clip awkwardly on small screens (allow padding).
- Test text contrast on Brick, Grass, Coin, and Sky.
- Artwork stays the visual hero.
- UI feels like one 8-bit world without becoming noisy or unreadable.
