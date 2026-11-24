# Spesifikasi Remix (K1/K2) — cakupan A1–A5, spec only

**Document:** `docs/master-plan/SPEC-REMIX.md`<br />
**Purpose:** Merangkum baseline terverifikasi, perilaku produk K1/K2, dan gate spec sebelum ada implementasi remix.<br />
**Status:** APPROVED — SIGNED OFF 2026-11-25; A2 AUTHORIZED AND IMPLEMENTED — A3–A5 BLOCKED<br />
**Updated:** 2026-11-25<br />
**Source of truth:** `docs/PRODUCT-SPEC.md:88,284-286,496-497`, `docs/TECHNICAL-SPEC.md:266,306,417,490,546-553`, `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md` §5<br />
**Backlog decisions:** K1 = publik + atribusi; K2 = full enforcement UI + Server Action + DB + Storage — DECIDED 2026-11-25<br />
**Scope:** Remix/fork creation saja; A1–A5 dari brief. Bukan Challenge, Pixel Assets, atau kolaborasi D.<br />
**Dependencies:** Review Stage 0.4, go-ahead owner, dan operator migration/policy application.<br />
**Next action:** A2 selesai 2026-11-25; minta go-ahead terpisah untuk A3. Tidak ada kode A3–A5, migrasi, policy, atau dependency yang dibuat dari spec ini.

> Spec ini **disetujui owner 2026-11-25**. Persetujuan itu mengizinkan A2 saja; A3–A5 tetap memerlukan go-ahead terpisah. A2 mengubah action + test; tidak ada migrasi, policy, dependency, atau perubahan UI dari dokumen ini.
>
> K1: semua karya `published` dapat di-remix; atribusi sumber wajib. K2: aturan yang sama berlaku di UI, Server Action, database, dan Storage. Tidak ada opt-in, approval flow, atau kolom kebijakan per-karya.
>
> Gunakan bahasa migrasi **additive** saja. Jangan menulis ulang atau melemahkan migrasi/policy lama, termasuk `tests/resource-cleanup.test.ts:28-32`.
>
> `VERIFIED IN CODE` / `VERIFIED BY TEST` hanya berarti bukti source atau assertion ada. Bukan bukti browser, produksi, “aman”, `production-ready`, `shipped`, atau fitur selesai.

---

## 1. Ringkasan dan status

| Item | Status |
|---|---|
| Keputusan owner K1/K2 | VERIFIED — tercatat di `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md:180-181`, `docs/PRODUCT-SPEC.md:286`, `docs/TECHNICAL-SPEC.md:550` |
| Spec ini | APPROVED — SIGNED OFF 2026-11-25 |
| Implementasi A1–A5 | A1 DONE; A2 DONE 2026-11-25 (action + test); A3–A5 BLOCKED |
| Gate migrasi/policy + smoke | READY FOR OPERATOR hanya setelah A3 additive disetujui dan dijalankan operator; belum dijalankan |

Keputusan produk final dan spec ditandatangani. A2 (sumber keputusan server) sudah dikerjakan; turunan teknis §4–§6 untuk A3–A5 tetap tertunda dan tidak diubah. Fondasi fork yang ada dipakai ulang, bukan dibangun ulang.

## 2. Current verified baseline

### VERIFIED IN CODE

- `forkCreationAction` — `features/creations/actions.ts:561-622`: validasi `forkCreationSchema`, butuh profil dan sumber published, redirect self-fork ke editor sendiri (`:576-578`), memanggil `canForkCreation` (`:579`), batas `CREATION_PER_MEMBER_MAX` (`:582-585`), membuat draft baru ber-`forked_from` untuk pixel dan non-pixel (`:590-621`).
- `forkPixelCreation` — `features/creations/actions.ts:632-726`: menyalin `source.json` dan `cover.png`, memvalidasi ukuran/JSON/PNG, mengunggah ulang ke path milik forker, serta rollback baris dan objek saat gagal.
- `canForkCreation` — `lib/auth/permissions.ts:83-88`: login + `creationStatus === "published"`. Izin unduh PNG terpisah di `canDownloadCreationPng` — `lib/auth/permissions.ts:90-99` — memakai `allowPngDownload`.
- Trigger `creations_validate_fork` — `supabase/migrations/20261116050000_community.sql:22-47`: `forked_from` wajib mengarah ke creation dengan `status = 'published'`.
- `creations_insert_own` — `supabase/migrations/20261116030000_creations.sql:63-67`: `with check (user_id = auth.uid() and status = 'draft')`; tidak ada kolom policy remix per-karya.
- Storage — `supabase/migrations/20261116110000_artwork_conversation.sql:99-114`: `pixel_source_select_published_authenticated` mengizinkan member SELECT `source.json` hanya untuk karya `published`.
- Atribusi dua arah — `components/creations/RemixStrip.tsx:23-56`, `app/[lang]/(public)/creation/[id]/page.tsx:126,256-260,331-341`, `components/community/CreationCommunity.tsx:233-239`, query `features/creations/queries.ts:576-659`.
- `loadRemixStripAction` — `features/creations/recommendation-actions.ts:37-42` — ada, tetapi halaman memanggil `listPublishedRemixes` langsung; action tersebut belum terpasang.

### VERIFIED BY TEST

- `tests/detail-hierarchy.test.ts:52-60` — `CreationEngagement`, `CreationMoreMenu`, `allowFork={!isOwner}`, `RemixStrip`, `ForkForm`.
- `tests/detail-recommendations.test.ts:8-27` — `RemixStrip` memakai `WorkTile` dan `recommendationStripListClass`.
- `tests/download-permission.test.ts:73-96` — remix dan unduh PNG ditegaskan terpisah.
- `tests/rls-community.test.ts:20-26` — `canForkCreation` untuk karya `published`.

Ini assertion source/teks, bukan integration test fork end-to-end.

### Gap — VERIFIED IN CODE, perbaikan PROPOSED

- `stage_ground` dari header sumber tidak ikut tersalin — `features/creations/actions.ts:671-674,695-702`.
- Remix non-pixel tidak masuk count/strip karena filter `type = "pixel"` — `features/creations/queries.ts:576-617`.
- Atribusi hilang saat sumber di-hidden/unpublish: resolver `source` menyaring `published` — `features/creations/queries.ts:643-660` — dan `RemixStrip` hanya render bila `source` ada — `components/creations/RemixStrip.tsx:23`.
- UI + Server Action saja tidak cukup: INSERT langsung atau akses objek Storage dapat melewati keduanya bila trigger/RLS/policy tidak selaras.
- `loadRemixStripAction` belum dipakai — `features/creations/recommendation-actions.ts:37-42`.

## 3. Product behavior

Status keputusan: VERIFIED. Spec ditandatangani 2026-11-25; perilaku di bawah berlaku sebagai desain produk, bukan bukti bahwa A3–A5 sudah diimplementasi.

1. Member login dapat me-remix karya `published`; karya `draft` atau `hidden` tidak dapat di-remix. Self-fork tetap mengarah ke editor sendiri — `features/creations/actions.ts:576-578` — bukan remix baru.
2. Remix membuat draft baru milik forker dengan `forked_from` sumber. Untuk pixel, salinan yang dipakai adalah editor source, lalu PNG — `docs/TECHNICAL-SPEC.md:490` — bukan PNG dari client.
3. Atribusi sumber wajib terlihat dua arah: tautan sumber pada halaman remix dan daftar remix published pada halaman sumber.
4. Unduh PNG resmi tetap diatur oleh `allow_png_download` dan `CreationMoreMenu`; K1/K2 tidak mengubahnya.
5. Tidak ada state `allow` / `ask` / `closed`, permintaan persetujuan, notifikasi, atau kolom kebijakan per-karya.

## 4. Proposed server/permission design

> Satu keputusan, satu sumber: `canForkCreation`. Jika UI, action, trigger/RLS, atau Storage berbeda, selaraskan ke sumber itu; jangan menambah cabang kebijakan paralel.

| Titik | Usulan | Status |
|---|---|---|
| Decision source | `canForkCreation` — `lib/auth/permissions.ts:83-88` — tetap mengekspresikan K1/K2. `forkCreationAction` memanggilnya di `features/creations/actions.ts:579`; tidak ada cabang izin remix lain di action. Self-fork `:576-578`, batas `:582-585`, dan validasi tipe `:582` bukan kebijakan remix dan tidak menggantikan check ini. | PROPOSED |
| Server Action | `features/creations/actions.ts:561-622` memakai hasil `canForkCreation` sebelum insert/copy. Error `forbidden` tetap lewat `CreationActionState`; tidak ada jalur “ask/approval”. | PROPOSED |
| Trigger DB | Publish-only check pada `creations_validate_fork` — `supabase/migrations/20261116050000_community.sql:22-47` — dipertahankan. Perubahan bila perlu hanya lewat migrasi additive baru, bukan edit migrasi lama. | PROPOSED |
| INSERT RLS | `creations_insert_own` — `supabase/migrations/20261116030000_creations.sql:63-67` — tetap `user_id = auth.uid()` + `status = 'draft'`; `forked_from` tidak boleh dipakai untuk mengarah ke sumber non-published. Tanpa kolom policy baru. | PROPOSED |
| Storage SELECT | `pixel_source_select_published_authenticated` — `supabase/migrations/20261116110000_artwork_conversation.sql:99-114` — tetap published-only untuk `source.json`; jangan memperluas ke `draft`/`hidden`. Policy tambahan bersifat additive. | PROPOSED |
| PNG permission | `canDownloadCreationPng` — `lib/auth/permissions.ts:90-99` — dan `allow_png_download` tetap terpisah dari remix; assertion `tests/download-permission.test.ts:73-96` tidak dilemahkan. | PROPOSED |
| Source copy + rollback | Pertahankan `downloadPixelObject`, `persistPixelFiles`, validasi `parsePixelSource`/`isPngBuffer`, dan rollback di `features/creations/actions.ts:624-725`. Jangan mempercayai PNG dari client. | PROPOSED |
| `stage_ground` | Apakah header remix harus menyalin `stage_ground` dari sumber — `features/creations/actions.ts:671-674,695-702` — belum diputus. | PROPOSED |
| Non-pixel remix | Apakah count/strip harus menghitung semua tipe, bukan hanya `pixel` — `features/creations/queries.ts:576-617` — belum diputus. | PROPOSED |
| Atribusi saat parent hidden | Apakah kredit tetap disimpan sebagai snapshot bila sumber di-hidden/unpublish — `features/creations/queries.ts:643-660` — belum diputus. | PROPOSED |
| `loadRemixStripAction` | Apakah detail page dipindahkan ke action itu — `features/creations/recommendation-actions.ts:37-42` — atau tetap memakai query langsung, belum diputus. | PROPOSED |

## 5. Proposed UI state and copy

Semua copy harus berasal dari `lib/copy.ts` untuk `id` dan `en`. Teks final untuk state baru **tidak diciptakan di sini**; key baru ditandai PROPOSED dan menunggu §7.

| UI / state | Sumber copy saat ini | Status |
|---|---|---|
| Member eligible, `pending`, jumlah remix | `copy.fork`, `copy.forkWorking`, `copy.remixCount` — `lib/copy.ts:1011-1012,1019`; `components/community/CreationCommunity.tsx:963-971,993-999` | VERIFIED IN CODE |
| Belum login | `copy.remixSignIn` — `lib/copy.ts:1020-1023`; link di `components/community/CreationCommunity.tsx:973-982` | VERIFIED IN CODE |
| Error action (`not_authenticated`, `forbidden`, `not_found`, `invalid_input`, `limit_reached`, `payload_too_large`, `not_configured`) | `copy.errors[state.error]` — `components/community/CreationCommunity.tsx:988-992`, keys di `lib/copy.ts:1712,1768-1794`; `forkedUnavailable` di `lib/copy.ts:1014-1017` | VERIFIED IN CODE |
| Atribusi sumber / daftar remix | `copy.remixFrom`, `copy.remixCount` — `lib/copy.ts:1018-1019`; `components/creations/RemixStrip.tsx:23-56`; `copy.forkedFrom` / `forkedUnavailable` di `components/community/CreationCommunity.tsx:233-239` | VERIFIED IN CODE |
| `CreationMoreMenu` | Hanya unduh PNG — `components/creations/CreationMoreMenu.tsx:52-104`; izin di `lib/auth/permissions.ts:90-99` | VERIFIED IN CODE |
| Teks/error state baru bila diperlukan | Key baru di `lib/copy.ts` untuk `id` dan `en`; mapping final belum disetujui | PROPOSED |

`RemixStrip` tetap dua mode: mode sumber pada `app/[lang]/(public)/creation/[id]/page.tsx:126` dan mode daftar pada `:256-260,331-341`. Jangan menampilkan tombol remix pada karya `draft`/`hidden` sebagai ganti error server; UI hanya mencerminkan aturan yang sama.

## 6. Test gates

Perluas assertion yang ada; jangan hapus atau lemahkan. Gate A2 DONE; gate A3–A5 tetap BLOCKED sampai go-ahead terpisah.

| Gate | Tindakan | Status |
|---|---|---|
| Permission | `tests/rls-community.test.ts:20-29` kini menguji `published` / `draft` / `hidden` / `sessionUserId: null` pada `canForkCreation`. | DONE 2026-11-25 |
| Pemisahan PNG | `tests/download-permission.test.ts:73-96` dipertahankan; A2 tidak mengubah `canDownloadCreationPng`. | DONE — assertions lama dipertahankan |
| Detail hierarchy | `tests/detail-hierarchy.test.ts:52-60` dipertahankan — `allowFork={!isOwner}`, `CreationMoreMenu`, `RemixStrip`, `ForkForm`. | DONE — assertions lama dipertahankan |
| Recommendations | `tests/detail-recommendations.test.ts:8-27` dipertahankan — `WorkTile`, `recommendationStripListClass`. | DONE — assertions lama dipertahankan |
| Source-text review | `tests/create-edit.test.ts:51-64` mengunci satu call `canForkCreation`, urutan sebelum self-fork, dan tanpa helper izin paralel di action. Cek migrasi/Storage tetap gate A3. | DONE untuk A2; A3 BLOCKED |
| Policy review | Review manual migrasi additive, `creations_insert_own`, `creations_validate_fork`, dan policy `pixel_source_select_published_authenticated`; jangan klaim RLS aman hanya dari test source. | PROPOSED |
| Guard lama | `tests/resource-cleanup.test.ts:28-32` tetap melarang pola realtime; tidak disentuh. | PROPOSED |
| Operator | Setelah migrasi/policy additive diapply operator: urutan migrasi, verifikasi RLS/Storage di lingkungan nyata, smoke signed-in fork published/draft, dan unduh PNG. Bukti runtime dicatat terpisah. | READY FOR OPERATOR (setelah sign-off) |

## 7. Open details — signed off as recorded, implementation deferred

K1/K2 tidak dibuka kembali. Owner menandatangani spec 2026-11-25; butir di bawah tetap tercatat sebagai detail yang belum diimplementasi, bukan izin A3–A5:

1. Apakah `stage_ground` ikut disalin saat fork pixel — `features/creations/actions.ts:671-674,695-702`.
2. Apakah remix non-pixel ikut dihitung dan tampil di strip — `features/creations/queries.ts:576-617`.
3. Apakah atribusi tetap tampil bila sumber di-hidden/unpublish, dan bila ya, apakah memakai snapshot nama/author — `features/creations/queries.ts:643-660`.
4. Apakah `loadRemixStripAction` — `features/creations/recommendation-actions.ts:37-42` — dipasang atau query langsung dipertahankan.
5. Teks final dan mapping error state baru; key `id`/`en` di `lib/copy.ts` belum disetujui.
6. Nama/urutan migrasi dan policy additive, serta apakah policy lama sudah cukup atau perlu policy tambahan.
7. Jendela dan bukti operator verification; tidak boleh dianggap selesai hanya karena test source lulus.

## 8. Definition of done before implementation

- [x] Spec A1–A5 ditulis sebagai dokumen terpisah dengan status APPROVED — SIGNED OFF 2026-11-25.
- [x] Owner menandatangani spec ini 2026-11-25; item §7 dicatat sebagai deferred, bukan diimplementasi.
- [ ] Baseline `VERIFIED IN CODE` / `VERIFIED BY TEST` di §2 ditinjau ulang terhadap HEAD saat implementasi dimulai.
- [x] A2: satu sumber keputusan `canForkCreation` di Server Action, dengan gate sebelum self-fork dan tanpa helper izin paralel. UI, trigger/RLS, dan Storage tetap gate A3–A4.
- [ ] Perubahan DB/Storage dirancang additive; tidak ada rewrite migrasi lama atau weakening `tests/resource-cleanup.test.ts:28-32`.
- [ ] Pemisahan izin PNG tercantum dan assertion `tests/download-permission.test.ts:73-96` dipertahankan.
- [ ] Semua copy baru tersedia di `lib/copy.ts` untuk `id` dan `en` sebelum UI disentuh.
- [ ] Test gate di §6 dipecah menjadi task dengan exit criteria; tidak ada assertion yang dilemahkan.
- [ ] Operator gate direncanakan sebagai bukti terpisah; tidak ada klaim browser, produksi, aman, `production-ready`, atau `shipped` dari dokumen ini.
- [x] Perubahan dibatasi pada A2 (action + test + docs); tidak ada A3–A5, migrasi, policy, dependency, atau UI yang digarap.
