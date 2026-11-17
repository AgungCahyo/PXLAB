# THE COMMONS — User Journey

**Dokumen:** USER-JOURNEY.md  
**Tanggal:** 16 Nov 2026  
**Sifat:** Alur yang ada di kode hari ini, dan alur yang direkomendasikan. Bukan implementasi.

Deep link yang harus tetap hidup: `/`, `/explore`, `/creation/[id]`, `/u/[username]`, `/create/[id]`, `/settings`, `/login`, `/register`.

---

## A. Visitor

### Alur sekarang

1. Membuka `/`. Melihat satu kalimat, Jelajahi karya, Gabung, catatan Ruang Bersama, lalu sampai enam karya pixel, lalu dua kartu penjelasan.
2. Membuka kartu ke `/creation/[id]`, atau Jelajah.
3. Di Jelajah, filter ukuran selalu terlihat. Bawaan Pixel. Tab Semua | Following (Following butuh akun). Kartu membuka detail.
4. Detail menampilkan judul besar, kreator, gambar, lalu apresiasi (hanya angka jika belum masuk), bagikan, dan percakapan. Tautan masuk tidak membawa identitas halaman ini.
5. Profil kreator lewat `@username`. Hanya karya terbit. Anggota dapat Follow/Following tanpa melihat jumlah pengikut.
6. Gabung membuka `/register` (nama, username, email, kata sandi). Setelah berhasil, atau setelah tautan email, tujuan adalah Jelajah, bukan karya yang tadi dilihat.
7. Masuk sama: selalu Jelajah.

### Jawaban atas pertanyaan audit

- Produk bisa dipahami dari kalimat dan karya di beranda, selama ada karya terbit. Jika galeri gagal atau kosong, beranda hanya menyisakan teks dan dua kartu. Tidak ada penjelasan pengganti.
- Karya terlihat sejak awal, untuk pengunjung yang gulir melewati kalimat pembuka.
- Menjelajah, membuka detail, dan membuka profil bisa tanpa akun.
- Registrasi sendiri singkat dan meminta identitas (nama tampilan dan username). Yang tidak alami adalah *kapan* ia muncul: dari tombol Gabung, bukan dari niat “saya ingin menanggapi karya ini”, dan sesudahnya konteks karya hilang.
- Login memutus perjalanan. Itu temuan P0-3.

### Alur yang direkomendasikan

1. Beranda tetap bisa dibuka siapa saja. Karya tetap di atas penjelasan.
2. Tamu menikmati Jelajah, detail, dan profil tanpa akun.
3. Saat apresiasi, komentar, atau Buat disentuh, masuk/daftar menyimpan `next` ke URL yang aman (diawali `/`, bukan URL luar).
4. Setelah berhasil, kembali ke karya, atau ke langkah Buat yang tertunda. Jika tidak ada `next`, baru ke Jelajah.
5. Gabung dari beranda tetap ke daftar, lalu Jelajah, karena tidak ada karya yang ditinggalkan.

## B. Authenticated member

### Alur sekarang

1. Masuk mendarat di Jelajah. Benar sebagai rumah discover.
2. Bilah atau tab: Jelajah, Buat, Profil. Desktop menambah menu Akun.
3. Membuka karya. Jika itu karyanya, ada “Sunting karya ini”. Jika bukan, ada fork.
4. Apresiasi satu jenis, bukan peringkat. Komentar dan satu tingkat balasan. Komposer tidak selalu terbuka.
5. Profil orang lain adalah etalase. Profil sendiri menambah Pengaturan dan, di ponsel, keluar.
6. Pengaturan menyimpan dulu jika pengguna kembali dengan perubahan.
7. Keluar kembali ke `/`.
8. `/dashboard` hanya sapaan dan pintasan. Tidak ada di navigasi.

### Yang terasa terputus

Jelajah, detail, dan profil terasa satu galeri. Akun terasa tempelan: di desktop ia menu, di ponsel ia tersembunyi di profil sendiri. Tidak ada tempat “karya saya” yang berbeda dari etalase publik. Member yang baru masuk tidak melihat drafnya.

### Alur yang direkomendasikan

1. Rumah setelah masuk tetap Jelajah.
2. Profil adalah etalase. Di profil sendiri, satu tindakan sekunder: Kelola karya, plus Pengaturan. Keluar tetap ada.
3. Kelola karya membuka rumah draf dan karya terbit (rute yang sudah ada, lihat INFORMATION-ARCHITECTURE.md).
4. Apresiasi, komentar, dan bagikan tetap di detail, lebih dekat ke karya, tanpa mengubah aturan B4.
5. Menu Akun desktop dan blok akun di profil ponsel memuat tujuan yang sama: Kelola karya, Pengaturan, keluar, dan admin bila perlu.

## C. Creator

### Alur sekarang

1. Buat membuka `/create`.
2. Bagian atas adalah seluruh karya milik sendiri, draf dan terbit, dengan lencana kecil dan tautan Sunting ke `/create/[id]`.
3. Bagian bawah adalah ukuran kanvas. Memilih ukuran membuat draf berjudul “Tanpa judul” dan langsung membuka Playground.
4. Di Playground pengguna bisa mengganti judul, menggambar, menunggu autosave, pratinjau, terbit, dan kembali. Kembali menyimpan dulu lalu ke `/create`.
5. Status draf/terbit tertulis kecil di bawah judul. Terbit tidak pindah ke halaman publik.
6. Lepas-terbit, lihat publik, dan hapus ada di dialog Lainnya. Hapus meminta konfirmasi.
7. Karya terbit muncul di Jelajah dan profil. Draf tidak.
8. Dari detail, pemilik menyunting lewat “Sunting karya ini”. Fork pada karya sendiri di server diarahkan kembali ke editor yang sama, bukan salinan baru.
9. Jenis lama masih terbuka lewat `/create/[id]` dengan `StudioForm`, bukan lewat pemilih ukuran.

### Lima masalah yang diminta dinilai

1. **Create mencampur daftar dan Playground.** Benar. Daftar di atas, ukuran di bawah, satu URL, satu label navigasi “Buat”.
2. **Playground terbuka tanpa identitas karya.** Benar. Judul dikirim tersembunyi sebelum kanvas ada. Pengguna bisa menggambar dulu; itu baik. Yang buruk adalah judul palsu sudah tersimpan sebagai data.
3. **Banyak karya terbit tanpa judul.** Mekanismenya mendukung itu. Terbit tidak memeriksa judul. Autofill “Tanpa judul” membuat karya tampak selesai.
4. **Draf dan terbit sulit dibedakan.** Status ada, tetapi bukan struktur halaman. Satu daftar campur. Tidak ada grup, filter, atau perbedaan tindakan yang menonjol (terbit vs lanjutkan vs lihat publik).
5. **Pengelolaan karya belum punya pengalaman sendiri.** Benar. Tidak ada My Works. Profil menolak menampilkan draf. Dashboard tidak menampilkan karya.

Langkah yang berulang atau membingungkan:

- Untuk menggambar lagi, pengguna melewati daftar karya orang lain tidak, tetapi melewati daftarnya sendiri setiap kali mengetuk Buat.
- Judul diketik di kanvas, di field yang tidak terlihat seperti field.
- Setelah terbit, tindakan berikut yang wajar (“lihat sebagai pengunjung”) tersembunyi di Lainnya.
- Kembali dari studio selalu ke daftar-yang-juga-pembuat, sehingga “kembali” dan “buat lagi” adalah halaman yang sama.

### Alur yang direkomendasikan

Tetap satu editor di `/create/[id]`. Jangan memindahkan kanvas.

1. **Buat** membuka langkah mulai: pilih ukuran, lihat pratinjau proporsi, lanjut. Belum membuat baris berjudul palsu sampai pengguna lanjut.
2. Draf boleh tetap tanpa judul *di dalam pengelola*, ditampilkan sebagai belum dinamai, bukan sebagai judul publik “Tanpa judul”.
3. Playground tetap langsung bisa digambar. Bidang judul terlihat seperti bidang (border, placeholder “Nama karya”), tidak diisi paksa.
4. Autosave, kembali-yang-menyimpan, pratinjau, offline, dan hapus-dengan-konfirmasi tetap.
5. **Terbit** jika judul masih kosong membuka satu langkah singkat: isi nama, lalu terbit. Setelah berhasil, tawarkan Lihat karya (detail publik) dan Kembali ke karyaku. Kanvas tidak ditutup paksa.
6. **Kelola karya** menampilkan dua kelompok yang jelas: Draf dan Terbit. Setiap baris: gambar, nama atau “Belum dinamai”, status, tanggal, dan satu tindakan utama (Lanjutkan atau Lihat). Sunting tetap ada.
7. Dari detail publik, pemilik tetap punya Sunting. Itu pintu kedua yang sudah benar.

Tidak ada langkah ukuran kedua. Tidak ada salin-sebagai-cara-menyunting. Fork tetap hanya untuk karya orang lain.
