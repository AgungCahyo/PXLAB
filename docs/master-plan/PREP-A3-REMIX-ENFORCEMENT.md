# A3 — Remix Enforcement (DB/Storage) — Preparation Brief

**Document:** `docs/master-plan/PREP-A3-REMIX-ENFORCEMENT.md`  
**Document purpose:** Menyiapkan ruang kerja A3 (enforcement aturan remix di database dan Storage) setelah A2 selesai. Dokumen ini **hanya persiapan**: bukan spec baru, bukan izin implementasi, dan bukan bukti bahwa A3 sudah dikerjakan.  
**Status:** PREPARATION ONLY — A3 `BLOCKED`, menunggu go-ahead owner yang eksplisit dan terpisah.  
**Updated:** 2026-11-26.  
**Implementation evidence:** VERIFIED IN CODE — `lib/auth/permissions.ts:83-88` (`canForkCreation`: login + `published`), `features/creations/actions.ts:561-590` (A2 gate sebelum self-fork dan sebelum insert), `supabase/migrations/20261116030000_creations.sql:12-24,39-89` (status, `forked_from`, RLS INSERT `user_id = auth.uid() and status = 'draft'`), `supabase/migrations/20261116050000_community.sql:22-47` (`creations_validate_fork`: sumber wajib `published`), `supabase/migrations/20261116110000_artwork_conversation.sql:99-114` (Storage `source.json` hanya untuk karya `published`, member login). VERIFIED BY TEST — `tests/rls-community.test.ts`, `tests/download-permission.test.ts`, `tests/detail-hierarchy.test.ts`, `tests/create-edit.test.ts`. VERIFIED ABSENCE — tidak ada perubahan A3 di repo pada 2026-11-26: belum ada migrasi additive baru, policy baru, atau test A3.  
**Completed:** A1 (spec K1/K2 signed-off 2026-11-25) dan A2 (satu sumber keputusan `canForkCreation` di Server Action + test) sudah selesai.  
**Open:** Go-ahead A3; hasil gap review DB/Storage; keputusan §7.6–7.7 `SPEC-REMIX.md` (nama/urutan migrasi, apakah policy lama sudah cukup, jendela pembuktian operator); item §7.1–7.5 tetap deferred ke A4/A5; operator migration dan signed-in smoke.  
**Dependencies:** `docs/master-plan/SPEC-REMIX.md` §4, §6, §7, §8; `docs/PRODUCT-SPEC.md`; `docs/TECHNICAL-SPEC.md`; `docs/IMPLEMENTATION-PLAN.md` §14; `docs/master-plan/arah-pengembangan-pxlb.md`.  
**Next action:** Minta go-ahead owner untuk A3. Setelah itu: review gap DB/Storage → jalankan A3.1–A3.5 di bawah → serahkan ke operator. Jangan mulai A4/A5, B2–B6, C1–C6, atau kolaborasi langsung dari dokumen ini.  
**Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION / APPROVED — SIGNED OFF / DECIDED — PRODUCT ONLY. Bukti source/test bukan bukti browser atau produksi; tidak ada klaim `production-ready`, aman, atau selesai dari dokumen ini.

---

## 1. Mengapa A3 berikutnya

`SPEC-REMIX.md` menetapkan urutan A1 → A2 → A3 → A4 → A5. A1 dan A2 sudah ditandai selesai, sehingga A3 adalah satu-satunya langkah lanjutan yang depannya sudah jelas dan tidak membuka kembali keputusan K1/K2. Semua jalur lain masih tertahan:

| Jalur | Status | Penghalang |
|---|---|---|
| A3 Remix DB/Storage | BLOCKED | Go-ahead owner belum ada; dokumen ini baru persiapan. |
| A4 copy/UI remix | BLOCKED | Menunggu A3 dan keputusan teks/error `SPEC-REMIX.md` §7.5. |
| A5 detail remix (non-pixel, `stage_ground`, snapshot atribusi, action strip) | BLOCKED | Butir §7.1–7.4 belum diputus. |
| B2 Open Challenge | BLOCKED | Spec signed-off, tapi go-ahead terpisah belum ada. |
| C1 Pixel Assets | BLOCKED | Spec signed-off, tapi go-ahead terpisah belum ada. |
| B6 Common Space / kolaborasi langsung | VISION ONLY — NOT APPROVED FOR IMPLEMENTATION | Dilarang: tanpa realtime, `canvas_tiles`, stroke RPC, presence/broadcast, `postgres_changes`. |

---

## 2. Ruang lingkup A3

**Masuk cakupan:**

- Review kecukupan aturan yang sudah ada: `creations_validate_fork`, `creations_insert_own`, grant kolom `forked_from`, dan policy Storage `pixel_source_select_published_authenticated`.
- Menutup celah bila ada — **hanya** dengan migrasi **additive** baru; migrasi lama tidak ditulis ulang.
- Menjaga satu sumber keputusan: `canForkCreation`. Tidak boleh ada cabang kebijakan paralel di UI, Server Action, trigger, RLS, atau Storage.
- Menjaga pemisahan izin unduh PNG (`canDownloadCreationPng` / `allow_png_download`).
- Menyiapkan test gate dan penyerahan operator (migration apply + RLS/Storage smoke).

**Tidak masuk cakupan:**

- Perubahan UI, copy, atau error state baru (A4).
- `stage_ground`, remix non-pixel di count/strip, snapshot atribusi saat sumber di-hidden, atau pemasangan `loadRemixStripAction` (A5 / §7.1–7.4).
- Challenge, Pixel Assets, analytics, marketplace, dan B6.
- Klaim browser/produksi/`production-ready` tanpa bukti operator yang terpisah.

---

## 3. Baseline terverifikasi (HEAD 2026-11-26)

| Lapisan | Fakta | Status |
|---|---|---|
| Server Action | `forkCreationAction` memanggil `canForkCreation` sebelum self-fork dan sebelum insert/copy — `features/creations/actions.ts:561-590`. A2 DONE. | VERIFIED IN CODE |
| Izin aplikasi | `canForkCreation` = login + `creationStatus === "published"`; `canDownloadCreationPng` berdiri sendiri — `lib/auth/permissions.ts:83-99`. | VERIFIED IN CODE |
| Trigger DB | `creations_validate_fork` menolak `forked_from` yang tidak mengarah ke creation `published` — `supabase/migrations/20261116050000_community.sql:22-47`. | VERIFIED IN CODE |
| RLS INSERT | `creations_insert_own` membatasi `user_id = auth.uid()` dan `status = 'draft'`; grant `forked_from` terpisah di `:23` community migration. | VERIFIED IN CODE |
| Storage | `pixel_source_select_published_authenticated` mengizinkan member SELECT `source.json` hanya bila creation `published` dan path sesuai — `supabase/migrations/20261116110000_artwork_conversation.sql:99-114`. | VERIFIED IN CODE |
| Migrasi terbaru | 22 file migrasi; yang terakhir `20261125120000_saved_and_archive.sql`. Nama migrasi A3 harus setelahnya. | VERIFIED IN CODE |
| Guard realtime | `tests/resource-cleanup.test.ts` tetap melarang pola realtime; tidak akan disentuh. | VERIFIED BY TEST |

Catatan: ini bukti source dan assertion. Apakah migrasi sudah terpasang di project Supabase **tidak terbukti** dari repo — lihat `IMPLEMENTATION-PLAN.md` §14 item 1.

---

## 4. Paket kerja A3 (mulai hanya setelah go-ahead)

| ID | Pekerjaan | Exit criteria |
|---|---|---|
| A3.0 | Ulang baseline §3 terhadap HEAD pada hari implementasi; catat bila ada pergeseran baris atau perilaku. | Tabel baseline diperbarui atau dinyatakan masih berlaku. |
| A3.1 | Gap review: apakah trigger + RLS + Storage policy sudah cukup untuk aturan "published-only + `forked_from` wajib"? Periksa juga jalur INSERT langsung dan akses objek `source.json`. | Keputusan tertulis: `NO GAP` (A3 ditutup sebagai verifikasi) atau `GAP` dengan daftar celah konkret. |
| A3.2 | Bila `GAP`: tulis **satu** migrasi additive baru (nama setelah `20261125120000_...`), tanpa mengubah migrasi lama dan tanpa kolom kebijakan remix per-karya. Bila `NO GAP`: tidak ada migrasi baru. | Diff hanya menambah file migrasi baru; `git diff` tidak menyentuh migrasi lama. |
| A3.3 | Test gate: pertahankan `tests/rls-community.test.ts`, `tests/download-permission.test.ts`, `tests/detail-hierarchy.test.ts`, `tests/create-edit.test.ts`; tambah assertion sesuai celah bila ada. `tests/resource-cleanup.test.ts` tidak diubah. | `npm test` lulus tanpa assertion dilemahkan; daftar test baru tercatat. |
| A3.4 | Penyerahan operator: urutan apply migrasi, RLS/Storage smoke, fork published vs draft vs hidden, dan unduh PNG OFF/ON. Masuk ke `IMPLEMENTATION-PLAN.md` §14. | Register operator diperbarui dengan status `READY FOR OPERATOR`; bukti runtime masih kosong sampai operator mengisi. |
| A3.5 | Sinkron dokumen: `SPEC-REMIX.md` status A3, `arah-pengembangan-pxlb.md` bagian A, dan brief ini. | Tidak ada dokumen yang mengklaim A3 selesai sebelum bukti operator ada. |

**Urutan wajib:** A3.0 → A3.1 → (A3.2 bila perlu) → A3.3 → A3.4 → A3.5. Jangan lompat ke A4.

---

## 5. Guardrails

1. Gunakan migrasi **additive**; jangan menimpa atau melemahkan migrasi/policy lama.
2. `canForkCreation` tetap satu-sumber keputusan. Jangan menambah helper izin paralel.
3. Izin unduh PNG tetap terpisah; assertion lama tidak boleh dilemahkan.
4. Jangan menambah realtime, `canvas_tiles`, stroke RPC, presence/broadcast, atau `postgres_changes`.
5. Jangan menambah dependency baru.
6. Jangan mengklaim `production-ready`, aman, `shipped`, `VERIFIED IN BROWSER`, atau `VERIFIED IN PRODUCTION` hanya karena test source lulus.
7. Berhenti setelah A3; tidak boleh mulai A4/A5/B/C tanpa go-ahead terpisah.

---

## 6. Definisi siap mulai

- [x] Spec K1/K2 dan A1–A5 `APPROVED — SIGNED OFF` 2026-11-25.
- [x] A2 DONE (action + test).
- [x] Brief persiapan A3 ini ditulis 2026-11-26.
- [ ] Owner memberi go-ahead eksplisit untuk A3.
- [ ] Baseline §3 ditinjau ulang terhadap HEAD (A3.0).
- [ ] Keputusan `SPEC-REMIX.md` §7.6–7.7 dicatat sebelum A3.2/A3.4.
- [ ] Operator menjalankan migrasi dan smoke; bukti runtime dicatat terpisah.

---

## 7. Rujukan cepat

- Keputusan produk: `docs/master-plan/SPEC-REMIX.md` §3–§8.
- Backlog dan status A–D: `docs/master-plan/arah-pengembangan-pxlb.md`.
- Register operator: `docs/IMPLEMENTATION-PLAN.md` §14.
- Strategi jangka panjang (bukan izin implementasi): `docs/strategy/PXLB-Community&Growth-Strategy.md`.
