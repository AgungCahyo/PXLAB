# THE COMMONS — Pixel Playground Design Features Audit & Roadmap

**Dokumen:** PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md  
**Tanggal:** 17 Nov 2026  
**Sifat:** Audit + perencanaan fitur **desain**. Bukan izin implementasi. Tidak mengubah kode, skema, migrasi, RLE, PNG, RLS, atau UI.

> **Kadaluarsa untuk status fitur dan target layout.** Ganti dengan `WPLACE-STUDIO-FEATURE-AUDIT.md` (inventaris) dan `PIXEL-STUDIO-REDESIGN-BLUEPRINT.md` (workspace + modal create). Dokumen ini masih mengklaim fill/eyedropper/shapes belum ada.

**Fokus:** kemampuan studio pixel art (tools, selection, layers, precision, aids) — **bukan** polish workflow Simpan / Terbit / leave. Persistensi Studio (explicit-save, local draft) tetap keputusan produk terpisah; lihat `ARTWORK-METADATA-EXPLORE-AUDIT.md` #8.

**Sumber kebenaran kode:** `components/canvas/PixelBoard.tsx`, `lib/pixel.ts`, `components/creations/PlaygroundForm.tsx`, `components/creations/ColorPicker.tsx`, `lib/pixel-color-memory.ts`, `lib/site.ts` (batas payload).

**Spesifikasi terkait (sebagian ketinggalan vs kode):** `PIXEL-CANVAS-SPEC.md`, `PIXEL-ART-DESIGN-SYSTEM.md`, `REDESIGN-BLUEPRINT.md` (bagian Playground), `PRODUCT-SPEC.md`.

---

## 1. Ringkasan eksekutif

Playground hari ini adalah **studio single-layer 1×1** yang solid: pensil, penghapus (Paper), pan, zoom/fit/wheel/pinch, undo/redo 32 langkah, palet dokumen hingga 64 warna + ColorPicker (HEX / recent / favorit), grid otomatis pada zoom tinggi, dan export `PixelSourceV1` (RLE indeks) + PNG opaque.

Itu cukup untuk MVP komunitas, tetapi **jauh dari studio pixel art lengkap**. Kesenjangan terbesar bagi kebebasan kreatif: fill, eyedropper, shape tools, brush size, selection/move/copy, flip/rotate, symmetry, palette management, dan (jauh kemudian) layers / animation.

**Implikasi format:** hampir semua alat “klasik” (fill, shapes, selection, symmetry) bisa masuk **tanpa bump `PixelSource`** jika hasil di-bake ke satu buffer indexed. **Layers, alpha, animation** membutuhkan model dokumen baru (v2) + flatten untuk PNG / `color_usage`.

---

## 2. Inventaris kemampuan desain (dari kode)

Status: **Ada** | **Partial** (ada tapi tipis / inkonsisten) | **Belum** (diverifikasi tidak ada di `PixelBoard` / chrome studio — bukan hanya karena absen di docs).

### 2.1 Drawing tools & shape tools

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Pensil 1×1 | Ada | `Tool = "pencil" \| "eraser" \| "pan"`; `stamp` → `setPixel` |
| Penghapus → Paper | Ada | `paintColor` memakai `PIXEL_PAPER` saat eraser; bukan alpha |
| Bresenham stroke | Ada | `walkLine` di `lib/pixel.ts`; dipanggil dari `stamp` |
| Brush size > 1 | Belum | Satu `setPixel` per sel |
| Garis / rect / ellipse | Belum | Tidak ada tool atau preview shape |
| Fill / bucket | Belum | Spec mendefer; tidak ada stub handler |
| Dither / spray | Belum | — |
| Eyedropper | Belum | Spec mendefer; tidak ada Alt-click / tool |

### 2.2 Selection, move, copy, paste, transform

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Marquee / lasso / wand | Belum | — |
| Move / cut / copy / paste | Belum | Tidak ada clipboard buffer di board |
| Delete selection | Belum | — |
| Flip H/V, rotate 90° | Belum | — |
| Scale / free transform | Belum | — |

**Catatan format:** operasi ini **tidak wajib** mengubah skema jika hasil di-bake ke `ImageData` sebelum `exportSource`. Clipboard boleh sesi-editor saja.

### 2.3 Layer management

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Multi-layer | Belum | Satu `ImageData` + satu stream RLE |
| Opacity / blend | Belum | Alpha selalu 255 di buffer |
| Visibility / lock | Belum | — |
| Flatten | N/A | PNG sudah flatten implisit dari satu buffer |

**Catatan format:** layers butuh `PixelSource` v2 (atau sidecar) + aturan flatten untuk PNG dan snapshot `color_usage` saat publish.

### 2.4 Color & palette management

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Palet dokumen max 64 | Ada | `PIXEL_DOCUMENT_PALETTE_MAX`; index 0 = Paper wajib |
| HEX bebas + native color | Ada | `ColorPicker`, `normalizePixelHex`, `ensurePaletteColor` |
| Recent / favorites | Ada | `pixel-color-memory.ts`; max 12 / 24 |
| Auto-append warna saat cat | Ada | `adoptColor` di board |
| Feedback palet penuh saat stroke | Partial | Error di ColorPicker; stroke diam jika penuh |
| Hapus / urut ulang / remap warna | Belum | History menyimpan indeks — remap harus rewrite buffer + undo stack |
| Ramp / replace-color | Belum | — |
| Import palet | Belum | — |

### 2.5 Grid, symmetry, precision

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Grid overlay | Partial | Otomatis jika `scale >= PIXEL_GRID_MIN_ZOOM` (8); bukan toggle |
| Rulers / guides | Belum | — |
| Symmetry draw (X/Y/XY) | Belum | — |
| Snap (selain grid sel) | Belum | Koordinat sudah integer sel |

### 2.6 Canvas manipulation & view

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Pan tool + middle-mouse | Ada | `PixelBoard` pointer handlers |
| Zoom Fit + steps 1…48 | Ada | `PIXEL_ZOOM_STEPS`; wheel; pinch 0,25–48 |
| Fit dari menu Lainnya | Ada | `PlaygroundForm` → `board.fit()` / `zoomBy` |
| Zoom % di chrome studio | Partial | Label zoom ada di chrome **prototype**; studio memakai More + gesture |
| Ukuran kanvas saat buat | Ada | Preset + custom 8–512; area ≤ 512² |
| Resize / crop di editor | Belum | WxH tersimpan di content; mengubahnya invalidasi RLE |
| Clear canvas | Belum | — |
| Tile / pattern preview | Belum | `PIXEL_TILE_SIZE` 32 ada untuk Common Space nanti, tidak dipakai Playground |

### 2.7 Reference & alat bantu

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Reference image overlay | Belum | — |
| Image import → quantize | Belum | Spec: out of scope kecuali disetujui |
| Onion skin / frames | Belum | Model karya = satu bitmap |

### 2.8 Workflow desain (bukan publish)

| Fitur | Status | Bukti / catatan |
|---|---|---|
| Undo / redo 32 | Ada | `HISTORY_LIMIT = 32`; snapshot `Uint8Array` indeks per pointer-down |
| Ctrl/Cmd+Z, Y, Shift+Z | Ada | Hanya di `variant === "studio"` |
| Shortcut tool (B/E/G/Space) | Belum | Hanya Z/Y |
| Pratinjau PNG | Ada | `PlaygroundForm` toggle preview (workflow tampilan, bukan tool desain) |
| Hint gesture | Partial | Copy: “Dua jari menggeser”; kode = pinch zoom + mid pan |

### 2.9 Dual chrome (penting untuk implementasi nanti)

- `PixelBoard` `variant="prototype"` + `chrome`: toolbar lengkap di dalam board.
- Playground live: `variant="studio" chrome={false}` — tools di-reimplement sebagian di `PlaygroundForm`.
- Fitur desain baru harus memutuskan: API board + chrome studio, atau menghidupkan kembali chrome board. Jangan dobel tanpa kontrak props.

---

## 3. Batasan teknis & kompatibilitas

### 3.1 Model data

```
Pointer → ImageData (RGBA opaque) → indices (Uint8) → RLE runs + palette → source.json
                                              ↘ buffer.toBlob PNG (display)
```

| Artefak | Peran |
|---|---|
| `PixelSourceV1` | Source of truth editor: `version`, `width`, `height`, `palette[]`, `encoding: "rle-index"`, `runs[]` |
| PNG | Artefak tampilan; hydrate **tidak** dari PNG |
| History | Indeks flat; palet hidup di `paletteRef` (append-only aman) |
| `color_usage` | Snapshot server **saat publish** dari source (bukan tool studio) |

### 3.2 Matriks kompatibilitas fitur baru

| Kelas fitur | RLE v1 | PNG flatten | History 32 | Explicit-save / local draft | `color_usage` |
|---|---|---|---|---|---|
| Eyedropper, shortcuts, grid toggle, zoom readout | OK | OK | OK | Dirty lokal sama | N/A |
| Fill, shapes, brush size, symmetry | OK (bake) | OK | Per stroke/op | Dirty lokal | Saat publish |
| Selection move/copy/flip/rotate/clear | OK (bake) | OK | Per commit op | Dirty lokal | Saat publish |
| Palette delete/remap | OK jika rewrite indeks | OK | **Harus** sync/invalidate history | Dirty | Saat publish |
| Reference overlay | OK (tidak di source) | Tidak masuk PNG kecuali bake | N/A | Opsional local-only | N/A |
| Canvas resize/crop | **Ubah** WxH + RLE | Regenerasi | Reset history | Dirty + schema content | Saat publish |
| Layers / alpha / animation | **Butuh v2** | Flatten policy | History kaya | Draft lebih besar | Dari flatten |

### 3.3 Risiko performa

- Flood fill pada 512×512: BFS/stack; batasi iterasi; satu undo snapshot.
- Selection drag preview: jangan encode RLE tiap frame; bake saat pointer-up.
- Layers × N: payload JSON & undo memori; butuh desain v2 + batasan jumlah layer.

### 3.4 Persistensi (konteks saja)

Studio **tidak** server-autosave pixel/metadata (keputusan #8). Tool desain baru hanya perlu memanggil jalur dirty kanvas yang sama (`onStrokeEnd` / setara). Jangan mengembalikan autosave DB sebagai syarat fitur desain.

---

## 4. Katalog per kategori — manfaat kreatif

### 4.1 Drawing tools & shapes

| Fitur | Manfaat kreatif |
|---|---|
| Eyedropper | Sampling cepat dari karya sendiri; menjaga harmoni palet |
| Fill | Blok warna, sky/BG, siluet massal tanpa klik per piksel |
| Line / rect / ellipse | UI chrome, arsitektur, proporsi tubuh, ikon |
| Brush size | Blocking kasar lalu detail 1×1 |

### 4.2 Selection & transform

| Fitur | Manfaat kreatif |
|---|---|
| Marquee + move | Komposisi ulang tanpa redraw |
| Copy / paste | Motif berulang, tile dekoratif |
| Flip / rotate | Simetri karakter, variasi pose |

### 4.3 Layers

| Fitur | Manfaat kreatif |
|---|---|
| Lineart / color / BG terpisah | Iterasi aman; eksperimen warna |
| Hide / lock | Fokus lapisan aktif |

Ongkos: format, undo, UI — cadangkan setelah tools datar matang.

### 4.4 Color & palette

| Fitur | Manfaat kreatif |
|---|---|
| Remap / hapus warna | Palet ketat, mood swap |
| Replace-color | Revisi skema tanpa seleksi manual |
| Warn palette full | Hindari “cat tidak jalan” diam-diam |

### 4.5 Grid, symmetry, precision

| Fitur | Manfaat kreatif |
|---|---|
| Grid toggle | Kontrol pixel-perfect independen zoom |
| Symmetry | Wajah, creature, ornament cepat |
| Guides | Proporsi konsisten |

### 4.6 Canvas manipulation

| Fitur | Manfaat kreatif |
|---|---|
| Flip/rotate seluruh karya | Orientasi final |
| Resize/crop | Iterasi resolusi (risiko format tinggi) |
| Clear | Mulai ulang aman dengan undo |

### 4.7 Reference & aids

| Fitur | Manfaat kreatif |
|---|---|
| Reference overlay | Trace/proporsi dari sketsa atau foto |
| Import→quantize | Bootstrap dari aset (nanti; kebijakan palet) |

### 4.8 Workflow desain

| Fitur | Manfaat kreatif |
|---|---|
| Shortcut B/E/Space/Alt | Alur seperti studio pro; tangan di keyboard |
| Zoom % terlihat | Kesadaran skala kerja |
| Clear / replace | Lebih sedikit gesekan non-kreatif |

---

## 5. Prioritas (manfaat × kompleksitas × performa × risiko)

| Prioritas | Fitur | Manfaat | Risiko format | Catatan |
|---|---|---|---|---|
| **P0** | Eyedropper + shortcut tool | Tinggi | Rendah | Spec sudah defer; cocok gelombang pertama |
| **P0** | Fill bucket (contiguous) | Tinggi | Rendah | Bake; waspadai 512² |
| **P0** | Shape: line / rect / ellipse (+ constrain) | Tinggi | Rendah | Preview lalu commit |
| **P1** | Brush size 1–N | Tinggi | Rendah | History per stroke |
| **P1** | Selection rect + move/copy/paste/delete | Sangat tinggi | Rendah–sedang | Clipboard in-memory |
| **P1** | Flip H/V + rotate 90° | Tinggi | Rendah | Kanvas atau seleksi |
| **P1** | Grid toggle + zoom % + Space-pan | Sedang | Rendah | Precision chrome |
| **P2** | Symmetry draw | Tinggi | Rendah | Stamp cermin |
| **P2** | Palette reorder/delete/remap + warn full | Sedang | Sedang | Rewrite indeks |
| **P2** | Clear / replace-color | Sedang | Rendah | |
| **P3** | Reference overlay (client-only) | Tinggi | Rendah | Tidak di RLE |
| **P3** | Canvas resize/crop + confirm | Sedang | Tinggi | Ubah content WxH |
| **P4** | Layers + flatten export | Sangat tinggi | Sangat tinggi | Source v2 |
| **P4** | Animation / onion / timeline | Tinggi | Sangat tinggi | Model karya berubah |
| **Later** | Import→quantize, dither, tile mode | Bervariasi | Sedang–tinggi | Setelah P0–P2 |

---

## 6. Roadmap bertahap (D1–D5)

Setiap gelombang **menunggu persetujuan eksplisit** sebelum kode. Jangan digabung jadi satu PR raksasa. Jangan digabung dengan irisan metadata Explore (M5–M7) kecuali disetujui.

### Gelombang D1 — Tools inti (tanpa ubah skema)

**Isi:** eyedropper; fill; line / rect / ellipse; brush sizes; shortcuts (B/E/G/Space/Alt); grid toggle; zoom readout di chrome studio.

**Kriteria keluar:**

- [ ] Semua tool bake ke buffer; `exportSource` / PNG round-trip lulus uji.
- [ ] Undo/redo per operasi atau stroke; tidak merusak history 32.
- [ ] Payload tetap ≤ 512 KiB pada kasus uji tipikal.
- [ ] Explicit-save / local draft tetap berfungsi; tidak ada server autosave baru.
- [ ] Chrome studio menampilkan tool baru tanpa merusak mobile (sentuhan + safe area).

### Gelombang D2 — Seleksi & transform

**Isi:** marquee; move; cut/copy/paste/delete; flip & rotate 90° (seleksi atau seluruh); clear canvas.

**Kriteria keluar:**

- [ ] Clipboard sesi editor; paste bake sebelum export.
- [ ] Transform menghasilkan indeks valid; Paper tetap index 0.
- [ ] Escape batalkan seleksi; Delete menghapus ke Paper.

### Gelombang D3 — Presisi & warna

**Isi:** symmetry X/Y/XY; palette manager (hapus/remap + rewrite); replace-color; feedback palet penuh saat draw.

**Kriteria keluar:**

- [ ] Remap tidak mengorphan indeks; history dikosongkan atau di-rewrite konsisten.
- [ ] Symmetry tidak menulis di luar bounds; undo satu stroke cermin.

### Gelombang D4 — Alat bantu

**Isi:** reference image overlay (opacity, geser lokal); guides opsional.

**Kriteria keluar:**

- [ ] Overlay tidak masuk `source.json` / PNG kecuali produk memutuskan bake.
- [ ] Tidak mengganggu hit-test menggambar (mode lock / opacity).

### Gelombang D5 — Model dokumen baru

**Isi:** desain `PixelSource` v2 (layers); baca v1; flatten → PNG + `color_usage`; migrasi hati-hati.

**Animation / timeline:** gelombang **terpisah** setelah layers terbukti.

**Kriteria keluar:**

- [ ] Karya v1 tetap terbuka.
- [ ] Publish menghasilkan PNG + `color_usage` dari flatten.
- [ ] Batas jumlah layer & ukuran payload terdokumentasi dan diuji.

---

## 7. Urutan kerja teknis yang disarankan (saat implementasi nanti)

1. Ekstrak operasi buffer murni ke `lib/pixel.ts` (fill, shapes, flip, rotate, blit selection) + unit test — terpisah dari React.
2. Perluas `PixelBoardHandle` / props tool tanpa menggandakan logika di Form dan Board.
3. Baru kemudian chrome `PlaygroundForm` (toolbar, shortcut, zoom %).
4. Format v2 hanya setelah D1–D3 stabil di lapangan.

---

## 8. Di luar cakupan sementara

- AI generation, realtime collab di editor pribadi, Common Space tools (B6).
- Gradient brush, text tool, advanced wand multi-toleransi (kecuali disetujui setelah D2).
- Mengubah encoding RLE/PNG storage policy hanya demi fitur UI.
- Polish workflow Simpan/Terbit sebagai bagian dari gelombang D* (boleh irisan terpisah).

---

## 9. Keterkaitan dokumen

| Dokumen | Hubungan |
|---|---|
| `PIXEL-CANVAS-SPEC.md` | Aturan engine; masih mendefer eyedropper/fill/layers; zoom steps di spec ketinggalan vs kode |
| `ARTWORK-METADATA-EXPLORE-AUDIT.md` | Metadata & Explore; #8 persistensi — orthogonal terhadap roadmap D* |
| `REDESIGN-BLUEPRINT.md` | Chrome Playground tingkat halaman; daftar tool masih MVP |
| `IMPLEMENTATION-ROADMAP.md` | Antrian M*; antrian desain D* ditambahkan sebagai pointer ke dokumen ini |

---

## 10. Keputusan yang masih terbuka (produk)

Tidak memblokir penulisan audit; memblokir **mulai D1**:

1. Apakah eyedropper = tool tersendiri, atau hanya Alt/klik kanan sementara pensil aktif?
2. Brush size maksimum (usulan: 1–8 atau 1–16 pada kanvas kecil)?
3. Selection: hanya rect di D2, atau lasso juga?
4. Reference overlay: boleh hilang antar perangkat (local-only) untuk D4?
5. Kapan boleh membahas layers (D5) vs menunda indefinitely?

---

**Status:** Audit + roadmap siap. **D1–D3 diimplementasikan di kode** (17 Nov 2026) setelah persetujuan eksplisit.  
**Chrome mobile:** toolbar Playground memakai **2 baris kontrol** (tool full-width scroll + brush/symmetry/undo) agar tool D terlihat di ~390px — diperbaiki 17 Nov 2026 sebelum D4.
