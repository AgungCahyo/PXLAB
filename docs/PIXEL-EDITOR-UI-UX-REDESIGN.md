# THE COMMONS — Pixel Editor UI/UX Redesign Recommendations

> **Status: SUPERSEDED**
> **Updated:** 2026-11-24.
> **Reason:** Its workspace, create-dialog, inspector, minimap and publish-layout recommendations were superseded first by the redesign blueprint and now by shipped Studio work.
> **Replacement:** [docs/studio/01_SYSTEM_AUDIT.md](studio/01_SYSTEM_AUDIT.md) for current inventory, [PXLB_STUDIO_EXECUTION.md](studio/PXLB_STUDIO_EXECUTION.md) for milestone state, [PRODUCT-SPEC.md](PRODUCT-SPEC.md) for product decisions.
> **Coding agent instruction:** Do not implement §3–§6 as current layout targets. Only the visual-identity principles and anti-pattern discussion remain useful historical context.
> **Document purpose:** Historical UI/UX recommendation report for the pixel editor.
> **Completed:** Later Studio work implemented the shipped workspace; this report is not an implementation source.
> **Open:** No active task from this document.
> **Dependencies:** Superseded by current studio docs.
> **Next action:** Read-only archive.
> **Implementation evidence:** VERIFIED IN CODE — `components/creations/PlaygroundForm.tsx`, `components/creations/StudioMinimap.tsx`, `components/creations/StudioInspector.tsx`; VERIFIED BY TEST — `tests/pixel-studio-redesign.test.ts`.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION.

**Dokumen:** PIXEL-EDITOR-UI-UX-REDESIGN.md  
**Tanggal:** 17 Nov 2026 · **Diperbarui:** 18 Nov 2026  
**Sifat:** Rekomendasi desain saja. Tidak mengimplementasikan UI.  
**Identitas:** Classic Pixel Adventure (`PIXEL-ART-DESIGN-SYSTEM.md`) — Paper, Earth borders, Brick CTA, block shadows. **Bukan** salinan skin Wplace (abu-biru SaaS).  
**Dasar audit:** `WPLACE-STUDIO-FEATURE-AUDIT.md` + layout referensi Overlay Studio.

> **Layout workspace, modal Buat Karya, inspector, minimap, dan alur publish:** sumber kebenaran sekarang [`PIXEL-STUDIO-REDESIGN-BLUEPRINT.md`](PIXEL-STUDIO-REDESIGN-BLUEPRINT.md). Bagian §3–§6 di bawah ini **kadaluarsa sebagai target layout** (masih berguna untuk prinsip identitas §2 dan anti-pola §7). Jangan implementasikan “contextual strip + palet bawah” sebagai keadaan akhir.

---

## 1. Masalah pengalaman hari ini

`PlaygroundForm` terasa seperti **form komunitas dengan kanvas di tengah**, bukan aplikasi kreatif:

- Toolbar **bawah** memuat tools + brush + symmetry + history + swatches → padat di HP, “admin strip” di desktop.
- Header memikul judul karya, status simpan, dan publish — sinyal produk komunitas mendominasi sinyal studio.
- Pengaturan tool (brush, symmetry) selalu terlihat meski tool tidak membutuhkannya.
- Tidak ada hirarki panel: palet = deretan kecil; layers tidak ada; tidak ada minimap untuk kanvas lebar/tinggi (preset 360×640, custom 1024×256).
- Dialog “More” menumpuk navigasi kanvas, unduh, flip, hapus — bukan context menu di kanvas.

Tujuan redesign: **studio profesional dalam bahasa THE COMMONS**, tetap ramah publish komunitas.

---

## 2. Prinsip adaptasi (bukan clone)

1. **Artwork is the hero** — maksimalkan area kanvas; panel collapsible.
2. **Satu identitas** — token Paper/Ink/Earth/Brick; ikon `PixelIcon`; border 3px; tanpa glass/purple SaaS.
3. **Contextual controls** — brush size muncul untuk pencil/eraser/line; fill options untuk bucket; selection actions saat ada seleksi.
4. **Desktop ≠ mobile layout** — desktop: rail kiri + optional rail kanan; mobile: tool rail bawah + sheet kontekstual.
5. **Komunitas tetap ada tapi tidak menelan studio** — Simpan/Terbit di chrome tipis atau overflow; bukan bar tiga CTA besar di setiap frame.
6. **Jangan dashboard** — tidak ada kartu statistik, tidak ada multi-column admin.

---

## 3. Layout target

### 3.1 Desktop (≥ md)

```
┌─ Studio header (satu baris) ─────────────────────────────────┐
│ ← · judul/status · zoom/−/+/Fit/grid/undo   [Simpan][⋯][Terbit] │
├────┬───────────────────────────────────────────────┬─────────┤
│ T  │                                               │ Palette │
│ o  │              CANVAS VIEWPORT                  │ (coll.) │
│ o  │         + optional minimap BL                 │ Layers* │
│ l  │                                               │ (coll.)*│
│ s  │                                               │         │
├────┴───────────────────────────────────────────────┴─────────┤
│ Contextual strip (jika relevan) · status: ukuran · alat · hint │
└──────────────────────────────────────────────────────────────┘
```

\* Layers panel muncul hanya setelah model layer diaktifkan (lihat arsitektur).

**Toolbar kiri (vertikal):** pencil, eraser, select, fill, eyedropper, line, rect, ellipse, pan — ikon ≥44px touch-friendly, `aria-pressed`, tooltip shortcut.

**Panel kanan (collapsible):**  
- Palet aktif (swatch besar + HEX + “semua warna”).  
- Nanti: stack layer.  
Minimize → strip sempit: warna aktif saja (mirip ide Wplace 1.6.9, visual Commons).

**Chrome atas:** satu header — metadata karya + zoom Fit / − / label / + + grid + undo/redo + Simpan/Pratinjau/Terbit/⋯. **Bukan** strip view terpisah di bawah header.

**Status bar:** ukuran · nama alat · status simpan · pintasan singkat.

**Minimap (opsional P1):** pojok kanvas, frame Earth, nearest-neighbor thumbnail, viewport rect.

### 3.2 Mobile (< md)

- Full-bleed: sembunyikan site header (semua breakpoint).
- Header tipis: Back · judul · Simpan/Pratinjau/Terbit/⋯.
- **View dock** di atas tool rail (zoom / Fit / grid / undo / redo).
- **Tool rail bawah** 1 baris scroll horizontal (pertahankan pola jari jempol).
- Tap tool → **sheet** setengah tinggi untuk settings (brush, symmetry, fill mode).
- Long-press kanvas → context menu (setara Wplace long-press).

---

## 4. Hierarki visual & ukuran

| Elemen | Rekomendasi |
|---|---|
| Ikon tool | 24px glyph dalam hit target 44×44; border Earth 3px |
| Tool aktif | Brick fill + Ink shadow (sudah mirip `pixel-choice`) |
| Panel | bg Soft/Card; bukan flat gray Wplace |
| Tipografi chrome | pixel font judul kecil; sans untuk label body |
| Zoom widget | satu kontrol terpusat (bukan hanya teks di status) |
| Swatch | 28–32px di panel; 36px+ untuk warna aktif |
| Spacing | kurangi “form gap”; kanvas `flex-1 min-h-0` prioritas |

---

## 5. Interaksi per zona

### Toolbar
- Single-select tool.
- Shortcut letters tetap (B E V I G L U O H) + tampilkan di tooltip.
- Jangan campur undo/grid ke dalam kolom tool utama — pindah ke chrome view.

### Contextual strip
| Tool | Kontrol yang muncul |
|---|---|
| Pencil / eraser / line | Brush size, symmetry |
| Rect / ellipse | Fill toggle (ganti ketergantungan Alt tersembunyi) |
| Fill | (nanti) contiguous vs global; tolerance off by default |
| Select | Cut / copy / paste / delete / flip — tombol atau context menu |

### Palette
- Klik = warna aktif; long-press / ⋯ = manage.
- Paper tidak di deretan tinta (sudah); eraser terpisah.
- Collapsible: ekspansi penuh vs swatch aktif saja.

### Canvas
- Floating label opsional: `W×H` + nama tool (hindari clutter permanen; hide setelah 2s).
- Context menu: undo, paste, select all, zoom fit, flip (subset).
- Grid toggle di view chrome, bukan di antara swatch.

### Metadata komunitas
- Judul: inline edit OK, tetapi visual secondary.
- Caption/tags: dialog Details (sudah) — jangan panel permanen.

---

## 6. Desktop vs mobile workflow

| Tugas | Desktop | Mobile |
|---|---|---|
| Ganti tool | Rail kiri / keys | Rail bawah |
| Brush size | Contextual strip / `[` `]` | Sheet setelah pilih pencil |
| Zoom | Widget + wheel | Pinch (sudah) + tombol |
| Selection ops | Context menu + keys | Sheet saat ada seleksi |
| Publish | Chrome kanan atas | ⋯ → Terbit |
| Palette manage | Panel kanan | Dialog penuh |

---

## 7. Anti-pola (hindari)

- Menyalin UI abu-biru Wplace atau menaruh logo/aset mereka.
- Membuka **semua** panel permanen di viewport pertama.
- Mengubah Playground menjadi dashboard analytics.
- Menyembunyikan Simpan/Terbit sepenuhnya (produk komunitas butuh jalur jelas).
- Overlay badge/sticker di atas hero artwork di surface publik (aturan desain yang sudah ada).

---

## 8. Urutan visual (tanpa tunggu layers)

**Diganti** oleh fase S0–S3 di `PIXEL-STUDIO-REDESIGN-BLUEPRINT.md` §10:

1. **S0:** Modal create (judul wajib, preset Commons, latar, preview).  
2. **S1:** Header + rail kiri + inspector kanan + status (hapus strip palet/brush desktop).  
3. **S2:** Mobile dock + tab sheet.  
4. **S3:** Minimap.  
5. Layers panel hanya setelah model data (Opsi B).

Detail teknis & risiko: `PIXEL-EDITOR-TECHNICAL-ARCHITECTURE.md`.  
Prioritas fitur: `PIXEL-EDITOR-IMPLEMENTATION-ROADMAP.md`.
