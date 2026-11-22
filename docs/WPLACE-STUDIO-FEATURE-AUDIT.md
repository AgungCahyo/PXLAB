# THE COMMONS — Wplace Pixel-art Studio Feature Audit

**Dokumen:** WPLACE-STUDIO-FEATURE-AUDIT.md  
**Tanggal:** 17 Nov 2026 · **Diperbarui:** 18 Nov 2026 (arah produk studio)  
**Sifat:** Audit only. Tidak mengubah kode, skema, migrasi, CSS, atau UI.  
**Referensi:** [wplace.live](https://wplace.live/), patch notes [1.6.0](https://wplace.live/patch-notes/1.6.0) / [1.6.5](https://wplace.live/patch-notes/1.6.5) / [1.6.9](https://wplace.live/patch-notes/1.6.9), screenshot Overlay Studio + dialog New Overlay (18 Nov 2026).  
**Sumber kebenaran THE COMMONS:** `PixelBoard.tsx`, `PlaygroundForm.tsx`, `lib/pixel.ts`, `creation-metadata-local.ts`, `lib/pixel-png-scale.ts`, `features/creations/actions.ts`, `lib/validations/creation.ts`, `lib/site.ts`, `docs/PIXEL-RENDER-EXPORT-BLUEPRINT.md`.  
**Arah desain (layout, modal create, inspector, minimap):** [`PIXEL-STUDIO-REDESIGN-BLUEPRINT.md`](PIXEL-STUDIO-REDESIGN-BLUEPRINT.md) — menggantikan asumsi “form + toolbar bawah cukup”.

**Catatan:** `docs/PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` **kadaluarsa** (masih mengklaim fill/eyedropper/shapes/brush/selection belum ada). Inventaris di bawah ini menggantikannya untuk status fitur.

Jangan menyalin identitas, aset, atau kode proprietary Wplace. Hanya prinsip workflow dan kelengkapan studio.

---

## 1. Ringkasan jarak produk

| Dimensi | THE COMMONS hari ini | Wplace Pixel-art Studio (Overlay Studio) |
|---|---|---|
| Model dokumen | Single-layer RLE V1 indexed | Multi-layer project + flatten ke overlay |
| Layout | Full-bleed; header + left rail (desktop) + bottom tools (mobile) + palet strip; **belum** inspector kanan / minimap / modal create | Left tools + center canvas + right inspector + top chrome + minimap + New Overlay modal |
| Drawing | Pensil disk, eraser→Paper, fill, shapes, line | Square/circle brush, polygon, text, gradients, dither |
| Selection | Rect marquee + move + cut/copy/paste (session) | Rect + lasso + color select; paste → layer baru |
| Layers | Tidak ada | Full stack (visibility, lock, folders, merge, multi-select) |
| Recovery | localStorage ≤120KB + IndexedDB; explicit server save | Autosave lokal unfinished edits; Drive sync opsional |
| Tujuan | Karya komunitas → publish Explore | Overlay map / alliance / progress painting |

**Kesimpulan jarak:** THE COMMONS sudah melewati “MVP pensil saja” dan punya fondasi stroke/selection/palette yang nyata, plus P0 chrome parsial (full-bleed, rail kiri, zoom di header, context menu, status). Masih **bukan** aplikasi studio panelled: palet/brush di strip, `/create` tanpa judul wajib, tidak ada inspector/minimap. Gap terbesar vs Wplace: **workspace inspector**, **modal create**, **minimap**, **layers**, **text & gradient**, **project file** multi-layer. Blueprint target: `PIXEL-STUDIO-REDESIGN-BLUEPRINT.md`.

---

## 2. Phase 1 — Existing system (fakta kode)

### 2.1 Struktur halaman

| Route | File | Peran |
|---|---|---|
| `/[lang]/create` | `app/[lang]/(member)/create/page.tsx` | `PixelNewForm` — pilih ukuran; judul hidden `DRAFT_UNNAMED_TITLE` (target: modal judul wajib) |
| `/[lang]/create/[id]` | `…/create/[id]/page.tsx` | `PlaygroundForm` untuk `type === "pixel"` |
| `/[lang]/creation/[id]` | detail publik | Edit → `/create/[id]`; unduh PNG resmi |

Tidak ada route terpisah bernama “playground”. Shell: `data-chrome="playground"`, full-viewport (`fixed inset-0 z-[60]`); site header + tabbar + footer tertutup oleh overlay studio itu sendiri, bukan disembunyikan lewat `body:has(...)` (selector itu tetap cocok saat React menahan route lama sampai view transition selesai) — navigasi keluar lewat chrome studio (Kembali).

### 2.2 Rendering engine

- `ImageData` tunggal di `PixelBoard` → buffer canvas 1:1 → `view` canvas dengan transform × DPR.
- `imageSmoothingEnabled = false`; CSS `image-rendering: pixelated` pada view.
- Dirty flag: `putImageData` hanya saat piksel berubah; pan/zoom = `scheduleView`.
- Skala perangkat bulat (`snapCssScaleToDevicePixels`); origin snap; prefer `devicePixelContentBoxSize`.
- Grid cull ke viewport; `PIXEL_GRID_MIN_ZOOM = 8`.

### 2.3 State management

- React state di `PlaygroundForm` (tool, brush, symmetry, palette, dirty, publish).
- Refs di `PixelBoard` untuk kamera, stroke, selection, history.
- Clipboard: singleton modul `sessionClipboard` (tab-local, bukan OS clipboard).
- Tidak ada store global (Redux/Zustand) untuk dokumen.

### 2.4 Drawing pipeline

`PixelDrawTool`: `"pencil" | "eraser" | "pan" | "eyedropper" | "fill" | "line" | "rect" | "ellipse" | "select"`.

- Pensil/eraser: Bresenham + `stampBrush` (disk radius dari `PIXEL_BRUSH_SIZES` `[1,2,3,4,6,8]`).
- Symmetry `off|x|y|xy` hanya pada pensil/eraser.
- Fill: flood 4-connected, exact RGB, tanpa tolerance/simetri.
- Line/rect/ellipse: preview pada buffer salinan; Shift = constrain square; Alt = filled rect/ellipse.
- Eraser = cat `PIXEL_PAPER` (bukan alpha di editor).

### 2.5 Palette

- Index 0 = Paper `#FFFDF7`; max 64 warna dokumen; append-only saat stroke.
- UI: swatch dokumen + `ColorPicker` (HEX, recent 12, favorites 24, curated swatches).
- `DocumentPaletteDialog`: ganti/hapus warna (hapus → Paper + clear history).

### 2.6 Undo/redo

- `HISTORY_LIMIT = 32` snapshot indeks (`Uint8Array`) per langkah.
- Ctrl/Cmd+Z / Shift+Z / Y; tombol toolbar.
- Bukan tree history; bukan layer-aware.

### 2.7 Draft autosave

- Metadata: `localStorage` `commons:creation-meta:${id}` (langsung).
- Source: debounce 400 ms → `writeLocalCreationSource`.
  - ≤ `LOCAL_SOURCE_LS_SOFT_MAX` (120_000) → localStorage.
  - Lebih besar / quota gagal → IndexedDB `commons-pixel-drafts` / store `sources`.
  - Keduanya gagal → Alert `draftLocalSaveFailed`.
- **Tidak ada autosave server**; Simpan/Terbit eksplisit.
- Setelah save sukses: clear local source (jika `editGen` belum maju).

### 2.8 RLE & DB

- `PixelSourceV1`: `{ version:1, width, height, palette, encoding:"rle-index", runs }`.
- Header di DB (`pixelContentSchema`): width/height/palette/encoding/`source_path` — **bukan** runs.
- Storage: `{user}/{id}/source.json` + `cover.png`; batas 512 KiB masing-masing.
- Ukuran dokumen terkunci setelah create; update menolak width/height berbeda.
- Batas kanvas: sisi 8–1024, luas ≤ 262_144 (`PIXEL_CANVAS_AREA_MAX`).

### 2.9 Publish & export

- Publish: upload source + cover native opaque; `color_usage` snapshot (exclude Paper).
- Unduh klien: skala bulat / fit 1080p|1440p; latar transparan atau Paper solid; worker opsional (`PIXEL_EXPORT_EDGE_MAX = 2560`).

### 2.10 Responsive

- Toolbar bawah horizontal scroll-ish; tool icon; brush/symmetry `<select>`.
- Save/preview/publish: icon-only di HP.
- Pinch zoom + pan; Space = pan sementara; middle-click pan.

---

## 3. Phase 2 — Feature inventory (THE COMMONS × Wplace)

Status: **Ada** | **Sebagian** | **Belum**. Referensi Wplace dari patch notes Overlay Studio / Pixel-art Studio.

### A. Workspace & interface

| Fitur | Commons | Wplace ref | Catatan |
|---|---|---|---|
| Editor workspace layout | Sebagian | Left/right panels + top chrome | Commons: header + bottom bar |
| Toolbar | Ada (bawah) | Toolbar kiri vertikal | |
| Contextual tool settings | Sebagian | Panel brush/shape | Brush/symmetry selalu di bar |
| Layers panel | Belum | Layers + folders (1.6.x / later) | |
| Color palette panel | Sebagian | Collapsible paint palette (1.6.9) | Swatch strip + dialog |
| Canvas viewport | Ada | Center stage | |
| Zoom controls | Sebagian | % widget top | Fit + step + More; tanpa ± key |
| Pan controls | Ada | | Tool / Space / middle / pinch |
| Minimap | Belum | Live minimap (1.6.5) | |
| Floating controls | Belum | Canvas labels, transform handles | |
| Context menu | Belum | Right-click / Shift+F10 / long-press (1.6.5) | |
| Collapsible panels | Belum | Palette minimize (1.6.9) | |
| Fullscreen mode | Sebagian | | Mobile full-bleed; bukan true fullscreen API |

### B. Drawing tools

| Fitur | Commons | Wplace |
|---|---|---|
| Pencil | Ada | Ada |
| Square brush | Sebagian | Explicit square/circle | Commons disk ≈ circle |
| Circle brush | Sebagian | Ada | `stampBrush` disk |
| Eraser | Ada (→Paper) | Ada |
| Paint bucket | Ada | Ada |
| Eyedropper | Ada (+ Alt hold) | Ada |
| Line | Ada | Ada |
| Rectangle / filled | Ada (Alt fill) | Ada |
| Ellipse / filled | Ada (Alt fill) | Ada |
| Polygon | Belum | Ada (1.6.0) |
| Bézier curve | Belum | Tidak disebut eksplisit di 1.6.x notes |

### C. Selection tools

| Fitur | Commons | Wplace |
|---|---|---|
| Rectangular selection | Ada | Ada |
| Lasso | Belum | Disebut di actions/workflow studio | |
| Contiguous / by color | Belum | Select nontransparent layer pixels (later notes) | |
| Move selection | Ada | Ada |
| Cut / copy / paste | Ada (session) | Ada; paste → layer baru (1.6.9) |
| Duplicate | Sebagian | Ada | Paste setelah copy ≈; tanpa “duplicate” eksplisit |
| Delete selection | Ada (Del → Paper) | Ada |
| Selection transform | Sebagian | Move/resize layer/selection | Flip/rotate selection ada; bukan free transform |

### D. Layer system

| Fitur | Commons | Wplace |
|---|---|---|
| Multiple layers | Belum | Ada (1.6.0+) |
| Thumbnails / visibility / lock / opacity | Belum | Ada |
| Rename / duplicate / reorder / delete / merge | Belum | Ada |
| Folders / multi-select | Belum | Ada (compact palette notes) |
| Layer transform / import image as layer | Belum | Ada |
| Layer-aware undo | Belum | Ada |

### E. Advanced tools

| Fitur | Commons | Wplace |
|---|---|---|
| H/V symmetry | Ada (pencil only) | Ada |
| Brush size | Ada (disk 1–8) | Square/circle + size |
| Pixel-perfect / grid | Ada (grid + integer device scale) | Grid + zoom |
| Linear / radial gradient | Belum | Ada (1.6.9) + dither option |
| Dithering | Belum | Ada (dengan gradient) |
| Text tool | Belum | Ada (1.6.9) |
| Image import / reference | Belum | Import images as layers / overlays |
| Crop / expand canvas | Belum | Ada (1.6.0) |
| Flip / transform artwork | Sebagian | Flip + move/resize | Flip H/V + rotate 90 (square canvas full) |

### F. Productivity

| Fitur | Commons | Wplace |
|---|---|---|
| Keyboard shortcuts | Ada (tools, undo, clipboard) | Customizable (game-wide Controls) |
| Customizable shortcuts | Belum | Ada |
| Tooltips | Sebagian (`title`/aria) | Redesigned tooltips |
| Right-click actions | Belum | Context menu |
| Undo/redo / history | Ada (32) | Ada (+ layer ops) |
| Autosave | Sebagian (browser only) | Automatic recovery lokal |
| Draft recovery | Ada (LS/IDB) | Ada |
| Export/import editable projects | Sebagian | Layered project import | Commons: RLE+PNG publish; unduh PNG saja |

---

## 4. Fitur Wplace yang **tidak** diadaptasi

| Fitur | Alasan |
|---|---|
| World-map overlay placement / opacity on map | Produk berbeda (komunitas karya, bukan canvas dunia) |
| Alliance HQ / share overlay ke alliance | Tidak ada model alliance |
| Paint charges, Droplets, Prism, store | Monetisasi game |
| Pixel inspection mismatch (red X / gray ?) | Overlay painting progress, bukan editor komunitas |
| Google Drive backup sebagai sumber kebenaran | Commons memakai Supabase + draft browser |
| Overlay gallery tags berwarna Wplace | Explore sudah punya kategori ukuran + tags karya |
| “Save to overlay” / map HUD | Tidak relevan |

---

## 5. Gap prioritas (ringkas)

1. **Modal create + judul wajib + preview latar** — alur screenshot 2; tidak bump format.
2. **Workspace studio** (header + rail kiri + inspector kanan + status + minimap) — screenshot 1; ganti strip palet/brush desktop.
3. **Mobile dock + sheet inspector** — bukan perkecil desktop.
4. **Layers + format dokumen** — gap fungsional terbesar; menyentuh RLE/publish (Opsi B dulu).
5. **Polygon / text / gradient** — advanced drawing; bake ke single layer dulu.
6. **Crop/expand canvas** — butuh aturan ukuran + migrasi header dimensi (hari ini dimensi terkunci).
7. **Custom shortcuts / OS clipboard** — polish.

Spesifikasi lengkap: `PIXEL-STUDIO-REDESIGN-BLUEPRINT.md`. Matriks lama P0–P3: `PIXEL-EDITOR-IMPLEMENTATION-ROADMAP.md`.
