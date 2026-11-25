# PXLB — Community & Growth Strategy

**Document:** `docs/strategy/PXLB-Community&Growth-Strategy.md`  
**Document Type:** Product & Community Strategy  
**Document purpose:** Strategy and vision context for community, growth, and long-term ecosystem direction. This is not an implementation plan, not a signed-off spec, and not authorization to write code.  
**Project:** PXLB  
**Website:** https://pxlb.fun  
**Status:** STRATEGY / VISION — NOT AN IMPLEMENTATION PLAN. Items without a signed-off spec remain `PROPOSED — AWAITING OWNER DECISION`.  
**Updated:** 2026-11-25.  
**Implementation evidence:** VERIFIED IN CODE — Studio (`components/creations/PlaygroundForm.tsx`, `components/canvas/PixelBoard.tsx`, `lib/pixel.ts`) and THE COMMONS (`app/[lang]/(public)/explore/page.tsx`, `components/community/CreationCommunity.tsx`, `features/community/actions.ts`, `components/profiles/`); VERIFIED BY TEST — `tests/community-fase-a.test.ts`, `tests/community-fase-b.test.ts`, `tests/social-interactions.test.ts`, `tests/instant-interaction.test.ts`, `tests/works-home.test.ts`. VERIFIED ABSENCE — no marketplace, challenge, founding-creator, spotlight, growth-analytics, or realtime tables/routes/actions found in `app/`, `features/`, `lib/`, `components/`, or `supabase/migrations/` (audit 2026-11-25).  
**Completed:** Studio + community MVP loop exists (create → draft → publish → explore/detail → appreciate/comment/share); profiles and avatars; fork/remix foundation with A2 server gate.  
**Open:** Marketplace, Founding Creators Program, Artist Spotlight, Weekly Challenge, growth analytics, and financial sustainability. Realtime collaboration stays **VISION ONLY — NOT APPROVED FOR IMPLEMENTATION**.  
**Dependencies:** `docs/PRODUCT-SPEC.md`, `docs/TECHNICAL-SPEC.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/master-plan/arah-pengembangan-pxlb.md`, `docs/master-plan/SPEC-REMIX.md`, `docs/master-plan/SPEC-CHALLENGE.md`, `docs/master-plan/SPEC-PIXEL-ASSETS.md`.  
**Next action:** Use this document only as strategy input. Any feature needs an owner decision, a signed-off spec, and a separate go-ahead. Operator actions in `docs/IMPLEMENTATION-PLAN.md` §14 remain pending.  
**Status labels:** VERIFIED IN CODE / VERIFIED BY TEST / VERIFIED IN BROWSER / VERIFIED IN PRODUCTION / OPERATOR ACTION REQUIRED / PROPOSED — AWAITING OWNER DECISION / APPROVED — SIGNED OFF / DECIDED — PRODUCT ONLY. No browser or production verification was performed for this document; source-level proof is not browser or production proof.  
**Market:** Indonesia first, global later (proposed direction; current app ships ID/EN copy only).

---

## Status mapping — strategy vs implementation (2026-11-25)

| Strategy item | Current status | Notes |
|---|---|---|
| PXLB Studio — acquisition engine | VERIFIED IN CODE | Editor, layers, import/export, draft/publish exist. |
| THE COMMONS — retention engine | VERIFIED IN CODE | Explore, creation detail, appreciate/comment/share, profiles exist. Named programs below do not. |
| PXLB Marketplace — monetization engine | VISION ONLY — NOT APPROVED FOR IMPLEMENTATION | No marketplace code, schema, or endpoint. |
| Founding Creators Program / badge | PROPOSED — AWAITING OWNER DECISION | No badge, recruitment, or benefit mechanism in code. |
| Artist Spotlight | PROPOSED — AWAITING OWNER DECISION | No curation or spotlight surface in code. |
| Weekly Pixel Challenge | Open Challenge: APPROVED — SIGNED OFF, implementation BLOCKED (`docs/master-plan/SPEC-CHALLENGE.md`). Guided Challenge: deferred. | No challenge table, route, action, or UI. |
| Community Showcase / social distribution | PROPOSED — AWAITING OWNER DECISION | Requires creator permission and attribution; no automation exists. |
| Growth analytics / MAU targets | PROPOSED — AWAITING OWNER DECISION | No analytics instrumentation found. |
| Financial sustainability / PXLB Pro | PROPOSED — AWAITING OWNER DECISION | No billing or subscription code. |
| "Berkolaborasi" in the long-term vision | VISION ONLY — NOT APPROVED FOR IMPLEMENTATION | No realtime APIs, `canvas_tiles`, stroke RPC, presence/broadcast, or `postgres_changes`. |

Naming alignment: the final product name for reusable artwork is **Pixel Assets** (K7), not `Stamp`. `stampBrush` is only an internal brush helper. See `docs/master-plan/SPEC-PIXEL-ASSETS.md`.

---

## 1. Vision

PXLB adalah ekosistem pixel art berbasis web yang menggabungkan tiga komponen utama:

1. **PXLB Studio** — tempat pengguna membuat pixel art.
2. **THE COMMONS** — tempat pengguna memamerkan karya, berinteraksi, dan membangun komunitas.
3. **PXLB Marketplace** — tempat kreator menjual dan pengguna membeli aset digital. **VISION ONLY — NOT APPROVED FOR IMPLEMENTATION**; tidak ada kode, schema, atau endpoint marketplace saat ini.

PXLB bukan sekadar pixel art editor. Tujuan jangka panjangnya adalah menjadi rumah bagi komunitas pixel art, mulai dari pemula hingga kreator profesional.

### Core Vision

> A home for pixel artists to create, share, connect, and grow.

### Geographic Strategy

- Tahap pertama: Indonesia.
- Tahap berikutnya: Asia Tenggara.
- Tahap jangka panjang: Global.

---

## 2. Founder Positioning

Founder PXLB tidak harus menjadi pixel artist atau ilustrator profesional.

Peran utama founder:

- Product Builder: membangun dan mengembangkan platform.
- Community Organizer: menghubungkan kreator.
- Ecosystem Builder: menciptakan lingkungan yang mendukung kreativitas.
- Product Listener: mengumpulkan feedback dan memahami kebutuhan pengguna.

PXLB dibangun bersama komunitas, bukan hanya untuk komunitas.

### Prinsip

Founder tidak harus menghasilkan semua karya yang ditampilkan di PXLB. Kreator dan komunitas menjadi sumber utama karya, aktivitas, dan perkembangan ekosistem.

---

## 3. Target Audience

PXLB menargetkan enam kelompok pengguna:

| Audience | Primary Needs |
|---|---|
| Pixel Artist | Editor, portfolio, exposure |
| Indie Game Developer | Sprite, tileset, game assets |
| Digital Illustrator | Creative experimentation |
| Pixel Animator | Animation tools, GIF |
| Beginner & Student | Learning, practice, feedback |
| Digital Asset Buyer | Discover and purchase assets |

### Market Hypothesis — Indonesia

Estimasi awal untuk divalidasi:

- Conservative: 5.000–10.000 calon pengguna.
- Moderate: 20.000–50.000 calon pengguna.
- Optimistic: 100.000–200.000 calon pengguna.

Angka tersebut merupakan hipotesis pasar, bukan data resmi jumlah pixel artist Indonesia.

### Initial Acquisition Target

10 founding creators yang benar-benar menggunakan PXLB.

---

## 4. Ecosystem Strategy

### A. PXLB Studio — Acquisition Engine

Fungsi:
- Menarik pengguna baru.
- Memberikan pengalaman membuat pixel art.
- Menjadi sumber karya untuk THE COMMONS.
- Menghubungkan proses kreatif dengan publikasi.

Strategi:
- Prioritaskan stabilitas editor.
- Pastikan pengalaman menggambar nyaman.
- Sediakan integrasi publikasi karya.
- Kurangi hambatan antara membuat dan membagikan karya.

### B. THE COMMONS — Retention Engine

Fungsi:
- Menjadi pusat komunitas.
- Menampilkan karya kreator.
- Mendorong interaksi dan apresiasi.
- Membangun identitas kreator.

Aktivitas utama:
- Artwork Showcase.
- Artist Spotlight.
- Weekly Pixel Challenge.
- Community Feedback.
- Creator Profile.

### C. PXLB Marketplace — Monetization Engine

**Status: VISION ONLY — NOT APPROVED FOR IMPLEMENTATION.** `PROPOSED — AWAITING OWNER DECISION`. Tidak ada tabel, route, action, bucket, atau UI marketplace di repo (VERIFIED ABSENCE, audit 2026-11-25). Bagian ini adalah arah jangka panjang, bukan target rilis.

Fungsi:
- Memungkinkan kreator memperoleh penghasilan.
- Menyediakan aset digital bagi pengguna.
- Membangun ekonomi kreator.

Potensi produk:
- Sprite Sheets.
- Character Packs.
- Tilesets.
- Animation Packs.
- Game Assets.

Marketplace dikembangkan setelah terdapat kreator aktif dan katalog produk yang memadai.

---

## 5. Community Acquisition Strategy

PXLB tidak bergantung pada kemampuan founder menggambar atau menjadi influencer.

Pertumbuhan komunitas mengandalkan partisipasi kreator.

### 5.1 Founding Creators Program

`PROPOSED — AWAITING OWNER DECISION.` Program operasional, bukan fitur yang sudah ada; tidak ada badge, rekrutmen, atau mekanisme benefit di kode (VERIFIED ABSENCE, 2026-11-25).

Program untuk mengajak kreator pertama bergabung dan membantu membangun PXLB.

Manfaat:
- Founding Creator Badge.
- Featured Creator.
- Early Access.
- Kesempatan memberikan feedback.
- Profil kreator yang dipromosikan.
- Kesempatan berkolaborasi.

Target awal: 10 founding creators.

Tidak menjanjikan pembayaran atau keuntungan finansial yang belum tersedia.

### 5.2 Artist Spotlight

`PROPOSED — AWAITING OWNER DECISION.` Belum ada permukaan kurasi/spotlight di aplikasi (VERIFIED ABSENCE, 2026-11-25).

Program mingguan untuk memperkenalkan satu kreator.

Format konten:
- Nama kreator.
- Profil singkat.
- Karya pilihan.
- Proses kreatif.
- Tautan menuju profil PXLB.

Tujuan:
- Memberikan exposure.
- Mengapresiasi kreator.
- Menghasilkan konten promosi.
- Membangun hubungan dengan komunitas.

### 5.3 Weekly Pixel Challenge

**Open Challenge:** `APPROVED — SIGNED OFF` sebagai spec (`docs/master-plan/SPEC-CHALLENGE.md`), tetapi **implementasi BLOCKED** dan menunggu go-ahead terpisah. **Guided Challenge tetap ditunda.** Tidak ada tabel, route, action, atau UI Challenge (VERIFIED ABSENCE, 2026-11-25). Nama final untuk aset siap pakai adalah **Pixel Assets**, bukan `Stamp` (`docs/master-plan/SPEC-PIXEL-ASSETS.md`).

Aktivitas rutin dengan tema tertentu.

Contoh:
- Cozy Winter.
- Fantasy Creature.
- Indonesian Food.
- Pixel Pets.
- Retro Game Character.

Alur:
1. PXLB mengumumkan tema.
2. Pengguna membuat karya.
3. Pengguna mengirimkan karya.
4. Karya ditampilkan di THE COMMONS.
5. PXLB memilih karya unggulan.
6. Peserta dapat membagikan hasilnya.

### 5.4 Community Showcase

Kumpulan karya komunitas yang dipublikasikan melalui:
- Website PXLB.
- Instagram.
- TikTok.
- X.
- Discord atau komunitas terkait.

Seluruh penggunaan karya untuk promosi harus memperhatikan izin kreator dan atribusi.

---

## 6. Marketing Strategy

### 6.1 Building in Public

Founder mendokumentasikan proses pengembangan PXLB.

Jenis konten:

**Development Progress**
- Perkembangan PXLB Studio.
- Fitur baru.
- Perbaikan bug.
- Perubahan UI/UX.

**Feature Demonstration**
- Drawing tools.
- Layer system.
- Animation timeline.
- Keyboard shortcuts.
- Export functionality.

**Founder Story**
- Alasan membangun PXLB.
- Tantangan membangun produk sendiri.
- Visi membangun komunitas pixel art.
- Proses mengambil keputusan produk.

**Community Stories**
- Artist Spotlight.
- Challenge results.
- Creator achievements.
- Community feedback.

### 6.2 Distribution Channels

| Channel | Purpose |
|---|---|
| Instagram | Artwork showcase |
| TikTok | Feature demonstrations |
| X | Development updates |
| Discord | Community interaction |
| Reddit | International discovery |
| Pixel Art Groups | Early user acquisition |

Strategi utama bukan melakukan promosi agresif, melainkan berpartisipasi dan memberikan nilai kepada komunitas.

### 6.3 Direct Outreach

Menghubungi pixel artist secara langsung.

Tujuan:
- Mencari founding creators.
- Mengajak beta testing.
- Meminta feedback.
- Membuka kolaborasi.

Pendekatan harus personal dan tidak menggunakan pesan spam massal.

---

## 7. First 30 Days — Execution Plan

`PROPOSED — AWAITING OWNER DECISION.` Ini rencana operasional/eksperimen komunitas, bukan komitmen fitur dan bukan izin implementasi. Kegiatan yang menyentuh Challenge menunggu go-ahead terpisah; tidak ada automation, analytics, atau sistem rekrutmen yang dibangun dari daftar ini.

### Week 1: Preparation

- [ ] Rapikan landing page.
- [ ] Buat penjelasan singkat PXLB.
- [ ] Siapkan media sosial.
- [ ] Rekam demonstrasi fitur.
- [ ] Siapkan Founding Creators Program.

### Week 2: Creator Acquisition

- [ ] Identifikasi 20 pixel artist Indonesia.
- [ ] Hubungi calon kreator.
- [ ] Rekrut 5–10 founding creators.
- [ ] Ajak mencoba PXLB.
- [ ] Kumpulkan feedback.

### Week 3: Community Activation

- [ ] Jalankan pixel challenge pertama.
- [ ] Publikasikan karya komunitas.
- [ ] Buat Artist Spotlight pertama.
- [ ] Bagikan development updates.

### Week 4: Distribution & Evaluation

- [ ] Publikasikan hasil challenge.
- [ ] Ajak peserta membagikan karya.
- [ ] Evaluasi pengguna yang kembali.
- [ ] Identifikasi hambatan penggunaan.
- [ ] Susun perbaikan berdasarkan feedback.

### Initial Targets

| Metric | Target |
|---|---:|
| Founding Creators | 10 |
| Direct Artist Outreach | 20 |
| Community Challenge | 1 |
| Community Artwork Published | 5+ |

Target ini adalah sasaran eksperimen awal.

---

## 8. Growth Roadmap

`PROPOSED — AWAITING OWNER DECISION.` Target MAU adalah hipotesis, bukan data. Tidak ada instrumentasi analytics di kode (VERIFIED ABSENCE, 2026-11-25); metrik di bawah merupakan definisi yang diusulkan, bukan dashboard yang tersedia.

| Stage | Monthly Active Users | Focus |
|---|---:|---|
| Validation | 100–500 | Product validation |
| Early Community | 1.000–3.000 | Community activation |
| Indonesian Ecosystem | 5.000–10.000 | Creator economy |
| Global Expansion | 25.000–100.000 | International growth |

MAU adalah pengguna unik aktif bulanan, bukan jumlah akun terdaftar.

Pertumbuhan tidak boleh hanya diukur berdasarkan jumlah akun.

### Important Metrics

**Acquisition**
- New registrations.
- Traffic sources.
- Registration conversion.
- Creator acquisition.

**Activation**
- First artwork created.
- First artwork published.
- First community interaction.

**Retention**
- Weekly Active Users.
- Monthly Active Users.
- Returning creators.
- Artwork publishing frequency.

**Community**
- Published artworks.
- Comments and reactions.
- Challenge participation.
- Active creators.

**Marketplace**
- Active sellers.
- Listed assets.
- Transactions.
- Gross Merchandise Value.
- Creator earnings.

---

## 9. Financial Sustainability

`PROPOSED — AWAITING OWNER DECISION.` Seluruh opsi di bawah adalah ide pendanaan, bukan produk yang tersedia. Tidak ada kode billing, subscription, atau pembayaran (VERIFIED ABSENCE, 2026-11-25).

Prinsip: PXLB harus bisa bertahan tanpa founder menanggung seluruh biaya operasional selamanya.

Potensi pendanaan:

1. Community Support.
2. Sponsorship.
3. Marketplace Commission.
4. Optional PXLB Pro.
5. Creator Tools.
6. Educational Partnerships.
7. Grants and Open-source Support.

### Financial Priority

Tahap awal:
- Infrastruktur efisien.
- Pengembangan komunitas.
- Validasi produk.

Tahap pertumbuhan:
- Community sponsorship.
- Dukungan sukarela.
- Monetisasi marketplace.

Tahap matang:
- Pendapatan berulang.
- Pengembangan tim.
- Infrastruktur berskala lebih besar.

Editor dasar dan akses komunitas sebaiknya tetap mudah dijangkau.

---

## 10. Operating Principles

Prinsip yang harus dipertahankan dalam pengembangan PXLB:

1. Community before monetization.
2. Product quality before aggressive growth.
3. Creator recognition and attribution.
4. Sustainable infrastructure.
5. No artificial user growth.
6. Feedback-driven development.
7. Indonesia first, global later.
8. Creator-friendly ecosystem.

PXLB tidak boleh hanya menjadi platform yang mengumpulkan akun. PXLB harus menjadi tempat yang benar-benar digunakan dan dirasakan manfaatnya oleh kreator.

---

## 11. Long-Term Vision

PXLB ingin membangun ekosistem tempat:

- Pemula dapat belajar pixel art.
- Kreator dapat membuat dan memamerkan karya.
- Komunitas dapat berinteraksi dan berkolaborasi.
- Profesional dapat membangun portofolio.
- Kreator dapat menjual aset digital.
- Pembeli dapat menemukan aset berkualitas.

### Final Vision Statement

> PXLB aims to become a home for the global pixel art community — a place where people create, share, connect, and turn creativity into opportunities.

---

## 12. Next Development Direction

Dokumen ini menjadi dasar diskusi strategi, **bukan** dasar implementasi. Prioritas 2–4 sudah memiliki spec yang ditandatangani (`docs/master-plan/SPEC-REMIX.md`, `SPEC-CHALLENGE.md`, `SPEC-PIXEL-ASSETS.md`), tetapi implementasinya tetap menunggu go-ahead terpisah. Prioritas 1 dirujuk ke `docs/PRODUCT-SPEC.md`. Prioritas 5–7 masih `PROPOSED — AWAITING OWNER DECISION`.

Prioritas pembahasan berikutnya:

1. Community architecture — struktur komunitas dan pengalaman pengguna.
2. Founding Creators System — mekanisme rekrutmen dan benefit kreator.
3. Community Challenge System — pengelolaan kompetisi rutin.
4. Artist Spotlight System — kurasi dan publikasi kreator.
5. Marketing Content Pipeline — alur pembuatan dan distribusi konten.
6. Growth Analytics — pengukuran akuisisi, aktivasi, dan retensi.
7. Creator Economy — persiapan marketplace dan monetisasi.

**Implementation principle:** strategi harus diterjemahkan menjadi fitur hanya ketika ada kebutuhan produk yang jelas. Jangan membangun sistem kompleks sebelum proses manualnya terbukti berjalan.