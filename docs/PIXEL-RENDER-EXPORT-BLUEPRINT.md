# THE COMMONS — Pixel render & export blueprint

**Dokumen:** PIXEL-RENDER-EXPORT-BLUEPRINT.md  
**Tanggal:** 17 Nov 2026  
**Sifat:** Blueprint dari audit rendering/ekspor. Tahap 0–3 dan 5 diimplementasikan; tahap 4 dan 6 menunggu keputusan terpisah.

Tidak mengubah RLE V1, migrasi Supabase, atau `file_size_limit` bucket pada tahap 0–5.

---

## 1. Alur data (ringkas)

`ImageData` tunggal di `PixelBoard` → buffer canvas tersembunyi → `draw()` ke canvas tampilan (`imageSmoothingEnabled = false`, transform skala × DPR). Penyimpanan: RLE V1 (`source.json`) + `cover.png` (hasil `toBlob`). Unduh resmi: `scaleRgbaNearest` (replikasi piksel, bukan `drawImage`).

**Sudah benar:** tidak ada blending di jalur data; alpha PNG editor selalu 255 (Paper opak); CSS `image-rendering: pixelated` pada gambar Detail/thumbnail; `scaleRgbaNearest` salin byte persis.

---

## 2. Batas hari ini

| Konstanta | Nilai | Dipakai untuk |
|---|---|---|
| `PIXEL_CANVAS_MAX` | 1024 | Sisi maksimum satu edge (custom wide/tall) |
| `PIXEL_CANVAS_AREA_MAX` | 262144 | Luas maksimum (= 512²); independen dari sisi max |
| `PIXEL_EXPORT_EDGE_MAX` | 2560 | Sisi unduh klien saja (skala / fit-to-target) |
| `PIXEL_SOURCE_MAX_BYTES` / PNG | 512 KiB | Payload sumber & cover |
| Bucket `file_size_limit` | 524288 | Storage |

Payload JSON ≈ 4 byte/run → ~131k run dalam 512 KiB. Karya 512×512 berdither (run pendek) bisa gagal simpan meski dimensi legal.

---

## 3. Masalah utama (audit)

1. Fit-to-screen memakai skala CSS **pecahan** → lebar sel perangkat tidak seragam (9/10 px, 16/17 px, …).
2. Backing store `floor(contentRect × dpr)` + stretch CSS; canvas tampilan belum `image-rendering: pixelated`.
3. Detail/thumbnail `object-fit: contain` bisa skala non-bulat (mis. 512→~200).
4. `rgbaToIndices` loop + `hexToRgb` per kandidat palette (hot path undo/export/draft).
5. `putImageData` penuh setiap frame termasuk pan/zoom; grid menggambar semua garis.
6. `createImageBitmap` tanpa `colorSpaceConversion: 'none'` (risiko konversi warna).

---

## 4. Keputusan terkunci — tahap 0–2

| Topik | Keputusan |
|---|---|
| Skala tampilan ≥ 1 | `deviceScale = max(1, floor(cssScale × dpr))`; simpan `cssScale = deviceScale / dpr` |
| Fit &lt; 1 px/sel | Clamp ke **1:1 + pan** (bukan downsample mode) |
| Pinch | Bebas selama gestur; **snap** ke skala bulat saat pointer berakhir |
| Origin | Snap ke piksel perangkat: `round(origin × dpr) / dpr` |
| Backing store | Prefer `devicePixelContentBoxSize`; fallback `round(css × dpr)` |
| View canvas | `image-rendering: pixelated`; konteks `{ alpha: false }` bila aman |
| Unduh bitmap | `createImageBitmap(blob, { colorSpaceConversion: 'none' })` |
| Lookup warna | Peta `rgb24 → index` O(1) saat palette berubah |
| Buffer | Dirty flag: `putImageData` hanya bila piksel berubah |
| Grid | Cull ke rentang sel terlihat; tetap hormati `PIXEL_GRID_MIN_ZOOM` untuk ketebalan |

---

## 5. Tahapan

| Tahap | Isi | Status |
|---|---|---|
| 0 | Tes properti warna ⊆ palette + checklist ukur perangkat | Dilakukan (tes otomatis); checklist manual di bawah |
| 1 | Lookup O(1), dirty `putImageData`, grid cull | Dilakukan |
| 2 | Skala/origin bulat, DPR box, colorSpace none, CSS pixelated view | Dilakukan |
| 3 | Pisah konstanta; ekspor fit-to-target (1080p/1440p); worker unduh | Dilakukan |
| 4 | PNG indexed; thumbnail mode; Detail skala bulat | Ditunda |
| 5 | Sisi max 1024 + luas ≤ 512²; preset wide/tall; IndexedDB draft | Dilakukan |
| 6 | 1024² + naikkan payload/bucket | Ditunda — butuh persetujuan eksplisit |

---

## 6. Checklist ukur manual (perangkat nyata)

Jalankan di desktop + 2 HP; catat DPR (1 / 2 / 1.25 / 1.5 / 2.625) dan zoom browser 100%/110%.

| Kanvas | Cek editor (fit + zoom 1/2/4) | Cek Detail/thumbnail |
|---|---|---|
| 16×16 | Sel seragam; tidak lembut | Tajam di stage |
| 32×32 | Idem | Idem |
| 64×64 | Idem; pan setelah fit 1:1 jika perlu | Idem |
| 512×512 | Fit → 1:1 + pan; grid cull OK | Nearest; aliasing downsample diterima sampai tahap 4 |

Target performa usulan (setel ulang setelah ukur): stroke awal ≤ 16 ms p95 @ 512×512; draw ≤ 8 ms.

---

## 7. Standar kualitas

- Tidak ada warna di PNG ekspor di luar palette dokumen (uji otomatis).
- Skala editor ≥ 1 selalu bulat di perangkat (kecuali pinch aktif).
- Preview tidak mengubah `ImageData` / `source.json`.
- Ekspor unduh: dimensi kelipatan bulat; `scaleRgbaNearest` tanpa warna baru.
- Cover/storage batas dan RLE V1 tidak diubah pada tahap 0–5.
- Kanvas: sisi ≤ 1024, luas ≤ 262.144; preset wallpaper → kategori Explore `custom` (tanpa migrasi DB).
- Draft lokal: localStorage untuk sumber kecil; IndexedDB + peringatan bila gagal.
- Unduh: skala bulat hingga `PIXEL_EXPORT_EDGE_MAX`; fit 1080p/1440p letterbox; pilihan latar **transparan** (Paper → alpha 0) atau **solid Paper**; encode di worker bila tersedia.
