# THE COMMONS — Implementation Roadmap

**Dokumen:** IMPLEMENTATION-ROADMAP.md  
**Tanggal:** 16 Nov 2026  
**Sifat:** Urutan kerja setelah audit disetujui. Bukan izin untuk mulai mengkode.

Jangan mulai sebelum ada persetujuan eksplisit. Jangan mulai B6. Jangan mengubah skema, SQL, storage, RLS, format RLE, PNG sebagai dokumen, deep link, atau spesifikasi Artwork Conversation.

Setiap irisan: baca kode yang disentuh, kerjakan hanya irisannya, `tsc`, tes yang relevan, cek desktop dan ponsel 390px.

---

## 1. Urutan

| Irisan | Prioritas | Isi | Bergantung pada |
|---|---|---|---|
| 1. Rumah karya | P0 | `/dashboard` menjadi My Works. `/create` hanya mulai karya. Kembali studio ke `/dashboard`. Profil pemilik menautkan Kelola karya. | Tidak ada |
| 2. Identitas karya | P0 | Form baru tidak menulis “Tanpa judul”. Judul studio terlihat seperti bidang. Terbit menolak nama kosong lewat dialog, lalu menawarkan lihat detail. | Irisan 1, supaya draf tanpa nama punya tempat tampil |
| 3. Kembali setelah masuk | P0 | `next` internal pada masuk, daftar, dan tautan dari detail serta tab tamu. Callback email menghormati next halaman asal, bukan selalu Jelajah. | Tidak ada. Boleh sejajar dengan 1 |
| 4. Hierarki detail | P1 | Gambar di atas, judul mengecil, apresiasi dan bagikan mendekat. Percakapan tidak diubah aturannya. | Tidak ada |
| 5. Kejelasan status | P1 | My Works mengelompokkan Draf dan Terbit. Menu Akun ponsel dan desktop memuat tujuan yang sama. | Irisan 1 |
| 6. Kerapian galeri dan chrome | P2 | Jenis lain tidak lagi lima tombol setara. `/create` dan `/dashboard` tidak menyembunyikan footer. Swatch 44px. Ikon tab opsional dengan label tetap. | Irisan 1 supaya atribut studio tidak salah halaman |

Irisan 3 dan 4 boleh dikerjakan bersamaan dengan 1 jika orangnya berbeda, karena filenya hampir tidak bertumpuk. Irisan 2 menyentuh `StudioNewForm` dan `PlaygroundForm`, yang juga disentuh irisan 1 pada tujuan kembali. Kerjakan 1 dulu, lalu 2.

## 2. Di luar peta ini

- Pencarian, notifikasi, pengikut, urutan populer.
- B6 dan perluasan `/space`.
- Menghapus jenis lama atau `StudioForm`.
- Migrasi SQL untuk mengubah judul “Tanpa judul” yang sudah tersimpan.
- Toast baru, tooltip baru, sidebar, mode gelap.

## 3. Risiko regresi

| Risiko | Cara menahan |
|---|---|
| Tautan `/create` dari detail pemilik dan dari kartu lama diharapkan membuka editor, bukan daftar. | Editor tetap `/create/[id]`. Hanya indeks `/create` yang berubah. |
| `/dashboard` yang lama diharapkan sapaan. | URL tetap. Isi berubah menjadi sesuatu yang lebih berguna. Tidak ada redirect ke tempat lain. |
| Kembali studio sekarang ke `/create`. Mengarahkannya ke dashboard mengubah kebiasaan yang baru saja diperbaiki. | Tetap menyimpan dulu, lalu pindah. Tes kembali yang sudah ada harus diperbarui agar mengharapkan `/dashboard`, bukan menghapus perilaku simpan. |
| Terbit tanpa judul menolak karya yang memang ingin cepat dipublikasikan. | Menolak hanya saat nama kosong, dengan satu bidang di tempat yang sama. Tidak menambah halaman wizard. |
| `next` terbuka bisa menjadi open redirect. | Hanya path yang diawali `/` dan tidak diawali `//`. Callback sudah melakukan pemeriksaan awal. Samakan di form. |
| Irisan 4 mengubah `CreationCommunity` dan tanpa sengaja mengubah balasan atau komposer. | Ubah urutan dan jarak. Jangan mengubah action, skema komentar, atau syarat “satu tingkat”. |
| Footer dan tab hilang di halaman daftar karena `data-chrome="studio"` ikut pindah. | Atribut studio hanya pada kanvas (`data-chrome="playground"`) dan, bila masih perlu, editor jenis lama. |

## 4. Kriteria terima

### Irisan 1

- Mengetuk Buat tidak menampilkan daftar karya.
- Memilih ukuran tetap membuka `/create/[id]`.
- `/dashboard` menampilkan draf dan karya terbit milik sendiri, dengan gambar pixel.
- Draf tidak muncul di Jelajah atau profil publik.
- Profil sendiri punya tautan Kelola karya. Profil orang lain tidak.
- Kembali dari Playground mendarat di `/dashboard` dan tidak membuang goresan yang belum tersimpan.
- Tidak ada rute baru. `tsc` bersih.

### Irisan 2

- Membuat karya baru tidak menyimpan judul “Tanpa judul” / “Untitled”.
- Bidang judul di studio terlihat bisa diisi.
- Terbit dengan nama kosong tidak mengubah status menjadi published.
- Setelah nama diisi dari dialog itu, terbit berjalan seperti sekarang.
- Karya lama yang sudah berjudul “Tanpa judul” tidak diubah paksa di database.
- Deep link `/create/[id]` tetap membuka karya yang sama.

### Irisan 3

- Dari detail, Masuk, lalu berhasil, kembali ke `/creation/[id]` itu.
- Tab Profil dan Buat untuk tamu membawa `next`.
- Masuk tanpa `next` tetap ke Jelajah.
- `next` ke domain lain ditolak.
- Daftar dengan konfirmasi email memakai `next` yang sama bila ada.

### Irisan 4

- Pada pixel, gambar adalah blok pertama di dalam artikel.
- Apresiasi tetap satu jenis dan tetap terpisah dari kolom komentar.
- Balasan tetap satu tingkat. Komposer akar tetap tertutup sampai dibuka.
- Fork pemilik tidak membuat salinan.
- Bagikan tetap menyalin atau membuka lembar berbagi.

### Irisan 5

- Draf dan terbit tidak berada dalam satu daftar tanpa penanda kelompok.
- Tindakan utama draf adalah lanjutkan. Tindakan utama terbit termasuk lihat di galeri.
- Di ponsel, Pengaturan, Kelola karya, dan keluar dapat ditemukan dari profil sendiri tanpa membuka desktop.
- Menu Akun desktop memuat Kelola karya.

### Irisan 6

- Jelajah ponsel 390px menampilkan karya tanpa lima tombol jenis menguasai layar pertama. Jenis lama tetap bisa dipilih.
- `/dashboard` dan `/create` menampilkan hak cipta di atas tab, bukan menyembunyikannya.
- Studio tetap tanpa tab dan tanpa footer.
- Swatch yang dipakai untuk memilih warna minimal 44px.
- Label tab tetap ada jika ikon ditambahkan.

## 5. Cek yang tetap di luar kode

Dokumen fase masih menyatakan migrasi Supabase dan uji Playground dalam keadaan masuk belum tentu dilakukan operator. Irisan di atas tidak menggantikan cek itu. Setelah irisan 1–2, satu lulusan masuk akun harus: buat ukuran, gambar, kembali, melihat draf di My Works, menamai, terbit, membuka detail, dan melihat karya di profil.
