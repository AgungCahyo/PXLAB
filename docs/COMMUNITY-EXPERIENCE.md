# THE COMMONS — Audit Pengalaman Komunitas dan Create

Repo: github.com/AgungCahyo/PXLAB · Tanggal: 17 November 2026

**Sifat dokumen:** audit dan blueprint saja. Tidak ada perubahan pada kode, database, maupun fitur. Menunggu persetujuan sebelum implementasi.

**Metode dan batasan:** hasil membaca kode (`CreationCard`, halaman profil, Detail, `CreationCommunity`, Explore, Dashboard, `PlaygroundForm`, `StudioNewForm`, `StudioForm`, `forkCreationAction`, migrasi Supabase, dan dokumen spec). Aplikasi tidak dijalankan, sehingga perilaku visual perlu dicek langsung.

---

## 1. Ringkasan

- THE COMMONS sudah kuat sebagai alat menggambar dan galeri, tetapi **belum punya jalur antarkreator**. Kartu tidak menuju profil, Detail tidak menawarkan kelanjutan, dan kreator tidak tahu ada yang merespons karyanya.
- Alur Create berhenti di "karya terbit", padahal di situlah komunitas seharusnya mulai.
- **Konflik dengan spec:** `PRODUCT-SPEC.md` dan `INFORMATION-ARCHITECTURE.md` secara eksplisit mengecualikan pengikut, feed, dan notifikasi dari MVP (prinsip "Contribution over popularity"). Follow dan Following Feed berarti mengubah spec. Karena itu keduanya dirancang tanpa angka pengikut publik, tanpa ranking, dan tanpa feed algoritmik.

**Prinsip desain:** aktivitas hanya muncul di tiga tempat, tanpa ticker global:

1. **Pada karya** (percakapan dan remix).
2. **Pada kreator** (profil: aktif sejak kapan, karya terbaru).
3. **Pribadi** (kotak "Respon untuk karyamu").

---

## 2. Audit pengalaman komunitas

### 2.1 Menemukan dan mengenal kreator lain

- Explore hanya diurutkan `published_at` terbaru, dengan filter ukuran dan pencarian judul. Tidak ada pencarian kreator dan tidak ada jalur "kreator baru".
- Profil hanya berisi avatar, nama, bio, dan grid karya (maks. 100). Tidak ada jumlah karya, tanggal bergabung, atau penanda karya terbaru, sehingga pengunjung tidak bisa menilai apakah kreatornya aktif.
- Satu-satunya jalan ke profil adalah byline kecil di Detail dan nama komentator.

### 2.2 Creation Card

- Seluruh kartu adalah satu link ke karya. `@username` hanya teks di dalamnya, jadi **tidak ada jalan dari kartu ke profil kreator**.
- Data kartu tidak memuat `avatar_url`, sehingga wajah kreator tidak muncul di galeri.
- Kartu tidak menampilkan sinyal percakapan.

### 2.3 Halaman Detail

- Apresiasi dan Bagikan sudah solid (optimistic UI, rapi).
- Byline kreator berupa teks kecil tanpa avatar dan bio. Tidak ada "karya lain dari kreator ini" atau "karya serupa", sehingga setelah selesai melihat pengguna kembali ke Explore tanpa jalur lanjutan.
- Komposer komentar tertutup dengan prompt generik ("Tulis catatan…"). Tamu hanya melihat teks ajakan masuk.
- **Fork adalah interaksi paling berpusat pada karya, tetapi tersembunyi**: ghost button di dasar halaman, di bawah semua komentar. Silsilah hanya terlihat ke belakang ("Fork dari"); karya asli tidak tahu ia pernah di-fork.

### 2.4 Hubungan antarkreator

Tidak ada. Satu-satunya "hubungan" adalah komentar dan fork, dan keduanya satu arah serta tidak tercatat di mana pun untuk kreator aslinya.

### 2.5 Aktivitas komunitas

Tidak terlihat sama sekali. Ini aman terhadap risiko "terlalu ramai", tetapi ruangnya terlalu kosong.

### 2.6 Alasan kreator kembali

- Dashboard hanya berisi daftar draf dan karya terbit milik sendiri.
- **Tidak ada cara bagi kreator mengetahui ada komentar, balasan, apresiasi, atau fork** tanpa membuka karyanya satu per satu. Ini kebocoran terbesar pada loop kontribusi: kreator publish, tidak mendengar apa-apa, lalu berhenti.

---

## 3. Audit Create dan Studio

### 3.1 Peta alur saat ini

- **`/create`** (`StudioNewForm`, meski bernama "Studio") hanya membuat draf **pixel**: pilih preset ukuran atau ukuran kustom, lalu mulai.
- **`/create/[id]`** untuk karya pixel membuka `PlaygroundForm`, editor utama.
- **`StudioForm`** (teks, visual, ide, cerita) hanya bisa dicapai lewat `/create/[id]` untuk karya tipe lama. Tidak ada pintu masuk baru, jadi pada dasarnya itu sisa legacy.

### 3.2 Temuan

1. **Dialog setelah terbit terlalu pelit.** Isinya hanya "Sudah di Jelajah." dengan tombol "Lihat karya" dan "Lanjut edit". Tidak ada Bagikan, tidak ada gambaran apa yang terjadi berikutnya, dan tidak ada ajakan agar karya mendapat percakapan. Ini momen emosional terbaik kreator, dan terbuang.
2. **Caption dan hashtag tersembunyi di menu "Caption & hashtag"** dan tidak disinggung saat Terbitkan. Padahal caption adalah bahan percakapan di Detail. Hanya judul yang dipaksa (lewat dialog nama), jadi mayoritas karya akan terbit tanpa konteks.
3. **Fork berakhir di editor sendirian.** `forkCreationAction` menyalin karya lalu mengalihkan ke `/create/{id}`. Atribusi tersimpan di `forked_from`, tetapi kreator asli tidak pernah tahu karyanya di-remix.
4. **Halaman `/create` hampa onboarding.** Teksnya hanya "Pilih ukuran." Pengguna baru tidak melihat contoh karya komunitas, ukuran yang umum dipakai, atau titik awal, padahal bagian ini menentukan apakah mereka berani menerbitkan karya pertama.
5. **Legacy bocor ke profil.** Explore memfilter `type: "pixel"`, tetapi `listPublishedCreationsByUser` mengambil semua tipe. Karya teks/ide/cerita yang sudah terbit tampil di profil sebagai kartu dengan thumbnail kosong (`cover` hanya diisi untuk pixel).
6. **Penamaan membingungkan di kode:** `StudioNewForm` dan `StudioForm` sebenarnya adalah "buat pixel baru" dan "editor legacy".

---

## 4. Rekomendasi gabungan

Kolom **ID**: K = komunitas, C = Create. Item yang sama di dua audit digabung.

| ID | Perubahan | Manfaat UX | Kompleksitas | Perubahan DB |
|---|---|---|---|---|
| K1 | **Jalur kartu → kreator.** Avatar dan `@username` jadi tautan terpisah (pola stretched-link, bukan anchor bersarang). Tambah `avatar_url` ke query kartu. | Tinggi | Rendah | Tidak |
| K2 | **Blok kreator di Detail**: avatar, nama, bio satu baris, ditambah strip "Karya lain dari @x" (3–4 item). | Tinggi | Rendah | Tidak |
| K3 / C3 | **Remix terlihat dua arah.** Tombol Remix naik ke samping Apresiasi; "N remix" dan strip remix di karya asli; layar fork menampilkan "Remix dari @x". | Tinggi | Rendah–Sedang | Tidak (`forked_from` sudah ada) |
| K4 | **Profil lebih hidup**: jumlah karya, "bergabung sejak", sorotan karya terbaru. | Sedang | Rendah | Tidak |
| K5 | **Prompt komentar kontekstual** (misal merujuk palet atau ukuran karya); tamu melihat komposer yang mengarah ke login. | Sedang | Rendah | Tidak |
| K6 / C7 | **Kotak "Respon untuk karyamu"** di Dashboard: komentar, balasan, apresiasi, dan remix sejak kunjungan terakhir, plus titik kecil di navigasi. Tanpa email, push, atau realtime. | Sangat tinggi | Sedang | Ya: 1 kolom `activity_seen_at` di `profiles` |
| K7 | **Follow / Following** satu arah. Tombol di profil dan blok kreator. Jumlah pengikut tidak ditampilkan publik. | Sedang–Tinggi | Sedang | Ya: tabel `follows` (unik, tanpa self-follow, RLS) |
| K8 | **Following Feed** sebagai tab/filter di Explore (bukan halaman baru): hanya karya baru dari yang diikuti, kronologis, tanpa algoritma. Empty state menyarankan kreator. | Tinggi (butuh K7) | Sedang | Tidak (memakai K7) |
| K9 | **Rak "Belum ada percakapan"**: karya baru dengan 0 komentar. Mendorong kontribusi, bukan popularitas. | Sedang–Tinggi | Rendah–Sedang | Tidak |
| K10 | **Karya serupa** di Detail (kategori/tag sama) dan strip "Kreator baru" di Explore. | Sedang | Sedang | Tidak |
| K11 | **Indikator tenang di kartu**: hanya jumlah komentar (bila > 0), tanpa jumlah apresiasi, dan penanda "Baru" di tab Following. | Rendah–Sedang | Rendah | Tidak |
| C1 | **Dialog terbit yang lebih bermakna**: tombol Bagikan, satu kalimat "Karyamu sudah bisa dikomentari", dan ajakan menambah caption bila kosong. | Tinggi | Rendah | Tidak |
| C2 | **Nudge caption ringan saat Terbitkan** (opsional, bisa dilewati, tidak memblokir). | Sedang | Rendah | Tidak |
| C4 | **Onboarding `/create`**: tampilkan 3–4 karya komunitas per ukuran ("Karya 32×32 terbaru") sebagai inspirasi, dan tautan "Remix karya" bagi yang belum tahu mau menggambar apa. | Sedang–Tinggi | Sedang | Tidak |
| C5 | **Rapikan legacy**: sembunyikan karya non-pixel dari profil publik atau beri kartu yang layak, dan putuskan nasib `StudioForm` (pertahankan hanya untuk mengedit karya lama). | Sedang | Rendah | Tidak |
| C6 | **Ganti nama komponen** (`StudioNewForm` → `PixelNewForm`, dll.). | Rendah (internal) | Rendah | Tidak |

---

## 5. Urutan implementasi yang disarankan

- **Fase A, tanpa migrasi:** K1, K2, K3/C3, K4, K5, C1, C2, C5, C6. Hasil terbesar dengan risiko terkecil: memperbaiki alur menemukan kreator, membuat fork terlihat, dan memberi arti pada momen terbit.
- **Fase B, migrasi kecil:** K6/C7, lalu K9, lalu C4 (C4 memakai query yang sama dengan strip karya di Fase A). K6 menutup loop "publish, tidak ada respon, berhenti".
- **Fase C, perubahan spec:** K7, K8, lalu K10 dan K11. Layak setelah Fase A dan B terbukti membuat karya mendapat respons.

---

## 6. Sengaja tidak disarankan

Angka pengikut publik, sort "trending/populer", leaderboard, ticker aktivitas global, streak atau badge, notifikasi realtime/push/email, komentar bersarang lebih dari satu level, dan reaksi emoji tambahan. Semuanya menambah keramaian tanpa memperdalam interaksi pada karya.

---

## 7. Risiko yang perlu dijaga

- **Spam follow:** perlu rate limit seperti komentar (`COMMENT_PER_HOUR`).
- **Performa:** blok "karya lain", feed, dan inbox menambah query; hindari N+1 dengan satu query berbatas (limit kecil).
- **Moderasi:** inbox harus menyembunyikan komentar berstatus `hidden`.
- **Salinan:** semua teks baru perlu versi ID dan EN di `lib/copy.ts`.
- **Spec:** dokumen spec perlu direvisi sebelum Fase C, karena saat ini menyatakan pengikut dan notifikasi "out".

---

## 8. Persetujuan yang dibutuhkan

1. Fase mana yang boleh dikerjakan lebih dulu? Saran: **Fase A**, karena tidak menyentuh database maupun spec.
2. Untuk Fase C: setujukah merevisi bagian "tidak ada pengikut" di spec?
3. Untuk C5: karya legacy disembunyikan dari profil publik, atau diberi tampilan kartu yang layak?