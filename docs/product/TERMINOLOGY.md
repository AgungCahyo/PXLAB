# PXLB Terminology

**Status:** ACTIVE — 2026-11-25
**Source of truth untuk:** seluruh teks antarmuka (navigation, menu, tombol, tooltip, dialog, toast, notifikasi, empty/error/success state, label form, placeholder, konfirmasi).
**Aturan konvensi kode:** [`docs/architecture/NAMING_CONVENTIONS.md`](../architecture/NAMING_CONVENTIONS.md).

Tabel ini disusun dari hasil pemeriksaan source, bukan dari contoh hipotetis. Bila istilah lama masih muncul di kode, itu tercatat sebagai alias kompatibilitas atau pekerjaan tertunda — bukan izin untuk memakai istilah itu di teks baru.

## 1. Kamus istilah resmi

| Konsep | Istilah Standar | Hindari | Keterangan |
| --- | --- | --- | --- |
| Pemberitahuan umum sistem | **Notification / Notifikasi** | Response, Alert (untuk konteks yang sama) | Umpan balik singkat atau pemberitahuan sistem. Tidak memakai `Response`. |
| Inbox tanggapan atas karya sendiri | **Responses / Respon** | Notification (untuk permukaan ini), Inbox | `/responses` menggabungkan komentar, apresiasi, dan remix atas karya milik sendiri. Ini fitur "Respon untuk karyamu" (`COMMUNITY-EXPERIENCE.md`), bukan notifikasi sistem umum. URL dan kunci lama `notifications*` tetap untuk kompatibilitas; **nilai teksnya** memakai "Respon/Responses". |
| Karya pengguna (label UI) | **Work / Works — Karya** | Creation, Project, Kreasi, My creations | Label tombol, tab, judul, dan kartu. Contoh: `Karya saya / My works`, `Belum ada karya / No works yet`. |
| Karya sebagai domain kode/DB | **Creation / creations** | Artwork (sebagai nama kode), Work (sebagai nama tabel) | Tabel `creations`, tipe `CreationCard`, rute `/creation/[id]`, API `/api/og/creation/[id]`. Dipertahankan karena kontrak dan migrasi. |
| Karya pixel (prose produk) | **Artwork** | Piece, Canvas (untuk karya) | Istilah editorial di `PRODUCT-SPEC.md` ("Artwork is the hero", "Artwork Conversation"); bukan label UI dan bukan nama file baru. |
| Reaksi satu jenis pada karya | **Appreciation / Apresiasi** | Like, Suka, Reaction (sebagai label UI) | Konsep produk: satu tipe `appreciate`, unik per anggota per karya (`PRODUCT-SPEC.md`). Teks aksi kini "Apresiasi / Appreciate"; kode/DB `reaction` dipertahankan. |
| Percakapan di bawah karya | **Conversation / Percakapan**, **Comment / Komentar** | Forum, Thread, Response (untuk komentar itu sendiri) | `CommentPanel`, `lib/conversation.ts`; "Artwork Conversation" adalah nama fitur. |
| Turunan karya | **Remix** | Fork, Duplikat (sebagai label UI) | UI memakai Remix; DB `forked_from` dipertahankan (`PRODUCTION-READINESS-UIUX-AUDIT.md:285`). |
| Karya belum terbit | **Draft / Draf** | Unfinished, Pending work | Status `draft`; judul karya belum dinamai = "Belum dinamai / Untitled" sesuai IA. |
| Menerbitkan karya | **Publish / Terbitkan** | Submit, Upload | Status `published`; aksi "Terbitkan karya". |
| Halaman kelola karya | **My Works / Karya saya** | Dashboard (sebagai label UI), My creations | URL `/dashboard` dipertahankan; judul halaman `Karyamu / Your works`. |
| Halaman beranda publik | **Home / Beranda** | Feed (untuk `/`) | `/` adalah landing; `/home` adalah feed. Jangan menyebut `/` sebagai "Feed". |
| Feed aktivitas | **Feed** | Timeline, Stream | `/home` = feed publik; tab `Untuk Anda / For you` dan `Mengikuti / Following`. |
| Pengaturan akun | **Settings / Pengaturan** | Preferences, Konfigurasi | Rute `/settings`, komponen `SettingsForm`. |
| Anggota yang masuk | **Member / Anggota** | User (sebagai label UI), Account (sebagai label UI) | Objek `member`; boolean memakai `isMember`; identitas DB `user_id`. |
| Identitas akun/DB | **User / user_id** | member_id, account_id | `auth.users`, `profiles.id`, kolom `user_id`. |
| Pembuat karya | **Creator / Kreator** | Author (sebagai label UI), User | Profil publik `/u/[username]`, daftar `/creators`. |
| Pemberitahuan dot pada nav | **Responses badge** | Notification badge | Digerakkan oleh `hasResponses`, bukan angka hard-coded. |
| Editor karya | **Studio / Playground** | Editor (sebagai nama produk), Create (sebagai label editor) | `/create/[id]` memakai `PlaygroundForm` untuk pixel dan `StudioForm` untuk tipe lama. Chrome gelap Studio disengaja. |
| Ruang bersama | **Common Space / Ruang Bersama** | Canvas (sebagai nama halaman) | `/space` adalah fase lanjutan/arsip, bukan pusat produk. |
| Moderasi | **Moderation / Moderasi** | Admin (sebagai label UI) | `/admin` menampilkan `AdminReports`; URL dipertahankan. |
| Laporan | **Report / Laporan** | Flag | Tabel `reports`, tombol "Lapor"; tidak diubah menjadi "Flag". |
| Status laporan | **Pending / Menunggu**, **Reviewed / Ditinjau**, **Resolved / Selesai** | `pending`, `reviewed`, `resolved` (nilai mentah di UI) | Pakai kunci `adminPending`, `adminReviewed`, `adminResolved`. |
| Filter ukuran karya | **Size / Ukuran** | Category (sebagai label UI) | Kolom DB `category` berisi preset ukuran pixel; tetap `category` di DB. |
| Gambar sampul karya | **Cover / Sampul** | Thumbnail (sebagai nama kode) | `cover.png`, `cover_url`; thumbnail hanya tampilan. |
| Izin unduh PNG | **PNG download / Unduh PNG** | Export permission | Kolom `allow_png_download`, endpoint `/api/pixel-download/[id]`. |
| Umpan balik singkat | **Toast** | Alert (untuk pesan sementara) | `components/social/Toast.tsx`; maksimal dua pesan, auto-hilang, bisa ditutup manual. |
| Pesan keadaan persisten | **Alert / status inline** | Toast (untuk error formulir yang tetap) | `components/ui/Alert.tsx`, status simpan di Studio. |
| Keadaan kosong | **Empty state** | Kosong (sebagai kode) | Dua keluarga sesuai scope: `ui/EmptyState` (halaman), `social/SocialEmptyState` (feed/bagian). |
| Memuat | **Muat… / Loading…** | `Loading` (bahasa Inggris pada UI Indonesia) | `aria-label` skeleton dan loading masih menyisakan ini; lihat pekerjaan tertunda. |
| Simpan draf | **Save draft / Simpan draf** | Autosave (untuk aksi eksplisit) | Tidak ada autosave server; draf lokal browser hanya pemulihan. |

## 2. Aturan pemakaian

1. Satu konsep, satu istilah. Jangan berganti antara `Creation`, `Artwork`, `Work`, dan `Project` untuk label yang sama; lihat kolom "Konteks" untuk membedakan domain kode dan UI.
2. Bahasa Indonesia memakai kata sehari-hari (`Karya`, `Respon`, `Pengaturan`, `Terbitkan`), bahasa Inggris memakai istilah umum (`Works`, `Responses`, `Settings`, `Publish`).
3. Brand dan fitur beridentitas tidak diterjemahkan atau diganti: `PXLB`, `Pixel Art`, `Studio`, `Playground`, `Common Space`.
4. Kunci copy adalah nama teknis; yang dilihat pengguna adalah **nilainya**. Alias lama seperti `notificationsUnread` dipertahankan sementara, tetapi nilainya sudah mengikuti tabel ini.
5. Jangan menampilkan nilai mentah dari DB/enum/provider sebagai label; gunakan kunci copy yang sudah dilokalkan.
6. Semua teks baru wajib masuk `lib/copy.ts` atau `lib/copy-social.ts`; jangan menambah ternary `lang === "id"` langsung di JSX.

## 3. Status pelaksanaan

| Topik | Keputusan |
| --- | --- |
| `/responses` memakai "Notifikasi" | **Diperbaiki**: nilai copy kini "Respon/Responses"; kunci lama dipertahankan agar test dan import tidak rusak. |
| Reaksi "Like/Suka" di feed social | **Diperbaiki**: nilai copy kini "Apresiasi/Appreciate"; kode `liked` dan RPC tetap karena kontrak. |
| Label "My creations" di sidebar | **Diperbaiki**: memakai `socialCopy.nav.works` → "My works". |
| `Response` untuk notifikasi sistem | **Dilarang** sejak dokumen ini berlaku; tidak ada notifikasi sistem generik di source saat audit. |
| Status/provider mentah di AdminReports & AccountSecurity | **Ditunda**: perlu kunci copy baru dan mapping; menyentuh UI moderasi/akun di luar lingkup rename. |
| Dashboard hard-coded copy, `aria-label="Loading"`, `placeholder="W"/"H"` | **Ditunda**: migrasi copy lintas file, bukan perubahan penamaan. |
| `Karya` vs `Kreasi` di dokumentasi lama | Dokumen arsip tidak diubah; dokumen aktif memakai tabel ini. |

Catatan: perubahan di atas hanya menyentuh teks. Tidak ada perubahan desain visual, perilaku, rute, atau skema data. Validasi runtime/browser tidak dilakukan; status **UNVERIFIED**.
