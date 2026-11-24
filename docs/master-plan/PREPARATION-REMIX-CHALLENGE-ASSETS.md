# Persiapan Remix, Challenge, dan Community Assets — Brief Keputusan

**Document:** `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md`  
**Purpose:** Mengaudit status kode, merangkum keputusan owner yang mem-blok, dan mengusulkan urutan kerja bertahap untuk A–C.  
**Status:** PREPARATION ONLY — NOT IMPLEMENTATION AUTHORIZATION  
**Updated:** 2026-11-25  
**Source of truth:** `docs/PRODUCT-SPEC.md`, `docs/TECHNICAL-SPEC.md`, `docs/IMPLEMENTATION-PLAN.md` (§14/§15)  
**Backlog input:** `docs/master-plan/arah-pengembangan-pxlb.md` — backlog/vision, bukan source of truth  
**Scope:** A. Remix, B. Challenge, C. Community Assets / Pixel Assets  
**Out of scope:** D. Kolaborasi langsung — tetap `VISION ONLY — NOT APPROVED FOR IMPLEMENTATION`  
**Dependencies:** fork/attribution yang ada, pipeline publish creation, moderation/report, keputusan owner K1–K9  
**Next action:** Owner memilih K1–K9. Setelah itu, perbarui spec sumber sebelum ada kode, migrasi, dependency, atau perubahan test.

> Dokumen ini bukan izin implementasi. Tidak ada kode aplikasi, migrasi, endpoint, dependency, atau test yang boleh dibuat dari brief ini.
>
> `VERIFIED IN CODE` / `VERIFIED BY TEST` hanya berarti bukti source atau assertion ada. Bukan bukti browser, bukan bukti produksi, dan bukan klaim fitur selesai.
>
> Gunakan migrasi **additive**. Jangan menulis ulang migrasi lama. Jangan melemahkan `tests/resource-cleanup.test.ts`.

---

## 1. Ringkasan audit

| Area | Status saat ini | Yang terverifikasi | Gap utama | Gate |
|---|---|---|---|---|
| A. Remix | **PARTIAL — VERIFIED IN CODE / VERIFIED BY TEST** | Fork action, salinan source + PNG, `forked_from`, atribusi dua arah, izin login + published | Tidak ada kebijakan per-karya; check server masih bisa dilewati via INSERT/storage RLS | K1, K2 |
| B. Challenge | **NOT STARTED — VERIFIED ABSENCE** | Tidak ada tabel, endpoint, action, atau UI Challenge. Fondasi creation/fork/moderation tersedia | Semua aturan lifecycle/ownership/submission belum diputus | K3–K6 |
| C. Community Assets | **NOT STARTED — VERIFIED ABSENCE** | Tidak ada tabel `assets`/`stamps`, endpoint, panel, atau bucket aset. `stampBrush` hanya helper internal | Nama, provenance, lisensi, copy vs reference, dan target moderasi belum diputus | K7–K9 |
| D. Kolaborasi langsung | **OUT OF SCOPE — VISION ONLY** | Tidak ada realtime, `canvas_tiles`, stroke RPC, presence, atau broadcast | Tidak boleh dimulai tanpa persetujuan owner eksplisit | Tidak dibahas di brief ini |

**Kesimpulan audit:** fondasi A sudah ada dan harus dipakai ulang, bukan dibangun ulang. B dan C benar-benar kosong dari sisi data/endpoint/UI, tetapi bisa memakai ulang creation pipeline, fork, atribusi, dan moderation yang sudah ada.

---

## 2. Audit A — Remix

### 2.1 VERIFIED IN CODE

- `forkCreationAction` — `features/creations/actions.ts:561-622`:
  - memvalidasi `forkCreationSchema`;
  - membutuhkan profil dan karya sumber published;
  - mengarahkan owner ke editor sendiri sebelum pengecekan izin (`:576-578`);
  - memanggil `canForkCreation` (`:579`);
  - membatasi jumlah karya dengan `CREATION_PER_MEMBER_MAX` (`:582-585`);
  - membuat draft baru dengan `forked_from` untuk pixel dan non-pixel.
- `forkPixelCreation` — `features/creations/actions.ts:632-726`:
  - menyalin `source.json` dan `cover.png` dari storage pemilik sumber;
  - memvalidasi ukuran, JSON, dan PNG;
  - mengunggah ulang ke path milik pengguna yang fork;
  - memiliki rollback baris dan objek saat kegagalan.
- Izin — `lib/auth/permissions.ts:83-88`: `canForkCreation` hanya mengecek login + `status === "published"`.
- Izin unduh PNG terpisah — `lib/auth/permissions.ts:90-99`; tidak dipakai sebagai izin remix.
- Atribusi:
  - `components/creations/RemixStrip.tsx:23-56` — mode sumber dan daftar remix;
  - `app/[lang]/(public)/creation/[id]/page.tsx:126,256-260,331-341`;
  - studio: `app/[lang]/(member)/create/[id]/page.tsx:47-64`, `components/creations/PlaygroundForm.tsx:1448`.
- Query remix — `features/creations/queries.ts:576-617,620-659`.
- DB — `supabase/migrations/20261116030000_creations.sql:12-24,63-75`; trigger fork di `20261116050000_community.sql:22-47`.
- Storage — `20261116110000_artwork_conversation.sql:99-114` memberikan akses baca `source.json` karya published kepada member.

### 2.2 VERIFIED BY TEST

- `tests/detail-hierarchy.test.ts:52-60` — `CreationEngagement`, `CreationMoreMenu`, `allowFork={!isOwner}`, `RemixStrip`, `ForkForm`.
- `tests/detail-recommendations.test.ts:8-27` — `RemixStrip` memakai `WorkTile` dan `recommendationStripListClass`.
- `tests/download-permission.test.ts:73-96` — remix dan unduh PNG ditegaskan terpisah.
- `tests/rls-community.test.ts:20-26` — `canForkCreation` untuk karya published.

Ini adalah assertion sumber/teks, bukan integration test perilaku fork end-to-end.

### 2.3 Gap yang belum ada

- Tidak ada kolom kebijakan remix per-karya. Yang ada hanya `allow_png_download`, dan itu bukan izin remix.
- Tidak ada state `allow` / `ask` / `closed`, entitas permintaan persetujuan, notifikasi, atau target laporan remix.
- `canForkCreation` tidak bisa mengekspresikan aturan owner atau per-karya.
- Pertahanan lapisan data belum siap untuk kebijakan baru:
  - `creations_insert_own` — `20261116030000_creations.sql:63-67` — mengizinkan `forked_from` sembarangan pada draft milik sendiri;
  - storage RLS masih memberi akses baca `source.json` published kepada member;
  - UI + server action saja tidak cukup untuk kebijakan `closed`.
- Remix non-pixel tercatat, tetapi tidak muncul di count/strip karena filter query khusus `pixel`.
- Atribusi hilang saat karya sumber di-hidden/unpublish karena resolver `source` menjadi null dan query remix menyaring published.
- `stage_ground` dari header sumber tidak ikut tersalin — `features/creations/actions.ts:671-674`.
- `loadRemixStripAction` — `features/creations/recommendation-actions.ts:37-42` — belum dipanggil; halaman memakai `listPublishedRemixes` langsung.

### 2.4 Bisa dipakai ulang

Jangan membangun ulang:
- `forkCreationAction` dan `forkPixelCreation`;
- `downloadPixelObject`, `persistPixelFiles`, dan jalur rollback;
- `forkCreationSchema`, `CreationActionState`, error UI `ForkForm` dengan `useActionState`;
- copy keys `fork`, `forkWorking`, `remixSignIn`, `remixCount`, `remixFrom`, `forkedFrom`, `forkedUnavailable`;
- `RemixStrip` dua mode, `countPublishedRemixes`, `listPublishedRemixes`, `getPublishedCreation.source`;
- trigger `creations_validate_fork` dan policy storage sebagai titik perluasan, bukan penggantian.

### 2.5 Koreksi pada backlog

- `arah-pengembangan-pxlb.md:6` merujuk `page.tsx:128,266,339-348`; posisi saat ini `:126,256-260,331-341`.
- `lib/pixel.ts:85-104` bukan bukti remix; itu union `PixelDrawTool`.
- `tests/resource-cleanup.test.ts:28-32` adalah guard realtime/D, bukan bukti remix.
- “Recommendation actions” pada `:31` overstated: atribusi ada di `RemixStrip`/conversation/studio, tetapi `loadRemixStripAction` belum terpasang.
- Klaim “source.json disalin” benar untuk byte file, tetapi `stage_ground` tidak ikut.

---

## 3. Audit B — Challenge

### 3.1 VERIFIED ABSENCE

- Tidak ada tabel `challenges` di migrasi mana pun.
- Tidak ada route handler, server action, endpoint, lifecycle, deadline, submission, atau UI Challenge.
- Tidak ada Challenge-specific test.

### 3.2 Fondasi yang tersedia

- Status creation `draft|published|hidden`, `published_at`, dan `forked_from` — `20261116030000_creations.sql:12-24`.
- Publish/unpublish:
  - `createDraftSchema`, `updateCreationSchema`, `parseCreationContent(..., mode)` — `lib/validations/creation.ts:247-293`;
  - `createDraftAction`, `updateCreationAction`, `updatePixelCreationAction` — `features/creations/actions.ts:192-436`.
- Fork/submission dasar — `forkCreationAction`, `forkPixelCreation`.
- Atribusi — `RemixStrip`, `getPublishedCreation`, query remix.
- Moderation:
  - `is_admin()` dan RPC admin — `20261116050000_community.sql:6-17,262-365`;
  - `moderateReportAction` — `features/moderation/actions.ts:41-145`;
  - admin UI — `components/moderation/AdminReports.tsx:25-120`.
- Layer lock memang **sudah ada** — `components/creations/LayerPanel.tsx:701-709`, `components/canvas/PixelBoard.tsx:2737-2742,828-830`, `lib/pixel-transform.ts:241,271-277`. Transparency lock ada di `lib/pixel.ts:2353-2357`.

### 3.3 Koreksi pada backlog

`arah-pengembangan-pxlb.md:59` menyatakan region terlindungi/layer terkunci belum tersedia. Itu terlalu luas. Yang benar: **layer lock/alpha lock sudah tersedia**; yang belum ada hanyalah aturan Challenge seperti “region ini harus dipertahankan”. Guided Challenge tetap tidak diimplementasikan.

### 3.4 Keputusan yang mem-blok

- Challenge sebagai entitas terpisah atau mode pada `creations`.
- Siapa pemilik dan siapa boleh mengubah/menutup.
- Open Challenge atau Guided Challenge.
- Ada/tidaknya deadline; perilaku setelah deadline; apakah kiriman masih bisa diedit.
- Verifikasi kiriman, pelaporan, hide/restore admin.
- Atribusi ke template dan ke kreator Challenge.
- Hubungan dengan kebijakan remix A — submission kemungkinan besar memakai fork, sehingga K1 harus diputus lebih dulu.

---

## 4. Audit C — Community Assets / Pixel Assets

### 4.1 VERIFIED ABSENCE

- Tidak ada tabel `assets` atau `stamps`.
- Tidak ada endpoint/action asset, bucket asset, path storage asset, atau field provenance/lisensi.
- Tidak ada panel asset di Studio.
- `stampBrush` hanya helper internal brush — `lib/pixel.ts:339-372`. Tidak ada tool atau produk bernama `stamp` di `PixelDrawTool` — `lib/pixel.ts:84-103`.
- Target laporan saat ini hanya `creation`, `comment`, `space_element`:
  - DB CHECK — `supabase/migrations/20261116050000_community.sql:173-175`;
  - konstanta — `lib/site.ts:160-161`;
  - Zod — `lib/validations/community.ts:69-80`;
  - validasi visibility — `features/community/actions.ts:85-113`;
  - copy admin — `lib/copy.ts:1195-1199`.

### 4.2 Pola yang bisa dipakai ulang

- Pipeline creation/publish dan validasi konten.
- Storage `pixel-creations` dan `avatars` sebagai contoh konvensi path/RLS, bukan sebagai bucket aset final.
- Alur report + admin hide/restore.
- Pola UX `recent`/`favorites` pada color memory — `lib/pixel-color-memory.ts:73`, `components/creations/ColorPicker.tsx:67` — hanya sebagai pola tampilan, bukan sistem aset.

### 4.3 Keputusan yang mem-blok

- Nama final: **Community Assets** atau **Pixel Assets**. Hindari `Stamp` sebagai label produk.
- Aset disalin ke dokumen pengguna atau direferensikan dinamis.
- Favorites, packs, recent, featured: filter/tampilan atau relasi data baru.
- Lisensi: bebas, wajib kredit, atau izin eksplisit.
- Provenance tetap terbaca saat aset dipakai di karya lain.
- Target moderasi/laporan aset dan perilaku hide/restore.
- Skema additive, path storage, MIME, dan batas ukuran.

---

## 5. Keputusan owner yang mem-blok implementasi

Semua rekomendasi di bawah adalah **PROPOSED — AWAITING OWNER DECISION**, bukan keputusan final.

| ID | Keputusan | Opsi | Rekomendasi persiapan | Mem-blok |
|---|---|---|---|---|
| K1 | Kebijakan remix | Publik + aturan umum / opt-in / butuh persetujuan | Mulai dari “publik + atribusi jelas” jika prioritas adalah proses paling ringan; opsi lain butuh kolom baru dan alur persetujuan | A1–A4, B submission |
| K2 | Enforcement remix | UI saja / UI + server / UI + server + DB + storage | UI + server + DB + storage bila K1 bukan “publik”; jangan hanya mengganti `canForkCreation` | A2, A3 |
| K3 | Model Challenge | Entitas terpisah / mode pada `creations` | Entitas `challenges` + kiriman tetap creation ber-`forked_from`; hindari pencampuran deadline/owner ke feed creation biasa | B1–B5 |
| K4 | Jenis Challenge pertama | Open / Guided | Open Challenge lebih dulu; Guided menunggu definisi region terlindungi | B1, B3 |
| K5 | Lifecycle Challenge | Owner, edit/close, deadline, editability, verifikasi | Putuskan paket aturan sekaligus agar RLS dan UI tidak berubah berulang | B2, B4 |
| K6 | Atribusi Challenge | Template saja / template + kreator Challenge / keduanya + remix chain | Simpan dua tautan provenance sejak awal | B3 |
| K7 | Nama produk aset | Community Assets / Pixel Assets | Pilih salah satu; jangan pakai `Stamp` sebagai nama produk | C0–C4 |
| K8 | Model pemakaian aset | Copy ke dokumen / referensi dinamis | Copy + provenance tersimpan untuk rilis awal; referensi dinamis ditunda | C1, C3 |
| K9 | Lisensi, provenance, moderasi aset | Bebas / wajib kredit / izin eksplisit; target laporan baru atau reuse `creation` | Tentukan sebelum schema dan copy UI; perubahan target laporan harus menyeluruh | C1, C5 |

---

## 6. Rencana implementasi bertahap — usulan, belum dieksekusi

Semua stage di bawah berstatus **BLOCKED** sampai keputusan terkait dan spec sumber diperbarui. Tidak ada stage yang boleh dimulai hanya dari dokumen ini.

### 6.0 Stage 0 — Decision freeze dan spec (semua fitur)

| Langkah | Tindakan | Exit criteria | Status |
|---|---|---|---|
| S0.1 | Owner memilih K1–K9 | Semua keputusan bertulis, bukan asumsi agent | BLOCKED |
| S0.2 | Perbarui `PRODUCT-SPEC.md` / `TECHNICAL-SPEC.md` sesuai keputusan | Perubahan perilaku, data, dan keamanan tercatat sebelum kode | BLOCKED |
| S0.3 | Perbarui catatan bukti di backlog A–C | Referensi usang dan koreksi layer lock dirapikan | BLOCKED |
| S0.4 | Tulis spec teknis kecil per fitur yang disetujui | Schema, RLS, UI state, error state, copy, dan test gate jelas | BLOCKED |

### 6.1 A — Remix

| Stage | Tindakan | Exit criteria | Verifikasi | Status |
|---|---|---|---|---|
| A1 | Speckan kebijakan remix dan copy UI | K1/K2 tertuang dalam spec; error state `ForkForm` diketahui | Review spec | BLOCKED |
| A2 | Satukan check izin di server | `canForkCreation` menjadi sumber keputusan; action tidak punya cabang izin tersembunyi | Test permission unit/source | BLOCKED |
| A3 | Perkuat enforcement data | Trigger `creations_validate_fork`, `creations_insert_own`, dan storage SELECT mengikuti K1/K2 | RLS policy review + test source | BLOCKED |
| A4 | UI/error copy | `ForkForm`, `CreationMoreMenu`, dan RemixStrip memakai copy dari `lib/copy.ts` | `detail-hierarchy`, `download-permission`, source test | BLOCKED |
| A5 | Operator handoff | Migrasi baru diapply berurutan; smoke fork/published/draft | §14 checklist + bukti operator | BLOCKED |

Catatan: jika K1 = “publik + aturan umum”, A3 bisa menjadi penyesuaian kecil tanpa kolom baru. Jika K1 = opt-in/approval, A3 wajib menyentuh DB dan storage.

### 6.2 B — Challenge

| Stage | Tindakan | Exit criteria | Verifikasi | Status |
|---|---|---|---|---|
| B1 | Tulis spec Model Challenge | K3–K6 tertuang; hubungan dengan fork dan remix jelas | Review spec | BLOCKED |
| B2 | Schema additive | Tabel/challenge metadata dan relasi submission dibuat tanpa mengubah migrasi lama | Migration review | BLOCKED |
| B3 | Lifecycle & owner actions | Role owner/admin, buka/tutup, deadline, dan editability sesuai K5 | Permission test + admin UI test | BLOCKED |
| B4 | UI detail & submission | Submit memakai ulang fork; atribusi template + kreator Challenge muncul | Source test `detail-hierarchy` + copy review | BLOCKED |
| B5 | Moderasi & laporan | Jika target baru dipilih, seluruh rantai target diubah bersamaan | Moderation test + admin smoke | BLOCKED |
| B6 | Runtime gate | Browser/operator checklist dijalankan; bukan hanya source test | Bukti browser/operator | BLOCKED |

Batasan: fork saat ini menolak fork karya sendiri dan mensyaratkan sumber published — `features/creations/actions.ts:576-585`. Perilaku template-owner harus diputus di K5, bukan dipaksa lewat workaround UI.

### 6.3 C — Community Assets / Pixel Assets

| Stage | Tindakan | Exit criteria | Verifikasi | Status |
|---|---|---|---|---|
| C1 | Tulis spec aset | K7–K9 tertuang: nama, lisensi, provenance, copy/reference | Review spec | BLOCKED |
| C2 | Schema & storage additive | Tabel aset, bucket/path, MIME, batas ukuran, RLS | Migration + policy review | BLOCKED |
| C3 | Publish asset flow | Validasi, moderasi awal, dan provenance creator tersimpan | Action/validation test | BLOCKED |
| C4 | Insert ke Studio | Aset disalin ke dokumen bila K8 = copy; tidak ada produk bernama `stamp` | Studio source test + copy review | BLOCKED |
| C5 | Discovery | Favorites/packs/recent/featured sesuai K9; filter dulu sebelum relasi baru | UI/source test | BLOCKED |
| C6 | Moderasi & runtime | Target laporan jika disetujui; lalu browser/operator smoke | Moderation test + bukti runtime | BLOCKED |

### 6.4 Rantai moderasi bersama

Jika owner menyetujui target laporan baru untuk Challenge atau aset, perubahan harus **seluruhnya** mencakup:

1. DB CHECK dan trigger visibility — `20261116050000_community.sql:173-175,219-260`;
2. `REPORT_TARGET_TYPES` / tipe — `lib/site.ts:160-161`;
3. Zod schema — `lib/validations/community.ts:69-80`;
4. `targetIsVisible` dan validasi action — `features/community/actions.ts:85-113`;
5. `describeTarget`, `applyHideRestore`, RPC admin — `features/moderation/actions.ts:41-145`;
6. copy admin — `lib/copy.ts:1195-1199`.

Perubahan sebagian akan memecah typing, UI, atau RLS.

---

## 7. Urutan dan dependency

```text
K1–K9
  └─ Stage 0: decision freeze + spec source of truth
       ├─ A Remix  ──┬─> B Challenge submission
       │             └─> C license/provenance decisions
       ├─ B Challenge (setelah A)
       └─ C Community Assets (bisa paralel dengan B setelah spec,
                              tetapi gabung perubahan moderasi dalam satu gate)
```

- A harus diputus dan dispesifikasi lebih dulu karena B memakai fork untuk submission dan C perlu kejelasan lisensi/provenance.
- B dan C boleh disiapkan paralel setelah Stage 0, tetapi perubahan target moderasi sebaiknya digabung dalam satu koordinasi.
- D tetap ditutup. Tidak ada kanal realtime, presence, broadcast, `postgres_changes`, `canvas_tiles`, atau stroke RPC.

---

## 8. Aturan verifikasi dan bukti

- `VERIFIED IN CODE` / `VERIFIED BY TEST` tidak boleh diubah menjadi `VERIFIED IN BROWSER` atau `VERIFIED IN PRODUCTION` tanpa bukti runtime.
- Gunakan status `NOT STARTED`, `BLOCKED`, `READY FOR OPERATOR`, atau `VERIFIED` seperti `IMPLEMENTATION-PLAN.md` §14.
- Perluas test yang sudah ada; jangan menghapus atau melemahkan assertion.
- `tests/resource-cleanup.test.ts:28-32` harus tetap melarang pola realtime. Jangan disentuh untuk memudahkan fitur apa pun.
- Gate operator `IMPLEMENTATION-PLAN.md` §14 tetap terbuka: migrasi, signed-in walkthrough, download permission, Community Experience, domain/redirect, Phase 8, WR, dan Layer/Group browser check.
- Jangan klaim “selesai”, “aman”, “production-ready”, atau “shipped” dari brief ini.

---

## 9. Definition of ready sebelum kode pertama

Sebelum agent atau implementator mana pun menyentuh kode, semua harus terpenuhi:

- [ ] K1–K9 diputus owner dan dicatat.
- [ ] Spec sumber diperbarui lebih dulu.
- [ ] Scope per fitur dipecah menjadi task kecil dengan exit criteria.
- [ ] Schema/RLS/storage dirancang additive; tidak ada rewrite migrasi lama.
- [ ] Copy UI berasal dari `lib/copy.ts` untuk ID dan `/en`.
- [ ] Test baru atau perluasan test diidentifikasi; tidak ada assertion yang dilemahkan.
- [ ] Jika ada target laporan baru, rantai lengkap §6.4 masuk dalam satu task.
- [ ] Bukti browser/produksi direncanakan sebagai gate terpisah.
- [ ] D tetap tertutup sebagai vision-only.

---

## 10. Lampiran bukti audit

| Klaim | Bukti | Status |
|---|---|---|
| Fork action dan salinan source/PNG ada | `features/creations/actions.ts:561-622,632-726` | VERIFIED IN CODE |
| Izin fork hanya login + published | `lib/auth/permissions.ts:83-88` | VERIFIED IN CODE |
| Izin PNG terpisah | `lib/auth/permissions.ts:90-99`, `tests/download-permission.test.ts:73-96` | VERIFIED IN CODE / BY TEST |
| Atribusi dua arah ada | `components/creations/RemixStrip.tsx:23-56`, `features/creations/queries.ts:576-659`, detail page `:126,256-260,331-341` | VERIFIED IN CODE |
| Tidak ada tabel Challenge/Assets | seluruh `supabase/migrations/` | VERIFIED ABSENCE |
| Tidak ada endpoint Challenge/Assets | `app/api/`, `features/`, `lib/`, `components/`, `scripts/` | VERIFIED ABSENCE |
| Target laporan hanya tiga | `20261116050000_community.sql:173-175`, `lib/site.ts:160-161`, `lib/validations/community.ts:69-80` | VERIFIED IN CODE |
| Layer lock sudah ada | `LayerPanel.tsx:701-709`, `PixelBoard.tsx:2737-2742,828-830`, `lib/pixel-transform.ts:241,271-277` | VERIFIED IN CODE |
| `stampBrush` hanya helper internal | `lib/pixel.ts:339-372`, `PixelDrawTool :84-103` | VERIFIED IN CODE |
| Realtime guard masih berlaku | `tests/resource-cleanup.test.ts:28-32` | VERIFIED BY TEST |
| Operator/runtime gate masih terbuka | `docs/IMPLEMENTATION-PLAN.md:403-422` | OPERATOR ACTION REQUIRED |
