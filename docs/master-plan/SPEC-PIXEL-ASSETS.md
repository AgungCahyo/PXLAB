# SPEC PIXEL ASSETS — Scope: S0.4/C1, product design only

**Document:** `docs/master-plan/SPEC-PIXEL-ASSETS.md`<br />
**Purpose:** Merangkum desain produk dan gate teknis Pixel Assets sebelum implementasi; bukan izin menulis kode.<br />
**Status:** APPROVED — SIGNED OFF 2026-11-25; IMPLEMENTATION NOT AUTHORIZED — NO CODE WRITTEN<br />
**Updated:** 2026-11-25<br />
**Source of truth:** `docs/PRODUCT-SPEC.md:290,431,493,499`, `docs/TECHNICAL-SPEC.md:260,268-270,427`, `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md:163-170,186-188,241-252`<br />
**Backlog decisions:** K7–K9 — DECIDED 2026-11-25, product only; K7 = `Pixel Assets`, K8 = copy + provenance, K9 = mandatory credit + dedicated `asset` report target.<br />
**Scope:** S0.4/C1 untuk Pixel Assets: nama, copy-into-document, provenance, kredit, bucket/path, rantai moderasi, copy UI, dan test gate.<br />
**Dependencies:** creation header/source pipeline, Storage policy, REPORT moderation chain, `lib/copy.ts` id/en, operator gate.<br />
**Next action:** Sign-off tercatat 2026-11-25; implementasi menunggu go-ahead terpisah. Repo-wide, hanya A2 yang diizinkan dan sudah dikerjakan.

> **Hard rule:** Nama produk final adalah **Pixel Assets**. Jangan memakai `Stamp` sebagai label produk. `stampBrush` di `lib/pixel.ts:339-372` hanya helper internal brush; `PixelDrawTool` di `lib/pixel.ts:84-103` tidak memuat tool bernama `stamp`.
>
> **Hard rule:** K8 = **copy ke dokumen member dengan provenance tersimpan**. Referensi dinamis/auto-update ditunda; PixelBoard tidak boleh mengambil ulang objek aset saat merender karya.
>
> **Hard rule:** K9 = **kredit wajib** dan target laporan baru `asset` dengan hide/restore admin. Provenance dan kredit harus tetap terbaca walaupun aset di-hidden atau dihapus; admin tidak mengubah dokumen member secara retrograde.
>
> **Hard rule:** Jangan mengubah `pixel-creations` menjadi pustaka aset publik. Bucket itu tetap untuk `source.json`/`cover.png` creation pipeline — `lib/site.ts:83-85`, `supabase/migrations/20261116100000_pixel_creations.sql:11-19`.
>
> **Hard rule:** Perubahan target `asset` bersifat all-or-nothing. Perubahan sebagian akan memecah typing, UI, atau RLS.
>
> **Hard rule:** Spec ini disetujui owner 2026-11-25, tetapi tidak mengizinkan implementasi Pixel Assets. Belum ada kode, migrasi, endpoint, action, bucket, atau test Pixel Assets. `VERIFIED` hanya untuk bukti runtime/produksi yang belum tersedia di sini.

---

## 1. Ringkasan dan status

`Pixel Assets` adalah elemen pixel siap pakai yang disalin ke dokumen PixelBoard milik member. Status dokumen ini **APPROVED — SIGNED OFF 2026-11-25**; Stage C tetap **BLOCKED** sampai go-ahead terpisah. Detail PROPOSED di bawah kini menjadi detail spec yang disetujui untuk didesain, bukan bukti implementasi. Tidak ada implementasi Pixel Assets yang diizinkan oleh dokumen ini.

Keputusan owner sudah tetap: K7 menetapkan nama, K8 menetapkan copy + provenance (bukan referensi dinamis), K9 mewajibkan kredit dan target laporan `asset` dengan hide/restore admin — `docs/master-plan/PREPARATION-REMIX-CHALLENGE-ASSETS.md:186-188`.

---

## 2. Verified baseline / absence

| Area | Bukti | Status |
|---|---|---|
| Tabel `assets`/`stamps`, endpoint, action, bucket, path, panel Studio, dan field provenance/lisensi aset | Tidak ditemukan di `supabase/migrations/`, `app/api/`, `features/`, `lib/`, `components/` | VERIFIED ABSENCE |
| `stampBrush` hanya helper internal; bukan tool/produk | `lib/pixel.ts:339-372`; `PixelDrawTool` `lib/pixel.ts:84-103` | VERIFIED IN CODE |
| Bucket yang ada hanya `pixel-creations` dan `avatars` | `lib/site.ts:83-88`; `supabase/migrations/20261116100000_pixel_creations.sql:11-19`; `supabase/migrations/20261117006000_avatars_bucket.sql:3-11` | VERIFIED IN CODE |
| Header creation: batas 32.000 karakter dan source path | `lib/site.ts:82`; `lib/validations/creation.ts:247-257` | VERIFIED IN CODE |
| Source pixel menerima V1–V4, `rle-index`, Paper di indeks 0, palette maksimum 256 | `lib/pixel.ts:193-205`; `lib/validations/creation.ts:173-188`; `docs/TECHNICAL-SPEC.md:413-414` | VERIFIED IN CODE |
| Target laporan hanya `creation`, `comment`, `space_element` | `supabase/migrations/20261116050000_community.sql:173-175,219-260`; `lib/site.ts:160-161`; `lib/validations/community.ts:69-80`; `features/community/actions.ts:85-113`; `lib/copy.ts:1195-1199` | VERIFIED IN CODE |
| Rantai admin hide/restore sudah ada untuk target lama | `supabase/migrations/20261116050000_community.sql:6-17,262-365`; `features/moderation/actions.ts:41-145`; `features/moderation/queries.ts:29-68`; `components/moderation/AdminReports.tsx:25-120` | VERIFIED IN CODE |
| Pola `recent`/`favorites` hanya precedent UX color picker | `lib/pixel-color-memory.ts:73`; `components/creations/ColorPicker.tsx:67` | VERIFIED IN CODE |

Catatan: VERIFIED IN CODE / VERIFIED ABSENCE bukan bukti browser, bukan bukti migrasi terpasang, dan bukan klaim fitur selesai.

---

## 3. Perilaku produk K7–K9

1. **K7 — Nama.** Label di panel, copy, admin, dan dokumentasi memakai `Pixel Assets`. `Stamp` tidak dipakai sebagai label produk.
2. **K8 — Copy, bukan link hidup.** Member memilih aset lalu menyalin pikselnya ke dokumen sendiri. Jejak asal disimpan di header creation. Perubahan aset setelah itu tidak mengubah karya yang sudah memuatnya.
3. **K9 — Kredit dan moderasi.** Kredit aset wajib diisi saat publish aset dan wajib tampil pada karya yang memuatnya. Aset diberi target laporan `asset`; admin bisa hide/restore tanpa menghapus riwayat pemakaian.
4. **Discovery detail.** Favorites, packs, recent, dan featured tetap perlu keputusan detail; tidak mengubah K7–K9. Untuk spec ini, favorites/recent hanya bersifat browser-local — PROPOSED.

---

## 4. Proposed data model dan storage

Semua nilai pada tabel ini **PROPOSED** dan memerlukan tanda tangan owner di §9. Gunakan migrasi additive baru; jangan menulis ulang migrasi lama.

### 4.1 Metadata table — PROPOSED

`public.pixel_assets` — tabel baru:

| Kolom | Aturan PROPOSED |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()` |
| `creator_id` | `uuid not null references public.profiles(id) on delete cascade` |
| `title` | `text not null`, `1..80` karakter |
| `credit_text` | `text not null`, `1..120` karakter; tidak boleh kosong saat `published` |
| `status` | `text not null default 'draft'`, CHECK `('draft','published','hidden')` |
| `source_version` | `smallint not null`, CHECK `1..4` |
| `width`, `height` | `integer not null`, memakai rentang `PIXEL_CANVAS_MIN/MAX` yang sudah ada |
| `source_key`, `preview_key` | `text not null`, maks. `200` karakter, unik, mengikuti path §4.2 |
| `published_at`, `created_at`, `updated_at` | `timestamptz`; `published_at` dipakai restore semantics |

RLS PROPOSED: owner select/update barisnya sendiri; member hanya select `status = 'published'`; admin select semua. Member tidak diberi UPDATE langsung pada `status`; hide/restore hanya lewat RPC admin. Status aset tersembunyi tidak boleh muncul di picker, tidak bisa dilaporkan, dan tidak bisa disalin ulang.

### 4.2 Storage — PROPOSED

- Bucket: `pixel-assets`, **`public = false`**, `file_size_limit = 524288`, `allowed_mime_types = ['application/json','image/png']`.
- Path: `{creator_id}/{asset_id}/source.json` dan `{creator_id}/{asset_id}/preview.png`. Jangan pakai filename user.
- `source.json`: format pixel yang sama dengan creation — `rle-index`, V1–V4, `palette[0] = Paper`, maks. `256` warna, maks. `512 KiB`.
- `preview.png`: `image/png`, maks. `512 KiB`; hanya materials preview, bukan pengganti source.
- Policy PROPOSED: insert/update/delete hanya pada prefix `creator_id = auth.uid()`; select member hanya jika baris `pixel_assets` terkait `published`; admin select semua. Tidak ada public bucket listing.
- Jika diperlukan, preview diberikan lewat route status-checked bergaya `/api/pixel-cover/{creation_id}` — `lib/site.ts:61-63`; detail exact route tetap PROPOSED.

### 4.3 Provenance field — PROPOSED

Di metadata table: `creator_id`, `credit_text`, `source_key`, `source_version`, `published_at`. Di header creation hasil copy: lihat §5.2. Keduanya memakai `asset_id` sebagai penghubung audit, bukan sebagai referensi render.

---

## 5. Proposed copy-into-document behavior

Baseline: dokumen pixel = `creations.content` header + objek `{user_id}/{creation_id}/source.json` — `lib/site.ts:53-59`, `docs/TECHNICAL-SPEC.md:410-413`. Header tunduk pada `CREATION_CONTENT_JSON_MAX = 32_000` — `lib/site.ts:82`, `lib/validations/creation.ts:255-257`.

### 5.1 Insert piksel — PROPOSED

1. Picker hanya menampilkan aset `published`. Klik **Copy into document** memuat `source.json` aset, mem-parse sebagai V1–V4, dan menolak versi unknown, RLE truncated/overlong, indeks di luar palette, atau panjang decode bukan `width * height` — pola validasi `docs/TECHNICAL-SPEC.md:413`.
2. Flatten layer/group V2–V4 menjadi komposit deterministik. V1 tetap dibaca sebagai single-layer.
3. Remap warna ke palette dokumen tujuan dengan `palette[0]` tetap Paper dan append-only. Jika palette penuh, insert ditolak; jangan menimpa warna member.
4. Tulis piksel hasil ke dokumen tujuan pada posisi/inset yang dipilih, klip ke selection bila ada, lalu buat satu undo step dan tandai dokumen dirty.
5. `stage_ground` dokumen tujuan dipertahankan; `stage_ground` aset tidak ikut tersalin. `source_path` header tetap menunjukkan objek milik member, bukan path aset.
6. Tidak ada fetch ulang aset saat PixelBoard merender. Aset yang di-hidden setelah copy tidak mengubah piksel atau kredit pada karya tersebut.

### 5.2 Provenance di creation header — PROPOSED

Tambahkan satu key baru pada `pixelContentSchema` yang saat ini `.strict()` — `lib/validations/creation.ts:173-188`:

```text
asset_provenance: [
  {
    asset_id: uuid,
    creator_id: uuid,
    creator_username: string,   // snapshot, maks. 30
    credit_text: string,        // snapshot, 1..120, wajib
    source_key: string,         // maks. 200, audit only
    source_version: 1 | 2 | 3 | 4,
    copied_at: ISO datetime
  }
]  // maks. 24 entri PROPOSED
```

Aturan PROPOSED: `version`, `width`, `height`, `palette`, `encoding`, dan `source_path` di header tetap mengikuti aturan source dokumen tujuan; `asset_provenance` tidak menggantikan `source_path`. Jika `JSON.stringify(header).length` melebihi `32_000`, kembalikan `payload_too_large` — jangan memotong `credit_text` atau diam-diam membuang entri. Kredit ditampilkan dari snapshot ini pada tampilan karya, bukan dari baris aset live.

---

## 6. Proposed full report/moderation target chain

Implementasi `asset` hanya boleh masuk sebagai satu perubahan yang mencakup seluruh rantai:

| Lapisan | Perubahan PROPOSED | Baseline |
|---|---|---|
| DB CHECK | Migration additive: drop/re-add `reports_target_type_allowed` agar menerima `asset` | `supabase/migrations/20261116050000_community.sql:173-175` |
| Visibility trigger | Replace `reports_validate_target()` dengan branch `asset` yang mensyaratkan `pixel_assets.status = 'published'` | `supabase/migrations/20261116050000_community.sql:219-260` |
| RPC admin | `admin_set_asset_status(uuid,text)`, `security definer`, `is_admin()` guard, CHECK `draft|published|hidden`, revoke/grant seperti RPC lain | `supabase/migrations/20261116050000_community.sql:262-365` |
| Tipe | Tambah `"asset"` ke `REPORT_TARGET_TYPES`; `ReportTargetType` mengikuti konstanta | `lib/site.ts:160-161` |
| Zod | `reportTargetTypeSchema`/`submitReportSchema` tetap diturunkan dari konstanta, dengan assertion eksplisit | `lib/validations/community.ts:69-80` |
| Action validation | `targetIsVisible` menerima `asset` dan mengecek status published; rate limit dan duplicate handling tidak diubah | `features/community/actions.ts:85-113,403-447` |
| Moderasi action | `moderateReportAction` + `applyHideRestore` memanggil RPC aset; revalidate path admin/detail terkait | `features/moderation/actions.ts:14-38,41-145` |
| Admin describe | `describeTarget` mengembalikan label aset, href opsional, dan `hidden` dari status | `features/moderation/queries.ts:29-68` |
| Admin copy/UI | `adminTargetTypes.asset` id/en; `AdminReports` mengindeks copy by `target_type` | `lib/copy.ts:1195-1199`; `components/moderation/AdminReports.tsx:67-124` |
| Report UI | Panel aset mengirim `targetType="asset"` ke dialog yang sudah menerima `ReportTargetType` | `components/community/ReportDialog.tsx:59-104` |

> **Hard rule:** Jika hanya DB, hanya tipe TypeScript, atau hanya UI yang diubah, typing/UI/RLS akan pecah. Rantai ini masuk satu task dengan satu gate review.

---

## 7. UI states dan error states

Semua state dan copy di bawah ini **PROPOSED**; belum dipasang di Studio.

- **Picker panel:** tombol panel memakai label `Pixel Assets`, bukan `Stamp`. Daftar berisi aset `published`; tiap kartu menampilkan preview, judul, creator, dan kredit.
- **Empty/loading/preview/insert:** empty saat tidak ada aset published; loading saat daftar/preview dimuat; preview read-only; insert disabled sampai header tujuan valid dan kredit tersedia. Insert sukses menutup panel dan menghasilkan satu undo step.
- **Favorites/recent:** PROPOSED browser-local mengikuti pola `usePixelColorMemory` — `lib/pixel-color-memory.ts:73`, `components/creations/ColorPicker.tsx:67`. Tidak ada tabel, kolom, atau sinkronisasi akun; packs/featured ditunda.
- **Report flow:** kartu aset membuka `ReportDialog` dengan `target_type: "asset"`; member harus login; aset hidden tidak bisa dilaporkan. Admin melihat entri dengan label `Aset`/`Asset` dan tombol hide/restore yang sama dengan target lain.
- **Error mapping PROPOSED:** invalid asset/source → `invalid_input`; hidden/unavailable asset → `not_found`; objek atau header melebihi batas → `payload_too_large`; kredit kosong → `invalid_input` dengan pesan kredit wajib; rate limit laporan → `limit_reached`. Kode error existing ada di `lib/auth/errors.ts:8,23-27`.

Copy keys exact di `lib/copy.ts` untuk id/en — **PROPOSED**:

```text
assetPanelTitle:          { id: "Pixel Assets", en: "Pixel Assets" }
assetPanelEmpty:          { id: "Belum ada aset yang tersedia.", en: "No assets available yet." }
assetPanelLoading:        { id: "Memuat Pixel Assets…", en: "Loading Pixel Assets…" }
assetPreview:             { id: "Pratinjau aset", en: "Asset preview" }
assetInsert:              { id: "Salin ke dokumen", en: "Copy into document" }
assetInserted:            { id: "Aset disalin.", en: "Asset copied." }
assetCreditLabel:         { id: "Kredit", en: "Credit" }
assetCreditRequired:      { id: "Kredit wajib diisi.", en: "Credit is required." }
assetInvalid:             { id: "Aset tidak valid.", en: "Invalid asset." }
assetHidden:              { id: "Aset tidak tersedia.", en: "Asset unavailable." }
assetTooLarge:            { id: "Ukuran aset melebihi batas.", en: "Asset exceeds the size limit." }
assetProvenanceTooLarge:  { id: "Provenance terlalu besar untuk dokumen.", en: "Provenance is too large for the document." }
assetRecent:              { id: "Terakhir dipakai", en: "Recent" }
assetFavorites:           { id: "Favorit", en: "Favorites" }
assetReport:              { id: "Laporkan aset", en: "Report asset" }
adminTargetTypes.asset:   { id: "Aset", en: "Asset" }
```

---

## 8. Test gates

Status saat ini **BLOCKED**; gate berikut baru boleh dijalankan setelah owner memberi go-ahead dan kode dibuat di task terpisah.

1. Perluas `tests/rls-community.test.ts:69-123` untuk target `asset`, CHECK/trigger visibility, dan larangan update status oleh member. Perluas `tests/rls-pixel-storage.test.ts:14-39` untuk bucket `pixel-assets`: private, `524288`, MIME allowlist, owner prefix, dan tidak ada public `source.json`.
2. Perluas assertion source untuk creation header: `tests/pixel-studio-redesign.test.ts:5,12-27`, `tests/pixel-import.test.ts`, dan `tests/create-edit.test.ts` — strict schema, 32KB cap, V1–V4 accept/reject, provenance tersimpan, tidak ada dynamic reference.
3. Perluas `tests/copy-keys.test.ts:23-40` agar semua key §7 dan `adminTargetTypes.asset` punya pasangan id/en. Perluas assertion UI/admin yang sudah membaca `components/moderation/AdminReports.tsx` — `tests/pr3-system-chrome.test.ts:11`.
4. Jangan hapus atau lemahkan `tests/resource-cleanup.test.ts:28-32`. Guard realtime/D tetap berlaku tanpa pengecualian untuk Pixel Assets.
5. Gate operator: migration, bucket, Storage/RLS policy, dan RPC diverifikasi di project Supabase; status baru boleh masuk `READY FOR OPERATOR` hanya setelah code/policy gate lulus — konvensi `docs/IMPLEMENTATION-PLAN.md:407-422`.
6. Browser checklist terpisah: publish aset → buka picker → insert → save/reopen → kredit tampil → report → admin hide/restore → hidden asset tidak bisa disalin/dilaporkan → error invalid/size/credit. Hasil checklist itu yang bisa disebut `VERIFIED`; sebelum itu tidak ada klaim browser/production-ready.

---

## 9. Signed-off details and definition of ready

Owner telah menyetujui butir PROPOSED berikut sebagai detail spec 2026-11-25; implementasi tetap memerlukan go-ahead terpisah:

- [ ] Nama bucket `pixel-assets`, path `{creator_id}/{asset_id}/...`, bucket private, MIME `application/json`/`image/png`, dan batas `512 KiB`.
- [ ] Kolom `public.pixel_assets`, status `draft|published|hidden`, serta restore semantics: `published` bila pernah publish, jika tidak `draft`.
- [ ] Bentuk `asset_provenance`, maks. `24` entri, `credit_text` `1..120`, snapshot username maks. `30`, dan perlakuan `payload_too_large`.
- [ ] Sumber aset: apakah dibuat dari Studio pixel source atau turunan creation tertentu; tidak ada arbitrary file upload.
- [ ] Lokasi tampil kredit Studio/detail karya dan perilaku saat aset di-hidden/dihapus.
- [ ] Favorites/recent browser-local saja; packs/featured tetap ditunda.
- [ ] Copy id/en persis seperti §7 dan label admin `Aset`/`Asset`.
- [ ] Task implementasi memasukkan seluruh rantai §6 dalam satu perubahan dan gate operator terpisah.

Definition of ready sebelum kode pertama:

- [x] Owner menandatangani spec ini sebagai S0.4/C1 pada 2026-11-25; tanda tangan K7–K9 saja belum cukup, kini sudah lengkap.
- [ ] Semua butir PROPOSED di atas menjadi keputusan tertulis; tidak ada placeholder yang ditebak implementator.
- [ ] Scope tetap Pixel Assets; Challenge, Remix enforcement, B6/realtime, dan D tidak ikut terseret.
- [ ] Exit criteria tiap task kecil disebut: schema/policy, copy/insert, moderation chain, copy UI, test gate, operator handoff.
- [ ] Tidak ada klaim shipped, production-ready, atau verified in browser sebelum bukti runtime dikumpulkan.
