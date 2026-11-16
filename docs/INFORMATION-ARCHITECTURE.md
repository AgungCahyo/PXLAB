# THE COMMONS — Information Architecture

**Dokumen:** INFORMATION-ARCHITECTURE.md  
**Tanggal:** 16 Nov 2026  
**Sifat:** Struktur yang direkomendasikan. Tidak menambah rute pada irisan pertama.

Empat fondasi: Discover, Create, Showcase, Connect.

---

## 1. Keputusan struktur

Kebutuhan “Explore, Create, My Works, Profile, Artwork Detail, Settings” dapat dipenuhi **tanpa rute baru**.

| Kebutuhan | Rute yang dipakai | Perubahan fungsi |
|---|---|---|
| Explore | `/explore` | Tetap pusat temuan. Bukan pengelola. |
| Create | `/create` | Berubah menjadi pintu karya baru saja: ukuran, lalu buka studio. |
| My Works | `/dashboard` | Berubah dari sapaan menjadi pengelola draf dan karya terbit. URL lama tidak patah. |
| Playground | `/create/[id]` | Tetap studio satu karya. |
| Profile | `/u/[username]` | Tetap etalase publik. Pemilik mendapat tautan ke My Works dan Pengaturan. |
| Artwork detail | `/creation/[id]` | Tetap karya + apresiasi + percakapan. |
| Settings | `/settings` | Tetap akun dan profil. |
| Auth | `/login`, `/register` | Tetap. Menambah kembali ke `next` yang aman. |
| Admin | `/admin` | Tetap di luar navigasi publik. |
| Common Space | `/space` | Tetap catatan nanti, bukan item navigasi. Jangan dinaikkan. |
| Beranda | `/` | Tetap bisa dibuka siapa saja. Bukan rumah anggota. |

Yang tidak dibuat: `/works`, `/my`, feed, notifikasi, pengikut.

Yang tidak digabung: profil publik dan daftar draf. Pengunjung tidak boleh melihat draf. Yang tidak dipisah menjadi aplikasi lain: Playground. Ia tetap di dalam situs.

`/dashboard` dipilih sebagai My Works karena rutanya sudah ada, sudah dibatasi anggota, dan sekarang tidak punya peran. Memakai `/create` untuk keduanya adalah sumber P0-1.

## 2. Sitemap

```text
/                         Beranda. Karya terbit + ajakan. Bukan rumah anggota.
/explore                  Discover. Pixel bawaan. Jenis lain sekunder.
/creation/[id]            Showcase satu karya + Connect.
/u/[username]             Etalase publik.
/login                    Masuk. Hormati next.
/register                 Gabung. Hormati next.
/space                    Nanti. Bukan nav.

Anggota
/create                   Mulai karya baru (ukuran → studio).
/create/[id]              Playground, atau studio lama jika jenis bukan pixel.
/dashboard                My Works. Draf dan terbit.
/settings                 Akun.
/admin                    Moderasi. Hanya admin.
```

## 3. Hierarki navigasi

Primer, selalu terlihat:

1. Jelajah → `/explore`
2. Buat → `/create` (mulai, bukan daftar)
3. Profil → `/u/[username]` jika masuk, `/login?next=…` jika tamu

Sekunder, lewat Profil atau menu Akun, bukan tab keempat:

- Kelola karya → `/dashboard`
- Pengaturan → `/settings`
- Keluar
- Admin, hanya jika `role = admin`

Bahasa tetap di header, bukan di tab.

Studio (`/create/[id]` pixel) menyembunyikan tab bawah dan footer, seperti sekarang. Kembali di dalam studio pergi ke My Works (`/dashboard`), bukan ke pintu “karya baru”.

Logo tetap ke `/`.

## 4. Hubungan antarfitur

```text
Beranda ──lihat──► Jelajah ──buka──► Detail ──kreator──► Profil
                      │                 │
                      │                 ├── apresiasi / komentar (akun)
                      │                 └── pemilik: Sunting ──► Playground
                      │
Buat ──ukuran──► Playground ──simpan──► My Works
                      │
                      └──terbit──► Detail publik
                                      │
Profil sendiri ──kelola──► My Works ──lanjutkan──► Playground
```

- Discover tidak menampilkan draf.
- Create tidak menampilkan daftar panjang.
- My Works tidak menjadi galeri publik dan tidak menampilkan karya orang lain.
- Profile tidak menjadi halaman akun penuh. Akun tetap di Pengaturan.
- Connect hanya hidup di detail karya. Tidak ada inbox.

## 5. Create versus My Works

| | Create `/create` | My Works `/dashboard` |
|---|---|---|
| Pertanyaan yang dijawab | “Saya ingin menggambar sesuatu yang baru.” | “Di mana karya yang belum selesai, dan yang sudah saya terbitkan?” |
| Isi | Pemilih ukuran yang sudah ada. Satu tindakan: Lanjut ke kanvas. | Dua kelompok: Draf, Terbit. Gambar, status, tanggal, Lanjutkan atau Lihat. |
| Tidak berisi | Daftar karya, pengaturan akun, sapaan dashboard lama. | Pemilih ukuran sebagai isi utama. Satu tautan “Karya baru” boleh ada di atas. |
| Setelah aksi | Langsung `/create/[id]`. | Tetap di daftar, atau masuk studio. |
| Kosong | Ajakan memilih ukuran. Bukan empty state yang menyuruh pergi ke tempat lain. | Ajakan satu tombol: Buat karya. |

Draf yang belum dinamai ditulis “Belum dinamai”, bukan judul publik “Tanpa judul”. Saat terbit, nama wajib diisi. Karya yang sudah terlanjur tersimpan sebagai “Tanpa judul” tetap tampil apa adanya sampai pemilik menggantinya. Tidak ada migrasi data dalam irisan ini.

## 6. Halaman yang dipertahankan, diubah, atau dibiarkan

- Dipertahankan fungsinya: Jelajah, detail, Playground, Pengaturan, masuk, daftar, admin, beranda.
- Diubah fungsinya: `/create` (hanya mulai), `/dashboard` (pengelola karya).
- Dipisahkan secara tanggung jawab, bukan URL baru: daftar yang sekarang di `/create` pindah ke `/dashboard`.
- Digabung: tidak ada.
- Tidak dihapus: `/space`, studio jenis lama, `/dashboard`.
- Bukan nav: Ruang Bersama, admin, pengaturan, kelola karya.

## 7. Yang sengaja tidak masuk navigasi

Pencarian, urutan populer, pengikut, notifikasi, dan Common Space sebagai tujuan utama. Urutan Jelajah tetap `published_at` terbaru. Filter jenis tetap ada, tetapi jenis lama tidak lagi setara secara visual dengan Pixel (lihat REDESIGN-BLUEPRINT.md).
