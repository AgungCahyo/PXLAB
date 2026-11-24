# Challenge — Spec S0.4 (Open Challenge; product-only)

**Document:** `docs/master-plan/SPEC-CHALLENGE.md`<br />
**Purpose:** Menetapkan perilaku, model data, action/RLS, UI state, copy, dan test gate untuk Challenge sebelum ada kode.<br />
**Status:** APPROVED — SIGNED OFF 2026-11-25; IMPLEMENTATION NOT AUTHORIZED — NO CODE WRITTEN<br />
**Updated:** 2026-11-25<br />
**Source of truth:** `docs/PRODUCT-SPEC.md:288,498`, `docs/TECHNICAL-SPEC.md:264-270,551`, `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md:174-188`<br />
**Backlog decisions:** K3–K6 tercatat 2026-11-25; K1/K2 adalah prasyarat jalur submit.<br />
**Scope:** Open Challenge only; kiriman tetap `creation` biasa; tidak ada guided/protected-region dan tidak ada target laporan baru.<br />
**Dependencies:** creation publish/fork, `is_admin()` + admin RPC, moderasi `creation`, copy ID/EN.<br />
**Next action:** Sign-off tercatat 2026-11-25; implementasi tetap menunggu go-ahead terpisah. Repo-wide, hanya A2 yang diizinkan dan sudah dikerjakan.

> Dokumen ini adalah keputusan produk/spec yang sudah disetujui owner 2026-11-25, tetapi bukan izin implementasi Challenge. Tidak ada kode, migrasi, endpoint, action, test, dependency, atau perubahan UI Challenge yang boleh dibuat sebelum go-ahead terpisah.
>
> `VERIFIED IN CODE` / `VERIFIED BY TEST` hanya bukti source atau assertion; bukan bukti browser, bukan bukti produksi, dan bukan klaim fitur selesai. `VERIFIED ABSENCE` berarti tidak ditemukan pada audit 2026-11-25.
>
> Gunakan migrasi **additive**. Jangan menulis ulang migrasi lama. Jangan melemahkan `tests/resource-cleanup.test.ts:28-32`.
>
> `forked_from` tetap menjadi lineage template. Jangan menggantinya dengan kolom Challenge. Tidak ada target laporan `challenge`; moderasi memakai target `creation` yang sudah ada.

---

## 1. Ringkasan dan status

**Status saat ini:** `APPROVED — SIGNED OFF 2026-11-25`; implementasi `BLOCKED`. Belum ada kode, migrasi, endpoint, action, UI, atau test Challenge.

| Aspek | Keputusan owner | Status spec ini |
|---|---|---|
| Entitas | `challenges` terpisah; kiriman adalah `creation` ber-`forked_from` | APPROVED — SIGNED OFF |
| Jenis pertama | Open Challenge; guided/protected-region ditunda | APPROVED — SIGNED OFF |
| Lifecycle | Owner/admin membuka dan menutup; deadline opsional; kiriman bisa diedit sampai tutup | APPROVED — SIGNED OFF |
| Provenance | Template + kreator Challenge + rantai remix harus terbaca | APPROVED — SIGNED OFF |
| Moderasi | Pakai report `creation` yang ada; tanpa target baru | APPROVED — SIGNED OFF |

---

## 2. Verified baseline / absence

### 2.1 VERIFIED ABSENCE

- Tidak ada tabel `challenges`, tabel relasi submission, route handler, server action, endpoint, lifecycle, UI, atau test Challenge di repo — `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md:107-111`.
- Tidak ada aturan protected-region Challenge. Yang sudah ada hanyalah layer lock/alpha lock: `components/creations/LayerPanel.tsx:701-709`, `components/canvas/PixelBoard.tsx:2737-2742,828-830`, `lib/pixel-transform.ts:241,271-277`.

### 2.2 VERIFIED IN CODE

- `creations` sudah punya status `draft|published|hidden`, `published_at`, dan `forked_from` — `supabase/migrations/20261116030000_creations.sql:12-24`; policy/grant insert-existing ada di `:63-89`.
- Publish/unpublish memakai `createDraftSchema`, `updateCreationSchema`, `parseCreationContent(..., mode)` — `lib/validations/creation.ts:247-293`; action `createDraftAction`/`updateCreationAction`/`updatePixelCreationAction` — `features/creations/actions.ts:192-436`.
- Fork memakai `forkCreationAction` dan `forkPixelCreation` — `features/creations/actions.ts:561-622,632-726`; izin `canForkCreation` hanya login + `published` — `lib/auth/permissions.ts:83-88`.
- Fork saat ini mengarahkan owner sumber ke karyanya sendiri dan mensyaratkan sumber published — `features/creations/actions.ts:574-585`; batas `CREATION_PER_MEMBER_MAX` ada di `:584-585`.
- Trigger `creations_validate_fork` menolak `forked_from` bukan published — `supabase/migrations/20261116050000_community.sql:22-47`.
- Moderation pattern tersedia: `is_admin()` dan RPC admin — `supabase/migrations/20261116050000_community.sql:6-17,262-365`; `moderateReportAction` — `features/moderation/actions.ts:41-145`; admin UI — `components/moderation/AdminReports.tsx:25-120`.
- Target laporan hanya `creation|comment|space_element` — `supabase/migrations/20261116050000_community.sql:173-175`, `lib/site.ts:160-161`, `lib/validations/community.ts:69-80`.

### 2.3 VERIFIED BY TEST

- Izin fork dan unduh PNG diuji terpisah — `tests/rls-community.test.ts:20-26`, `tests/download-permission.test.ts:73-96`.
- Susunan detail/remix diuji sebagai source assertion — `tests/detail-hierarchy.test.ts:52-60`.
- Copy keys dan guard resource cleanup sudah punya assertion — `tests/copy-keys.test.ts:23-51`, `tests/resource-cleanup.test.ts:28-32`.

---

## 3. Perilaku produk yang disetujui (K3–K6)

1. **K3 — entitas terpisah.** Challenge menyimpan metadata sendiri. Kiriman tetap baris `creation` biasa, bukan tipe creation baru, dan mempertahankan `forked_from` ke template.
2. **K4 — Open Challenge pertama.** Topik bebas; setiap anggota yang memenuhi syarat bisa fork template. Guided/protected-region tidak masuk rilis ini; layer lock yang sudah ada bukan aturan Challenge.
3. **K5 — lifecycle minimal.** Challenge dibuat dalam keadaan `open`. Owner/admin boleh menutup; deadline opsional. Kiriman tetap bisa diedit selama `open` dan sebelum deadline. **PROPOSED:** setelah `closed`, member tidak boleh mengubah kiriman; admin moderation tetap berjalan lewat RPC yang ada.
4. **K6 — provenance.** Detail Challenge wajib menampilkan template, kreator Challenge, dan rantai remix kiriman. Rantai remix tetap mengikuti `forked_from`; relasi Challenge menambahkan tautan challenge → kiriman, bukan menggantikan lineage.
5. **Moderasi.** Tidak ada target laporan `challenge`. Karya kiriman dilaporkan dan dimoderasi sebagai `creation`; admin hide/restore memakai rantai yang sudah ada.

---

## 4. Model data — RECOMMENDED PROPOSED

**RECOMMENDED PROPOSED:** pakai tabel relasi `challenge_submissions`, bukan kolom nullable `challenge_id` di `creations`. Alasan: `creations` sudah dipakai publish/fork/moderation dengan grant insert yang sempit (`supabase/migrations/20261116030000_creations.sql:83-89`); relasi terpisah bisa menaruh unique `(challenge_id, user_id)` dan unique `(creation_id)` tanpa mengubah arti semua creation. Trade-off: satu join tambahan saat query detail. Semua kolom dan constraint di bawah berstatus **PROPOSED**.

### 4.1 `challenges` — PROPOSED

| Column | Type / rule | Status |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | PROPOSED |
| `owner_id` | `uuid not null references public.profiles(id)` — kreator/owner Challenge | PROPOSED |
| `template_creation_id` | `uuid not null references public.creations(id) on delete restrict` — template; wajib published saat submit | PROPOSED |
| `title` | `text not null`, `char_length` 1–80 | PROPOSED |
| `description` | `text`, opsional, maksimal 500 karakter | PROPOSED |
| `status` | `text not null default 'open'`, check `in ('open','closed')` | PROPOSED |
| `deadline_at` | `timestamptz`, nullable; jika ada harus `> created_at` | PROPOSED |
| `created_at` | `timestamptz not null default now()` | PROPOSED |
| `updated_at` | `timestamptz not null default now()` | PROPOSED |
| `closed_at` | `timestamptz`, nullable; diisi saat `status = 'closed'` | PROPOSED |

Index PROPOSED: `challenges_status_deadline_idx` dan `challenges_owner_created_idx`.

### 4.2 `challenge_submissions` — PROPOSED

| Column | Type / rule | Status |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | PROPOSED |
| `challenge_id` | `uuid not null references challenges(id) on delete cascade` | PROPOSED |
| `creation_id` | `uuid not null references creations(id) on delete cascade` | PROPOSED |
| `user_id` | `uuid not null references public.profiles(id) on delete cascade` | PROPOSED |
| `created_at` | `timestamptz not null default now()` | PROPOSED |

Constraint PROPOSED: `unique (challenge_id, user_id)` untuk satu kiriman per anggota; `unique (creation_id)` agar satu creation tidak masuk dua Challenge.

**Provenance PROPOSED:** `challenge_submissions.creation_id` → `creations.forked_from` → `challenges.template_creation_id`; `challenges.owner_id` memberi kreator Challenge. Semua perubahan skema wajib berada di satu migrasi additive baru; tidak ada `alter` pada migrasi yang sudah dipakai.

---

## 5. Server action & RLS — PROPOSED

### 5.1 Action

| Action | Actor | Aturan PROPOSED |
|---|---|---|
| `createChallengeAction` | Member login; admin juga boleh | Membuat `challenges` dengan `owner_id = profile.id`, `status = 'open'`. Template, judul, deskripsi, deadline divalidasi server. Jika owner ingin hanya admin yang membuat, ini harus disetujui di §8. |
| `updateChallengeAction` | Owner atau admin | Ubah judul/deskripsi/deadline hanya saat `status = 'open'`. Template tidak bisa diganti setelah ada submission pertama. |
| `setChallengeStatusAction` | Owner atau admin | Menutup Challenge: `status = 'closed'`, `closed_at = now()`. Buka kembali tidak masuk rilis ini kecuali disetujui. |
| `submitToChallengeAction` | Member login | **PROPOSED:** perluas alur `forkCreationAction` dengan `challenge_id`; cek Challenge `open`, deadline belum lewat, belum pernah submit, template published, dan bukan template milik sendiri; lalu fork memakai `forkPixelCreation`/jalur lama dan simpan baris `challenge_submissions`. Jika insert relasi gagal, fork baru harus di-rollback. |

- **Self-fork / template-owner — PROPOSED:** jangan menyiasati redirect di `features/creations/actions.ts:576-578`. Owner template melihat CTA nonaktif dan dibawa ke template miliknya; ia tidak membuat submission terpisah. Jika owner template harus tetap submit, itu keputusan owner baru di §8.
- **Publish/edit — PROPOSED:** submit menghasilkan draft biasa; member mempublish lewat `updateCreationAction`/`updatePixelCreationAction` yang sudah ada — `features/creations/actions.ts:247-436` dan `lib/validations/creation.ts:247-293`. Tidak ada publish schema baru.
- **Deadline/editability — PROPOSED:** cek deadline di action dan di trigger DB. Setelah `closed`, trigger pada `creations` menolak update member untuk creation yang terhubung ke Challenge; RPC admin hide/restore harus tetap dikecualikan agar moderasi tidak melemah.
- **Moderasi — PROPOSED:** tidak menyentuh `REPORT_TARGET_TYPES`, Zod report, atau rantai admin report; pakai `creation` — `lib/site.ts:160-161`, `lib/validations/community.ts:69-80`, `features/moderation/actions.ts:41-145`.

### 5.2 RLS — PROPOSED

| Table | Policy PROPOSED |
|---|---|
| `challenges` | Public `SELECT` termasuk yang `closed`; `INSERT` hanya `owner_id = auth.uid()` atau admin; `UPDATE` owner pada Challenge sendiri atau admin; tanpa `DELETE` pada rilis ini. |
| `challenge_submissions` | `SELECT` publik hanya bila creation terkait `published`; member melihat baris sendiri; owner Challenge/admin melihat semua. `INSERT` hanya `user_id = auth.uid()` dengan creation milik sendiri dan aturan open/deadline/template; tanpa `UPDATE`/`DELETE` member. |

Server action dan RLS harus searah: RLS tidak boleh mengizinkan direct INSERT yang melewati status, deadline, atau `forked_from`. Policy admin mengikuti `is_admin()` — `supabase/migrations/20261116050000_community.sql:6-17`; status change admin sebaiknya lewat RPC `security definer` seperti `:262-365`.

---

## 6. UI state dan error state — PROPOSED

**List Challenge:** kartu menampilkan judul, owner, badge open/closed, deadline bila ada, dan jumlah kiriman published. **Detail Challenge:** judul/deskripsi, tautan template, kreator Challenge, daftar kiriman published, dan provenance rantai remix mengikuti pola `components/creations/RemixStrip.tsx:23-56`.

| State | Perilaku CTA PROPOSED |
|---|---|
| Eligible | `challengeSubmit` aktif; saat pending `challengeSubmitting`. |
| Closed | CTA nonaktif; tampil `challengeClosedMessage`. |
| Deadline lewat | CTA nonaktif; tampil `challengeDeadlinePassed`. |
| Already submitted | CTA nonaktif; tampil `challengeAlreadySubmitted` + tautan ke creation sendiri. |
| Template unpublished/hidden | CTA nonaktif; tampil `challengeTemplateUnavailable`. |
| Tidak login | CTA menuju login; tampil `challengeSignIn`. |
| Template owner | CTA nonaktif; tampil `challengeTemplateOwner`, sesuai aturan self-fork di §5. |
| Limit tercapai | CTA nonaktif; tampil `challengeLimitReached`. |

**Copy keys baru di `lib/copy.ts` — PROPOSED (id / en):**

- `challengeList`: “Tantangan” / “Challenges”
- `challengeOpen`: “Dibuka” / “Open”
- `challengeClosed`: “Ditutup” / “Closed”
- `challengeDeadline`: “Batas {date}” / “Deadline {date}”
- `challengeBy`: “Oleh @{username}” / “By @{username}”
- `challengeSubmittedCount`: “{count} kiriman” / “{count} submissions”
- `challengeSubmit`: “Ikuti tantangan” / “Join challenge”
- `challengeSubmitting`: “Menyiapkan remix…” / “Preparing remix…”
- `challengeAlreadySubmitted`: “Kamu sudah mengirim karya untuk tantangan ini.” / “You already submitted a work to this challenge.”
- `challengeClosedMessage`: “Tantangan sudah ditutup.” / “This challenge is closed.”
- `challengeDeadlinePassed`: “Batas waktu sudah berlalu.” / “The deadline has passed.”
- `challengeTemplateUnavailable`: “Template tidak publik.” / “Template is not public.”
- `challengeTemplateOwner`: “Template ini milikmu; buka template untuk mengedit.” / “This template is yours; open the template to edit.”
- `challengeSignIn`: “Masuk untuk mengikuti tantangan.” / “Sign in to join the challenge.”
- `challengeLimitReached`: “Batas karya tercapai.” / “Creation limit reached.”

Copy lama yang relevan tetap dipakai bila cocok: `fork`, `forkWorking`, `forkedFrom`, `remixCount`, `forkedUnavailable`, `remixSignIn` — `lib/copy.ts:1011-1023`; error `limit_reached` — `lib/copy.ts:1780-1783`.

---

## 7. Test gate — PROPOSED, belum dijalankan

1. Perluas `tests/rls-community.test.ts:20-26` dan `tests/download-permission.test.ts:73-96` dengan assertion eligibility Challenge: login, `open`/`closed`, deadline, already-submitted, template unpublished, template-owner, dan limit. Jangan hapus assertion fork/published yang ada.
2. Perluas `tests/detail-hierarchy.test.ts:52-60` untuk provenance dan state CTA; `tests/copy-keys.test.ts:23-51` harus menemukan semua copy keys baru di ID dan EN.
3. Tambah source test migration/policy: additive-only, struktur `challenges`/`challenge_submissions`, RLS public read, unique constraints, dan `creations_validate_fork` tetap memberlakukan published source — `supabase/migrations/20261116050000_community.sql:22-47`.
4. Jangan ubah rantai target laporan pada task Challenge: `20261116050000_community.sql:173-175`, `lib/site.ts:160-161`, `lib/validations/community.ts:69-80`, `lib/copy.ts:1195-1199`.
5. `tests/resource-cleanup.test.ts:28-32` harus tetap lolos tanpa perubahan assertion; Challenge tidak boleh menambah Realtime/presence/broadcast.
6. Setelah ada kode, status menjadi `READY FOR OPERATOR`: operator mengapply migrasi additive berurutan dan menjalankan browser checklist — buka Challenge, submit, publish, edit sebelum close, blokir edit setelah close, duplicate submit, deadline lewat, template hidden, self-fork, admin close/hide, serta anon read. Browser/produksi baru boleh disebut `VERIFIED` setelah bukti checklist dilampirkan — pola gate `docs/IMPLEMENTATION-PLAN.md:407-420`.

---

## 8. Detail yang disetujui dan definition of ready

**SIGNED OFF 2026-11-25**; implementasi tetap **BLOCKED** sampai go-ahead terpisah. Butir berikut kini menjadi detail spec, bukan izin kode:

- Pilihan `challenge_submissions` sebagai relasi, termasuk unique creation per Challenge dan batas `on delete restrict` pada template.
- Siapa boleh membuat Challenge: semua member login atau admin saja.
- Perilaku template-owner: tetap tidak bisa submit terpisah, atau ada aturan khusus baru.
- Apakah `closed` final, atau reopen diperlukan; siapa boleh mengubah deadline setelah ada submission.
- Siapa boleh melihat draft submission: submitter saja, atau owner Challenge/admin juga.
- Jika judul/deskripsi Challenge disalahgunakan: tetap tanpa target laporan baru dan admin menutup manual, atau ada keputusan terpisah.

**Definition of ready sebelum kode pertama:**

- [x] K3–K6 tercatat di `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md:174-188` dan spec sumber.
- [x] Owner menandatangani detail terbuka di atas 2026-11-25; status berubah menjadi `APPROVED — SIGNED OFF`.
- [ ] Task kecil punya exit criteria untuk schema, action/RLS, UI/copy, dan test gate.
- [ ] Migrasi additive dirancang; tidak ada rewrite migrasi lama.
- [ ] Copy ID/EN final di `lib/copy.ts`; tidak ada hard-coded UI text.
- [ ] Test gate di §7 masuk task; tidak ada assertion yang dilemahkan, terutama `tests/resource-cleanup.test.ts:28-32`.
- [ ] Gate operator dan browser checklist dijadwalkan terpisah sebelum klaim `VERIFIED`.
- [ ] Guided/protected-region dan target laporan baru tetap di luar scope Challenge ini.
