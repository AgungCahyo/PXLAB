# Arah Pengembangan PXLB — Backlog / Visi

> **Document purpose:** Backlog dan visi produk untuk gagasan kolaborasi komunitas. Bukan rencana implementasi dan bukan izin untuk menulis kode.
> **Status:** BACKLOG / VISION — NOT AN IMPLEMENTATION PLAN.
> **Updated:** 2026-11-24.
> **Implementation evidence:** VERIFIED IN CODE — `features/creations/actions.ts:561-726` (fork/salinan karya), `lib/auth/permissions.ts:83-88` (`canForkCreation`), `lib/auth/permissions.ts:90-99` (izin unduh PNG, terpisah dari remix), `components/creations/RemixStrip.tsx`, `app/[lang]/(public)/creation/[id]/page.tsx:128,266,339-348`, `lib/pixel.ts:85-104`; VERIFIED BY TEST — `tests/detail-hierarchy.test.ts`, `tests/detail-recommendations.test.ts`, `tests/resource-cleanup.test.ts:28-32`. Tidak ada tabel `challenges`, `stamps`, `assets`, `rooms`, atau `canvas_tiles` di migrasi saat ini.
> **Completed:** Fondasi fork/remix, salinan source + PNG, atribusi dua arah, dan permissions dasar sudah ada di kode.
> **Open:** Keputusan owner tentang aturan izin remix, desain/lifecycle Challenge, nama dan model Community Assets, serta status kolaborasi langsung. Semua masih PROPOSED — AWAITING OWNER DECISION.
> **Dependencies:** `PRODUCT-SPEC.md`, `TECHNICAL-SPEC.md`, `IMPLEMENTATION-PLAN.md`, `docs/studio/01_SYSTEM_AUDIT.md`, dan operator actions di `IMPLEMENTATION-PLAN.md` §14.
> **Preparation brief:** `PREPARATION-REMIX-CHALLENGE-ASSETS.md` berisi audit status A–C dan rencana bertahap; tidak mengubah status backlog atau memberi izin implementasi.
> **Next action:** Owner mengambil keputusan untuk A–C terlebih dahulu. Tidak ada agent yang boleh memulai implementasi atau B6 dari dokumen ini.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION. Bukti level source/test bukan bukti browser atau produksi.

---

## Keputusan final vs usulan

| Topik | Keputusan final yang sudah tercatat | Status usulan saat ini |
|---|---|---|
| Remix | Fondasi salinan karya, source attribution, dan RemixStrip sudah ada. Jangan membangun ulang sistem atribusi/fork. | Aturan izin remix belum dipilih. PROPOSED — AWAITING OWNER DECISION. |
| Challenge | Open Challenge adalah kandidat pertama. Guided Challenge ditunda sampai ada region terlindungi/layer terkunci. | Belum ada keputusan final tentang ownership, lifecycle, deadline, submission, dan moderasi. |
| Community Assets | Nama kerja: **Community Assets** atau **Pixel Assets**. Hindari `Stamp` karena editor sudah memakai `stampBrush`. | Konsep favorites, packs, recent, dan featured belum diputuskan; bukan sistem terpisah yang disetujui. |
| Kolaborasi langsung | **VISION ONLY — NOT APPROVED FOR IMPLEMENTATION.** Terkait keputusan B6 dan memerlukan persetujuan owner eksplisit. | Tidak ada desain teknis, transport, skema, atau API yang disetujui. Tidak boleh dimulai. |
| Dokumen ini | Tetap backlog/vision, bukan implementation plan. | Tidak mengubah source of truth mana pun. |

---

## A. Remix

**Status saat ini:** Partial — mekanisme sudah ada, aturan izin belum.

**VERIFIED IN CODE.** `forkCreationAction` memvalidasi session, mengambil karya publik, memeriksa `canForkCreation`, lalu membuat creation baru; untuk `pixel`, `forkPixelCreation` menyalin `source.json` dan `cover.png`, menulis `forked_from`, dan mengarahkan ke editor draft baru. Atribusi/source relationship ditampilkan lewat `RemixStrip` di halaman detail dan recommendation actions.

**Yang sudah selesai:**
- Remix menghasilkan karya baru; karya sumber tidak diubah.
- Source pixel disalin dan cover PNG diikutsertakan.
- Hubungan `forked_from` tercatat.
- Kreator/karya sumber mendapat atribusi di UI terkait.

**Yang masih terbuka:**
- `canForkCreation` saat ini hanya memeriksa user login + status `published`. Belum ada aturan per-karya seperti “boleh / perlu izin / ditutup”.
- `allow_png_download` adalah izin unduh PNG, bukan izin remix; jangan dipakai sebagai pengganti.
- Alur permintaan persetujuan, jika dipilih, belum ada dan tidak boleh ditambahkan tanpa keputusan owner.

**PROPOSED — AWAITING OWNER DECISION:**
1. Remix diizinkan untuk semua karya publik yang memenuhi aturan umum.
2. Remix hanya untuk karya yang secara eksplisit mengizinkan.
3. Remix memerlukan persetujuan kreator.

**Next action:** Owner memilih salah satu kebijakan. Setelah itu, perubahan dibatasi pada permission rule dan copy UI; jangan membangun ulang fork/source attribution.

---

## B. Challenge

**Status saat ini:** PROPOSED — AWAITING OWNER DECISION. Tidak ada implementasi, tabel, atau endpoint Challenge.

**Kandidat pertama:** Open Challenge. Peserta memulai dari salinan gambar dasar, bebas mewarnai/menambah/mengubah, lalu menerbitkan hasil sebagai karya baru dengan kaitan ke sumber. Ini memakai fondasi fork yang sudah ada tanpa mengubah karya asli.

**Guided Challenge:** ditunda. Diperlukan kemampuan menandai region yang harus dipertahankan atau layer terkunci; kemampuan tersebut belum tersedia sebagai produk.

**Yang perlu diputuskan owner sebelum implementasi apa pun:**
- Siapa pemilik Challenge dan siapa yang boleh mengubah/ menutupnya.
- Apakah Challenge adalah creation biasa dengan mode khusus atau entitas terpisah.
- Apakah ada deadline, bagaimana perilaku setelah deadline, dan apakah kiriman masih bisa diedit.
- Bagaimana kiriman diverifikasi, dilaporkan, dan disembunyikan oleh admin.
- Bagaimana atribusi ke template dan ke kreator Challenge ditampilkan.

**Ketergantungan:** model `creations`/fork saat ini, aturan remix dari bagian A, moderasi laporan/admin yang sudah ada, dan keputusan migration baru jika entitas terpisah diperlukan. Jangan menimpa migrasi lama.

**Next action:** Owner menetapkan keputusan di atas. Jika disetujui, tulis spec kecil lebih dulu; document ini tidak menjadi izin implementasi.

---

## C. Community Assets / Pixel Assets

**Status saat ini:** PROPOSED — AWAITING OWNER DECISION. Tidak ada tabel `stamps`/`assets` dan tidak ada editor asset panel.

**Nama kerja:** Community Assets atau Pixel Assets. Hindari `Stamp` sebagai nama produk karena editor sudah memakai `stampBrush`; nama itu akan menyesatkan.

**Ide inti:** kreator menerbitkan elemen pixel kecil yang bisa dipakai kreator lain di Studio, dengan kredit ke pembuat dan tautan ke karya sumber.

**Belum diputuskan — jangan dianggap sebagai fitur terpisah:**
- Favorites, packs, recent, dan featured: apakah ini sekadar filter/tampilan atau memerlukan relasi data baru.
- Apakah aset disalin ke dokumen pengguna atau direferensikan secara dinamis.
- Izin penggunaan: bebas, wajib kredit, atau izin eksplisit.
- Provenance: bagaimana kredit aset tetap terbaca saat aset dipakai di karya lain.
- Moderasi dan pelaporan aset; `reports.target_type` saat ini mencakup `creation`, `comment`, dan `space_element`, bukan aset.

**Next action:** Owner memilih nama final, model provenance, dan kebijakan lisensi/izin. Setelah itu baru spec data model dan migrasi additive disusun.

---

## D. Kolaborasi langsung

**Status:** VISION ONLY — NOT APPROVED FOR IMPLEMENTATION.

Ini adalah gagasan jangka panjang untuk menggambar bersama dalam satu kanvas. Tidak ada keputusan produk, arsitektur, transport, skema, atau API yang disetujui. Tidak termasuk rilis komunitas dan tidak boleh menunggu atau memblokir rilis tersebut.

**Batasan tegas:**
- Tidak ada persetujuan untuk menambah kanal realtime, kehadiran/siaran, atau mekanisme perubahan langsung.
- Tidak ada persetujuan untuk tabel tile, RPC stroke, atau layanan tambahan.
- `tests/resource-cleanup.test.ts` menjaga tidak adanya API tersebut di source; jangan mengubah test itu untuk memudahkan implementasi.
- Status ini berada di belakang keputusan B6 dan persetujuan owner eksplisit.

**Yang bisa dilakukan sekarang:** hanya mencatat kebutuhan produk tingkat tinggi (siapa boleh ikut, apa yang terlihat, bagaimana karya asli tetap aman) sebagai diskusi. Tidak ada prototype, migrasi, dependency, atau perubahan test.

**Next action:** Owner membuat keputusan eksplisit apakah topik ini boleh keluar dari vision. Jika tidak, biarkan ditutup sebagai vision-only.

---

## Prinsip yang tetap berlaku

- Karya dan source asli tidak berubah saat orang lain mengembangkannya.
- Kreator dan sumber aset tetap mendapat kredit.
- Aturan izin harus sederhana dan terlihat sebelum pengguna berkomitmen.
- Gunakan fondasi yang sudah ada; jangan membangun ulang fork, atribusi, auth, atau moderasi.
- Kembangkan bertahap: keputusan produk → spec → implementasi additive → verifikasi → operator/produksi.
- Dokumen ini tidak boleh dipakai sebagai dasar untuk mengklaim fitur selesai atau production-ready.
