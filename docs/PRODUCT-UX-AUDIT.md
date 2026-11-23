# THE COMMONS — Product UX Audit

> **Document purpose:** Point-in-time product UX audit from 16 Nov 2026.
> **Status:** HISTORICAL SNAPSHOT — NOT CURRENT FEATURE STATUS.
> **Updated:** 2026-11-24 (marker added).
> **Implementation evidence:** VERIFIED IN CODE — explicit save with browser-local recovery (`components/creations/PlaygroundForm.tsx:431`); autosave wording in the checklist below is historical. Current inventory: `docs/studio/01_SYSTEM_AUDIT.md`.
> **Completed:** Original audit report recorded; later B2–B7 work changed the workflows it describes.
> **Open:** Re-validate any issue against current code and browser before acting; production QA is an operator task.
> **Dependencies:** `PRODUCT-SPEC.md`, `IMPLEMENTATION-PLAN.md`, `docs/studio/01_SYSTEM_AUDIT.md`.
> **Next action:** Read-only archive; do not treat the checklist as current acceptance criteria.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION.

**Dokumen:** PRODUCT-UX-AUDIT.md  
**Tanggal:** 16 Nov 2026  
**Sifat:** Audit dan usulan. Tidak mengubah aplikasi, skema, atau spesifikasi Artwork Conversation.  
**Dasar:** kode di repository, bukan hanya dokumen fase.

Dokumen terkait yang tidak ditimpa: `PRODUCT-SPEC.md`, `TECHNICAL-SPEC.md`, `IMPLEMENTATION-PLAN.md`, `PIXEL-ART-DESIGN-SYSTEM.md`.

---

## 1. Ringkasan kondisi produk

THE COMMONS sudah punya loop komunitas yang benar di kode: buat pixel art, simpan draf, terbit, temukan di Jelajah, buka detail, apresiasi, dan bercakap. Identitas visual Classic Pixel Adventure dipakai bersama. Navigasi publik sudah menjadi bilah atas (desktop) dan tiga tab bawah (ponsel): Jelajah, Buat, Profil.

Yang belum utuh adalah cara manusia *memakai* loop itu:

- **Discover** sudah visual. Kartu memimpin dengan gambar.
- **Create** dan **kelola karya** masih satu halaman. Tombol Buat membuka daftar, bukan studio.
- **Showcase** publik hanya menampilkan karya terbit. Draf tidak punya rumah sendiri.
- **Connect** ada di detail karya, tetapi masuk akun selalu membuang pengguna ke Jelajah, bukan kembali ke karya yang sedang dilihat.

Produk ini belum terasa seperti satu platform sosial visual. Ia terasa seperti galeri yang benar, ditambah studio yang kuat, dengan pengelolaan karya yang masih menumpang.

## 2. Status fase: dokumen versus kode

`IMPLEMENTATION-PLAN.md` menyatakan B0–B5 dan B7 ada di repository, B6 tidak dimulai dan bukan syarat luncur. Itu sesuai untuk Playground, Jelajah, percakapan, dan peniadaan Common Space dari navigasi utama.

Perbedaan yang harus dicatat:

| Klaim dokumen | Yang ada di kode |
|---|---|
| Bagian 2 masih menulis prototipe pixel “local only; in-memory”. | Playground di `/create/[id]` menyimpan source RLE dan PNG lewat `updatePixelCreationAction`. Header dokumen sudah benar; tabel bagian 2 ketinggalan. |
| B1–B3 “awaiting audit before the next phase”, sekaligus “implemented”. | Fitur ada di kode. Kalimat status per fase saling bertentangan. |
| B5: `/space` adalah halaman nanti; PixelBoard tidak dipasang; SpaceBoard “archived in place”. | PixelBoard memang tidak dipasang. `app/[lang]/(public)/space/page.tsx` tetap memasang `SpaceBoard` yang bisa dipakai, di bawah catatan arsip. Ini bukan halaman baca-saja. |
| B7 lulus di build dan permukaan publik. | Dokumen sendiri masih mensyaratkan migrasi di proyek Supabase dan uji Playground dalam keadaan masuk. Audit ini tidak menganggap persistensi live sudah terbukti. |
| PRODUCT-SPEC: pengunjung boleh melihat Common Space. | Beranda menyebut Ruang Bersama “nanti” dan bukan navigasi utama. Rute `/space` tetap hidup. |

B4 (Artwork Conversation) ada di kode: apresiasi terpisah dari komentar, balasan satu tingkat, komposer yang tidak selalu terbuka, laporkan, dan fork raster untuk bukan-pemilik. Audit ini tidak mengubah spesifikasi itu.

## 3. Apa yang sudah berjalan

- Rute publik: `/`, `/explore`, `/creation/[id]`, `/u/[username]`, `/space`, `/login`, `/register`.
- Rute anggota: `/create`, `/create/[id]`, `/settings`, `/dashboard`. Admin: `/admin`.
- Bahasa ID (tanpa prefiks) dan EN (`/en`).
- Setelah masuk dan daftar, tujuan adalah `/explore`. `/` tidak dipaksa pindah. `/dashboard` tidak lagi jadi rumah, tetapi rutanya hidup.
- Jelajah: urutan `published_at` terbaru, filter jenis, bawaan Pixel, paginasi, kerangka muat, gagal-muat yang bisa diulang. Kartu: gambar, satu baris judul dan `@username`. Tidak ada hitungan apresiasi di kartu.
- Detail: karya, kreator, tombol pemilik “Sunting karya ini”, apresiasi, bagikan, percakapan.
- Playground: ukuran kanvas, alat, palet, undo, pratinjau, autosave, kembali yang menyimpan dulu, lepas-terbit, hapus dengan konfirmasi, peringatan offline.
- Profil publik: nama, `@username`, bio, grid karya terbit. Pemilik melihat Pengaturan dan keluar.
- Footer satu baris hak cipta. Studio menyembunyikan footer dan tab bawah.

## 4. Temuan dan dampak

### P0 — menghalangi loop utama

**P0-1. Buat adalah daftar dan pintu studio sekaligus.**  
`/create` menaruh “Karyamu” di atas dan pemilih ukuran di bawah. Tab serta tautan bernama Buat. Pengguna yang ingin menggambar mendarat di daftar. Pengguna yang ingin mengelola draf harus tahu bahwa tempatnya adalah tombol yang bernama Buat. Profil hanya menampilkan karya terbit, jadi draf tidak kelihatan dari etalase.

Dampak: kreator tidak punya satu tempat yang artinya “karya saya”. Mulai karya baru terasa seperti langkah kedua di halaman administrasi.

**P0-2. Karya lahir tanpa identitas, lalu mudah terbit begitu.**  
`StudioNewForm` mengirim judul tersembunyi `Tanpa judul` / `Untitled`, lalu langsung membuka Playground. Bidang judul di studio adalah input tanpa batas dan tanpa label yang terlihat. Jika dikosongkan, simpan mengisi lagi “Tanpa judul”. Terbit tidak menolak judul kosong.

Dampak: galeri dan profil dipenuhi “Tanpa judul”. Pengguna tidak bisa membedakan karyanya sendiri. Showcase gagal sebelum percakapan dimulai.

**P0-3. Masuk akun memutus halaman yang sedang dilihat.**  
Layout anggota mengarahkan tamu ke `/login` tanpa `next`. Tautan “Masuk” di percakapan juga langsung ke `/login`. `loginAction` dan `registerAction` selalu ke `/explore`. Callback email mendaftarkan `next` ke Jelajah, meskipun callback sebenarnya bisa menghormati `next` yang diawali `/`.

Dampak: tamu yang ingin mengapresiasi atau membalas kehilangan karya itu. Connect terputus di saat niatnya paling jelas.

### P1 — mengurangi kenyamanan secara berarti

**P1-1. Detail karya masih teks dulu, gambar kemudian.**  
Urutan di `creation/[id]/page.tsx`: kicker jenis, judul pixel besar, kreator, baru `CreationBody`. Apresiasi dan bagikan ada di `CreationCommunity`, dengan `mt-16` di bawah karya. Hierarki visual-first yang diinginkan (karya, kreator, apresiasi, percakapan) belum terjadi. Perilaku B4 sendiri sudah benar dan tidak boleh diubah.

**P1-2. Draf dan terbit sulit dibedakan, dan terbit tidak punya penutup.**  
Lencana status ada, tetapi kecil: satu baris muted di daftar dan di bawah judul studio. Setelah terbit, pengguna tetap di kanvas. Tautan “lihat karya publik” ada di menu Lainnya, bersama zoom dan hapus. Tidak ada momen “karya ini sekarang di galeri”.

**P1-3. Akun di ponsel tidak setara dengan desktop.**  
Menu Akun (`Pengaturan`, admin, keluar) adalah `hidden md:block`. Di ponsel, Pengaturan dan keluar hanya ada di profil sendiri. Tidak ada jalan ke pengelolaan draf dari profil. Pengguna ponsel yang sedang di Jelajah harus menebak bahwa Profil adalah pintu akun.

**P1-4. `/dashboard` adalah sapaan yatim.**  
Halaman ini menyapa nama dan memberi pintasan. Tidak ada di navigasi. Isi tidak menunjukkan karya. Siapa pun yang masih punya tautan lama mendapat halaman yang bukan rumah dan bukan pengelola karya.

**P1-5. Jenis lama selalu setara dengan Pixel di Jelajah.**  
Filter Tulisan, Visual, Ide, Cerita, dan Semua selalu terbuka. Create baru hanya membuat pixel. Jenis lama tetap perlu bisa ditemukan, tetapi mereka mengambil baris pertama galeri di ponsel dan menyaingi karya yang menjadi produk.

### P2 — penyempurnaan

- Tab bawah memakai teks tanpa ikon. Itu jelas, tetapi belum memanfaatkan ikon pixel yang sudah ada untuk pengenalan cepat.
- Dua landmark `nav` sama-sama bernama “Utama” (header dan tab).
- Halaman `/create` memakai `data-chrome="studio"` sehingga footer hilang, padahal ini daftar, bukan kanvas. Tab bawah tetap ada.
- Swatch warna studio `h-9 w-9` (36px), di bawah target sentuh 44px. Alat utama sudah 44px.
- Tidak ada tooltip, toast, atau dropdown bersama. Umpan balik sukses bersifat lokal (status simpan, “tautan disalin”, alert pengaturan).
- Beranda anggota sama dengan beranda tamu, ditambah tombol Buat. Itu boleh. Dua kartu penjelasan masih berbicara seperti brosur di bawah karya.
- Tablet ≥768px langsung memakai navigasi desktop. Tidak ada layout antara.
- Studio jenis lama (`StudioForm`) masih ada untuk karya text/visual/idea/story. Bukan jalur buat-baru.

### P3 — jangan dikerjakan sekarang

- Pencarian, notifikasi, aktivitas, dan urutan popularitas.
- Pengikut. Bertentangan dengan prinsip kontribusi-bukan-popularitas di PRODUCT-SPEC.
- B6 Common Space raksasa.
- Menyalin Threads, Pinterest, atau editor profesional.

## 5. Empat pengalaman, dinilai dari kode

| Pengalaman | Kondisi | Yang menghalangi |
|---|---|---|
| Discover | Jelajah dan kartu sudah visual. Beranda menampilkan sampai 6 karya pixel. | Filter jenis lama dan judul “Tanpa judul” menurunkan kualitas temuan. |
| Create | Playground lengkap setelah kanvas ada. | Pintu masuk mencampur daftar. Identitas karya tidak diminta. |
| Showcase | Profil publik dan detail ada. | Draf tidak punya rumah. Terbit tidak mengantar ke etalase. |
| Connect | Apresiasi, komentar, balasan satu tingkat, bagikan, laporkan, fork. | Masuk akun tidak kembali ke karya. |

## 6. Prioritas perbaikan

Urutan mengikuti dampak, bukan kemudahan:

1. Pisahkan mulai-karya-baru dari mengelola karya, memakai rute yang sudah ada.
2. Jangan menyimpan “Tanpa judul” sebagai judul sungguhan. Minta judul sebelum terbit.
3. Kembalikan pengguna ke halaman yang mereka tinggalkan setelah masuk atau daftar.
4. Rapikan hierarki detail tanpa mengubah aturan percakapan.
5. Perjelas draf, terbit, dan jalan “lihat di galeri”.
6. Baru kemudian ikon, filter, dan kerapian chrome.

Tidak ada temuan P0 yang membutuhkan perubahan skema, storage, RLS, format RLE, atau spesifikasi B4.
