# THE COMMONS — Comprehensive UX Audit

> **Document purpose:** Point-in-time UX audit from commit `66503eb` (17 Nov 2026), useful for reasoning about the redesign but not for current feature status.
> **Status:** HISTORICAL SNAPSHOT — NOT CURRENT FEATURE STATUS.
> **Updated:** 2026-11-24 (marker added; original findings preserved).
> **Implementation evidence:** VERIFIED IN CODE — current Studio uses explicit server save with browser-local recovery (`components/creations/PlaygroundForm.tsx:431`), so the autosave findings below are historical. Current inventory: `docs/studio/01_SYSTEM_AUDIT.md`.
> **Completed:** Original audit and its issue list were recorded; many layout/workflow findings were addressed by later B2–B7 and Studio work.
> **Open:** Browser verification of any finding before acting; production QA remains an operator task.
> **Dependencies:** `PRODUCT-SPEC.md`, `IMPLEMENTATION-PLAN.md`, `docs/studio/01_SYSTEM_AUDIT.md`.
> **Next action:** Treat this file as read-only history. Do not implement P0/P1 items from it without re-validating against current code and browser behavior.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION.

**Dokumen:** `docs/COMPREHENSIVE-UX-AUDIT.md`
**Tanggal:** 17 Nov 2026
**Sifat:** Audit dan perencanaan. Tidak ada kode, CSS, komponen, konfigurasi, atau database yang diubah.
**Dasar:** source code di `main` (satu commit, `66503eb`, 17 Nov 2026 00:26). Dokumen `docs/` dipakai sebagai baseline, bukan sebagai kebenaran.

## Batas verifikasi

Dikerjakan dari membaca kode. Belum dilakukan:

- Menjalankan aplikasi di browser atau perangkat. Semua temuan viewport 390px berasal dari analisis class Tailwind dan CSS, bukan dari tangkapan layar. Beri label "perlu dicek visual" pada temuan tata letak sebelum dikerjakan.
- Menjalankan `tsc` dan `vitest`. Tes RLS butuh proyek Supabase.
- Memeriksa konfigurasi proyek Supabase (apakah konfirmasi email aktif, template email, rate limit). Beberapa temuan auth bergantung pada ini.
- Migrasi SQL hanya dibaca sekilas, untuk satu fakta: relasi `creation_id ... on delete cascade` (lihat P1-6).

---

# 1. Executive Summary

Kode sudah jauh di depan dokumen audit 16 Nov. Dari tiga temuan P0 pada baseline, ketiganya sudah diterapkan: `/dashboard` kini My Works, `/create` kini hanya pemilih ukuran, judul "Tanpa judul" tidak lagi disimpan sebagai teks, terbit meminta nama lewat dialog, dan `next` dihormati sesudah masuk, daftar, dan callback email. Detail karya pixel sudah gambar-dulu. Tab bawah sudah berikon. Swatch sudah 44px.

Artinya audit ini tidak mengulang baseline. Yang tersisa adalah tiga kelompok masalah:

1. **Satu risiko kehilangan data di studio.** Autosave dibatalkan saat komponen dilepas, dan navigasi klien dari header situs tidak menyimpan dulu. Kembali lewat tombol Kembali aman, tetapi header situs tetap terlihat di atas studio.
2. **Auth hanya melayani jalur lancar.** Tidak ada pemulihan kata sandi. Kegagalan masuk selalu berpesan sama, termasuk untuk email yang belum dikonfirmasi. Layar "cek email" tidak punya langkah berikutnya. Di ponsel, tamu tidak melihat tombol Gabung/Masuk di header.
3. **Ponsel dan aksesibilitas belum setara dengan desktop.** Tombol `sm` setinggi 36px dipakai pada aksi utama studio. Warna merek tertentu tidak lolos kontras untuk teks kecil. Cincin fokus hanya 2,1:1 terhadap latar. Tidak ada penanganan safe area bawah padahal `viewportFit: cover` aktif.

P1-8 sebagian terkunci (17 Nov 2026): pencarian judul Jelajah **tetap**; sisa pekerjaan filter ukuran mobile = M7 di `ARTWORK-METADATA-EXPLORE-AUDIT.md`.

Tidak ada rekomendasi di dokumen ini yang membutuhkan perubahan skema, RLS, storage, format RLE, pipeline PNG, arsitektur auth, deep link, atau aturan Artwork Conversation. Pemulihan kata sandi (P1-1) menambah alur baru di atas Supabase Auth yang sudah ada dan perlu persetujuan eksplisit.

---

# 2. Kondisi UX Produk Saat Ini

## 2.1 Status temuan baseline (audit 16 Nov) terhadap kode

| Baseline | Status di kode | Bukti |
|---|---|---|
| P0-1 Buat = daftar + pintu studio | **Selesai** | `create/page.tsx` hanya `StudioNewForm` + tautan "Kelola karya yang sudah ada". `dashboard/page.tsx` memuat grup Draf dan Terbit via `listOwnCreations`. |
| P0-2 Judul palsu "Tanpa judul" | **Sebagian besar selesai** | `titleForStorage` menyimpan penanda `U+2060`, `displayTitle` menampilkan "Belum dinamai". Terbit ditolak di klien (`persist`) dan server (`actions.ts:265, 334`). Dialog nama + dialog "sudah terbit" ada. Sisa masalah: P2-8. |
| P0-3 Masuk memutus halaman | **Selesai** | Layout anggota mengirim `x-pathname` sebagai `next`. `loginHref`/`registerHref`/`authDestination`/`safeInternalPath` dipakai di form, tab bawah, header, dan komentar tamu. Callback memakai `safeInternalPath`. |
| P1-1 Detail teks-dulu | **Selesai untuk pixel** | `creation/[id]/page.tsx`: `CreationBody` lalu judul 22px, kreator, apresiasi + bagikan, lalu percakapan. |
| P1-2 Draf/terbit & penutup | **Sebagian** | Dialog "sudah terbit" ada. Status draf/terbit masih satu baris 12px di bawah judul (P2-3). |
| P1-3 Akun ponsel | **Selesai** | Profil sendiri memuat Kelola karya, Pengaturan, Keluar. Tetap hanya bisa dicapai lewat Profil (P2-10). |
| P1-4 `/dashboard` yatim | **Selesai** | Lihat P0-1. |
| P1-5 Jenis lama di Jelajah | **Selesai dengan cara lain** | Jelajah hanya memuat `type: "pixel"`. Filter kini = ukuran kanvas (P1-8). |
| P2 ikon tab, swatch 44px, footer di `/create` | **Selesai** | `AppTabBar` memakai `PixelIcon`. Swatch `h-11 w-11`. Atribut hanya `data-chrome="playground"`. |
| P2 dua landmark `nav` bernama sama | **Masih ada** | `SiteHeader` dan `AppTabBar` sama-sama `aria-label={copy.navAria}`. |
| P2 tablet langsung navigasi desktop | **Masih ada** | `md:` (768px) memakai `hidden md:flex` untuk bilah atas dan menyembunyikan tab bawah. |

## 2.2 Drift dokumentasi

`PRODUCT-UX-AUDIT.md`, `USER-JOURNEY.md`, dan `IMPLEMENTATION-ROADMAP.md` bertanggal 16 Nov dan masih menggambarkan keadaan sebelum irisan 1–5. Irisan 1–5 pada roadmap tampak sudah dikerjakan di kode (ada tes `works-home`, `work-identity`, `auth-next`, `detail-hierarchy`, `back-navigation`). Siapa pun yang membaca dokumen itu akan mengira P0 masih terbuka. Rekomendasi: tandai status irisan di roadmap (R7 di bagian 15).

Dua dokumen fase lain (dari audit baseline) tetap relevan: `/space` masih memasang `SpaceBoard` interaktif di bawah catatan arsip, dan tabel di `PRODUCT-SPEC` yang menyebut Common Space bisa dilihat pengunjung belum disinkronkan.

## 2.3 Empat pengalaman inti

| Pengalaman | Kondisi sekarang | Yang masih menghalangi |
|---|---|---|
| Discover | Kartu visual, filter, pencarian, paginasi, kerangka muat, gagal-muat dengan Coba lagi. | Filter berdasarkan ukuran kanvas (P1-8). Paginasi tanpa posisi halaman. Satu kolom di ponsel. |
| Create | Pemilih ukuran → studio langsung. Autosave, dialog nama, dialog selesai terbit. | Risiko kehilangan data (P0-1). Kromat studio di ponsel (P1-5). Jalan keluar saat simpan gagal (P1-4). |
| Showcase | Detail gambar-dulu. Profil. My Works berkelompok. | Hapus karya tidak memberi tahu komentar ikut hilang (P1-6). |
| Connect | Apresiasi, komentar, balasan satu tingkat, bagikan, laporkan, fork. Komentar tamu menautkan masuk dengan `next`. | Tombol Apresiasi hijau berteks putih 3,02:1 (P2-1). Bagikan diam-diam menyalin tautan saat dibatalkan (P2-6). |

---

# 3. Page-by-Page Audit

## A. Homepage `/`

- Kalimat nilai, dua CTA (Jelajahi, Gabung/Buat), catatan Ruang Bersama, sampai 6 karya, dua kartu penjelasan. Karya muncul di atas lipatan di ponsel setelah satu kalimat dan satu paragraf. Kokoh.
- `LandingWorks` mengembalikan `null` jika galeri gagal atau kosong. Halaman lalu hanya berisi teks dan dua kartu "mode" tanpa gambar. Tidak ada keadaan pengganti (baseline sudah mencatat ini, belum diubah). P2-12.
- Catatan "Ruang Bersama · nanti" menautkan ke `/space`, yang ternyata papan interaktif. Pengunjung yang mengikuti tautan tidak mendapat apa yang dijanjikan kata "nanti". P3-1.
- Anggota yang login melihat halaman yang sama dengan CTA Buat. Wajar.

## B. Explore `/explore`

- Struktur: judul, pencarian (label terlihat, ikon, tombol Cari), filter, galeri. Target sentuh 44px. Empty state dibedakan antara hasil pencarian, filter, dan galeri kosong. Gagal-muat bisa diulang.
- Filter adalah ukuran kanvas (`icon`, `small`, `sprite`, `medium`, `large`, `poster`, `custom`). Pengunjung mencari karya berdasarkan apa yang ingin dilihat, bukan berapa piksel. Lihat P1-8.
- Kartu: gambar, `judul · @username` dalam satu baris `truncate`. Di 390px judul panjang atau username panjang saling memotong. P2-13.
- Paginasi hanya "Sebelumnya/Berikutnya". Tidak ada "Halaman 2 dari 5". Landmark `nav` diberi nama sama dengan judul halaman. P2-13.
- Satu kolom di bawah 640px, 12 karya per halaman (`EXPLORE_PAGE_SIZE`). Dua belas layar gulir per halaman di ponsel. P2-13 (perlu dicek visual, ukuran thumbnail 2 kolom ≈ 170px).
- Filter diberi `role="toolbar"` padahal isinya tautan. Toolbar menjanjikan navigasi panah. Gunakan `nav` + daftar. P2-4.
- Tidak ada hitungan apresiasi di kartu. Sesuai prinsip kontribusi di atas popularitas.

## C. Create `/create`

- Intro, tautan "Kelola karya yang sudah ada", pemilih ukuran dengan pratinjau proporsi, tombol mulai. Tidak ada daftar karya. Tidak ada kebingungan baru-vs-lama lagi.
- Tombol "Mulai" berada setelah 7 kartu ukuran. Di ponsel dua kolom ≈ 4 baris ≈ 900px sebelum tombol (perlu dicek visual). Preset bawaan sudah terpilih, tetapi pengguna tidak tahu bahwa mereka bisa langsung lanjut. P2-9.
- Ukuran kustom yang tidak valid hanya mematikan tombol (`disabled={pending || !sizeOk}`). Tidak ada pesan yang menjelaskan rentang yang diizinkan. Input memiliki prop `error` tetapi tidak dipakai. P2-9.
- `StudioNewForm` masih mengirim judul tersembunyi `DRAFT_UNNAMED_TITLE`. Berfungsi, tetapi lihat P2-8 dan bagian 13.

## D. Pixel Studio `/create/[id]`

Yang baik: tiga alat + undo/redo + Lainnya dalam satu baris 44px, palet horizontal dengan tombol palet lengkap, status simpan di header, peringatan offline, pemulihan saat kembali online, `beforeunload`, penyimpanan sebelum Kembali, antrean simpan berurutan (`flightRef`) sehingga simpan tidak saling menimpa, ekspor melewati batas ukuran dengan pesan `payload_too_large`.

Temuan:

- Risiko kehilangan data lewat navigasi klien (P0-1).
- Jalan keluar saat simpan gagal tidak ada (P1-4).
- Kromat ponsel dan safe area (P1-5).
- Status simpan adalah satu baris 12px `text-muted` yang menggabungkan status karya, status simpan, dan ukuran ("Draf · Tersimpan · 64 × 64"), tanpa `aria-live`. Perubahan "Menyimpan…" → "Tersimpan" tidak diumumkan. P2-3.
- Zoom (`Perbesar`, `Perkecil`, `Pas`) ada di dalam dialog modal "Lainnya". Dialog tidak menutup setelah zoom, sehingga pengguna memperbesar sambil tertutup backdrop. Pinch dan roda mouse ada, tetapi pengguna desktop tanpa trackpad tidak punya pintasan terlihat. P2-11.
- `Batalkan terbit` di dialog Lainnya tidak memakai konfirmasi. Reversibel, jadi wajar, tetapi menyembunyikan karya dari publik tanpa umpan balik selain label status berubah.
- Kanvas menggambar hanya lewat pointer. Tidak ada alternatif keyboard. Ini batas bawaan editor piksel. P3-2.
- Pintasan keyboard hanya Ctrl/Cmd+Z/Y. Tidak ada pintasan alat. Bukan masalah sekarang.

## E. Artwork Detail `/creation/[id]`

- Hierarki sudah benar. Pemilik mendapat "Sunting karya ini", non-pemilik mendapat Fork (`allowFork={!isOwner}`). Masuk dari komentar tamu mengembalikan ke karya yang sama.
- Aturan Artwork Conversation tidak disentuh dan tidak boleh disentuh.
- Tombol Apresiasi memakai varian `secondary` (hijau, teks putih 3,02:1). Ini aksi Connect utama. P2-1.
- Bagikan: jika sheet native dibatalkan, kode jatuh ke penyalinan clipboard dan menampilkan "tautan disalin" (lihat komentar di `ShareButton`). Pengguna yang batal tidak meminta salinan. Jika clipboard gagal, tidak ada umpan balik. P2-6.
- Hapus komentar memakai konfirmasi inline, bukan dialog. Cukup untuk aksi kecil.

## F. Creator Profile `/u/[username]`

- `@username`, nama, bio, grid karya terbit. Pemilik: Kelola karya, Pengaturan, Keluar. Konsisten dengan detail karya (kartu yang sama).
- Profil sendiri tanpa karya terbit menampilkan empty state tanpa tindakan. Pemilik baru perlu CTA Buat di sini. P2-7.
- Tidak ada avatar di UI meskipun `avatar_url` ada di data. Bukan masalah, hanya dicatat.

## G. My Works `/dashboard`

- Draf dan Terbit berkelompok dengan `aria-labelledby`. Tindakan utama draf: Lanjutkan. Terbit: Lihat + Sunting. Thumbnail, tanggal ubah, status. Karya tanpa nama tampil "Belum dinamai".
- Hapus membuka dialog, tetapi dialog tidak menyebut karya mana yang dihapus dan tidak menyebut bahwa komentar dan apresiasi ikut hilang. P1-6.
- Tidak ada pengurutan atau pencarian. Batas per anggota `CREATION_PER_MEMBER_MAX = 100`. Dengan puluhan karya, daftar satu kolom panjang tanpa penunjuk. P3-3.
- Empty state memakai teks `createEmptyTitle` dengan tindakan "Karya baru". Baik.

## H. Authentication

- Login dan Register ringkas. `next` dibawa. Label terlihat, `autoComplete` benar, `type` benar.
- Pesan galat: Alert di atas form, tidak per field. Prop `error` pada `Input` tidak dipakai di form manapun. Validasi hanya lewat atribut native (`pattern`, `minLength`). P2-14.
- `loginAction` memetakan semua kegagalan ke `generic_auth` ("Email atau kata sandi tidak bisa dipakai."). Pengguna yang belum mengonfirmasi email tidak bisa dibedakan dari kata sandi salah. P1-2.
- Setelah daftar dengan konfirmasi email, form diganti Alert statis. Tidak ada kirim ulang, tidak ada ubah email, tidak ada tautan ke Masuk. Pesan sengaja kabur (anti-enumerasi): "Jika alamat ini bisa dipakai…". Pilihan itu masuk akal untuk keamanan, tetapi tanpa langkah berikutnya pengguna yang salah ketik email buntu. P1-2.
- Tidak ada "Lupa kata sandi" di mana pun (pencarian kode tidak menemukan alur pemulihan). P1-1.
- Tombol submit hanya `disabled` saat proses. Label tidak berubah. P2-14.
- Petunjuk username: "huruf kecil, angka, garis bawah", sedangkan `pattern="[a-zA-Z0-9_]+"` menerima huruf besar. Perlu dicek bagaimana skema menormalisasinya. P2-14.

## I. Settings `/settings`

- Form jelas: nama tampilan, username, bio, peran (baca-saja). Tombol Kembali menyimpan dulu, selaras dengan studio. `beforeunload` aktif.
- Kolom "Peran" menampilkan `member`/`admin` kepada semua anggota. Informasi internal tanpa kegunaan bagi anggota biasa. P2-10.
- Mengganti username mengubah URL `/u/[username]`. Tautan lama ke profil patah dan form tidak memperingatkan. Deep link tidak boleh diubah strukturnya, tetapi pengguna layak diberi tahu. P2-10.
- Umpan balik tersimpan: Alert `role="status"` di atas form. Cukup.

## J. Admin `/admin`

- Filter status, kartu laporan, tindakan Sembunyikan/Pulihkan/Tinjau/Selesai. Struktur wajar.
- Status mentah Inggris (`report.status`: `pending`, `reviewed`, `resolved`) ditampilkan di baris meta, padahal `adminPending/Reviewed/Resolved` sudah ada di `copy`. P2-15.
- Tidak ada umpan balik sukses setelah tindakan; kartu berubah hanya jika revalidasi memindahkannya. Hanya galat yang ditampilkan. P2-15.
- Tautan filter `min-h-9` (36px). Pengguna admin kebanyakan desktop, jadi prioritas rendah.

## K. Common Space `/space` (kondisi aktual saja)

- Halaman memasang `SpaceBoard` yang bisa dipakai anggota di bawah catatan arsip, plus tautan Jelajah/Buat. Tidak diperluas, tidak dijadikan prioritas. Hanya dicatat: wording "nanti" di beranda tidak cocok dengan keadaan (P3-1), dan `lucide-react` hanya dipakai di sini (bagian 13).

---

# 4. User Journey Audit

Simulasi dari kode. Titik pengerjaan ulang ditandai dengan ID temuan.

**1. Pengunjung baru → Beranda → Explore → Detail → Profil.**
Alur lancar. Beranda menampilkan karya. Kartu menuju detail. Nama kreator menuju profil. Sisa: Jelajah dimulai dengan filter ukuran kanvas (P1-8). Di ponsel tamu tidak melihat Gabung/Masuk di header di mana pun selain beranda (P1-3).

**2. Pengunjung → mencoba membuat → Login/Register → kembali.**
Tab Buat untuk tamu → `loginHref(..., "/create")` → setelah masuk ke `/create`. Layout anggota mengisi `next`. Baik. Dari halaman login, tautan ke Register membawa `next`. Dari Register dengan konfirmasi email: `emailRedirectTo` membawa `next`. Sisa: tidak ada petunjuk jika email tidak datang (P1-2).

**3. Pengguna baru → Register → membuat → simpan draf → lanjut → Terbit.**
Pilih ukuran → studio → gambar → autosave → Terbit → dialog nama bila kosong → dialog "sudah terbit" dengan Lihat karya / Lanjut menyunting. Kembali → `/dashboard` (menyimpan dulu). Titik gesekan: tombol Mulai jauh di bawah (P2-9), jalan keluar jika simpan gagal (P1-4), navigasi header di studio (P0-1).

**4. Pengguna → Explore → Apresiasi → Komentar.**
Tombol terlihat, tamu diarahkan masuk dengan `next`. Tidak ada pembaruan optimistis, tombol `disabled` selama proses. Sisa: kontras tombol (P2-1).

**5. Pengguna → Detail → Fork → edit hasil fork.**
Fork membuat salinan raster dan membuka editor. Pemilik tidak melihat Fork. Tidak ditemukan masalah baru. Tidak diubah.

**6. Kreator → My Works → lanjutkan draf.**
Lanjutkan → `/create/[id]`. Alur pendek. Sisa: daftar panjang tanpa urutan (P3-3).

**7. Kreator → Profil → kelola karya.**
Profil sendiri → Kelola karya → My Works. Dari Profil kosong tidak ada CTA (P2-7).

**8. Pengguna ponsel → pindah halaman lewat navigasi utama.**
Tiga tab dengan ikon + label, 56px tinggi. Aktif ditandai garis bawah sky + `aria-current`. Sisa: tab bawah tidak punya padding safe area (P1-5), dua landmark `nav` bernama sama (P2-2). Pengguna ponsel tamu: lihat P1-3.

---

# 5. Navigation Audit

- Desktop: Jelajah, Buat, Profil (atau Gabung + Masuk untuk tamu), menu Akun (Kelola karya, Pengaturan, Admin, Keluar), pengalih bahasa. Setiap item punya fungsi. Aktif ditandai garis bawah + `aria-current`.
- Ponsel: tiga tab. Akun lewat Profil sendiri. Tamu: Buat dan Profil sama-sama menuju Masuk. Tidak ada jalan ke Gabung kecuali lewat halaman Masuk atau beranda (P1-3).
- Menu Akun desktop: `aria-expanded` dan `aria-controls` ada, tutup dengan Escape dan klik luar. Belum ada `aria-haspopup`, fokus tidak kembali ke pemicu setelah Escape, panah tidak bergerak antaritem. Untuk empat item, disclosure sederhana cukup; kembalikan fokus (P2-5).
- Kembali: studio → `/dashboard` (menyimpan dulu). Pengaturan → profil (menyimpan dulu). Konsisten.
- Konsistensi lokasi tindakan: Sunting karya ada di detail dan My Works. Hapus ada di My Works dan dalam dialog Lainnya di studio, dengan kata "Hapus" yang sama tetapi dialog yang berbeda (lihat P1-6).
- Header situs tetap terlihat di atas studio (`top-[66px]`), sementara tab bawah dan footer disembunyikan. Jadi di studio ada dua tingkat navigasi: header global dan header studio. Ini akar P0-1 dan P1-5.
- Tablet 768px memakai navigasi desktop. Belum menjadi masalah nyata tanpa layout antara. Dicatat saja (P3-4).
- Breadcrumb: tidak perlu. Jangan ditambah.

---

# 6. Visual Design Audit

Identitas Classic Pixel Adventure konsisten dan tetap dipertahankan.

- Token warna tepat sesuai spesifikasi: sky `#59BCEB`, grass `#45A849`, brick `#E94B3C`, coin `#FFD447`, earth `#936037`, paper `#FFFDF7`, ink `#282B35`. `--muted` `#5C5866` untuk teks sekunder.
- Border 3px, bayangan blok 4px, tanpa radius, tanpa gradien dekoratif, tanpa mode gelap. Sesuai.
- Press Start 2P untuk `.pixel-title`/`.pixel-kicker`, DM Sans untuk isi. `.pixel-title` memakai `clamp(1.05rem, 2.6vw, 1.4rem)` dengan `letter-spacing` 0.06em. Cukup untuk judul pendek, melelahkan untuk kalimat panjang (tagline beranda). Bukan masalah sekarang.
- Hierarki tombol: primary (brick), secondary (grass), outline, ghost. Pemakaian cenderung konsisten. Pengecualian: "Hapus" ghost berdampingan dengan tindakan utama di baris My Works (risiko salah tekan di ponsel, lihat P1-6).
- Ukuran teks: banyak metadata 12–13px (`text-[12px]`, `text-[13px]`). Terbaca karena kontras `muted` 6,78:1, tetapi berada di batas bawah di ponsel.
- Dialog: native `<dialog>` dengan bingkai piksel. Konsisten di studio, My Works, Laporkan.
- Empty state: satu komponen bersama (`EmptyState`). Konsisten. Hanya profil sendiri yang tidak memberi tindakan.
- Loading: `GallerySkeleton` untuk galeri. Tombol submit auth dan form lain tidak memberi tanda proses selain `disabled`.
- Kontras, terhitung dari token (nilai dihitung, bukan perkiraan):

| Pasangan | Rasio | Dipakai untuk | Hasil |
|---|---|---|---|
| Putih di atas grass `#45A849` | 3,02:1 | Tombol `secondary` (Apresiasi, Terbit-lihat, dll.), teks 13–14px | **Gagal AA** (butuh 4,5:1) |
| Putih di atas brick `#E94B3C` | 3,79:1 | Tombol primary, filter terpilih, teks 13–14px | **Gagal AA** |
| Teks brick di atas paper | 3,73:1 | Pesan galat `text-brick` 13px, `.pixel-choice` kicker | **Gagal AA** |
| Cincin fokus sky `#59BCEB` di atas paper | 2,10:1 | `:focus-visible` global | **Gagal 3:1** (non-teks) |
| Ink di atas grass | 4,67:1 | (belum dipakai) | Lolos |
| Muted di atas paper / soft | 6,78 / 6,11:1 | Teks sekunder | Lolos |
| Earth di atas paper | 5,20:1 | Border, teks kecil | Lolos |

Jangan mengubah identitas. Pendekatan yang tidak mengubah karakter: pertahankan token merek untuk isi bidang dan border, dan pilih kombinasi teks yang lolos (teks ink di atas grass lolos 4,67:1), atau tambah satu tingkat lebih gelap untuk bidang yang memuat teks kecil. Untuk cincin fokus, pakai cincin ink atau cincin ganda (ink dengan offset). Putuskan bersama Anda sebelum menyentuh `globals.css`; ini perubahan global (R5).

---

# 7. Mobile Experience Audit (390px)

Berdasarkan analisis kode. Perlu dicek visual pada perangkat nyata.

- **Navigasi utama:** tiga tab 56px di dasar, mudah dijangkau satu tangan. Tidak ada padding `env(safe-area-inset-bottom)` padahal `viewportFit: "cover"` aktif (`app/[lang]/layout.tsx`). Pencarian `safe-area` di seluruh `app/` dan `components/` tidak menemukan apa pun. Tab dan toolbar studio dapat tertutup indikator home di iPhone. P1-5.
- **Header ponsel:** logo + pengalih bahasa. Tamu tidak melihat Gabung/Masuk (`hidden md:flex`). P1-3.
- **Studio:** tinggi tersedia dibagi: header situs 66px, header studio (tombol Kembali, judul, Pratinjau, Terbit + baris status ≈ 70px), toolbar bawah dua baris ≈ 110px. Dari viewport 664px (Safari iPhone dengan bilah) tersisa sekitar 400px kanvas (perkiraan, perlu dicek visual). Baris alat 6 × 44px + celah muat di 390px. Header studio: tombol 44px + input judul + Pratinjau + Terbit `sm` (36px). Terbit dan Pratinjau di bawah 44px. P1-5.
- **Modal dan dialog:** `<dialog>` native, lebar `min(100% − 2rem, 28rem)`. Aman di 390px.
- **Form:** `autoComplete` benar, `min-h-11`. Tombol submit penuh lebar tidak ditegaskan, tetapi cukup.
- **Galeri:** satu kolom (`grid gap-4 sm:grid-cols-2`). P2-13.
- **Kartu:** judul dan username dalam satu baris terpotong. P2-13.
- **Elemen tumpang tindih:** `PublicShell` memberi `pb-16` agar tab tidak menutup konten. Studio memakai `fixed inset-x-0 bottom-0 top-[66px]` sehingga toolbar-nya sendiri berada di dasar. Konsisten asalkan safe area ditangani.
- **Overscroll:** studio memakai `overscroll-none`, bagus untuk mencegah tarik-segarkan saat menggambar.
- **Sentuhan di kanvas:** `touch-action: none`, pinch dan geser dua jari ada. Pointer capture dipakai.

---

# 8. Accessibility Audit

Yang sudah baik: `lang` dinamis pada `<html>`, tautan lompat ke `#main`, `:focus-visible` global, `aria-current` pada navigasi, `aria-pressed` pada alat dan filter pixel, `role="radiogroup"` pada palet, `<dialog>` native (fokus dan Escape ditangani browser), `Input` memasang `aria-invalid` dan `aria-describedby`, `Alert` memakai `role="alert"`/`status`, `prefers-reduced-motion` ditangani, label terlihat pada form.

Temuan (kontras sudah di bagian 6):

| Item | Bukti | ID |
|---|---|---|
| Status simpan studio tidak di live region | `PlaygroundForm`: `<p className="mt-1 text-[12px]...">` tanpa `role="status"` | P2-3 |
| Dua `nav` bernama sama | `SiteHeader.tsx` dan `AppTabBar` memakai `copy.navAria` | P2-2 |
| `role="toolbar"` pada kumpulan tautan filter | `ExploreFilters` | P2-4 |
| Menu Akun: tanpa `aria-haspopup`, fokus tidak kembali | `SiteNav.tsx` | P2-5 |
| Dialog nama terbit: fokus awal ke tombol Tutup, bukan ke kolom nama; Enter tidak mengirim karena bukan `<form>` | `PlaygroundForm`: `<input id="publish-title">` di luar form | P2-8 |
| Target sentuh `sm` = `min-h-9` (36px) | `Button.tsx`: `sm: "min-h-9 ..."`; dipakai Terbit/Pratinjau, Apresiasi, Bagikan, Fork, Hapus, admin | P1-5, P2-1 |
| Galat form tidak per-field, `Input.error` tidak dipakai | `LoginForm`, `RegisterForm`, `SettingsForm` | P2-14 |
| Kanvas hanya pointer | `PixelBoard`: `role="img"` + label, tanpa kontrol keyboard | P3-2 |

Tidak ditemukan: gambar tanpa alt yang bermakna (gambar kartu `alt=""` benar karena tautan memuat teks judul), judul yang melompati tingkat, label form yang hilang.

---

# 9. Interaction & Feedback Audit

| Aksi | Umpan balik | Penilaian |
|---|---|---|
| Autosave | "Menyimpan…" / "Tersimpan" / "Belum tersimpan" di baris 12px | Ada, kecil, tidak diumumkan (P2-3) |
| Simpan gagal | Alert galat di atas kanvas, kanvas mengecil | Ada, tanpa jalan keluar (P1-4) |
| Offline | Alert, simpan ulang otomatis saat online | Baik |
| Terbit | Dialog nama bila kosong, dialog "sudah terbit" | Baik |
| Hapus karya (My Works dan studio) | Dialog konfirmasi generik | Kurang spesifik (P1-6) |
| Hapus komentar | Konfirmasi inline | Baik |
| Apresiasi | Tombol `disabled` saat proses, galat inline | Cukup; tanpa pembaruan optimistis |
| Bagikan | "Tautan disalin" 2 detik | Salah saat sheet dibatalkan; senyap saat clipboard gagal (P2-6) |
| Masuk/Daftar | Alert galat, tombol `disabled` | Tanpa label proses, tanpa galat per field (P1-2, P2-14) |
| Pengaturan | Alert "tersimpan" | Baik |
| Moderasi admin | Hanya galat | Tanpa sukses (P2-15) |
| Zoom di studio | Tidak ada selain gambar yang berubah di balik backdrop | P2-11 |

Aksi berisiko: hapus karya berkonfirmasi tetapi tidak menyebut kehilangan komentar (P1-6). Batalkan terbit tanpa konfirmasi, reversibel.

---

# 10. Temuan P0–P3

Format: halaman/komponen, kondisi saat ini, masalah bagi pengguna, bukti, dampak, rekomendasi, kompleksitas (S/M/L), risiko regresi.

## P0 — Critical UX

### P0-1. Studio dapat kehilangan goresan terakhir lewat navigasi header

- **Halaman:** `/create/[id]` — `PlaygroundForm`, `PublicShell`/`SiteHeader`.
- **Kondisi:** Header situs tetap terlihat (`fixed top-[66px]` pada studio menyisakan header di atas). `leave()` menyimpan dulu, tetapi hanya dipanggil tombol Kembali. Satu-satunya pelindung selain itu adalah `beforeunload`.
- **Masalah:** Mengetuk logo (di ponsel) atau Jelajah/Buat/Profil (di desktop) adalah navigasi klien Next.js. `beforeunload` tidak terpicu pada navigasi klien. Cleanup efek hanya `window.clearTimeout(timerRef.current)` dan tidak memicu simpan. Goresan dalam jendela autosave 1,2 detik, atau goresan yang menunggu karena simpan gagal/offline, hilang tanpa peringatan.
- **Bukti:** `PlaygroundForm.tsx`: efek `useEffect` dengan `beforeunload` dan cleanup `clearTimeout`; `AUTOSAVE_MS = 1200`; `leave()` dipasang hanya pada tombol Kembali. `PublicShell.tsx` selalu memasang `SiteHeader`.
- **Dampak:** Kehilangan karya, terburuk saat offline atau saat simpan sedang gagal, ketika pengguna paling mungkin menekan navigasi lain.
- **Rekomendasi:** Pilih salah satu, diurutkan menurut risiko:
  1. Dalam studio, tampilkan header situs tanpa tautan navigasi, atau arahkan semua tautan header lewat penjaga yang memanggil jalur simpan `leave()` (menyimpan dulu, lalu pindah). Tidak ada perubahan pada mekanisme editor.
  2. Tambah flush simpan pada `pagehide`/`visibilitychange` sebagai lapisan kedua. Server action tidak bisa memakai `sendBeacon`, jadi ini tidak menggantikan (1).
  Jangan mengubah `persist()`, antrean `flightRef`, atau ekspor sumber/PNG.
- **Kompleksitas:** S–M. **Risiko regresi:** Sedang (menyentuh `PlaygroundForm` dan header bersama). Tes `back-navigation` harus diperluas.

## P1 — High Impact

### P1-1. Tidak ada pemulihan kata sandi

- **Halaman:** Login. **Kondisi:** tidak ada alur "lupa kata sandi" di `app/`, `components/`, `features/`, atau `lib/`. **Masalah:** pengguna yang lupa kata sandi kehilangan akses ke akun dan seluruh karyanya. **Bukti:** pencarian `forgot|reset|lupa` tanpa hasil. **Dampak:** menghalangi tujuan utama bagi pengguna yang kembali. **Rekomendasi:** halaman permintaan reset + halaman set kata sandi baru di atas Supabase Auth bawaan (`resetPasswordForEmail`). Tidak mengubah skema atau arsitektur auth, tetapi **menambah alur baru dan konfigurasi email Supabase**; butuh persetujuan. **Kompleksitas:** M. **Risiko:** Rendah–sedang (rute baru, callback harus menghormati `next`).

### P1-2. Kegagalan masuk generik, dan konfirmasi email buntu

- **Halaman:** Login, Register. **Kondisi:** `loginAction` memetakan semua galat ke `generic_auth`. Setelah daftar yang butuh email, form diganti Alert tanpa tindakan. **Masalah:** pengguna yang belum mengonfirmasi email melihat "Email atau kata sandi tidak bisa dipakai" dan menyimpulkan kata sandinya salah. Pengguna yang salah ketik email tidak punya jalan kembali. **Bukti:** `features/auth/actions.ts` (`generic_auth`), `RegisterForm.tsx` (cabang `needsEmail`), `registerEmailSent`. **Dampak:** pengguna baru berhenti di langkah paling awal. **Rekomendasi:** (a) bedakan "belum dikonfirmasi" dari kata sandi salah pada Login (dengan tetap tidak membocorkan apakah email terdaftar, mis. hanya setelah kredensial benar); (b) layar sesudah daftar menampilkan alamat yang dipakai, tombol kirim ulang, dan tautan Masuk; (c) pertahankan teks anti-enumerasi. **Kompleksitas:** M. **Risiko:** Rendah.

### P1-3. Tamu di ponsel tidak melihat Gabung/Masuk

- **Halaman:** header global di ponsel. **Kondisi:** tombol Gabung dan Masuk ada di dalam `hidden items-center gap-1 md:flex`. **Masalah:** pengunjung ponsel di `/explore` atau detail tidak melihat cara bergabung. Mereka harus menebak bahwa Buat atau Profil menuju Masuk, lalu menemukan tautan ke Daftar di sana. **Bukti:** `SiteNav.tsx` dan `AppTabBar` (Buat dan Profil untuk tamu = `loginHref`). Detail karya menampilkan tautan Masuk di komentar, jadi satu titik masuk tersedia di sana. **Dampak:** menghambat konversi pengunjung ke anggota. **Rekomendasi:** satu tindakan Gabung/Masuk terlihat di header ponsel untuk tamu, tanpa tab keempat. **Kompleksitas:** S. **Risiko:** Rendah (perlu dicek visual pada 390px agar header tidak sesak).

### P1-4. Studio: tidak ada jalan keluar saat simpan gagal

- **Halaman:** `/create/[id]`. **Kondisi:** `leave()` kembali tanpa tindakan jika simpan gagal atau offline (`if (!result || "error" in result ...) { setLeaving(false); return }`). **Masalah:** pengguna melihat alert galat tetapi Kembali tidak melakukan apa-apa, dan tidak ada pilihan "keluar tanpa menyimpan" atau "coba lagi". **Bukti:** `PlaygroundForm.leave`. **Dampak:** pengguna terjebak; satu-satunya jalan keluar adalah menutup tab atau memakai header (P0-1) yang membuang perubahan. **Rekomendasi:** saat simpan gagal, tawarkan dua tombol: Coba lagi dan Keluar tanpa menyimpan, dengan peringatan jelas. **Kompleksitas:** S–M. **Risiko:** Sedang (menyentuh alur Kembali yang baru diperbaiki). Perbarui tes `back-navigation`, jangan hapus perilaku simpan-dulu.

### P1-5. Kromat studio ponsel: safe area, target sentuh, ruang kanvas

- **Halaman:** `/create/[id]`, tab bawah. **Kondisi:** `viewportFit: "cover"` aktif, tidak ada `env(safe-area-inset-*)` di mana pun. Terbit dan Pratinjau adalah `Button size="sm"` (`min-h-9` = 36px). Header situs 66px + header studio + toolbar dua baris. **Masalah:** toolbar dan tab dapat tertutup indikator home; aksi utama studio di bawah 44px; kanvas mendapat sisa ruang (perkiraan ≈ 400px, perlu dicek visual). **Bukti:** `app/[lang]/layout.tsx`, `Button.tsx`, `PlaygroundForm.tsx`, `globals.css` (`.app-tabbar` tanpa padding bawah). **Dampak:** salah tekan, kanvas sempit, kontrol tertutup. **Rekomendasi:** padding safe area pada toolbar studio dan tab bawah; Terbit/Pratinjau 44px; pertimbangkan menyembunyikan header situs di studio ponsel (bersamaan dengan P0-1 opsi 1). **Kompleksitas:** M. **Risiko:** Sedang. Ubahan `Button sm` bersifat global; lihat R3.

### P1-6. Hapus karya tidak menyebut apa yang ikut hilang

- **Halaman:** `/dashboard`, studio. **Kondisi:** dialog hanya "Hapus karya ini? Tindakan ini tidak bisa dibatalkan." Tidak menyebut judul. Tombol Hapus ghost berdampingan dengan tindakan utama di baris. **Masalah:** pengguna dengan banyak draf tidak tahu karya mana yang akan dihapus. Karya terbit yang dihapus juga menghapus komentar dan apresiasi orang lain, dan dialog tidak menyebutnya. **Bukti:** `WorksDeleteButton.tsx`, `createDeleteConfirm`; migrasi `20261116050000_community.sql`: `creation_id uuid not null references public.creations (id) on delete cascade`. **Dampak:** kehilangan permanen yang tidak disadari, termasuk kontribusi orang lain. **Rekomendasi:** sebut judul (atau "Belum dinamai") di dialog; untuk karya terbit, tambahkan satu kalimat tentang komentar dan apresiasi; pertimbangkan menyarankan "Batalkan terbit" sebagai alternatif. Hanya copy dan dialog, tanpa perubahan aksi atau skema. **Kompleksitas:** S. **Risiko:** Rendah.

### P1-7. Dialog dan keadaan tidak diketahui pada studio saat simpan terbit gagal

Digabung ke P1-4. (Tidak ada temuan terpisah.)

### P1-8. Filter Jelajah memakai ukuran kanvas, dan ada pencarian teks

- **Halaman:** `/explore`. **Kondisi:** `CREATION_CATEGORIES` = `icon, small, sprite, medium, large, poster, custom`. Ada formulir pencarian `q` (`ilike` pada judul). **Masalah (a):** ukuran kanvas adalah atribut teknis. Filter tujuh tombol mengisi baris pertama di ponsel. **Masalah (b, historis):** batasan produk melarang "Search system baru" sementara pencarian judul sudah ada di kode. **Bukti:** `lib/site.ts`, `ExploreGallery.tsx`, `lib/creations.ts` (`ilikeContains`). **Keputusan (17 Nov 2026):** pencarian judul **tetap** (bukan search global baru). Label ukuran **dihapus dari kartu** (M4 metadata). Lipat filter ukuran di mobile = M7. Rincian: `ARTWORK-METADATA-EXPLORE-AUDIT.md`. **Kompleksitas:** S. **Risiko:** Rendah.

## P2 — Quality Improvement

| ID | Halaman/komponen | Kondisi dan masalah | Bukti | Rekomendasi | Kompl. | Risiko |
|---|---|---|---|---|---|---|
| P2-1 | Tombol global | Putih di atas grass 3,02:1 dan di atas brick 3,79:1; teks kecil gagal AA. Apresiasi memakai grass. | `Button.tsx` varian `primary`/`secondary` | Lihat bagian 6 dan R5. Putuskan bersama sebelum mengubah token. | M | Sedang (global) |
| P2-2 | Header + tab bawah | Dua landmark `nav` dengan nama sama. | `SiteHeader.tsx`, `AppTabBar` | Beri nama berbeda ("Utama" dan "Navigasi bawah"). | S | Rendah |
| P2-3 | Studio | Status simpan satu baris 12px, tanpa `aria-live`. | `PlaygroundForm` baris status | Pisahkan status simpan dari ukuran, `role="status"` dengan `aria-live="polite"`. | S | Rendah |
| P2-4 | Filter Jelajah | `role="toolbar"` pada tautan. | `ExploreFilters` | Ganti dengan `nav` + daftar. | S | Rendah |
| P2-5 | Menu Akun | Tanpa `aria-haspopup`; fokus tidak kembali ke pemicu. | `SiteNav.tsx` | Kembalikan fokus saat Escape. | S | Rendah |
| P2-6 | Bagikan | Menyalin tautan saat sheet dibatalkan; senyap saat clipboard gagal. | `ShareButton` | Bedakan `AbortError` dari kegagalan; tampilkan galat bila salin gagal. | S | Rendah |
| P2-7 | Profil sendiri | Empty state tanpa tindakan untuk pemilik. | `PublicProfilePage` / `ProfileWorks` | Tambah CTA Buat untuk pemilik. | S | Rendah |
| P2-8 | Studio, judul | (a) Dialog nama: fokus awal ke tombol Tutup; Enter tidak mengirim. (b) "Untitled"/"Tanpa judul" ditolak sebagai nama sah dengan galat "Isi nama karya". (c) Penanda `U+2060` tersimpan di database. | `PlaygroundForm` (dialog nama), `lib/creations.ts` (`LEGACY_UNNAMED_TITLES`, `DRAFT_UNNAMED_TITLE`) | Bungkus dialog dengan `<form>` dan fokus ke kolom; ubah galat agar menjelaskan; biarkan (c) (lihat bagian 13). | S | Rendah |
| P2-9 | Pemilih ukuran | Tombol Mulai jauh di bawah di ponsel; ukuran kustom tidak valid tanpa pesan. | `StudioNewForm.tsx` (`disabled={pending \|\| !sizeOk}`) | Tombol Mulai menempel di dasar atau ringkasan pilihan di atas; pakai `Input.error` untuk rentang. | S | Rendah |
| P2-10 | Pengaturan | Kolom Peran terlihat oleh semua anggota; ganti username memutus tautan `/u/…` tanpa peringatan. | `SettingsForm.tsx` | Sembunyikan Peran untuk non-admin; tambah satu kalimat petunjuk pada username. | S | Rendah |
| P2-11 | Studio, Lainnya | Zoom/Pas di dalam dialog modal yang tidak menutup; pengguna zoom sambil tertutup backdrop. | `PlaygroundForm` dialog Lainnya | Pindahkan Pas/Zoom ke toolbar (desktop) atau tutup setelah aksi. | S–M | Sedang |
| P2-12 | Beranda | Galeri kosong/gagal → `null`, halaman jadi teks dan dua kartu. | `LandingWorks` | Tampilkan empty state singkat atau CTA Buat. | S | Rendah |
| P2-13 | Jelajah, kartu | Judul dan `@username` dalam satu baris terpotong; paginasi tanpa posisi; satu kolom di ponsel; landmark paginasi bernama sama dengan judul halaman. | `CreationCard.tsx`, `ExploreGallery.tsx` | Judul dan username dua baris; tampilkan "Halaman X dari Y"; evaluasi dua kolom di ponsel (perlu dicek visual). | S | Rendah |
| P2-14 | Auth | Galat hanya di atas form; `Input.error` tidak dipakai; label proses tidak berubah; petunjuk username huruf kecil vs `pattern` yang menerima huruf besar. | `LoginForm`, `RegisterForm`, `Input.tsx` | Galat per field untuk validasi lokal; label "Memproses…". Samakan petunjuk dan pola. | S–M | Rendah |
| P2-15 | Admin | Status mentah Inggris; tanpa sukses; tautan filter 36px. | `AdminReports.tsx` | Pakai `adminPending/Reviewed/Resolved`; beri umpan balik; target 44px. | S | Rendah |
| P2-16 | Fokus global | Cincin fokus sky di atas paper 2,10:1. | `globals.css` `:focus-visible` | Cincin ink atau ganda. Bagian dari R5. | S | Sedang (global) |

## P3 — Future Consideration

- **P3-1.** Wording Ruang Bersama di beranda ("nanti") tidak cocok dengan `/space` yang interaktif. Selaraskan teks, bukan fitur.
- **P3-2.** Kontrol keyboard untuk kanvas. Perubahan editor besar. Tidak sekarang.
- **P3-3.** Urutan, pencarian, atau penanda posisi di My Works untuk puluhan karya (batas 100 per anggota).
- **P3-4.** Layout tablet 768px (tab bawah vs bilah atas).
- **P3-5.** ~~Pencarian di Jelajah~~ — ditutup: pencarian judul disetujui tetap (17 Nov 2026). Perluasan ke search global tetap di luar cakupan.

---

# 11. Rekomendasi Perbaikan

Disusun menurut dampak pengguna per usaha. Semua memakai komponen yang sudah ada, `PixelIcon`, sistem `copy` dua bahasa, dan identitas piksel yang ada.

1. **Lindungi pekerjaan di studio** (P0-1, P1-4). Penjaga navigasi + jalan keluar saat simpan gagal.
2. **Selesaikan perjalanan auth** (P1-2, P1-3, P2-14). Pesan yang membedakan, layar sesudah daftar yang bisa ditindaklanjuti, CTA Gabung/Masuk di header ponsel.
3. **Pemulihan kata sandi** (P1-1). Perlu persetujuan; menyentuh konfigurasi email Supabase.
4. **Hapus dengan informasi cukup** (P1-6). Copy dan dialog.
5. **Tata ulang kromat ponsel** (P1-5, P2-9, P2-11).
6. **Aksesibilitas bersama** (P2-1, P2-2, P2-3, P2-4, P2-5, P2-16): token kontras dan cincin fokus, landmark, live region.
7. **Keputusan Jelajah** (P1-8, P2-13).
8. **Kerapian kecil** (P2-6, P2-7, P2-8, P2-10, P2-12, P2-15).

---

# 12. Komponen yang perlu dipertahankan

- `PixelIcon` dan sistem ikon.
- `Dialog` berbasis `<dialog>` native (fokus dan Escape gratis).
- `Alert`, `Input` (sudah punya `error`/`hint`/`aria-describedby`), `EmptyState`, `Button`, `Card`.
- `PixelBoard` dan seluruh mekanisme editor: RLE, ekspor PNG, `touch-action: none`, pinch, antrean simpan.
- `CreationCard`, `CreationBody`, `PixelArt`, `GallerySkeleton`.
- `CreationCommunity` dan semua aturan percakapan (apresiasi satu jenis, balasan satu tingkat, komposer tertutup, laporkan, fork).
- `safeInternalPath`, `authDestination`, `loginHref`, `registerHref`.
- `displayTitle`/`isUnnamedTitle`/`titleForStorage` dan gerbang terbit ganda (klien dan server).
- Pola "Kembali menyimpan dulu" di studio dan Pengaturan.
- `lib/copy.ts` sebagai sumber dua bahasa.

---

# 13. Potensi technical debt

- **Penanda `U+2060` sebagai judul draf.** Disimpan di kolom `title` demi batas skema 1–80 karakter. Berfungsi, tetapi tampil kosong di mana pun `displayTitle` tidak dipakai (laporan admin, ekspor, `ilike` pada pencarian). Jangan diubah sekarang (butuh perubahan skema atau migrasi data yang berada di luar peta). Periksa semua tempat yang menampilkan `title` mentah.
- **`lucide-react` di `package.json`**, dipakai hanya di `SpaceBoard.tsx` (`PenLine`). Bertentangan dengan aturan "gunakan `PixelIcon`, jangan tambah library ikon". Sudah ada sebelum audit ini; hapus bersama keputusan nasib `/space`, bukan sekarang.
- **`PlaygroundForm.tsx` (586 baris)** memuat persist, antrean, autosave, dialog, dan toolbar dalam satu komponen dengan banyak ref. Jangan dipecah di tahap UX ini. Setiap perubahan P0-1 dan P1-4 menyentuhnya; tulis tes sebelum mengubah.
- **Dua studio.** `StudioForm` (jenis lama) masih ada. Tidak dihapus tanpa persetujuan.
- **`x-pathname` header** diset di middleware dan dibaca layout anggota untuk `next`. Cukup, tetapi pathname tanpa query; tidak berdampak untuk rute anggota saat ini.
- **Dokumen yang menyimpang** (bagian 2.2).
- **`instant = false`** pada hampir semua halaman. Tidak dinilai di sini.

---

# 14. Hal yang tidak perlu diubah

- Identitas Classic Pixel Adventure: token warna, border 3px, bayangan blok, Press Start 2P + DM Sans.
- Tiga tab bawah dan navigasi desktop. Jangan tambah tab keempat atau sidebar.
- Beranda tetap bisa dibuka siapa saja dan tidak dipaksa pindah.
- Kartu Jelajah tanpa hitungan apresiasi.
- Apresiasi satu jenis, percakapan satu tingkat, komposer tertutup.
- Skema, RLS, storage, RLE, PNG, arsitektur auth, deep link.
- `/space` apa adanya, tanpa perluasan.
- Dialog "sudah terbit" dan dialog nama.
- Konfirmasi hapus komentar inline.
- Teks anti-enumerasi pada pendaftaran (tambahkan langkah berikutnya, jangan menghapus kekaburannya).

---

# 15. Proposed Implementation Roadmap

Disusun menurut dependensi dan dampak. Tidak dimulai sebelum persetujuan.

| Irisan | Prioritas | Isi | Bergantung pada | Kompleksitas |
|---|---|---|---|---|
| **R1. Pelindung studio** | P0 | P0-1 penjaga navigasi header di studio; P1-4 Coba lagi / Keluar tanpa menyimpan. Perluas tes `back-navigation`. | — | S–M |
| **R2. Auth** | P1 | P1-2 pesan dan layar sesudah daftar; P1-3 CTA ponsel; P2-14 galat per field dan label proses. | — (paralel dengan R1; file hampir tidak bertumpuk) | M |
| **R3. Kromat ponsel dan sentuhan** | P1 | P1-5 safe area, Terbit/Pratinjau 44px, evaluasi header di studio; P2-9; P2-11. | R1 (keduanya menyentuh `PlaygroundForm`/header). Kerjakan R1 dulu. | M |
| **R4. Hapus dan dialog** | P1/P2 | P1-6 dialog hapus; P2-8 dialog nama (form, fokus, galat). | — | S |
| **R5. Kontras dan fokus** | P2 | P2-1, P2-16. Token teks dan cincin fokus. **Butuh keputusan Anda** karena menyentuh palet merek dan semua halaman. | R3 (hindari dua perubahan tombol bersamaan) | M |
| **R6. Jelajah** | P1/P2 | Keputusan P1-8; P2-13. Perluasan caption/hashtag/palette → `ARTWORK-METADATA-EXPLORE-AUDIT.md` (M1–M7), bukan bagian R6 kecuali disetujui. | Keputusan produk | S–M |
| **R7. Sinkronisasi dokumen dan kerapian** | P2 | Perbarui status roadmap; P2-2, P2-3, P2-4, P2-5, P2-6, P2-7, P2-10, P2-12, P2-15. | — | S |
| **R8. Pemulihan kata sandi** | P1 | P1-1. **Butuh persetujuan khusus** dan cek konfigurasi email Supabase. | R2 | M |

## Risiko terhadap fitur yang sudah berjalan

| Perubahan | Risiko | Cara menahan |
|---|---|---|
| R1 (penjaga navigasi studio) | Mengubah alur Kembali yang baru diperbaiki; header bersama dipakai semua halaman. | Penjaga hanya aktif di studio. Pertahankan "simpan dulu". Tes yang ada harus tetap lulus. |
| R3 (`Button sm` jadi 44px) | Mengubah tampilan banyak halaman sekaligus. | Terapkan 44px hanya pada konteks sentuh studio lebih dulu; ukuran global di R5 setelah pengecekan visual. |
| R5 (token warna) | Menggeser identitas visual. | Pertahankan token merek untuk bidang dan border; hanya teks kecil yang berubah. Tunjukkan pratinjau sebelum menerapkan. |
| R8 (reset kata sandi) | Rute dan callback auth baru. | `safeInternalPath` pada semua `next`; jangan ubah arsitektur sesi. |
| P1-2 (pesan masuk lebih spesifik) | Membocorkan apakah email terdaftar. | Bedakan hanya setelah kredensial benar. |

## Cek yang tetap di luar kode

Jalankan setelah R1 dan R2: satu lulusan lengkap di perangkat nyata (ponsel 390px dan desktop): daftar (dengan dan tanpa konfirmasi email) → buat → gambar → coba navigasi lewat header → kembali → lihat draf → nama → terbit → buka detail → hapus. Selama sesi, matikan jaringan sekali dan pastikan jalan keluar P1-4 bekerja.