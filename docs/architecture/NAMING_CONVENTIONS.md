# PXLB Naming Conventions

**Status:** ACTIVE — 2026-11-25
**Scope:** source naming audit of `app/`, `components/`, `features/`, `lib/`, `public/`, `scripts/`, `supabase/`, `tests/` (418 files, 72 directories, excluding `node_modules`, `.next`, `.tmp`, `.git`). Documentation and root config were read for cross-references.
**Companion:** [`docs/product/TERMINOLOGY.md`](../product/TERMINOLOGY.md) — the official vocabulary for user-facing text.

Prinsip utama: nama menjelaskan tanggung jawab, satu konsep memakai satu istilah, dan kontrak yang sudah dipakai publik (URL, API, skema DB, nama file framework) **menang** atas keinginan merapikan nama. Nama yang diubah tanpa mengubah perilaku; nama yang berisiko dicatat sebagai dipertahankan atau ditunda.

---

## 1. Ringkasan audit

| Area | File | Direktori | Temuan utama |
| --- | ---: | ---: | --- |
| `app/` | 53 | 40 | Nama route umum sudah sesuai Next.js; beberapa nama folder (`home`, `dashboard`, `responses`) tidak persis menggambarkan isinya, tetapi URL-nya sudah dipakai. |
| `components/` | 119 | 14 | Beberapa file tidak mengekspor komponen yang namanya sama (`SocialNav`, `ReportDialog`, `PageSkeletons`, `SearchResults`, `RecommendationRack`). |
| `features/` | 17 | 8 | `actions.ts` / `queries.ts` per domain sudah konsisten; `activity.ts` sebenarnya aggregation inbox respon. |
| `lib/` | 105 | 4 | `utils.ts`, `site.ts`, `copy.ts`, `paths.ts`, `meta.ts` adalah bucket yang sangat luas; tiga file helper (`social-*`) tidak menggambarkan isinya. |
| `public/` | 26 | 2 | Aset statis; tidak ada perubahan nama. |
| `scripts/` | 2 | 0 | Tidak ada perubahan. |
| `supabase/` | 24 | 4 | Tabel plural snake_case, RPC `search_*_ranked` / `admin_set_*`, policy `<object>_<action>_<scope>` sudah konsisten. |
| `tests/` | 72 | 0 | Banyak test membaca **path sumber sebagai string literal**; rename file dapat memutus test tanpa import rusak. |

Risiko tertinggi bukan import TypeScript, melainkan: (1) URL publik dan rewrite `next.config.ts`, (2) test yang membaca path literal, (3) migrasi DB/RLS, (4) dokumen spesifikasi yang sudah disetujui.

---

## 2. File dan folder

| Jenis | Pola | Contoh | Catatan |
| --- | --- | --- | --- |
| Komponen React | `PascalCase.tsx`, nama file = ekspor utama | `SiteNav.tsx`, `Toast.tsx`, `FilterChip.tsx` | Jika satu file mengekspor beberapa komponen sejenis, nama file memakai keluarga yang jelas (`PageSkeletons.tsx`), bukan nama umum. |
| Utilitas/modul | `kebab-case.ts`, satu tanggung jawab | `merge-unique.ts`, `response-groups.ts`, `pixel-blend.ts` | Hindari `misc`, `common`, `helper`, `manager`, `handler`, `core`, `service` untuk file baru. `utils.ts` dan `site.ts` tetap ada sebagai bucket lama (62 import each). |
| Hook | `useX.ts` | `useInfiniteList.ts`, `useToast` (dalam `Toast.tsx`) | Hook diekspor dari file yang sesuai domainnya. |
| Domain (`features/`) | `features/<domain>/actions.ts`, `queries.ts`, file domain tambahan | `features/creations/queries.ts`, `features/community/follows.ts` | Konvensi ini dipertahankan; jangan dipindah tanpa refactor besar. |
| Test | `<domain>.test.ts` / `<fitur>.test.ts` | `tests/works-home.test.ts`, `lib/merge-unique.test.ts` | Nama bertahap lama (`community-fase-b`) adalah arsip dan tetap dipertahankan. |
| Framework | Nama tetap | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts(x)`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `icon.tsx`, `index.ts` (Edge Function) | **Dilarang diganti** — kontrak Next.js/Supabase. Lihat `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`. |

Keputusan rename fase ini:

| Lama | Baru | Alasan |
| --- | --- | --- |
| `lib/social-notifications.ts` | `lib/response-groups.ts` | Isinya hanya `groupByRecency` + `splitTemplate`, bukan pengiriman notifikasi. |
| `lib/social-feed.ts` | `lib/merge-unique.ts` | Isinya hanya `mergeUnique<T>`, bukan seluruh feed. |
| `lib/social-notifications.test.ts` | `lib/response-groups.test.ts` | Mengikuti modul yang diuji. |
| `lib/social-feed.test.ts` | `lib/merge-unique.test.ts` | Mengikuti modul yang diuji. |

---

## 3. Routes

Aturan:

- `app/[lang]/(group)/.../page.tsx` menentukan URL; route group `(public)`, `(auth)`, `(member)` **tidak** masuk URL.
- `id` memakai URL root tanpa prefiks; `en` memakai `/en`. `next.config.ts` menulis ulang path root ke `/id/...` dan mengalihkan `/id/...` kembali ke path polos.
- Dynamic segment memakai `[id]` / `[username]` sesuai konvensi Next.js.
- `loading.tsx`, `error.tsx`, `not-found.tsx` mengikuti nama framework dan ditempatkan sedekat mungkin dengan segmen yang mereka layani.
- Helper URL terpusat: `lib/i18n.ts:href()`, `lib/paths.ts`, `lib/share.ts`. Jangan menyusun URL publik secara ad-hoc.

URL yang **dibekukan** (perubahan memerlukan persetujuan owner + redirect permanen + update `next.config.ts`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `public/sw.js`, email template Supabase, test, dan docs):

| URL | Nama internal yang tidak persis | Alasan dipertahankan |
| --- | --- | --- |
| `/` | Landing page, bukan "home" | PWA `start_url`, sitemap, kanonik Indonesia. |
| `/home` | Feed publik, bukan beranda | URL publik, nav/tab, rewrite, test. |
| `/dashboard` | My Works, bukan dashboard | sudah ada, dibatasi anggota, IA `INFORMATION-ARCHITECTURE.md` §1. |
| `/responses` | Inbox respon, bukan notifikasi umum | deep link, robots, test, dan istilah produk `COMMUNITY-EXPERIENCE.md`. |
| `/create`, `/create/[id]` | Pintu karya baru + editor | rewrite dinamis, service worker, banyak redirect. |
| `/creation/[id]` | Detail karya | canonical share/OG/QR/download. |
| `/u/[username]` | Profil publik | deep link publik, share, revalidate. |
| `/space`, `/creators`, `/admin`, `/settings`, `/welcome`, auth routes | — | sitemap/role gate/auth allowlist. |
| `/api/*`, `/auth/callback`, `/auth/recovery` | — | kontrak eksternal, email template, allowlist Supabase. |

---

## 4. Komponen

- `PascalCase` untuk komponen; prop dan callback memakai `camelCase`.
- Nama prop boolean diawali `is`/`has` (`isMember`, `hasResponses`), bukan `member` yang terdengar seperti objek. Perubahan fase ini: `member: boolean` → `isMember` pada `ReportButton` dan `FollowButton`.
- Callback payload diberi nama sesuai isinya: `onShapeDraftChange?: (shapeDraft: ShapeDraftInfo)`, `onCanvasMenu?: (position: { clientX, clientY })`.
- Satu keluarga UI memakai satu awalan: `Social*` untuk chrome feed, `ui/*` untuk primitive, `PageSkeletons` / `RouteSkeletons` / `Skeleton` sesuai scope. Jangan membuat keluarga baru (`Rack`, `Block`) untuk hal yang sudah punya `Strip`/`Card` tanpa alasan.
- Nama file sebaiknya sama dengan ekspor utama. Ketidaksesuaian berikut **didokumentasikan, tidak diganti** karena path dipin test atau spesifikasi: `SocialNav.tsx` → `SocialSidebar`/`SocialTabBar`, `ReportDialog.tsx` → `ReportButton`, `PageSkeletons.tsx` → tujuh skeleton, `SearchResults.tsx` → `SearchOverview`, `RecommendationRack.tsx` → `recommendationStrip*Class`/`RecommendationSkeleton`, `Toast.tsx` → `ToastProvider`/`useToast`, `menuKeyboard.ts` → `handleMenuKeyDown`/`focusMenuItem` (path dipin `UI_INTERACTION_SPEC.md` U4).
- Brand mark: `PxlbMark` di `components/layout/PxlbMark.tsx` adalah implementasi kanonik. `PxlbLogo.tsx` dan alias deprecated `CommonsMark.tsx` dipertahankan sampai keputusan konsolidasi terpisah.

---

## 5. Function, variable, constant, type, hook

| Jenis | Aturan | Contoh |
| --- | --- | --- |
| Function / method | `verbNoun`, camelCase | `groupByRecency`, `mergeUnique`, `langFromAcceptLanguage` |
| Hook | `useX` | `useToast`, `useInfiniteList` |
| Boolean | `is`, `has`, `can`, `should` | `isMember`, `hasResponses`, `isActive` |
| Constant | `SCREAMING_SNAKE_CASE` | `DEFAULT_LANG`, `REACTION_TYPE`, `PIXEL_BUCKET` |
| Type / interface | `PascalCase`, nama sesuai domain | `CreationRow`, `ShapeDraftInfo`, `PublicProfile` |
| Teks bilingual | `LocalizedText` = `Record<Lang, string>` | `Bi` tetap sebagai alias deprecated untuk kompatibilitas |
| Event payload | nama sesuai muatan, bukan `info`/`data` | `shapeDraft`, `position`, `item` (hanya jika generik memang tepat) |
| Lokal matematis | singkatan diperbolehkan hanya di scope sangat kecil | `x`, `y`, `s` di raster/geometry |

Batasan layer: **row DB tetap snake_case** (`CreationRow`, `PublicProfile`), **objek UI hasil mapping tetap camelCase** (`CreationCard.author`). Jangan merename field per field; pertahankan batas ini.

---

## 6. Teks UI

- Teks pengguna dua bahasa di `lib/copy.ts` dan `lib/copy-social.ts`; halaman/komponen **tidak** menulis literal ID/EN baru. Aturan ini tertulis di `docs/TECHNICAL-SPEC.md:577`.
- Gunakan [`TERMINOLOGY.md`](../product/TERMINOLOGY.md) untuk memilih kata. Bahasa Indonesia natural, bahasa Inggris umum; brand `PXLB`, `Pixel Art`, `Studio`, `Common Space` tidak diterjemahkan.
- Jangan menampilkan nilai enum/mentah (`pending`, `email`, `creation`) sebagai label pengguna; pakai label lokal yang sudah ada atau tambahkan kunci copy baru.
- `aria-label`, placeholder, judul dialog, dan status kosong mengikuti bahasa antarmuka yang aktif.
- Toast = umpan balik singkat; Alert/status inline = keadaan persisten (lihat `docs/audit/UI_INTERACTION_SPEC.md` §4.6.1).
- Istilah lama yang masih tertanam di kunci copy dipertahankan sebagai alias kompatibilitas; nilinya yang diselaraskan. Contoh: `notificationsUnread` kini menampilkan "Ada respon baru / New responses" karena permukaan `/responses` adalah inbox respon, bukan notifikasi sistem.

---

## 7. API dan database

| Elemen | Konvensi yang berlaku | Status |
| --- | --- | --- |
| Tabel | plural, snake_case: `profiles`, `creations`, `comments`, `reactions`, `reports`, `follows`, `space_elements`, `reaction_events`, `follow_events` | Dipertahankan — perubahan butuh migrasi + RLS + grant + test |
| Kolom | snake_case: `user_id`, `creation_id`, `created_at`, `published_at` | Dipertahankan |
| Enum | `text` + `check`, bukan tipe Postgres: `draft|published|hidden`, `text|visual|idea|story|pixel` | Dipertahankan |
| RPC | `search_*_ranked`, `admin_set_*_status`, `set_reaction_state`, `set_follow_state`, `is_admin()` | Dipertahankan — dipanggil klien dan di-pin test |
| RLS policy | `<object>_<action>_<scope>` (`creations_select_published`, `avatars_insert_own`) | Dipertahankan |
| Storage bucket | `pixel-creations`, `avatars` (kebab-case, bukan snake_case SQL) | Dipertahankan — diatur `SPEC-PIXEL-ASSETS.md` |
| Endpoint API | kebab-case: `/api/pixel-cover/[id]`, `/api/pixel-download/[id]`, `/api/share-export/[id]`; nested resource untuk `/api/og/creation/[id]`, `/api/qr/creation/[id]` | Dipertahankan — URL eksternal |
| Zod schema | `<concept>Schema`, `parse<Concept>` | Dipertahankan |
| Migrasi | additive-only (`TECHNICAL-SPEC.md:161`) | Tidak ada rename schema dalam tugas ini |

Ketidaksesuaian konseptual yang **sengaja tidak diubah sepihak**: `creations.category` sebenarnya preset ukuran pixel; `reactions` vs UI "appreciation"; `forked_from` vs UI "remix"; `activity_seen_at` dipakai sebagai penanda "baru" untuk feed serta inbox; RPC JSON `liked` vs `appreciate`. Semuanya memerlukan keputusan produk/migrasi.

---

## 8. Keputusan pelaksanaan

### Diubah pada fase ini
- 4 file rename (2 modul helper + 2 test) seperti tercantum di §2.
- `member: boolean` → `isMember` pada `ReportButton` dan `FollowButton` beserta semua call site.
- `info` → `shapeDraft` / `position` pada kontrak callback `PixelBoard`.
- `LocalizedText` ditambahkan sebagai nama kanonik; `Bi` tetap alias.
- Teks `/responses` diselaraskan ke "Respon/Responses"; aksi reaksi diselaraskan ke "Apresiasi/Appreciate"; label "My creations" diganti memakai `socialCopy.nav.works`.

### Dipertahankan (dengan alasan)
- `utils.ts`, `site.ts`, `copy.ts`, `copy-social.ts`, `creations.ts`, `paths.ts`, `meta.ts`, `menuKeyboard.ts`, `flags.ts`, `social-like.ts` — dipin oleh banyak import, test literal, dan/atau spesifikasi yang sudah disetujui.
- Nama file komponen yang tidak cocok dengan ekspor utamanya — dipin test literal dan/atau dokumen arsip.
- Seluruh URL publik, endpoint API, tabel/kolom/RPC/bucket DB — kontrak eksternal dan migrasi berisiko.

### Ditunda (butuh keputusan owner / migrasi / refactor lebih besar)
- Konsolidasi `formatRelativeTime` di `lib/format.ts` dan `lib/social-time.ts` (keluaran berbeda → perubahan terlihat).
- Konsolidasi `SocialEmptyState` / `EmptyState`, `Pill` / `FilterChip`, `QuietRack` / `NewCreatorsStrip` / `RemixStrip` / `SimilarWorksStrip` (perubahan struktur visual).
- Rename `SocialNav.tsx`, `ReportDialog.tsx`, `SearchResults.tsx`, `PageSkeletons.tsx`, `RecommendationRack.tsx`, `RouteSkeletons.tsx` (path literal di test + dokumen).
- RenameDB `category` → `size_category`, `liked` → `appreciated`, `forked_from` → `remixed_from`, `activity_seen_at` → dua kolom (migrasi + RLS + RPC + test).
- Rename URL `/home`, `/dashboard`, `/responses`, `/create/[id]`, `/u/[username]` (redirect permanen dan dampak SEO/share).
- Migrasi copy hard-coded di dashboard dan skeleton `aria-label="Loading"` (terpisah dari renaming; menyentuh banyak file UI).
- Penghapusan alias deprecated (`CommonsMark`, `StudioNewForm`, `PixelDecor`) — bukan penghapusan fitur tanpa persetujuan.

---

## 9. Checklist reviewer / agent

1. Apakah nama baru menggambarkan isi file, bukan nama "keren" atau generik?
2. Apakah satu konsep hanya punya satu istilah di kode, UI, dan dokumen aktif?
3. Apakah perubahan menyentuh URL, API, DB, atau path yang dipin test? Jika ya, apakah sudah ada keputusan dan migrasi/redirect?
4. Apakah teks UI sudah memakai kunci copy dan mengikuti kamus istilah?
5. Apakah `npm run typecheck`, `npm test`, `npm run lint`, dan `npm run build` masih lolos tanpa issue baru?

Catatan status: tidak ada validasi browser pada perubahan ini; klaim perilaku runtime tetap **UNVERIFIED**.
