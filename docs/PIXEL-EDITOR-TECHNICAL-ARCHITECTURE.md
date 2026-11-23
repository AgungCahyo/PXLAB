# THE COMMONS — Pixel Editor Technical Architecture (Wplace adaptation)

> **Document purpose:** Historical compatibility analysis for the Wplace-inspired editor expansion.
> **Status:** HISTORICAL SNAPSHOT — NOT CURRENT TECHNICAL SOURCE OF TRUTH.
> **Updated:** 2026-11-24 (marker added).
> **Implementation evidence:** VERIFIED IN CODE — `lib/pixel.ts:194-214` accepts source V1–V4 with palette max 256; `lib/validations/creation.ts:171-188`; current inventory in `docs/studio/01_SYSTEM_AUDIT.md`. Palette-64 / V1-only statements below are stale.
> **Completed:** Original technical comparison recorded; later Studio work shipped layers/groups and larger indexed palettes.
> **Open:** Use current specs for any change; browser/production proof remains an operator task.
> **Dependencies:** `TECHNICAL-SPEC.md`, `PIXEL-CANVAS-SPEC.md`, `docs/studio/01_SYSTEM_AUDIT.md`.
> **Next action:** Read-only archive; do not restore retired palette-64 or V1-only constraints.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION.

**Dokumen:** PIXEL-EDITOR-TECHNICAL-ARCHITECTURE.md  
**Tanggal:** 17 Nov 2026 · **Diperbarui:** 18 Nov 2026  
**Sifat:** Analisis kompatibilitas teknis. Tidak mengubah skema/kode.  
**Batas kanvas terkunci:** sisi ≤ 1024, luas ≤ 262_144; payload source/cover 512 KiB; RLE V1 indexed.  
**Layout / create modal:** [`PIXEL-STUDIO-REDESIGN-BLUEPRINT.md`](PIXEL-STUDIO-REDESIGN-BLUEPRINT.md).

---

## 1. Arsitektur hari ini (ringkas)

```
PlaygroundForm (React state)
    └── PixelBoard
            ├── ImageData (RGBA opaque, Paper = empty)
            ├── buffer canvas 1:1
            ├── view canvas × DPR (dirty flag, integer scale)
            ├── undo stack: Uint8Array indices × ≤32
            └── exportSource() → PixelSourceV1 RLE
                    ├── draft: localStorage / IndexedDB
                    └── publish: Storage source.json + cover.png
```

Header DB: `{ version, width, height, palette, encoding, source_path }` — dimensi **immutable** setelah create.

---

## 2. Kompatibilitas per kapabilitas

### 2.1 UI/workspace (tanpa ubah format)

| Perubahan | Dampak data | Risiko |
|---|---|---|
| Toolbar kiri / contextual strip / zoom widget | Tidak | Rendah — refactor `PlaygroundForm` |
| Inspector kanan + mobile sheets | Tidak | Rendah–sedang (chrome tes) |
| Context menu / long-press | Tidak | Rendah |
| Minimap | Baca `ImageData` / buffer thumbnail | Sedang (perf redraw) — throttle + dirty |
| Collapsible palette | Tidak | Rendah |
| Modal create + judul wajib | Validasi `createDraftSchema`; judul row sudah ada | Sedang — tes unnamed + virgin draft |
| Latar gelap = fill Ink | Source awal index 1; palet `[Paper, Ink]` | Rendah jika hanya karya baru |
| Checker vs Paper stage | Metadata lokal, bukan RLE | Rendah |

**Kesimpulan:** S1 layout hampir murni presentasi. S0 judul wajib adalah kontrak create, bukan migrasi tabel. Fill Ink adalah seed `PixelSourceV1`, tetap V1.

### 2.2 Drawing tools baru (single-layer bake)

Polygon, text-to-pixels, gradient, dither: **bisa di-bake** ke `ImageData` lalu RLE V1 sama seperti shape tools hari ini.

| Constraint | Implikasi |
|---|---|
| Palette max 64 | Gradient/dither harus quantize ke palette dokumen (atau tolak warna baru saat penuh) |
| Paper = index 0 | Text/glyph: pixel non-tinta = Paper; unduh transparan tetap punch Paper |
| Area 262k | Flood/gradient O(n) OK; hindari alokasi per-piksel berlebihan (sudah diperingatkan di audit render) |
| Undo 32 × indices | Satu langkah = full frame; tools berat OK asal 1 pushUndo/gesture |

**Tidak perlu** bump `PixelSource` version jika hasil flatten single buffer.

### 2.3 Selection advanced

Lasso / magic wand: struktur seleksi hari ini = `PixelRect`. Perlu:

- Mask `Uint8Array` (1 bit/piksel) atau list spans.
- Cut/copy memakai mask, bukan hanya rect.
- Undo tetap full-frame indices (aman).

Risiko: kompleksitas pointer + mobile; **tidak** menyentuh Storage jika bake ke buffer.

Paste ke “layer baru” (perilaku Wplace 1.6.9) **membutuhkan** layer model — jangan emulasi palsu tanpa layer.

### 2.4 Layer system (gap terbesar)

#### Opsi A — Flatten-only (ditolak sebagai “layers”)
User melihat 1 layer; fitur Wplace tidak terpenuhi.

#### Opsi B — Layers runtime, flatten on save (disarankan tahap awal layers)
- Editor: `Layer[]` { id, name, visible, locked, opacity, pixels indexed or RGBA }.
- `exportSource()` / publish: **flatten** visible layers → RLE V1 + cover PNG.
- Draft lokal: simpan **project JSON** terpisah (IndexedDB) + optional flattened RLE untuk recovery cepat.
- DB/`source.json` tetap V1 → karya lama dan fork tetap kompatibel.

**Risiko:** kehilangan layer saat publish jika hanya flatten (produk harus jelas: “Terbit = gambar datar”). Draft recovery harus memuat project layers.

#### Opsi C — PixelSource V2 multi-layer di Storage
- Schema baru: layers + optional flatten cache.
- Migrasi: pembaca V1 → satu layer background; V2 writer.
- `color_usage`, fork, unduh, payload size: semua terdampak.
- Bucket 512 KiB mungkin **tidak cukup** untuk N layer penuh → butuh naikkan limit (dekat tahap 6) atau kompresi per layer / hanya tile kotor.

**Rekomendasi arsitektur:** mulai **Opsi B** di editor + draft IDB; Opsi C hanya setelah metrik payload dan keputusan produk “apakah layer ikut terbit/fork”.

#### Layer-aware undo
- Hari ini: snapshot full indices.
- Dengan layers: (1) tetap snapshot flatten indices (mudah, boros), atau (2) command stack per layer (benar, kompleks).
- RAM: 32 × 262144 × 1 B ≈ 8 MiB indices; RGBA ×4 ≈ 32 MiB — masih masuk desktop; HP perlu hati-hati jika N layer × history.

### 2.5 Canvas crop / expand

Hari ini **width/height terkunci** di header + validasi update.

Untuk crop/expand seperti Wplace:

1. Izinkan `updatePixelCreationAction` mengubah dimensi **hanya draft** dengan rewrite `source.json` + content header, **atau**
2. Hanya ubah buffer lokal sampai publish berikutnya menulis ukuran baru.

Dampak: Explore `category`, cover regenerasi, fork dari ukuran lama, local draft mismatch (sudah ada cek width/height).

**Migrasi DB:** tidak wajib jika content JSON header ikut di-update; constraint kategori tetap. **Tidak** sama dengan naikkan `PIXEL_CANVAS_AREA_MAX`.

### 2.6 Rendering & performa

| Topik | Status | Saat menambah fitur |
|---|---|---|
| Ketajaman / DPR | Sudah (tahap 0–2) | Pertahankan integer device scale |
| Dirty buffer | Sudah | Minimap subscribe ke dirty |
| Large canvas | Luas capped 262k | Layers: jangan composite full setiap pointermove — dirty rect |
| Mobile | Pinch OK | Context menu + panels: uji safe-area (Wplace 1.6.5 fixes relevan sebagai checklist) |
| Worker | Unduh PNG | Pertimbangkan composite/flatten di worker untuk publish |

### 2.7 Persistence & recovery

| Jalur | Hari ini | Dengan layers (Opsi B) |
|---|---|---|
| localStorage meta | OK | Tetap |
| localStorage/IDB source RLE | Flatten atau dual-write | Simpan `PixelProjectDraft` di IDB; RLE flatten opsional |
| Refresh browser | Recovery jika IDB OK | Harus restore layers dari project draft |
| Publish gagal | Local draft tetap (dirty) | Sama; jangan hapus project draft sampai server OK |
| Karya published lama | V1 | Tetap dibuka sebagai 1 layer |

**Risiko terbesar draft/publish:** clear local source setelah “sukses” sementara user masih punya unsynced layer state; atau publish flatten berbeda dari yang dilihat karena layer hidden. Mitigasi: satu `editGen` untuk project; clear IDB project hanya setelah server ACK; flatten memakai visibility yang sama dengan preview.

### 2.8 Export / unduh

- Unduh PNG dari flatten (atau buffer aktif) — sudah ada skala/fit/bg.
- Jangan ubah cover tersimpan saat unduh (sudah).
- Indexed PNG (blueprint tahap 4) orthogonal; bisa perkecil cover tanpa layers.

### 2.9 Yang memerlukan migrasi / keputusan eksplisit

| Perubahan | Migrasi? |
|---|---|
| UI chrome saja | Tidak |
| Modal create judul wajib | Tidak (validasi aplikasi) |
| Seed fill Ink pada draft baru | Tidak (V1 source awal) |
| Tools bake single-layer | Tidak |
| Layers draft-only (B) | Tidak (IDB only) |
| Layers di `source.json` V2 (C) | Ya — format + kemungkinan `file_size_limit` |
| Crop mengubah width/height published | Ya — aturan produk + rewrite objects |
| 1024×1024 penuh / payload >512KiB | Ya — tahap 6 blueprint |

---

## 3. Batas yang tidak dilanggar tanpa keputusan baru

- `PIXEL_CANVAS_AREA_MAX = 262144`
- `PIXEL_SOURCE_MAX_BYTES` / `PIXEL_PNG_MAX_BYTES` = 512 KiB
- `palette[0] === Paper`, max 64 warna
- RLE V1 tetap terbaca untuk karya existing
- Publish tetap menghasilkan satu cover PNG komunitas

---

## 4. Checklist uji teknis (setelah implementasi nanti)

- Stroke/undo bit-identik golden 16×16 (sudah pola tahap 1).
- Draft IDB survive refresh pada kanvas 640×360.
- Publish: `source.json` decode = flatten preview.
- Fork karya V1 setelah editor layers: tetap 1 layer.
- HP: long-press menu tidak bentrok pan/pinch.
- DPR 2/2.625: sel tetap integer setelah snap.

Roadmap fitur: `PIXEL-EDITOR-IMPLEMENTATION-ROADMAP.md`.
