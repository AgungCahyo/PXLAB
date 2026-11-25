# Arah Pengembangan PXLB — Backlog / Visi

> **Document purpose:** Backlog dan visi produk untuk gagasan kolaborasi komunitas. Bukan rencana implementasi dan bukan izin untuk menulis kode.
> **Status:** BACKLOG / VISION — NOT AN IMPLEMENTATION PLAN.
> **Updated:** 2026-11-25.
> **Implementation evidence:** VERIFIED IN CODE — `features/creations/actions.ts:561-726` (fork/salinan karya), `lib/auth/permissions.ts:83-88` (`canForkCreation`), `lib/auth/permissions.ts:90-99` (izin unduh PNG, terpisah dari remix), `components/creations/RemixStrip.tsx`, `features/creations/queries.ts:576-659`, `app/[lang]/(public)/creation/[id]/page.tsx:126,256-260,331-341`; VERIFIED BY TEST — `tests/detail-hierarchy.test.ts`, `tests/detail-recommendations.test.ts`, `tests/download-permission.test.ts:73-96`. Tidak ada tabel `challenges`, `stamps`, `assets`, `rooms`, atau `canvas_tiles` di migrasi saat ini.
> **Completed:** Fondasi fork/remix, salinan source + PNG, atribusi dua arah, dan permissions dasar sudah ada di kode.
> **Open:** Go-ahead terpisah untuk A3–A5, B2–B6, dan C2–C6; status kolaborasi langsung tetap vision-only. Spec S0.4 sudah ditandatangani 2026-11-25 dan A2 selesai, tetapi tidak mengizinkan stage lain.
> **Dependencies:** `PRODUCT-SPEC.md`, `TECHNICAL-SPEC.md`, `IMPLEMENTATION-PLAN.md`, `docs/studio/01_SYSTEM_AUDIT.md`, `docs/strategy/PXLB-Community&Growth-Strategy.md` (strategi/vision input, bukan izin implementasi), dan operator actions di `IMPLEMENTATION-PLAN.md` §14.
> **Preparation brief:** `PREPARATION-REMIX-CHALLENGE-ASSETS.md` berisi audit status A–C, keputusan K1–K9, dan rencana bertahap; follow-up spec S0.4: `SPEC-REMIX.md`, `SPEC-CHALLENGE.md`, `SPEC-PIXEL-ASSETS.md` (SIGNED OFF). Tidak mengubah status backlog atau memberi izin implementasi.
> **Next action:** Minta go-ahead terpisah untuk A3—jangan mulai A3–A5, B2–B6, C2–C6, atau kolaborasi langsung dari dokumen ini. A2 sudah selesai dan dibatasi pada server action + test.
> **Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION / APPROVED — SIGNED OFF / DECIDED — PRODUCT ONLY. Bukti level source/test bukan bukti browser atau produksi.

---

## Keputusan final vs usulan

| Topik | Keputusan final yang sudah tercatat | Status usulan saat ini |
|---|---|---|
| Remix | Publik + atribusi wajib, full enforcement di UI/server/DB/Storage. Fondasi fork jangan dibangun ulang. | `SPEC-REMIX.md` SIGNED OFF; A2 DONE (server gate). A3–A5 masih BLOCKED. |
| Challenge | Entitas terpisah; Open Challenge lebih dulu; admin/owner membuka-menutup; deadline opsional; atribusi template + kreator + rantai remix. | `SPEC-CHALLENGE.md` SIGNED OFF; implementasi BLOCKED. Guided tetap ditunda. |
| Pixel Assets | Nama final **Pixel Assets**; copy + provenance; wajib kredit; target laporan aset baru. | `SPEC-PIXEL-ASSETS.md` SIGNED OFF; implementasi BLOCKED. |
| Kolaborasi langsung | **VISION ONLY — NOT APPROVED FOR IMPLEMENTATION.** Terkait keputusan B6 dan memerlukan persetujuan owner eksplisit. | Tidak ada desain teknis, transport, skema, atau API yang disetujui. Tidak boleh dimulai. |
| Dokumen ini | Tetap backlog/vision, bukan implementation plan. | K1–K9 sudah masuk source of truth: `PRODUCT-SPEC.md` dan `TECHNICAL-SPEC.md`. |

---

## A. Remix

**Status saat ini:** Partial — mekanisme dan A2 server gate sudah ada; enforcement DB/Storage (A3) dan copy UI (A4) belum.

**VERIFIED IN CODE.** `forkCreationAction` memvalidasi session, mengambil karya publik, memeriksa `canForkCreation`, lalu membuat creation baru; untuk `pixel`, `forkPixelCreation` menyalin `source.json` dan `cover.png`, menulis `forked_from`, dan mengarahkan ke editor draft baru. Atribusi/source relationship ditampilkan lewat `RemixStrip` di halaman detail dan daftar remix publik; `loadRemixStripAction` belum dipanggil.

**Yang sudah selesai:**
- Remix menghasilkan karya baru; karya sumber tidak diubah.
- Source pixel disalin dan cover PNG diikutsertakan.
- Hubungan `forked_from` tercatat.
- Kreator/karya sumber mendapat atribusi di UI terkait.

**Keputusan owner (K1/K2):**
- Remix terbuka untuk semua karya `published`.
- Atribusi sumber wajib dan terlihat dua arah.
- Enforcement penuh: UI, Server Action, DB trigger/policy, dan Storage `source.json`.
- Tidak ada opt-in, approval, atau kolom kebijakan per-karya.

**Yang masih terbuka:**
- `allow_png_download` tetap terpisah dari izin remix; jangan dipakai sebagai pengganti.
- Enforcement DB/storage belum sepenuhnya mengikuti aturan publik + `forked_from` wajib.
- Remix non-pixel belum muncul di count/strip; atribusi bisa hilang jika sumber di-hidden; `stage_ground` belum ikut tersalin.

**Next action:** A1 dan A2 selesai; minta go-ahead untuk A3 (DB/Storage). Jangan membangun ulang fork/source attribution.

---

## B. Challenge

**Status saat ini:** `DECIDED — PRODUCT ONLY; NOT IMPLEMENTED`. Tidak ada implementasi, tabel, atau endpoint Challenge.

**Keputusan owner (K3–K6):**
- Challenge memakai entitas terpisah; kiriman tetap creation ber-`forked_from`.
- Open Challenge lebih dulu. Peserta memulai dari salinan gambar dasar, bebas mewarnai/menambah/mengubah, lalu menerbitkan hasil sebagai karya baru.
- Admin/owner membuka dan menutup; deadline opsional; kiriman tetap bisa diedit sampai ditutup.
- Atribusi mencakup template, kreator Challenge, dan rantai remix.

**Koreksi:** layer lock dan alpha lock **sudah tersedia** di Studio. Yang belum ada hanyalah aturan Challenge seperti “region ini harus dipertahankan”. Guided Challenge tetap ditunda.

**Ketergantungan:** model `creations`/fork saat ini, kebijakan remix bagian A, dan moderasi laporan/admin yang sudah ada. Gunakan migrasi additive; jangan menimpa migrasi lama.

**Next action:** B1 selesai sebagai spec yang ditandatangani; implementasi B2–B6 menunggu go-ahead. B6 tetap runtime gate, bukan izin implementasi. Dokumen ini tidak menjadi izin implementasi.

---

## C. Pixel Assets

**Status saat ini:** `DECIDED — PRODUCT ONLY; NOT IMPLEMENTED`. Tidak ada tabel `stamps`/`assets`, endpoint, bucket, atau editor asset panel.

**Keputusan owner (K7–K9):**
- Nama final: **Pixel Assets**. Hindari `Stamp` sebagai label produk karena editor sudah memakai `stampBrush`.
- Aset disalin ke dokumen pengguna; provenance ikut tersimpan.
- Kredit ke pembuat wajib ditampilkan.
- Target laporan aset baru dengan hide/restore admin; rantai moderasi lengkap harus berubah bersamaan. `reports.target_type` saat ini masih `creation`, `comment`, `space_element`.

**Masih detail spec:** favorites, packs, recent, dan featured; path/bucket, MIME, dan batas ukuran; copy UI.

**Next action:** C1 selesai sebagai spec yang ditandatangani; implementasi C2–C6 menunggu go-ahead. Gunakan migrasi additive.

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
