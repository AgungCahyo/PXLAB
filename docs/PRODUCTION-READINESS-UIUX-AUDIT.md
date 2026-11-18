# PXLB — Production Readiness & UI/UX Polish Audit

**Tanggal:** 18 November 2026  
**Sifat:** audit saja — **tidak ada perubahan kode aplikasi** pada pass ini.  
**Arah visual target:** *Modern Pixel Playground* (identitas pixel ceria + platform kreatif modern).  
**Sumber kebenaran kode yang dibaca:** routes di `app/`, shell di `components/layout/`, UI di `components/ui/`, `app/globals.css`, `lib/copy.ts`, `docs/PIXEL-ART-DESIGN-SYSTEM.md`, tes layout/typography/pixel-world.

**Batasan yang harus dijaga saat polish nanti:** jangan ubah business logic, schema DB, format artwork source, canvas engine / rendering pipeline; jangan hapus fitur yang berfungsi; jangan refactor besar sebelum dampak dipahami.

**Tujuan produk (penekanan pemilik):** PXLB bukan “pixel editor yang kebetulan punya Explore & Profile”. Seluruh permukaan harus terasa **satu produk**: Landing menarik → Dashboard nyaman kembali → Create ingin berkarya → Editor menyenangkan → Explore ingin melihat karya → Profile membuat kreator bangga.

---

## 0. Verdict singkat

| Aspek | Kondisi |
|---|---|
| Fitur komunitas & studio | Kuat secara fungsional (Fase A–C komunitas + Playground sudah hidup) |
| Satu produk / atmosfer | **Belum utuh** — banyak halaman terasa “form + grid” di atas Paper, bukan playground modern yang sama |
| Design system di token | Ada foundation bagus (`globals.css`, Button, pixel-frame) |
| Design system di praktik | Drift: backdrop dunia tidak terpasang, beberapa tes UI gagal, Create tanpa judul halaman, Landing tipis |
| Production gates | Metadata/canonical ada; loading partial; tidak ada `not-found` app-level; operator migrations + live QA masih terbuka (B7) |

**Prioritas keseluruhan:** satukan atmosfer & hierarchy halaman publik dulu (Landing → Explore → Detail → Profile → Create), lalu Dashboard/Responses/Auth/Admin dengan bahasa yang sama, baru polish mikro editor chrome (tanpa sentuh engine).

---

## 1. Page inventory — routes & layouts

### 1.1 Layout stack

| Layout | Path | Peran |
|---|---|---|
| Root | `app/layout.tsx` | Minimal root |
| Lang | `app/[lang]/layout.tsx` | Fonts (DM Sans + Press Start 2P), skip link, **`PublicShell` untuk semua halaman lang** |
| Member gate | `app/[lang]/(member)/layout.tsx` | Redirect guest → login |
| Admin gate | `app/[lang]/admin/layout.tsx` | Auth + role admin |
| Public / auth groups | `(public)`, `(auth)` | Tidak punya layout sendiri — memakai `PublicShell` |

Shell bersama: `PublicShell` → `SiteHeader` + `SiteNav` / `AppTabBar` + `main#main` + `SiteFooter`.

**Catatan penting:** `PixelWorldBackdrop` ada di `components/layout/PixelWorldBackdrop.tsx` + CSS `.pixel-world*`, dan tes `tests/pixel-world.test.ts` mengharuskan mount di `PublicShell` — tetapi **`PublicShell` saat ini tidak mengimpor backdrop**. Atmosfer “dunia pixel” hilang dari runtime; halaman jadi flat Paper.

### 1.2 Routes (ID rewrite + `/en/...`)

| Route | Page file | Layout efektif | Kondisi | Catatan |
|---|---|---|---|---|
| `/` | `(public)/page.tsx` | PublicShell | **Uneven** | Hero teks pendek; gallery 6 karya; 2 mode cards; tanpa visual hero kuat |
| `/explore` | `(public)/explore/page.tsx` | PublicShell | **Good / crowded** | Filters + QuietRack + NewCreators + grid; intro copy tidak dipakai |
| `/creators` | `(public)/creators/page.tsx` | PublicShell | Secondary | Strip kreator baru |
| `/creation/[id]` | `(public)/creation/[id]/page.tsx` | PublicShell | **Good** | Artwork fokus; engagement; CreatorBlock; conversation |
| `/u/[username]` | `(public)/u/[username]/page.tsx` | PublicShell | **Good / thin** | Meta join + count; grid; Follow |
| `/space` | `(public)/space/page.tsx` | PublicShell | **Secondary / archive** | Common Space “nanti” + legacy `SpaceBoard` |
| `/login` | `(auth)/login/page.tsx` | PublicShell | Adequate | Form standar |
| `/register` | `(auth)/register/page.tsx` | PublicShell | Adequate | |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | PublicShell | Adequate | |
| `/reset-password` | `(auth)/reset-password/page.tsx` | PublicShell | Adequate | |
| `/create` | `(member)/create/page.tsx` | PublicShell + member | **Uneven** | Tidak ada `h1.pixel-title`; size picker + inspiration |
| `/create/[id]` | `(member)/create/[id]/page.tsx` | PublicShell + member | **Strong (pixel)** / legacy StudioForm | Playground full-bleed chrome; header site disembunyikan |
| `/dashboard` | `(member)/dashboard/page.tsx` | PublicShell + member | **Uneven** | “My Works” list rows — terasa admin list, bukan gallery bangga |
| `/responses` | `(member)/responses/page.tsx` | PublicShell + member | Adequate | Inbox respons |
| `/settings` | `(member)/settings/page.tsx` | PublicShell + member | Adequate | Form profil |
| `/admin` | `admin/page.tsx` | PublicShell + admin | Adequate / utilitarian | Filter reports + cards |

Rewrites: `next.config.ts` memetakan path tanpa prefix → `/id/...`; `/en/...` untuk English.

### 1.3 Loading / error surfaces

| Surface | Ada? |
|---|---|
| `explore/loading`, `dashboard/loading`, `create/loading`, `create/[id]/loading`, `creation/[id]/loading`, `u/[username]/loading` | Ya (`PageSkeletons` / gallery skeleton) |
| Auth / settings / responses / admin / landing / space / creators loading | **Tidak** |
| `app/**/not-found.tsx` / `error.tsx` | **Tidak ditemukan** |
| Skip link + `:focus-visible` Sky | Ya |

### 1.4 Shared components (inti)

**Layout:** `PublicShell`, `SiteHeader`, `SiteNav`/`AppTabBar`, `SiteFooter`, `LanguageSwitch`, `PageTransition`, `ViewTransitionGuard`, `PxlbMark` (+ alias deprecated `CommonsMark`), `PixelWorldBackdrop` (**orphan runtime**).

**Creations / community:** `CreationCard`, `WorksRow`, `ExploreGallery`, `QuietRack`, `NewCreatorsStrip`, `CreateInspiration`, `CreatorBlock`, `RemixStrip`, `SimilarWorksStrip`, `CreationCommunity`/`CreationEngagement`, `ResponsesInbox`, `FollowButton`, `PlaygroundForm`, `PixelBoard`, `PixelNewForm`, `StudioForm` (legacy), `StudioNewForm` (re-export deprecated).

**UI kit:** `Button`, `Card`, `Dialog`, `Input`, `Textarea`, `EmptyState`, `Alert`, `PixelIcon`, `SizeSlider`. `PixelDecor` — **tidak ada import** (mati).

---

## 2. Kondisi per halaman (UI/UX)

### 2.1 Landing `/`

**Yang baik:** brand kicker `SITE_NAME`, CTA Explore + Join/Create, cuplikan karya nyata, Common Space diturunkan jadi footnote.

**Masalah:**
- Hero **bukan** komposisi visual dominan — tidak ada gambar/atmosfer full-bleed; terasa landing docs.
- `landingIntro` = sama dengan `description` (duplikat “Playground kreatif…”).
- Dua `Card` mode (Playground / Jelajah) setara — bertentangan dengan arah “satu produk” dan catatan design system lama (“Not two equal product modes”).
- Tidak memanfaatkan accent pixel (sky strip hanya di header) di body.

**Product unity:** lemah — kurang “welcome to PXLB playground”.

### 2.2 Explore `/explore`

**Yang baik:** gallery cards berbingkai, filter ukuran + feed Following, QuietRack, kreator baru, empty/error + retry.

**Masalah:**
- Chrome padat di viewport pertama (judul + filters + quiet + strip) — risiko “dashboard discovery”.
- `exploreIntro` ada di copy tetapi **sengaja tidak di-render** (tes explore-layout).
- Filter chips menduplikasi pola “brick selected” yang juga dipakai admin — OK, tapi aria label feed memakai `exploreTitle` (tes mengeluh landmark).
- Tes `explore-layout` **gagal** vs implementasi saat ini → drift QA.

**Product unity:** sedang–baik sebagai galeri; perlu breathing room & hierarchy lebih jelas.

### 2.3 Create `/create`

**Yang baik:** preset ukuran (`pixel-choice`), inspirasi komunitas per ukuran, link kelola karya.

**Masalah:**
- **Tidak ada judul halaman `pixel-title`** (tes typography gagal). Hanya paragraf intro — terasa form orphan.
- Onboarding masih “pilih ukuran” lebih dulu daripada motivasi berkarya (meski inspiration di bawah membantu).

**Product unity:** sedang — fungsional, kurang undangan emosional.

### 2.4 Editor `/create/[id]` (Playground)

**Yang baik:** studio density tokens, icon-first tools, hide site header/footer/tabbar, skeleton studio, publish flow + caption nudge + share.

**Masalah (chrome saja — jangan sentuh engine di fase polish):**
- Tool rail sangat padat (banyak tool) — mobile comfort residual risk meski hit targets sudah ditokenisasi.
- Legacy `StudioForm` path untuk non-pixel masih hidup (jarang, tapi beda dunia visual).
- Studio terasa “tool product”; keluar ke Explore/Profile masih loncat atmosfer.

**Product unity:** editor kuat sebagai alat; jembatan masuk/keluar (create done → detail, dashboard) perlu polish copy/UI.

### 2.5 Dashboard `/dashboard` (“My Works”)

**Yang baik:** pisah draft/published, empty state, CTA create + responses.

**Masalah:**
- `WorksRow` = list horizontal mirip file manager (thumb 80px + banyak tombol). **Tidak** memakai bahasa gallery `CreationCard` yang membuat profil/explore bangga.
- Section titles memakai `pixel-title` untuk “Draf” / “Terbit” — berat untuk H2 berulang.
- Back control custom (bukan Button) — pola diulang di Responses.

**Product unity:** terasa “admin milik saya”, bukan rumah kreator PXLB.

### 2.6 Profile `/u/[username]`

**Yang baik:** avatar, count, member since, Follow, grid kartu pixel, link responses untuk pemilik.

**Masalah:**
- Header masih hemat — sedikit “kebanggaan” (tidak ada highlight karya, cover strip, atau atmosfer).
- Empty profile bergantung EmptyState generik.

**Product unity:** baik secara struktur; visual masih datar.

### 2.7 Artwork Detail `/creation/[id]`

**Yang baik:** artwork hero, sans title untuk judul user, palette/tags, Appreciate/Remix/Share, CreatorBlock, remix strip, similar, conversation + guest composer.

**Masalah:**
- Banyak section setelah karya (creator, similar, conversation) — scroll panjang; hierarchy sudah relatif jelas.
- Back “Ke jelajah” custom chip — inkonsisten dengan Button outline.

**Product unity:** paling dekat “produk komunitas” yang utuh.

### 2.8 Auth

**Yang baik:** pixel-title, meta, redirect jika sudah login, next path.

**Masalah:** halaman auth tanpa atmosfer/brand illustration; sama flat seperti settings. Opportunity: satu auth shell visual (mark + short pitch) tanpa mengubah logic.

### 2.9 Settings / Responses / Admin

- **Settings:** form padat, OK untuk utilitas; kurang page intro visual.
- **Responses:** jelas; list inbox — pastikan empty/unseen terasa ramah.
- **Admin:** utilitarian cards + filter brick — boleh lebih “moderation desk” dalam bahasa PXLB, bukan SaaS table.

### 2.10 Space `/space`

Secondary by design. Archive `SpaceBoard` + CTA ke Explore/Create. Jaga agar tidak mencuri fokus landing (sudah footnote) — polish rendah prioritas kecuali copy membingungkan.

---

## 3. Masalah UI/UX (lintas halaman)

1. **Tidak ada “product frame” bersama** di body (backdrop mati; dekorasi tidak dipakai) → setiap page = konten di Paper kosong.
2. **Hierarchy hero lemah** di Landing & Create (brand/CTA kalah atau setara dengan blok sekunder).
3. **Dashboard ≠ gallery language** → kreator tidak “bangga” di My Works.
4. **Chrome kontrol duplikatif ad-hoc:** banyak `border-[3px] border-earth bg-card` inline alih-alih `Button`/`FilterChip`.
5. **Cards di landing** untuk “cara kerja” menambah clutter tanpa menambah desire.
6. **Editor vs site:** transisi emosional publish-done sudah ada; return paths (dashboard/profile) masih list-heavy.
7. **Mobile tab bar** hanya Explore / Create / Profile — Dashboard & Responses tersembunyi di account menu desktop; di mobile anggota harus lewat Profile → Works (friction).

---

## 4. Design consistency

### 4.1 Arah desain: bentrok dokumen vs brief baru

| Sumber | Arah |
|---|---|
| `PIXEL-ART-DESIGN-SYSTEM.md` | **Classic Pixel Adventure** — sky stage, ground, sparse Mario-climate world |
| Brief polish ini | **Modern Pixel Playground** — warm off-white, accent cerah, selective pixel border/shadow, minimal clutter, profesional |

**Rekomendasi produk:** evolusi DS → Modern Pixel Playground: Paper tetap hero background; hard shadow & earth border **selektif**; backdrop dunia diganti/ diseimbangkan (bukan sky `#5c94fc` full-bleed yang mirip level game) agar modern tanpa kehilangan pixel identity. Update DS doc sebelum implementasi visual besar.

### 4.2 Warna

- Token inti konsisten: Paper `#FFFDF7`, Ink, Earth, Brick/Grass/Sky/Coin.
- Drift: `.pixel-world-sky` memakai `#5c94fc` / ground `#c84c0c` di luar token brand — tidak sinkron dengan `--sky` / `--earth`.
- `--accent` = `--sky` (redundant).
- Selected filters: Brick fill — kuat; hati-hati overuse (terasa “semua selected merah”).

### 4.3 Typography

- Skala token bagus (`--text-body` 15px, meta 13, pixel-title clamp).
- **Inkonsistensi praktik:** Create page tanpa `pixel-title`; Detail memakai `page-heading-sans` (benar untuk judul user); EmptyState memakai `pixel-title` untuk pesan panjang → risiko sulit dibaca.
- Banyak `text-[14px]`/`text-[15px]` hardcoded alih-alih utility token.

### 4.4 Komponen

| Pola | Variasi / masalah |
|---|---|
| Button | 4 variants solid — bagus; banyak link custom meniru outline tanpa `buttonClassName` |
| Card | `pixel-frame` + padding; dipakai landing modes & admin |
| Filter chips | Di-copy di Explore & Admin (bukan shared component) |
| Dialog | Ada; studio dialogs padat |
| Input | Shared; studio punya kontrol sendiri |
| Nav | Desktop underline sky; mobile tabbar 3 item |
| Mark | `PxlbMark` aktif; `CommonsMark` alias; `PixelDecor` mati |

### 4.5 Duplikat / legacy

- `StudioNewForm` → re-export `PixelNewForm`
- `CommonsMark` → alias `PxlbMark`
- `StudioForm` + `VisualEditor`/`VisualCanvas` untuk legacy types
- `SpaceBoard` archive
- Copy keys `principlesHeading` / contribution / view — kemungkinan **tidak dipakai di landing saat ini** (dead copy)

### 4.6 Styling unused / orphan

- `PixelWorldBackdrop` + sebagian besar CSS pixel-world (**orphan** selama tidak di-mount)
- `PixelDecor` (**no imports**)
- Tes pixel-world / explore-layout / typography **gagal** → sinyal drift desain vs kontrak tes

---

## 5. Responsiveness

**Sudah baik:**
- `min-w-0` di banyak gallery/header (cegah overflow flex)
- Explore size filters: horizontal scroll di mobile
- QuietRack horizontal scroll
- Studio tokens compact `<768px`; site header/tabbar hide di playground
- `pb` safe-area untuk tabbar; `viewportFit: cover`

**Risiko / temuan:**
- Landing mode cards + gallery: OK, tapi hero tetap teks — di mobile terasa panjang sebelum karya
- Dashboard `WorksRow`: tombol stack di mobile (`flex-col`) — tinggi row besar, mudah “tombol wall”
- Detail engagement wrap: OK; CreatorBlock + similar menambah scroll
- Hard shadow `4px 4px` bisa terasa clip di edge sempit jika parent `overflow-hidden` (sudah ada catatan di DS)
- Tab bar tidak mengekspos Works/Responses → discovery member di mobile lemah
- Admin filter wrap OK; belum diaudit visual di tablet secara live

*Catatan: audit ini berbasis kode/kelas, bukan browser matrix penuh. Live pass mobile/tablet tetap diperlukan di fase implementasi.*

---

## 6. Content & typography

| Isu | Contoh |
|---|---|
| Duplikat | `description` ≈ `landingIntro` |
| Terlalu pendek / generik | Banyak meta “Galeri pixel art.” / “Karya terbit.” — SEO lemah |
| Istilah | UI memakai **Remix** (baik); kode/DB tetap `fork` (OK internal). Nav dashboard **Karya/Works** vs judul **Karyamu/Your works** |
| EN/ID mix | “Playground” tetap di ID copy (personalTitle, createEyebrow) — sadar brand atau lokalize |
| Dead / unused copy | `exploreIntro` (tidak di page), kemungkinan principles* di landing |
| Empty/error | Explore/admin punya EmptyState; beberapa empty section hanya `<p className="text-muted">` (dashboard group empty) — inkonsisten |
| Label | Create tanpa H1 membuat landmark a11y/page title lemah |
| Brand history | Docs masih “THE COMMONS” di beberapa audit lama; runtime `SITE_NAME = "PXLB"` |

---

## 7. Production readiness

| Area | Status |
|---|---|
| **SEO / metadata** | `pageMeta` + canonical + hreflang id/en; OG image terutama di detail pixel; landing tanpa image hero OG khusus |
| **Indexing** | Member routes `noIndex`; publik indexable |
| **A11y** | Skip link, focus-visible Sky, aria pada nav/tools; EmptyState H2; beberapa kontrol icon-only mengandalkan aria-label (studio) |
| **Loading** | Partial route coverage; landing/auth tanpa skeleton |
| **Errors** | Tidak ada `error.tsx` / `not-found.tsx` branded |
| **Performance** | `cacheComponents`, Suspense boundaries Explore/landing; Playground client berat (diharapkan); backdrop SVG world saat diaktifkan perlu jaga cost |
| **Security / launch** | B7: migrasi operator + live signed-in pass masih open; service role tidak di client (sudah digate sebelumnya) |
| **Tes drift** | `pixel-world`, `explore-layout`, sebagian `typography` **FAIL** — kontrak UI tidak sinkron |
| **i18n routes** | Rewrite ID default solid |

---

## 8. Rekomendasi perbaikan (tanpa implementasi di pass ini)

### A. Product unity (paling berdampak)

1. **Tetapkan Modern Pixel Playground** di `PIXEL-ART-DESIGN-SYSTEM.md` (evolusi dari Classic Adventure): Paper-first, accent selektif, hard shadow selektif, dekorasi jarang, **bukan** sky-stage penuh kecuali opsi landing halus.
2. **Putuskan nasib `PixelWorldBackdrop`:** (a) remount versi soft/modern per-route, atau (b) ganti dengan atmosfer lebih ringan (gradient Paper + sparse pixel deco) dan update/hapus tes terkait.
3. **Landing redesign composition:** brand hero + 1 headline + 1 supporting + CTA + **visual karya/atmosfer dominan**; buang atau turunkan dua mode cards setara.
4. **Create page:** tambah H1 produk + undangan singkat; size picker sebagai langkah jelas; inspiration tetap di bawah.
5. **Dashboard → “Karyamu” gallery-first:** gunakan bahasa kartu/thumbnail besar seperti Explore/Profile; actions secondary.
6. **Profile pride pass:** sedikit lebih hero (nama + grid spacing + empty yang mengajak publish).
7. **Mobile IA:** pertimbangkan akses Works/Responses tanpa tiga ketukan (menu account di tab, atau overflow).

### B. Design system hygiene

8. Ekstrak **`FilterChip`**, **`BackLink`**, **`PageHeader`** (kicker/title/intro/actions).
9. Standarkan empty: selalu `EmptyState` atau varian inline yang sama.
10. Bersihkan orphan: `PixelDecor` / dead copy / alias deprecated setelah cutover.
11. Perbaiki tes layout agar match keputusan produk (bukan sebaliknya diam-diam).

### C. Content

12. Perkuat landing/explore/detail meta descriptions (unik, bukan echo tagline).
13. Glossary singkat: Remix, Karya, Jelajah, Playground (kapan EN dipinjam).
14. Samakan tone empty/error (ramah, actionable).

### D. Production

15. Branded `not-found` + `error` boundary.
16. Loading untuk auth/settings/responses/landing bila percieved delay ada.
17. Operator: apply migrations + B7 live checklist sebelum broad launch.
18. OG default image untuk halaman tanpa cover.

### E. Editor polish (terakhir, chrome only)

19. Density/grouping tool rail; jangan ubah pipeline gambar.
20. Publish-done → jalur komunitas (lihat karya / bagikan) sudah ada; pastikan visual dialog selaras DS baru.

---

## 9. Prioritas pengerjaan (dampak × risiko)

| Prio | Item | Dampak product-unity | Risiko teknis | Sentuh engine/DB? |
|---|---|---|---|---|
| **P0** | Putuskan & dokumentasikan arah Modern Pixel Playground vs Classic Adventure | Sangat tinggi | Rendah (docs) | Tidak |
| **P0** | Landing composition + atmosfer (backdrop soft atau alternatif) | Sangat tinggi | Sedang (CSS/layout) | Tidak |
| **P0** | Create page header + hierarchy | Tinggi | Rendah | Tidak |
| **P1** | Dashboard gallery-first (WorksRow → card language) | Tinggi | Sedang (UI only) | Tidak |
| **P1** | Shared `PageHeader` / `FilterChip` / `BackLink` | Tinggi (konsistensi) | Rendah–sedang | Tidak |
| **P1** | Profile pride + empty states seragam | Tinggi | Rendah | Tidak |
| **P1** | Fix / realign failing UI contract tests | Sedang (kecepatan polish) | Rendah | Tidak |
| **P2** | Explore breathing room (kurangi clutter above fold) | Sedang | Rendah | Tidak |
| **P2** | Auth visual shell | Sedang | Rendah | Tidak |
| **P2** | `not-found` / `error` / loading gaps | Sedang (prod) | Rendah | Tidak |
| **P2** | Content/meta/glossary pass | Sedang | Rendah | Tidak |
| **P3** | Admin/Responses visual tone | Rendah–sedang | Rendah | Tidak |
| **P3** | Space archive copy/layout | Rendah | Rendah | Tidak |
| **P3** | Editor chrome grouping | Sedang (delight) | Sedang — **hati-hati** | **Jangan** engine |
| **Ops** | Migrations + B7 live QA + deploy | Launch blocker | Ops | DB apply only |

**Urutan bertahap yang disarankan:**

1. **Phase PR-0 — Direction lock** (docs DS + keputusan backdrop).  
2. **Phase PR-1 — Public product surface** (Landing, Explore spacing, Detail/Profile micro).  
3. **Phase PR-2 — Creator home** (Create header, Dashboard gallery, mobile Works access).  
4. **Phase PR-3 — System & prod chrome** (shared components, empty/error/not-found, content, tests).  
5. **Phase PR-4 — Studio chrome only** (grouping/density; no engine).  
6. **Phase PR-Launch — Operator B7**.

---

## 10. Komponen yang sebaiknya dibuat reusable

| Komponen | Alasan |
|---|---|
| `PageHeader` | Title pixel + optional intro + actions — Create/Dashboard/Explore/Settings/Admin |
| `BackLink` | Pola berulang Dashboard/Responses/Detail |
| `FilterChip` / `SegmentedFilter` | Explore + Admin (+ mungkin Following) |
| `WorksGallery` (atau reuse `CreationCard` + actions menu) | Ganti/augment `WorksRow` agar selaras Explore/Profile |
| `AuthShell` | Login/register/forgot/reset — brand + form slot |
| `Atmosphere` (soft) | Pengganti atau wrapper modern untuk backdrop per-route |
| `SectionHeader` | QuietRack / inspiration / creator other works — title + hint satu pola |
| `EmptyState` variants | `page` vs `section` (section jangan pakai pixel-title besar) |

**Jangan abstraksi dulu:** `PixelBoard`, import pipeline, fork/remix actions, follow/inbox queries.

---

## 11. Mapping ke tujuan “satu produk”

| Permukaan | Harus terasa… | Gap terbesar hari ini |
|---|---|---|
| Landing | Tertarik masuk dunia PXLB | Hero visual & desire lemah |
| Dashboard | Nyaman kembali / bangga punya karya | List admin, bukan gallery |
| Create | Ingin mulai berkarya | Tanpa H1/undangan kuat |
| Editor | Senang menggambar | Sudah kuat; jaga jangan dirusak |
| Explore | Ingin lihat karya orang | Agak ramai di atas fold |
| Profile | Bangga menunjukkan karya | Tipis, kurang pride |

---

## 12. Lampiran — bukti tes drift (audit-time)

Perintah: `npx vitest run tests/pixel-world.test.ts tests/explore-layout.test.ts tests/typography.test.ts`

Gagal antara lain karena:
- `PublicShell` tidak memuat `PixelWorldBackdrop`
- Explore filter markup / aria tidak match kontrak tes
- Create page tidak mengandung `pixel-title`

Ini **bukan** ajakan “kembalikan Classic Adventure buta”; ini sinyal bahwa keputusan visual harus disengaja lalu tes & DS diselaraskan.

---

**Status dokumen:** dasar pengerjaan bertahap.  
**Progress:** **PR-0 → PR-3 (18 Nov 2026)** — DS + soft atmosphere; Landing/Create/Explore/Profile/Settings/Detail polish; Dashboard gallery; nav consolidate; `CornerBusy`; `FilterChip`/`PageHeader`/`SectionHeader`; branded `not-found`/`error`; `robots.ts` + `sitemap.ts`; unique public meta. Next: **PR-4** studio chrome only / **PR-Launch** B7.
