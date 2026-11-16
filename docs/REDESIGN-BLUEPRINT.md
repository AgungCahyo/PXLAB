# THE COMMONS — Redesign Blueprint

**Dokumen:** REDESIGN-BLUEPRINT.md  
**Tanggal:** 16 Nov 2026  
**Sifat:** Rancangan pengalaman. Tidak mengubah kode pada tahap ini.

Identitas visual tetap Classic Pixel Adventure. Jangan membuat kulit baru per halaman.

Palet yang dipertahankan:

| Token | Hex |
|---|---|
| Sky | `#59BCEB` |
| Grass | `#45A849` |
| Brick | `#E94B3C` |
| Coin | `#FFD447` |
| Earth | `#936037` |
| Paper | `#FFFDF7` |
| Ink | `#282B35` |

Sudah dipetakan di `app/globals.css` sebagai `--sky`, `--grass`, `--brick`, `--coin`, `--earth`, `--bg`, `--fg`. Border 3px, bayangan keras, Press Start 2P untuk judul, DM Sans untuk isi. Satu aksen per kelompok. Karya pengguna tetap fokus; chrome tidak menambah pigura kedua pada kartu.

---

## 1. Layout per halaman

### Beranda `/`

Tujuan: tamu mengerti ini rumah pixel art dan melihat karya sungguhan.

Susunan:

1. Satu kalimat.
2. Satu baris tombol: Jelajahi karya, dan Gabung atau Buat jika sudah masuk.
3. Grid `CreationCard` karya pixel terbit (halaman pertama, paling banyak 6). Jika gagal atau kosong, jangan berpura-pura ada galeri. Satu kalimat “belum ada karya” dan tombol Jelajah sudah cukup.
4. Dua kartu penjelasan yang sudah ada, di bawah karya.
5. Ruang Bersama tetap satu baris redup ke `/space`.

Bukan rumah anggota. Jangan redirect paksa.

### Jelajah `/explore`

Tujuan: menemukan karya.

Susunan yang tetap: judul pendek, satu kalimat, filter, grid, paginasi, empty state, gagal-muat dengan coba lagi.

Yang berubah:

- Pixel adalah filter yang terlihat sebagai pilihan utama. (Kode aktual saat ini hanya memuat `type = pixel`; filter yang padat adalah ukuran kanvas + pencarian judul.)
- Tulisan, Visual, Ide, Cerita, dan Semua — jika digabung kembali ke Jelajah — masuk “Jenis lain”, bukan lima tombol setara.
- Hierarki kartu target: gambar → judul → `@username` (baris terpisah) → caption ringkas (opsional) → hashtag ringkas (opsional). **Tanpa label ukuran di kartu.** Tidak ada angka apresiasi. Tidak ada urutan popularitas. Bukan masonry.
- Pencarian judul (`q`) **tetap**; jangan diperluas ke search global.
- Filter hashtag (`?tag=`) adalah tahap terpisah setelah metadata tag ada. Lihat `ARTWORK-METADATA-EXPLORE-AUDIT.md`.

### Buat `/create`

Tujuan: mulai kanvas baru.

Susunan:

1. Judul “Karya baru”.
2. Pemilih ukuran yang sudah ada (`StudioNewForm`), termasuk ukuran khusus dan tanda terpilih.
3. Tindakan utama: Lanjut. Ini yang membuat draf dan membuka `/create/[id]`.
4. Tautan teks sekunder: Kelola karya yang sudah ada → `/dashboard`.

Tidak ada daftar karya di halaman ini.

Judul tidak dikirim sebagai “Tanpa judul”. Draf baru boleh tanpa judul tersimpan, atau menyimpan string kosong jika kolom mengizinkan tanpa migrasi. Jika kolom judul di skema wajib dan tidak boleh kosong, simpan penanda internal yang **tidak** ditampilkan sebagai judul publik. Tampilan pengelola dan galeri memakai salinan “Belum dinamai” hanya untuk draf. Karya terbit tidak boleh memakai penanda itu. Irisan implementasi harus memilih opsi yang tidak mengubah skema. Opsi yang aman: jangan izinkan terbit sampai pengguna mengisi judul, dan selama draf, jangan menaruh “Tanpa judul” ke galeri karena draf memang tidak publik.

### Playground `/create/[id]`

Tujuan: menggambar, menyimpan, meninjau, menerbitkan.

**Fitur desain di luar MVP toolset** (eyedropper, fill, shapes, selection, layers, …): lihat antrian terpisah `PIXEL-PLAYGROUND-DESIGN-FEATURES-AUDIT.md` (gelombang D1–D5). Jangan dicampur dengan irisan chrome halaman ini.

Yang tetap:

- Kanvas penuh di bawah header situs.
- Tab bawah dan footer disembunyikan.
- Pensil, penghapus, geser, undo, redo, palet, pratinjau.
- Persistensi Studio: explicit-save (+ draft lokal browser); kembali dengan peringatan jika belum tersimpan; peringatan menutup tab; offline tanpa autosave server. (Detail: audit metadata #8.)
- Hapus hanya dari dialog, dengan konfirmasi.
- Lepas-terbit tidak menghapus source.

Yang berubah:

- Bidang judul terlihat: border 3px, placeholder “Nama karya”, bukan teks polos yang sudah terisi “Tanpa judul”.
- Caption + hashtag (opsional, max 5): lewat **Lainnya → Caption & hashtag**, dan di dialog nama sebelum terbit — bukan strip tetap di atas kanvas.
- Baris status tetap satu: Draf atau Terbit, keadaan simpan, ukuran.
- Terbit, jika nama kosong, membuka dialog satu bidang. Setelah terbit, dialog singkat: Lihat karya, tetap di kanvas. Caption/hashtag tidak wajib untuk terbit.
- Kembali menuju `/dashboard`.
- Menu Lainnya tetap untuk muat pas, zoom, lepas-terbit, lihat publik, hapus. Zoom tidak perlu jadi satu-satunya tempat “lihat publik” setelah tombol sukses ada.

Studio jenis lama di URL yang sama tidak didesain ulang. Jangan jadikan itu jalur buat-baru.

### My Works `/dashboard`

Tujuan: melihat dan melanjutkan milik sendiri.

Susunan:

1. Judul “Karyamu”. Satu tautan Buat karya baru.
2. Kelompok Draf, lalu kelompok Terbit. Kosong masing-masing punya satu kalimat, bukan halaman buntu.
3. Baris atau kartu kecil: thumbnail pixel, nama atau “Belum dinamai”, tanggal, tindakan utama.
   - Draf: Lanjutkan → `/create/[id]`
   - Terbit: Lihat → `/creation/[id]`, ditambah Sunting → `/create/[id]`
4. Jangan memakai `CreationCard` publik apa adanya, karena kartu itu menyembunyikan status. Boleh memakai `PixelArt` yang sama.

Bukan sapaan. Bukan pengaturan. Bukan galeri orang lain.

### Detail `/creation/[id]`

Tujuan: melihat karya, lalu mengenali kreator, lalu menanggapi.

Susunan baru, tanpa mengubah aturan percakapan:

1. Gambar (`PixelArt`, `contain`, pixelated), selebar kolom baca.
2. Judul satu baris yang bisa dibaca, bukan headline pixel yang mengalahkan gambar. Nama pixel besar boleh tinggal untuk judul halaman di beranda dan Jelajah.
3. Kreator dan tanggal satu baris. Pemilik: Sunting karya ini.
4. Caption opsional (teks body, bukan judul pixel).
5. Hashtag opsional (max 5), tautan siap ke filter Jelajah.
6. Color Palette + Color Usage Bar (pixel; dari snapshot RLE, bukan analisis PNG).
7. Apresiasi dan bagikan. Teks tetap mendampingi ikon.
8. Menu **Lainnya (⋯)** di detail (baru): **Download** PNG bila diizinkan; pemilik selalu melihat Download + pengaturan izin unduh. Bukan cluster apresiasi.
9. Percakapan di bawahnya: jumlah, kosong, muat yang lebih lama, catatan, balasan satu tingkat, komposer yang tertutup sampai dibuka. Fork tetap untuk bukan-pemilik. Laporkan tetap ada.

Jangan mengubah: apresiasi bukan komentar, balasan tidak bersarang lebih dari satu, komposer tidak menggantikan karya.

Rincian caption, hashtag, dan palet warna: `ARTWORK-METADATA-EXPLORE-AUDIT.md`.  
Izin unduh PNG (default OFF, ditegakkan server): `ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md` — **belum diimplementasikan**.

### Profil `/u/[username]`

Tujuan: etalase.

Susunan yang tetap: `@username`, nama, bio, grid kartu yang sama dengan Jelajah.

Tambahan hanya untuk pemilik:

- Kelola karya (utama)
- Pengaturan (bahasa + keluar ada di sini)

Bukan halaman pengikut. Bukan daftar draf.

### Pengaturan `/settings`

Formulir profil. Bagian **Bahasa** (ID/EN) dan **Sesi** (Keluar). Kembali ke profil menyimpan dulu jika kotor. Tidak menambah navigasi kedua.

### Masuk dan daftar

Tetap singkat. Tidak menambah footer promosi. Setelah berhasil, hormati `next` internal; jika tidak ada, Jelajah.

### Admin `/admin`

Tetap alat laporan. Tidak masuk nav publik. Tetap lewat menu Akun bagi admin.

### Ruang Bersama `/space`

Jangan dijadikan tujuan produk. Biarkan di luar nav. Catatan beranda tetap satu baris. Papan SVG yang masih terpasang adalah warisan B5, bukan undangan untuk B6. Audit tidak meminta papan itu dihidupkan lebih lanjut dan tidak meminta dihapus.

## 2. Komponen yang dipakai ulang

Jangan membuat kartu galeri kedua.

| Komponen | Pemakaian |
|---|---|
| `CreationCard` | Beranda, Jelajah, profil publik. |
| `PixelArt` | Semua gambar pixel, termasuk baris My Works. |
| `GallerySkeleton`, `EmptyState`, `Alert` | Muat, kosong, gagal, offline. |
| `Button`, `Input`, `Dialog` | Tindakan, judul saat terbit, hapus. |
| `StudioNewForm` | Hanya di `/create`. |
| `PlaygroundForm` | Hanya di `/create/[id]` pixel. |
| `CreationCommunity` | Hanya dipindah urutan visualnya. Perilaku tidak ditulis ulang. |
| `SiteHeader`, `SiteNav`, `AppTabBar` | Chrome bersama. |

My Works membutuhkan baris karya dengan status. Itu komposisi baru yang memakai `PixelArt`, bukan klon `CreationCard`.

## 3. Navigasi

### Desktop

Header tetap setinggi sekarang, `z-50`.

Terlihat: tanda, Jelajah, Buat, Profil, Akun. Switch bahasa di header hanya untuk **tamu**; anggota mengganti bahasa di Pengaturan.

Akun membuka panel: Kelola karya, Pengaturan, Admin bila ada. Keluar ada di Pengaturan. Tutup dengan Escape dan klik luar, seperti sekarang.

Tidak ada sidebar kiri atau kanan.

Keadaan aktif: garis bawah Sky pada tujuan yang cocok, termasuk `/explore?type=…` untuk Jelajah dan `/create/[id]` tidak menandai Buat sebagai “sedang membuat” ketika studio menyembunyikan nav. My Works tidak ada di baris primer, jadi tidak perlu state di bar utama. Saat pengguna ada di `/dashboard`, tidak ada item primer yang berpura-pura aktif.

### Ponsel

Header: tanda; bahasa hanya untuk tamu; anggota lewat Akun → Pengaturan.

Tab bawah, `md:hidden`, tinggi tautan minimal 44px, tiga kolom: Jelajah, Buat, Profil. Profil tamu ke masuk dengan `next`.

Padding bawah shell tetap agar hak cipta tidak tertutup tab. Studio menyembunyikan tab lewat `data-chrome="playground"`.

Daftar `/create` dan `/dashboard` **tidak** memakai `data-chrome="studio"`, supaya footer dan tab berperilaku seperti halaman aplikasi lain. Hanya kanvas yang menyembunyikan chrome.

### Kembali

- Studio: tombol Kembali, menyimpan dulu, ke My Works.
- Pengaturan: kembali ke profil, menyimpan dulu.
- Detail, Jelajah, profil: tidak perlu tombol kembali tambahan. Nav dan riwayat browser cukup.
- Dialog: Tutup atau Batal membuang hanya langkah itu (laporan yang belum terkirim, warna yang belum dipakai, teks yang belum ditempatkan, judul terbit yang dibatalkan). Karya yang sudah tersimpan tidak ikut terbuang.
- Tidak ada breadcrumb. Kedalaman situs tidak memintanya.

## 4. Iconography

Prinsip: ikon untuk mengenali, teks untuk kejelasan.

Library yang ada: `PixelIcon` 16×16, satu set pixel buatan sendiri. `lucide-react` hanya muncul di `SpaceBoard` (`PenLine`). Jangan menyebarkan Lucide ke chrome produk. Jangan menambah paket ikon.

| Tempat | Ikon | Teks |
|---|---|---|
| Tab ponsel | Boleh ikon pixel kecil (grid, pensil, orang) **ditambah** label yang sudah ada. | Wajib tetap. |
| Nav desktop | Tidak wajib. Tiga kata sudah jelas. | Wajib. |
| Alat studio | Pensil, penghapus, geser, undo, redo, palet. Sudah icon-only dengan `aria-label` dan 44px. | Tidak diulang di ponsel. Di desktop lebar, tooltip tidak wajib karena nama aksesibel sudah ada. |
| Apresiasi dan bagikan | Hati dan bagikan, seperti sekarang. | Wajib di samping ikon. |
| Terbit, hapus, lepas-terbit, simpan | Tidak icon-only. | Wajib. |
| Status simpan dan offline | Tidak diganti ikon. | Wajib. |
| Tutup dialog | Ikon tutup dengan `aria-label`. | Tidak perlu kata di samping. |
| Bahasa | Tetap ID \| EN. | Bukan ikon bendera. |

`PixelIcon` sudah punya `menu`, `grid`, `flag`, `heart`, `share`, `back`, `star`. `menu` tidak lagi dipakai setelah hamburger dihapus. Jangan menghidupkan hamburger.

Setiap tombol icon-only yang tetap: `aria-label` atau `<title>` yang terlihat oleh aksesibilitas, `:focus-visible` (sudah global, outline Sky), target minimal 44×44. Swatch 36px dinaikkan ke 44px pada irisan refinement.

Jangan mengganti “Terbit”, “Hapus”, atau “Kelola karya” menjadi ikon.

## 5. Design system

Yang sudah sama di seluruh halaman dan harus dipertahankan:

- Paper sebagai latar, Ink sebagai teks, Earth sebagai garis.
- `.pixel-frame` untuk kartu dan dialog.
- `.pixel-choice` dan `.pixel-swatch` untuk keadaan terpilih. Jangan kembali ke border Tailwind yang kalah oleh `.pixel-frame`.
- Tombol primer Brick, sekunder Grass, outline Earth.
- Fokus keyboard satu gaya.

Yang tidak konsisten dan dirapikan, bukan diganti sistemnya:

- Judul halaman galeri memakai `.pixel-title`. Judul di dalam detail karya tidak boleh sebesar itu di atas gambar.
- `/create` menyembunyikan footer lewat atribut studio meskipun bukan kanvas.
- Halaman sapaan dashboard memakai layout artikel, sementara tujuannya baru adalah daftar karya `max-w-6xl` seperti Jelajah.

Tidak ada mode gelap, pill, atau komponen pelangi.

## 6. Interaksi

| Keadaan | Pola yang dipakai |
|---|---|
| Hover | Latar `--soft` pada kartu dan baris. Jangan menggeser layout. |
| Aktif / terpilih | `aria-pressed` atau `aria-current`, garis Sky atau isi Brick yang sudah ada. |
| Disabled | `opacity` dan `disabled`. Jangan hanya warna. |
| Loading galeri | `GallerySkeleton` di dalam Suspense. |
| Gagal muat | `EmptyState` + coba lagi ke URL yang sama. |
| Sukses simpan studio | Teks status, bukan toast. |
| Sukses terbit | Dialog singkat dengan jalan ke detail. Ini yang belum ada. |
| Sukses pengaturan | `Alert` yang sudah ada. |
| Error | `Alert` tone error, salinan dari `lib/copy.ts`. |
| Offline | `Alert` `pixelOffline`, simpan ditahan, coba lagi saat `online`. |
| Konfirmasi hapus | Dialog yang sudah ada. |
| Tooltip | Tidak ditambah. Nama aksesibel cukup untuk alat. |
| Dropdown | Hanya menu Akun. Tidak perlu komponen baru jika panel sekarang diperluas isinya. |
| Modal | `Dialog` untuk palet, lainnya, hapus, dan nanti judul-saat-terbit. |
| Keyboard | Fokus terlihat. Escape menutup menu dan dialog. |
| Sentuh | 44px pada tab, alat, dan tombol utama. |

Autosave 1200ms dan antrean simpan tetap. Kembali tidak boleh membuang goresan yang lebih baru. `beforeunload` tetap jika kotor atau masih menyimpan.

## 7. Responsive

| | Desktop ≥768 | Tablet | Ponsel 390 |
|---|---|---|---|
| Nav | Bilah atas lengkap + menu Akun | Sama dengan desktop begitu lebar ≥768 | Header tipis + tab bawah |
| Grid karya | 4 kolom di `xl`, 3 di `lg` | 3 kolom | 2 kolom |
| Detail | Gambar contain, kolom `max-w-5xl` | Sama, gambar tidak dipaksa penuh layar sampai terpotong | Gambar di atas judul |
| Profil | Grid sama dengan Jelajah | Sama | Header lalu satu kolom |
| Studio | Kanvas di antara header dan toolbar | Sama | Toolbar dua baris: alat, lalu palet yang bisa digeser. Tab disembunyikan |
| My Works | Daftar longgar, thumbnail tetap kecil | Sama | Satu kolom, tindakan di dalam baris, bukan menu tersembunyi |
| Dialog | Tengah, tidak lebih lebar dari layar | Sama | Lebar layar dikurangi padding, tombol bertumpuk |
| Formulir | `max-w-xl` | Sama | Lebar penuh, label di atas field |

Jangan mengecilkan desktop menjadi ponsel. Tab bawah bukan bilah atas yang diperkecil; isinya tiga tujuan yang sama.

## 8. Salinan

Semua teks baru masuk `lib/copy.ts` dalam ID dan EN. Jangan menaruh string Indonesia langsung di komponen.

Istilah yang disarankan:

| ID | EN | Dipakai untuk |
|---|---|---|
| Karyamu | Your works | My Works |
| Belum dinamai | Not named yet | Draf tanpa judul |
| Nama karya | Work name | Placeholder judul |
| Karya baru | New work | Pintu Create |
| Lihat karya | View work | Setelah terbit |
| Kelola karya | Manage works | Tautan dari profil |

“Tanpa judul” boleh tetap sebagai cadangan baca untuk data lama, bukan sebagai nilai yang ditulis form baru.

---

## 9. Metadata karya & Color Palette (belum diimplementasikan)

Spesifikasi audit lengkap: **`docs/ARTWORK-METADATA-EXPLORE-AUDIT.md`**.

Ringkas:

| Fitur | Keputusan blueprint (terkunci 17 Nov 2026) |
|---|---|
| Caption | Kolom terpisah, opsional, max **500**; penuh di detail, 2 baris di kartu |
| Hashtag | `tags[]` max 5, dinormalisasi; bukan `category` ukuran; filter Explore = M5 |
| Color Usage | Snapshot dari RLE **saat publish**; **exclude Paper** (latar/penghapus); bar + HEX di detail; backfill batch M6 |
| Kartu Explore | Tanpa label ukuran; search judul tetap |
| Fork | Tidak menyalin caption, tags, atau `color_usage` |
| Skema | Jangan ubah RLE/PNG/RLS source; jangan reuse `content` pixel untuk caption/tags |

Tidak ada izin implementasi di dokumen ini. Irisan M1–M7 ada di audit dan di `IMPLEMENTATION-ROADMAP.md`.

---

## 10. Unduh karya (izin kreator — blueprint terkunci; belum diimplementasikan)

Spesifikasi: **`docs/ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md`**. Irisan **DL1–DL4** di `IMPLEMENTATION-ROADMAP.md`. **DL1–DL3 selesai** (Storage tetap Opsi A + logging unduh). **DL4** menunggu persetujuan.

| Keputusan | Isi terkunci |
|---|---|
| Default | Izin unduh orang lain **OFF** |
| Siapa | Pemilik selalu (termasuk draf); **tamu & anggota** jika flag ON + published |
| Format tahap 1 | PNG `cover.png`, dimensi asli; bukan source RLE |
| UI | Download di Lainnya detail; pintasan Lainnya Playground; toggle “Allow others to download this artwork” |
| Cache | Endpoint unduh **`no-store`**; **tidak** purge cache cover saat izin dicabut |
| Posisi | Fasilitas unduh **resmi** THE COMMONS — bukan DRM / jaminan hak cipta; Download OFF ≠ mencegah Save As |
| Pemisahan | Melihat karya · download PNG · fork **tidak saling mengunci** |

Operator: jalankan migrasi `allow_png_download` di Supabase sebelum mengandalkan unduh di lingkungan hidup. DL4 (source/RLE) menunggu persetujuan.
