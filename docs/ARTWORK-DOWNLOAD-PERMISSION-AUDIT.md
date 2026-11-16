# THE COMMONS — Artwork Download Permission Audit & Blueprint

**Dokumen:** ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md  
**Tanggal:** 17 Nov 2026  
**Sifat:** Audit + blueprint. **Bukan izin implementasi.** Tidak mengubah kode, skema, migrasi, RLS, Storage, RLE, PNG rendering, atau UI sampai irisan disetujui eksplisit.

**Fokus:** unduh PNG karya dengan izin yang dikontrol kreator. Bukan lisensi komersial, marketplace, atau unduh source otomatis.

**Terkait:** `TECHNICAL-SPEC.md` §11 (Storage), `PRODUCT-SPEC.md` (PNG display-only), `REDESIGN-BLUEPRINT.md` (detail), `IMPLEMENTATION-ROADMAP.md`, `lib/auth/permissions.ts`, `app/api/pixel-cover/[id]/route.ts`.

---

## 1. Ringkasan eksekutif

THE COMMONS **belum** punya produk “Download karya”. Tidak ada kolom izin, tidak ada menu Lainnya di detail publik, dan tidak ada endpoint unduh dengan `Content-Disposition: attachment`.

Yang sudah ada:

- PNG tampilan lewat `/api/pixel-cover/{id}` dan (untuk karya **published**) Storage policy `pixel_covers_public_select` — **siapa pun dapat membaca byte cover**.
- Source RLE private untuk draf; published `source.json` dapat dibaca **anggota terautentikasi** (untuk fork).
- Fork menyalin source+PNG lewat server (`downloadPixelObject`) — pola mediasi server terdekat.

**Kesimpulan keamanan:** menyembunyikan tombol di frontend **tidak cukup**. Unduh resmi harus diverifikasi di server. Namun selama cover published tetap publik untuk galeri, pengguna masih bisa menyimpan gambar dari `<img>` / Storage — itu batasan produk yang harus dinyatakan jujur, bukan disamarkan sebagai DRM.

---

## 2. Kondisi implementasi saat ini (dari kode)

### 2.1 Schema `creations`

Migrasi dasar: `supabase/migrations/20261116030000_creations.sql` (+ caption/tags/color_usage kemudian).

Kolom relevan: `cover_url`, `status`, `user_id`, `type`, `content`.  
**Tidak ada** `allow_download`, `allow_png_download`, atau flag sejenis.

### 2.2 Storage `pixel-creations`

Dari `20261116100000_pixel_creations.sql`:

| Objek | Draf | Published |
|---|---|---|
| `cover.png` | Owner (auth) | **`to public` SELECT** jika status published |
| `source.json` | Owner | Owner + authenticated (kebijakan terpisah di `20261116110000_…` untuk fork) |

Bucket `public = false`, tetapi policy SELECT publik pada cover published tetap mengekspos byte.

### 2.3 Endpoint tampilan

`app/api/pixel-cover/[id]/route.ts`:

- Published pixel → client publik, `Cache-Control: public, max-age=60`
- Owner draft → session, `private, no-store`
- **Bukan** attachment; dipakai `<img>` / OG

### 2.4 UI detail `/creation/[id]`

- Engagement: apresiasi + bagikan (`CreationEngagement`).
- Fork + laporkan di area tenang dekat percakapan.
- Pemilik: tautan sunting.
- **Tidak ada menu Lainnya (⋯) di detail publik.** Menu Lainnya hanya di Playground (`PlaygroundForm`).

### 2.5 Unduh / export yang ada

| Mekanisme | Peran |
|---|---|
| `/api/pixel-cover/[id]` | Tampilkan PNG |
| `downloadPixelObject` di actions | Internal fork saja |
| `PixelBoard.exportPng` | Payload simpan studio, bukan unduh publik |

---

## 3. Persyaratan produk (terkunci untuk perencanaan)

### 3.1 Siapa boleh mengunduh (PNG resmi) — terkunci 17 Nov 2026

| Aktor | Syarat |
|---|---|
| Kreator (pemilik) | **Selalu** — draf **dan** terbit |
| Tamu (anon) & anggota lain | Hanya jika karya **published** **dan** izin unduh **ON** |
| Default izin | **OFF** |

Menonaktifkan izin tidak mengubah status publikasi. Berlaku pada permintaan unduh **berikutnya**.

**Pemisahan akses (terkunci):** melihat karya (Explore/detail), izin download PNG resmi, dan kemampuan fork **tidak saling mengunci**. Fork tidak bergantung pada flag unduh; unduh OFF tidak menghapus karya dari galeri.

### 3.2 UI

- Opsi **Download** di menu **Lainnya (⋯)** pada **halaman detail karya** (menu ini perlu **ditambahkan** ke detail; hari ini belum ada).
- Pintasan yang sama di menu **Lainnya Playground** (pemilik) — DL2.
- Jika izin OFF: opsi **tidak ditampilkan** ke non-pemilik (dan server menolak).
- Pemilik selalu melihat Download.
- Toggle kreator: **“Allow others to download this artwork”** (salinan ID/EN nanti) — default OFF.
- **Jangan** mengubah apresiasi, komentar, fork, atau report.

### 3.3 Format tahap 1

- **PNG** hasil render (`cover.png`), dimensi asli.
- Tidak mengubah source RLE / mekanisme regenerate PNG.
- Unduh PNG **bukan** izin edit, redistribusi, atau penggunaan komersial (teks penafian singkat di UI/copy).

### 3.4 Di luar tahap 1

- Unduh PixelSource/RLE → evaluasi terpisah (overlap dengan fork).
- Lisensi komersial, marketplace, watermark DRM, unduh massal.

---

## 4. Audit keamanan & integritas data

### 4.1 Risiko jika hanya UI

1. Storage `pixel_covers_public_select` → unduh langsung lewat Storage API dengan path `{user}/{id}/cover.png`.
2. `/api/pixel-cover/{id}` + cache 60s → fetch / Save As dari browser.
3. Setelah izin dicabut: URL cover & cache CDN/browser masih bisa menyajikan byte lama sampai cache habis; **izin unduh resmi** harus dicek di route unduh, terpisah dari tampilan.

### 4.2 Validasi yang wajib di server (setiap request)

1. UUID karya valid.
2. Karya `type = pixel` (tahap 1).
3. Pemilik **atau** (`status = published` **dan** flag izin = true).
4. Objek `cover.png` ada; gagal → 404.
5. Respons: `Content-Type: image/png`, `Content-Disposition: attachment; filename="…"`, **`Cache-Control: private, no-store`** pada endpoint unduh resmi (wajib). Cover display boleh tetap `public, max-age=60`; **tidak** wajib purge cache cover saat izin dicabut.

**Jangan** mengandalkan hanya `display: none` pada tombol.

### 4.3 Kepemilikan & RLS

- Baca baris `creations`: kebijakan published-select + own-select sudah ada.
- Update flag izin: hanya owner (`creations` update own) — setelah kolom ada.
- Storage: route unduh memakai server/public client **setelah** cek flag; jangan expose signed URL panjang tanpa cek ulang.

### 4.4 Fork vs Download

| | Fork | Download PNG (rencana) |
|---|---|---|
| Artefak | Source + PNG salinan karya baru | File PNG saja |
| Siapa | Anggota (bukan pemilik), karya published | Pemilik selalu; orang lain jika flag ON |
| Izin unduh OFF | Fork **tetap** (kecuali produk memutuskan sebaliknya nanti) | Non-pemilik ditolak |

Rekomendasi perencanaan: **fork tidak terikat** flag unduh PNG. Salinan kreatif ≠ file download.

### 4.5 Source RLE

Published source readable oleh authenticated → risiko unduh source ad-hoc.  
Tahap 1: **jangan** menambah unduh source di UI.  
Lanjutan opsional: sempitkan RLS source agar hanya jalur fork/server role — **irisan terpisah**, audit ulang.

### 4.6 Posisi produk (terkunci): fasilitas unduh resmi, bukan DRM

**Download OFF bukan berarti karya tidak bisa disimpan orang lain.** PNG tetap harus tampil publik di Explore dan detail; pengunjung secara teknis masih bisa Save As / screenshot.

Fitur ini mengontrol **fasilitas download resmi THE COMMONS** (tombol + endpoint + filename), **bukan** perlindungan DRM atau jaminan hak cipta. Copy UI/penafian harus jujur tentang batas itu.

---

## 5. Usulan desain teknis (belum diimplementasi)

### 5.1 Schema (setelah persetujuan irisan)

Usulan nama kolom:

```sql
allow_png_download boolean not null default false
```

- Hanya `type = pixel` yang memakai flag di UI (kolom boleh ada di semua baris).
- Owner update lewat action Studio/detail yang sudah ada pola `updatePixelCreationAction` / action kecil khusus.
- **Jangan** migrasi sampai irisan DL1 disetujui dan grant/RLS diuji.

### 5.2 Permission helper

`canDownloadCreationPng({ viewerId, ownerId, status, allowPngDownload })`:

- `viewerId` ada dan `viewerId === ownerId` → true (termasuk draf)  
- else `status === 'published' && allowPngDownload` → true (**termasuk** `viewerId` null / tamu)  
- else false  

Tempat: `lib/auth/permissions.ts` (sejajar `canForkCreation`). **Bukan** sama dengan `canForkCreation` (fork tetap butuh anggota).

### 5.3 Endpoint

`GET /api/pixel-download/[id]` (nama final bebas, terpisah dari `pixel-cover`):

1. Parse id.  
2. Muat karya (published atau owned).  
3. `canDownloadCreationPng` — 403/404 jika tidak.  
4. Stream `cover.png` dari Storage.  
5. Header attachment; filename aman dari judul (`slug` + `.png`).  
6. Cache: **`Cache-Control: private, no-store`** (wajib). Tidak purge cache cover display saat flag dicabut.

Tampilan tetap memakai `/api/pixel-cover` (tanpa attachment).

### 5.4 UI (DL2 saja — setelah DL1)

1. Tambah kontrol **Lainnya (⋯)** di detail (bukan di cluster apresiasi).  
2. Isi menu: Download (jika `canDownload`); untuk pemilik juga toggle izin.  
3. Pintasan Download (+ toggle izin) di menu Lainnya **Playground** — satu kolom DB.  
4. Copy penafian: unduh resmi ≠ lisensi komersial / DRM.
### 5.5 Hardening Storage

Opsi A (disarankan): tetap biarkan cover published publik untuk performa galeri; unduh resmi = route terpisah + flag.  
Opsi B (lebih ketat, mahal): cabut `pixel_covers_public_select`; semua cover lewat Next + service role — tetap tidak menghentikan Save As dari `<img>`.

**DL3 (17 Nov 2026): Opsi A terkunci.** Jangan pilih B tanpa keputusan produk baru. Rincian: §9.

---

## 6. Irisan implementasi (setelah disetujui per irisan)

**Jangan menggabungkan DL1 dan DL2.** Backend harus terbukti aman sebelum tombol Download tersedia bagi pengguna.

| Irisan | Isi | Ketergantungan |
|---|---|---|
| **DL1** | Migrasi `allow_png_download` default false; grants; `canDownloadCreationPng` (anon OK jika flag ON); `GET /api/pixel-download/[id]` + `no-store`; pengujian keamanan | Persetujuan eksplisit **DL1** saja |
| **DL2** | Menu Lainnya di detail + pintasan Playground; tombol Download; toggle izin; copy ID/EN; tanpa ubah fork/appreciate/comment/report | DL1 selesai + persetujuan **DL2** |
| **DL3** | Evaluasi keamanan Storage + logging unduh (bukan wajib harden di awal) | DL1–DL2 stabil |
| **DL4** | Evaluasi unduh source/RLE vs fork — terpisah | Keputusan produk baru |

**Kriteria keluar DL1:** non-pemilik (termasuk anon) mendapat 403/404 saat flag false meski cover masih tampil; anon + flag ON + published → 200 attachment; pemilik draf/terbit selalu 200; header unduh `no-store`; flag false default pada karya lama; **tanpa** UI publik Download di PR yang sama.

**Kriteria keluar DL2:** non-pemilik tidak melihat Download jika OFF; pemilik melihat Download + toggle di detail (dan pintasan Playground); apresiasi/fork/komentar/report tidak berubah.

---

## 7. Keputusan produk terkunci (17 Nov 2026)

| No. | Keputusan | Isi terkunci |
|---|---|---|
| 1 | Tamu boleh download? | **Ya**, jika kreator mengaktifkan izin (karya published). |
| 2 | Pemilik boleh download draf? | **Ya**, selalu. |
| 3 | Download dari Playground? | **Ya**, pintasan di menu Lainnya (DL2). |
| 4 | Cabut izin dan cache? | **Tidak** purge cache cover; endpoint download resmi wajib **`no-store`**. |

Posisi: kontrol fasilitas unduh resmi THE COMMONS — **bukan** DRM / jaminan hak cipta. Melihat · download PNG · fork tetap terpisah.

---

## 8. Explicitly out of scope

- Sistem lisensi / Creative Commons picker / watermark wajib.  
- Marketplace, harga, royalties.  
- Mengubah format RLE atau pipeline regenerate PNG.  
- Menyamakan “download OFF” dengan menghapus gambar dari Explore atau mencegah Save As.  
- Mengunci fork ke flag unduh (atau sebaliknya).  
- Implementasi tanpa persetujuan eksplisit per irisan DL*.

---

## 9. DL3 — Evaluasi Storage & logging (17 Nov 2026)

### 9.1 Temuan Storage (post-DL1/DL2)

| Jalur | Siapa | Terikat `allow_png_download`? |
|---|---|---|
| `pixel_covers_public_select` | publik, cover published | **Tidak** — untuk tampilan galeri |
| `/api/pixel-cover/[id]` | publik (published) / owner (draf) | **Tidak** — display, `max-age=60` |
| `/api/pixel-download/[id]` | pemilik selalu; lain jika flag ON | **Ya** — `no-store` + cek setiap request |
| `source.json` own + `pixel_source_select_published_authenticated` | owner / anggota auth | **Tidak** — fork; **bukan** unduh UI (→ DL4) |

### 9.2 Keputusan harden (terkunci DL3)

**Tetap Opsi A:** jangan cabut `pixel_covers_public_select`. Cover published tetap publik agar Explore/detail cepat.  
**Jangan** pilih Opsi B (semua cover lewat service role) tanpa keputusan produk baru — biaya tinggi, tetap tidak menghentikan Save As dari `<img>`.

Residual yang diterima (jujur ke kreator lewat copy penafian):

1. Save As / screenshot dari gambar yang ditampilkan.  
2. Fetch Storage cover path atau `/api/pixel-cover` meski flag unduh OFF.  
3. Cache display ~60s setelah unpublish/ubah cover (bukan unduh resmi).

Kontrol produk yang **sudah** ditegakkan: tombol + endpoint resmi + filename + `no-store` pada unduh.

### 9.3 Logging

- Helper `lib/pixel-download-log.ts` → `console.info("[pixel-download]", JSON)`.  
- Event: `creationId`, `outcome` (`ok` \| `forbidden` \| `not_found` \| `invalid_id`), `viewer` (`owner` \| `member` \| `anon`), opsional `allowPngDownload`, `at`.  
- **Bukan** tabel analytics / dashboard kreator. Penyimpanan durable = keputusan produk terpisah.  
- Tidak mencatat IP, User-Agent, atau isi file.

### 9.4 Kriteria keluar DL3

- Evaluasi + keputusan Opsi A terdokumentasi.  
- Route unduh memanggil log pada ok / forbidden / not_found / invalid_id.  
- **Tidak** ada migrasi Storage baru di irisan ini.

---

## 10. Status

Arah desain + empat keputusan §7 **disetujui sebagai dasar blueprint** (17 Nov 2026).  
**DL1 (kode):** helper + endpoint + migrasi `20261117005000_…` — 17 Nov 2026.  
**DL2 (kode):** menu Lainnya + toggle + copy — 17 Nov 2026.  
**DL3:** evaluasi Storage (Opsi A) + logging terstruktur — **17 Nov 2026**.  
**DL4** (unduh source/RLE vs fork) belum disetujui.
