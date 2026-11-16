# THE COMMONS — Artwork Metadata & Explore Experience Audit

**Dokumen:** ARTWORK-METADATA-EXPLORE-AUDIT.md  
**Tanggal:** 17 Nov 2026  
**Sifat:** Audit + blueprint. Bukan izin implementasi. Tidak mengubah kode, skema, migrasi, RLE, PNG, RLS, atau UI.

**Sumber kebenaran:** kode dan migrasi aktual. Dokumen lain yang berbeda dengan kode dianggap ketinggalan.

**Terkait:** `REDESIGN-BLUEPRINT.md` (hierarki halaman), `IMPLEMENTATION-ROADMAP.md` (irisan kerja), `COMPREHENSIVE-UX-AUDIT.md` (P1-8 / P2-13 Jelajah), `PIXEL-CANVAS-SPEC.md` / `lib/pixel.ts` (RLE), `PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` (fitur desain studio — orthogonal; bukan metadata/Explore).

### Keputusan produk terkunci (17 Nov 2026)

| No. | Topik | Keputusan |
|---|---|---|
| 1 | Batas caption | **500 karakter** |
| 2 | Paper di Color Bar | **Exclude** index 0 (Paper). Semantik: Paper = latar/penghapus kanvas, bukan tinta karya; % dihitung dari pixel non-Paper saja |
| 3 | Perhitungan `color_usage` | **Saat publish** (bukan setiap draft save). Unpublish/draf boleh membiarkan snapshot lama atau `null` sampai publish berikutnya — lihat §5.3 |
| 4 | Fork menyalin metadata? | **Tidak** — caption, tags, dan `color_usage` tidak disalin; usage dihitung ulang saat forker publish |
| 5 | Search judul Explore | **Tetap** (P1-8 disetujui sebagai fitur yang ada; jangan perluas ke search global) |
| 6 | Label ukuran di kartu | **Tampilkan sekunder** di `CreationCard` (kecil, muted). Caption/tags tetap detail-only. Filter ukuran di Explore tetap |
| 7 | Backfill karya lama | **Batch backfill terkontrol pada M6** (bukan lazy-on-view) |
| 8 | Autosave Studio (metadata + pixel) | **Tidak ada server autosave** — judul, caption, hashtag, **dan goresan pixel** hanya lokal (+ `localStorage` untuk pemulihan). Kirim ke DB hanya pada **Simpan** eksplisit, leave→simpan, atau **Publish**. Publish commit metadata + pixel + hitung ulang `color_usage`. |

Implementasi masih menunggu persetujuan irisan M1–M7.

---

## 1. Kondisi implementasi saat ini

### 1.1 Metadata karya

| Aspek | Kondisi kode |
|---|---|
| Judul | `creations.title` text, 1–80 karakter (`CREATION_TITLE_MAX`) |
| Caption | **Tidak ada** kolom, field content, atau UI |
| Hashtag / tags | **Tidak ada**. `category` **bukan** topik: sejak `20261117001000_creation_category_size.sql` = preset ukuran kanvas (`icon`…`custom`) |
| Tipe | `pixel` utama; legacy `text` / `visual` / `idea` / `story` masih di skema |
| Content pixel | Header JSONB ketat: `version`, `width`, `height`, `palette`, `encoding`, `source_path` — tanpa caption/tags/usage |
| Source | `pixel-creations/{user}/{id}/source.json` (RLE index) |
| Cover | `cover.png` publik untuk karya terbit |

### 1.2 Studio / draft / publish

- Buat: `StudioNewForm` → draf pixel berukuran.
- Editor: `PlaygroundForm` — judul, simpan, terbit, unpublish, hapus. Tidak ada caption/hashtag.
- Validasi: `parseCreationContent` + `updateCreationSchema` (id, title, intent).
- My Works: `WorksRow` — thumbnail, judul/Belum dinamai, status, aksi. Tanpa caption.

### 1.3 Explore `/explore`

- Hanya karya `type = pixel`, status published.
- Filter: `category` = ukuran + pencarian judul `q` (`ilike`) sudah ada di kode.
- Grid konsisten via `CreationCard` + `GallerySkeleton`.
- Kartu: gambar → satu baris `judul · @username` → label ukuran. **Tanpa** jumlah apresiasi. **Tanpa** caption/hashtag.
- Jenis legacy **tidak** ditampilkan di Explore saat ini (bukan lima tombol jenis; yang padat adalah tujuh filter ukuran + search).

### 1.4 Detail `/creation/[id]`

Hierarki pixel aktual:

1. Gambar (`CreationBody` / `PixelArt`)
2. Judul
3. Kreator · tanggal · label ukuran
4. Sunting (pemilik)
5. Apresiasi + Bagikan
6. Percakapan (Suspense)

Belum ada caption, hashtag, atau Color Palette.

### 1.5 RLE dan akses source

- Format `PixelSourceV1`: `palette[]` (index 0 = Paper `#FFFDF7` = kosong/penghapus), `runs` pasangan `[index, count]`, max 64 warna, max 512×512.
- `parsePixelSource` / `decodeRle` / `encodeRle` di `lib/pixel.ts` sudah cukup untuk histogram akurat.
- **Cover PNG** publik (`pixel_covers_public_select`).
- **source.json** hanya: pemilik; atau anggota terautentikasi untuk karya **published** (fork). Tamu **tidak** bisa unduh source. Komentar migrasi: gallery does not link source.json.

---

## 2. Yang sudah tersedia dan bisa dipakai ulang

| Aset | Dipakai untuk |
|---|---|
| `title` + `displayTitle` / gerbang terbit | Tetap identitas singkat; caption terpisah |
| `category` (ukuran) | Tetap filter ukuran; **jangan** diisi ulang sebagai tag topik |
| `content.palette` (header) | Daftar warna dokumen; **bukan** usage % (warna di palette bisa belum dipakai) |
| `source.runs` + `palette` | Sumber kebenaran Color Usage (lebih akurat dari PNG) |
| `PixelArt`, `CreationCard`, `pixel-frame` | Kartu Explore/profil; hindari bingkai ganda |
| `PlaygroundForm` dialog nama / status bar | Pola input metadata tanpa mengubah kanvas |
| `lib/copy.ts` dua bahasa | Semua string baru |
| `PixelIcon` | Tanpa library ikon baru |
| Design tokens Classic Pixel Adventure | Palet UI Color Bar, bukan palet karya |

---

## 3. Rekomendasi UX — Caption

### 3.1 Peran

- Opsional. Bukan pengganti judul.
- Judul = nama singkat karya. Caption = cerita, inspirasi, konteks, maksud.
- Karya tanpa caption tetap utuh secara visual.

### 3.2 Batas (terkunci)

- Panjang: **0–500** karakter.
- Trim; empty string disimpan sebagai `null`.
- Bukan markdown / HTML. Plain text + newline diperbolehkan di detail; di kartu dinormalisasi spasi.

### 3.3 Penempatan

| Permukaan | Perilaku |
|---|---|
| Studio Create / Playground | Satu textarea di bawah judul (atau di panel metadata ringkas), placeholder singkat. Tidak menutupi kanvas. |
| Draft save | Caption ikut tersimpan bersama judul; tidak wajib untuk draf. |
| Publish | Caption **tidak** wajib. Judul tetap wajib seperti sekarang. |
| My Works | Opsional satu baris muted di bawah judul hanya jika ada; jangan menambah tinggi berlebih. |
| Detail | Di bawah baris kreator/tanggal, **sebelum** hashtag. Teks body penuh (`DM Sans`), max-width sama kolom baca. |
| Explore / profil | Maks **2 baris** (`line-clamp-2`), `text-[13px]` muted. Tanpa caption → tidak ada ruang kosong ekstra (jangan menyisakan slot tetap). |

### 3.4 Dominasi visual

- Caption tidak boleh memakai Press Start 2P.
- Tidak di atas atau di atas overlay gambar.
- Tidak mengubah aspect ratio / `object-fit` karya.

---

## 4. Rekomendasi UX — Hashtag

### 4.1 Peran

- Opsional, max **5** per karya.
- Discovery ringan menurut topik; **bukan** caption, **bukan** `category` ukuran, **bukan** trending/ranking.
- Tidak wajib saat publish.

### 4.2 Normalisasi & validasi

- Input: pengguna boleh mengetik dengan atau tanpa `#`.
- Simpan bentuk kanonik: **huruf kecil**, tanpa `#`, tanpa spasi.
- Karakter: `a-z0-9_` saja setelah normalisasi; panjang tag 2–24.
- Duplikat dihapus setelah normalisasi.
- Tolak tag kosong / hanya `#`.
- Contoh tampilan: `#pixelart` `#nature` `#landscape` `#character`.

### 4.3 UX input Studio

- Chip input di bawah caption: ketik + Enter/koma untuk menambah; klik × untuk hapus.
- Counter `n/5`.
- Jangan autocomplete trending; boleh suggest dari tag karya sendiri nanti (P2).

### 4.4 Tampilan

| Permukaan | Perilaku |
|---|---|
| Detail | Baris chip/tautan di bawah caption. Satu baris wrap. |
| Explore / profil | Maks **3** tag terlihat; jika lebih, `+N` atau potong diam-diam. Ukuran 12px, muted, tidak pill berkilau. |
| Tanpa tag | Tidak ada baris kosong. |

### 4.5 Klik → filter Explore

- Tautan ke `/explore?tag=pixelart` (nama query usulan).
- **Filter hashtag = tahap terpisah** (lihat M5). Tahap metadata cukup menyimpan + menampilkan + href siap pakai; query Explore boleh diabaikan sampai M5.
- Jangan bangun trending, ranking, atau “tag populer”.

---

## 5. Rekomendasi teknis — ekstraksi warna

### 5.1 Apakah RLE cukup?

**Ya.** Histogram akurat tanpa PNG:

1. Iterasi `runs` sebagai pasangan `(index, count)` — **tidak wajib** expand ke 262 144 indeks (meski `decodeRle` tetap aman).
2. `usage[index] += count`.
3. Abaikan index `0` (Paper / kosong) sesuai aturan produk di bawah.
4. Map ke `palette[index]` → HEX.
5. Urutkan descending by count; hitung `%` terhadap total pixel **non-Paper**.
6. Warna di `palette` dengan count 0 tidak ditampilkan.

Kompleksitas: O(jumlah run) ≪ O(pixel) untuk karya tipikal; worst case 512×512 tetap trivial (<5 ms di Node).

### 5.2 Jangan analisis PNG

PNG adalah render; Paper selalu opaque. Analisis gambar menambah dependensi dan error kuantisasi. RLE = sumber kebenaran pixel.

### 5.3 Client vs server (terkunci: publish)

| Opsi | Catatan |
|---|---|
| **A. Hitung saat publish (terkunci)** | Pada intent `publish`, setelah `parsePixelSource` berhasil, tulis snapshot `color_usage`. Detail & kartu tidak perlu source. Draft save **tidak** menulis/menghitung usage. |
| B. Hitung on-demand di detail | Ditolak untuk jalur normal; hanya relevan di M6 batch (service role membaca source terbit). |
| C. Hitung di client dari source | Ditolak untuk tamu. |

Tidak mengubah format RLE atau file source/cover.

**Unpublish:** biarkan `color_usage` terakhir tetap di baris (tidak ditampilkan publik karena karya tidak published), atau set `null` — preferensi implementasi: **pertahankan nilai terakhir** agar publish ulang cepat; wajib dihitung ulang jika source berubah sejak publish terakhir.

### 5.4 Bentuk data snapshot (usulan)

Kolom baru `color_usage jsonb null`, contoh:

```json
[
  { "hex": "#55B8FF", "count": 1200 },
  { "hex": "#45A849", "count": 800 }
]
```

- Persentase dihitung di UI dari `count` (hindari drift pembulatan di DB).
- Max 64 entri teoretis; UI menampilkan 12 dulu.
- `null` = belum dihitung (karya lama) atau non-pixel.

**Alternatif ditolak untuk tahap ini:** menyisipkan usage ke `content` pixel (schema `.strict()`; mencampur header storage dengan analytics).

### 5.5 Paper / kosong (terkunci)

Di model THE COMMONS tidak ada alpha: index 0 = Paper (`#FFFDF7`) = latar kanvas / penghapus, bukan tinta.

**Keputusan:** exclude index 0 dari bar dan daftar. Persentase = count warna / total pixel non-Paper.

Catatan semantik (salinan UI boleh menyebut singkat): Color Bar menampilkan komposisi **warna yang digambar**, bukan proporsi kertas kosong. Pixel yang sama hex-nya dengan Paper tetapi bukan index 0 tidak terjadi dalam model indexed ini — Paper hanya index 0.

Karya full Paper: empty state “Belum ada warna selain latar” / setara EN; bukan bar 100% krem.

### 5.6 Karya lama & legacy

- Backfill: **batch terkontrol di M6** (bukan lazy-on-view). Skrip/job berpaginasi membaca `source.json` karya pixel published yang `color_usage` null, menulis snapshot; tanpa mengubah source/PNG.
- Karya non-pixel: bagian Color Palette **disembunyikan**.
- Source rusak / parse gagal: sembunyikan bagian; jangan gagalkan halaman detail; di M6 catat dan lewati.

### 5.7 Jaminan non-destruktif

- Tidak mengubah `runs`, `palette`, encoding, path, atau PNG.
- Snapshot hanya metadata turunan; jika source berubah di save berikutnya, hitung ulang dan overwrite `color_usage`.

---

## 6. Rekomendasi tampilan — Color Usage Bar

### 6.1 Lokasi di detail

Setelah caption + hashtag, **sebelum** Apresiasi/Bagikan.

Alasan: tetap dekat karya (konteks visual), tidak di atas gambar, tidak mendorong percakapan ke bawah terlalu jauh, tidak mengalahkan image-first.

### 6.2 Komposisi

1. Judul bagian singkat: “Palet warna” / “Color palette” (`copy`).
2. Satu **bar horizontal** full-width, tinggi ~12–16px, border 3px earth — segmen lebar = %; tanpa label teks di dalam segmen pada mobile (terlalu sempit).
3. Di bawah: daftar hingga **12** baris: swatch 16×16 + HEX monospace/DM + `NN%`.
4. Tap/klik HEX → salin ke clipboard; feedback singkat (pola mirip Share, tanpa library baru).
5. Jika >12 warna: kontrol “Lihat semua” membuka sisa di tempat (tidak modal berat).
6. Hover desktop: boleh tooltip % pada segmen; bukan wajib P1.

### 6.3 Yang dihindari

- Nama warna deskriptif otomatis (“krem”, “biru”) — tidak akurat lintas budaya; cukup HEX + %.
- Glow, gradient dekoratif, kartu bershadow tebal.
- Menampilkan 64 swatch sekaligus di viewport pertama.
- Menaruh Color Bar di kartu Explore (terlalu padat; cadangkan detail).

---

## 7. Rekomendasi layout Explore

### 7.1 Tetap

- Explore = rumah anggota setelah login (keputusan sebelumnya).
- Pixel default; grid konsisten (bukan masonry).
- Tanpa ranking / tanpa count apresiasi di kartu.
- Mobile 390px nyaman; desktop 2–3 kolom sesuai lebar yang ada.
- Identitas visual yang ada.

### 7.2 Hierarki kartu (target)

1. Gambar karya (`PixelArt` thumb, `framed={false}` di dalam `pixel-frame` artikel — **satu** bingkai).
2. Judul (truncate).
3. `@username` (muted; disembunyikan di profil milik sendiri).
4. Ukuran karya (`category`) sebagai meta sekunder kecil — **terkunci ulang 17 Nov 2026**.
5. Caption & hashtag: **hanya di detail**, bukan di kartu.

Grid Explore/profil: **2 / lg:3 / xl:4** kolom (bukan masonry).

### 7.3 Filter

- Pertahankan filter ukuran, tetapi **lipat** di mobile (“Ukuran” disclosure / satu kontrol) agar tidak menguasai viewport pertama — M7.
- Jenis legacy: jika suatu saat digabung ke Explore, masukkan di “Jenis lain”, bukan setara Pixel. **Saat ini Explore hanya pixel** — jangan menambah UI jenis sebelum ada keputusan menampilkan legacy lagi.
- Search judul `q`: **tetap** (terkunci). Jangan perluas jadi search global / body / tag search di tahap metadata. Filter tag tetap lewat `?tag=` di M5, terpisah dari kotak search judul.
- Filter `?tag=` = tahap M5, bukan M4.

### 7.4 Yang tidak dikerjakan di tahap ini

Search global baru, trending, rekomendasi, masonry, popularitas, follower. (Search judul yang ada bukan “baru” — dipertahankan.)

---

## 8. Rekomendasi hierarki halaman detail

Untuk pixel, urutan target:

1. Gambar karya (tetap pertama, image-first)
2. Judul
3. Kreator · tanggal · (ukuran opsional)
4. Caption (jika ada)
5. Hashtag (jika ada)
6. Color Palette + Usage Bar (pixel + ada data)
7. Apresiasi + Bagikan (+ Sunting pemilik — boleh tetap dekat meta atas atau tepat sebelum engagement; jangan digeser ke bawah Color Bar)
8. Conversation (aturan tidak berubah)

**Catatan Sunting:** biarkan dekat identitas (seperti sekarang) agar pemilik tidak scroll melewati palet.

Tidak diubah: apresiasi, komentar, balasan satu tingkat, fork, laporkan.

---

## 9. Dampak database & karya lama

### 9.1 Field baru (usulan migrasi — belum dijalankan)

```text
creations.caption     text null
  check (caption is null or char_length(caption) <= 500)

creations.tags        text[] not null default '{}'
  check (cardinality(tags) <= 5)
  -- plus app-level normalize; optional DB check array elements

creations.color_usage jsonb null
```

- Grant insert/update kolom baru ke `authenticated` (pola sama `category`).
- Index: `gin (tags)` hanya saat M5 (filter). Jangan buat index prematur jika filter belum ada.
- RLS: tidak perlu policy baru bila memakai `creations_update_own` / select published yang ada — pastikan kolom ikut grant.

### 9.2 Yang tidak diubah

- Format RLE, bucket, path object, PNG pipeline.
- `category` size presets.
- Constraint judul 1–80.
- Karya lama: `caption` null, `tags` `{}`, `color_usage` null → UI gracefully empty.

### 9.3 Tipe & query

- Perluas `CreationRow`, `CreationCard` (caption + tags ringkas; `color_usage` hanya detail).
- `CARD_COLUMNS` tambah `caption, tags` — hindari memuat `color_usage` di list.
- Validasi Zod baru; jangan menaruh caption di dalam `pixelContentSchema`.

### 9.4 Fork (terkunci)

- Salin source/cover seperti sekarang.
- **Jangan** salin `caption`, `tags`, atau `color_usage`.
- `color_usage` forked work diisi saat forker **publish** (M3), bukan saat insert fork.

---

## 10. Risiko teknis & performa

| Risiko | Mitigasi |
|---|---|
| Membuka `source.json` publik untuk palette on-read | Hindari; pakai snapshot saat save |
| Hitung ulang 512² di setiap request detail | Snapshot; O(runs) jika terpaksa sekali |
| `content` JSONB strict pecah jika ditambah field asal | Kolom terpisah |
| Kartu Explore lebih tinggi → scroll lebih panjang | Clamp caption/tags; jangan Color Bar di kartu |
| Hashtag jadi pseudo-SEO / spam | Max 5, charset ketat, tanpa trending reward |
| Caption membuat feed terasa Threads | Opsional, pendek, di bawah gambar, tidak di landing hero |
| Grant kolom terlupa → update gagal diam-diam | Checklist migrasi + tes save |
| Duplikasi logika histogram | Satu helper `colorUsageFromSource(source)` di `lib/pixel.ts` |
| Sanitasi XSS | Plain text React escape; tidak render HTML |
| Karya lama tanpa usage | Sembunyikan section sampai M6 batch backfill |

---

## 11. Prioritas & tahap implementasi (kecil, independen)

Tidak ada P0 pada fitur ini (inti sudah jalan). Semua di bawah butuh **persetujuan eksplisit** sebelum kode.

| Irisan | Prioritas | Isi | Bergantung |
|---|---|---|---|
| **M1. Caption** | P1 | Migrasi `caption`; validasi; Studio; detail penuh; kartu Explore/profil clamp; My Works opsional | — |
| **M2. Hashtag metadata** | P1 | Migrasi `tags`; input Studio; tampil detail + kartu; href `?tag=` siap | M1 boleh paralel (kolom beda) |
| **M3. Color usage snapshot** | P1 | Helper RLE→usage; kolom `color_usage`; **tulis hanya saat publish**; UI detail bar+swatch+copy; exclude Paper | Independen dari M1/M2 |
| **M4. Explore card hierarchy** | P1 | Judul/username 2 baris; slot caption/tags; **hapus label ukuran dari kartu**; search judul tetap; cek 390px | Lebih bersih setelah M1–M2, boleh skeleton dulu |
| **M5. Filter hashtag Explore** | P2 | Baca `?tag=`; query `tags @>`; UI filter ringkas; tanpa trending | M2 |
| **M6. Backfill color_usage** | P2 | **Batch terkontrol** (paginated) untuk pixel published dengan `color_usage` null; service role; log gagal parse | M3 |
| **M7. Lipat filter ukuran mobile** | P2 | Disclosure ukuran | M4 opsional |

**Jangan** menggabungkan M1–M5 jadi satu PR besar.

---

## 12. Acceptance criteria (dapat diuji)

### M1 Caption

- [ ] Karya baru dapat disimpan dengan caption kosong atau terisi ≤ **500** karakter.
- [ ] Caption > 500 ditolak validasi (klien + server).
- [ ] Publish tanpa caption tetap berhasil bila judul valid.
- [ ] Detail menampilkan caption penuh; Explore/profil max 2 baris.
- [ ] Tanpa caption, kartu tidak menyisakan blok kosong aneh.
- [ ] Karya lama tanpa kolom terisi tampil seperti sekarang + caption null.
- [ ] `tsc` + tes validasi caption.

### M2 Hashtag

- [ ] Max 5; duplikat `#Nature` / `nature` jadi satu; disimpan lowercase tanpa `#`.
- [ ] Publish tanpa tag berhasil.
- [ ] Detail menampilkan tag; kartu ringkas.
- [ ] Tag tidak wajib dan tidak mengganti caption.
- [ ] Karya lama `tags = {}`.

### M3 Color Palette

- [ ] Draft save **tidak** mengisi/mengubah `color_usage`.
- [ ] Publish pixel mengisi `color_usage` dari RLE (Paper/index 0 excluded; % dari non-Paper).
- [ ] Detail: bar segmen + ≤12 swatch + HEX + %; salin HEX berfungsi.
- [ ] Source.json dan cover.png tidak berubah di luar pipeline save normal.
- [ ] Tamu melihat palet tanpa login (dari snapshot).
- [ ] Non-pixel / `color_usage` null: section tidak dirender.
- [ ] Kanvas full Paper saat publish: empty state singkat, bukan bar 100% krem.
- [ ] Fork tidak menyalin `color_usage`; terisi saat forker publish.

### M4 Explore layout

- [ ] Judul dan `@username` dua baris; gambar tidak terdobel-bingkai.
- [ ] Pixel art tajam (`pixelated`), rasio thumb konsisten.
- [ ] Caption/tag tidak mengalahkan gambar.
- [ ] **Label ukuran tidak muncul di kartu** (Explore dan profil).
- [ ] Search judul `q` tetap berfungsi; tidak diperluas.
- [ ] Tidak ada count apresiasi; tidak ada masonry.
- [ ] 390px: filter tidak menutupi seluruh layar pertama (atau ditunda ke M7 dengan catatan).

### M5 Tag filter

- [ ] `/explore?tag=pixelart` hanya karya bertag itu.
- [ ] Klik tag di detail menuju filter tersebut.
- [ ] Tidak ada UI trending/ranking.

### M6 Backfill

- [ ] Job batch memproses karya pixel published dengan `color_usage` null tanpa mengubah source/PNG.
- [ ] Dapat dijalankan ulang (idempotent untuk baris yang sudah terisi).
- [ ] Kegagalan parse satu karya tidak menghentikan batch; tercatat.
- [ ] Setelah backfill, detail menampilkan Color Bar seperti karya baru.

---

## 13. Keputusan desain terkunci (ringkas)

1. Caption dan tags = **kolom terpisah**, bukan reuse `category` atau `content` pixel. Caption max **500**.
2. Color Usage = **snapshot saat publish** dari RLE runs; **exclude Paper**; UI hanya di detail; backfill batch di M6.
3. Explore card = gambar → judul → username → caption → tags; **tanpa** label ukuran; search judul **tetap**.
4. Fork **tidak** menyalin caption/tags/`color_usage`.
5. Filter hashtag = **fase terpisah (M5)**; tampilan tag dulu.
6. Artwork-first; tolak pola feed teks / popularitas.
7. Studio **tanpa server autosave** untuk metadata **dan** pixel — lokal sampai Simpan / leave→simpan / Publish; pemulihan lewat `localStorage` (`commons:creation-meta:*`, `commons:creation-source:*`).

### Perilaku Studio vs penyimpanan

| Kondisi | Perilaku |
|---|---|
| Draf belum terbit | Metadata + pixel lokal sampai Simpan atau Publish |
| Karya sudah terbit | Perubahan lokal sampai Simpan perubahan |
| Meninggalkan halaman dengan perubahan belum disimpan | Peringatan: simpan atau buang |
| Penyimpanan berhasil | Tandai tersimpan; bersihkan local draft |
| Penyimpanan gagal | Pertahankan lokal + opsi coba lagi |
| Publish | Commit metadata + pixel terbaru + hitung ulang `color_usage` |

---

## 14. Keputusan produk — status

Delapan keputusan produk (17 Nov 2026, termasuk no. 8 tanpa autosave metadata) **sudah diputuskan** — lihat tabel di atas dokumen.

---

## 15. Di luar cakupan (tegaskan ulang)

Trending hashtag, ranking kreator, popularity score, apresiasi di kartu Explore, search global baru, follower, notifikasi sosial baru, masonry, redesign total, library ikon baru, ubah RLE/PNG/storage policy untuk memaksa source publik, perluasan besar Common Space.
