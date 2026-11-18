# THE COMMONS — Audit Pengalaman Komunitas dan Create

Repo: github.com/AgungCahyo/PXLAB · Tanggal audit: 17 November 2026 · **Status: Fase A–C shipped** (tes: `tests/community-fase-*.test.ts`)

**Sifat dokumen:** audit awal + catatan implementasi. Kode, migrasi, dan UI komunitas sudah mengikuti rekomendasi di bawah. Jangan mengulang Fase A–C kecuali ada regresi.

**Metode audit awal:** membaca kode (`CreationCard`, profil, Detail, `CreationCommunity`, Explore, Dashboard, `PlaygroundForm`, `StudioNewForm`/`PixelNewForm`, `StudioForm`, `forkCreationAction`, migrasi Supabase, dan dokumen spec).

---

## 1. Ringkasan (audit awal)

- THE COMMONS kuat sebagai alat menggambar dan galeri, tetapi **saat audit** belum punya jalur antarkreator yang lengkap.
- Alur Create berhenti di "karya terbit", padahal di situlah komunitas seharusnya mulai.
- **Keputusan produk (Fase C):** follow satu arah + filter Following di Explore diizinkan; **tanpa** angka pengikut publik, ranking, atau feed algoritmik. Spec diselaraskan.

**Prinsip desain:** aktivitas hanya muncul di tiga tempat, tanpa ticker global:

1. **Pada karya** (percakapan dan remix).
2. **Pada kreator** (profil: aktif sejak kapan, karya terbaru).
3. **Pribadi** (kotak / halaman "Respon untuk karyamu").

---

## 2. Audit pengalaman komunitas (awal)

### 2.1 Menemukan dan mengenal kreator lain

- Explore hanya diurutkan `published_at` terbaru, dengan filter ukuran dan pencarian judul. Tidak ada pencarian kreator dan tidak ada jalur "kreator baru".
- Profil hanya berisi avatar, nama, bio, dan grid karya (maks. 100). Tidak ada jumlah karya, tanggal bergabung, atau penanda karya terbaru.
- Satu-satunya jalan ke profil adalah byline kecil di Detail dan nama komentator.

### 2.2 Creation Card

- Seluruh kartu adalah satu link ke karya. `@username` hanya teks, jadi **tidak ada jalan dari kartu ke profil kreator**.
- Data kartu tidak memuat `avatar_url`.
- Kartu tidak menampilkan sinyal percakapan.

### 2.3 Halaman Detail

- Apresiasi dan Bagikan sudah solid.
- Byline kreator tanpa avatar/bio; tidak ada "karya lain" atau "karya serupa".
- Komposer komentar generik; tamu hanya teks ajakan masuk.
- Fork tersembunyi di dasar halaman; silsilah hanya ke belakang.

### 2.4–2.6

Tidak ada hubungan antarkreator, aktivitas komunitas tidak terlihat, Dashboard tidak memberi sinyal respons — loop kontribusi bocor.

---

## 3. Audit Create dan Studio (awal)

1. Dialog setelah terbit terlalu pelit.
2. Caption/hashtag tersembunyi saat Terbitkan.
3. Fork berakhir di editor; kreator asli tidak tahu.
4. `/create` hampa onboarding.
5. Legacy non-pixel bocor ke profil publik.
6. Penamaan membingungkan (`StudioNewForm` vs editor pixel).

---

## 4. Rekomendasi + status

| ID | Perubahan | Status |
|---|---|---|
| K1 | Jalur kartu → kreator (`avatar_url`, tautan terpisah) | **Shipped** |
| K2 | Blok kreator di Detail + strip karya lain | **Shipped** (`CreatorBlock`) |
| K3 / C3 | Remix terlihat dua arah (engagement + strip + sumber) | **Shipped** |
| K4 | Profil: jumlah karya, bergabung sejak | **Shipped** |
| K5 | Prompt komentar kontekstual + komposer tamu | **Shipped** |
| K6 / C7 | Inbox "Respon untuk karyamu" + `activity_seen_at` | **Shipped** (`/responses`) |
| K7 | Follow satu arah (tanpa angka publik) | **Shipped** |
| K8 | Following Feed = filter Explore | **Shipped** (`feed=following`) |
| K9 | Rak "Belum ada percakapan" | **Shipped** (`QuietRack`) |
| K10 | Karya serupa + kreator baru | **Shipped** |
| K11 | Indikator tenang di kartu (catatan, badge Baru) | **Shipped** |
| C1 | Dialog terbit bermakna + Bagikan | **Shipped** |
| C2 | Nudge caption saat Terbitkan | **Shipped** |
| C4 | Onboarding `/create` + inspirasi | **Shipped** (`CreateInspiration`) |
| C5 | Profil publik hanya pixel | **Shipped** |
| C6 | `PixelNewForm` (re-export deprecated `StudioNewForm`) | **Shipped** |

---

## 5. Urutan yang sudah dijalankan

- **Fase A** — K1–K5, C1, C2, C5, C6
- **Fase B** — K6/C7, K9, C4
- **Fase C** — K7, K8, K10, K11

Tes regresi: `npx vitest run tests/community-fase-a.test.ts tests/community-fase-b.test.ts tests/community-fase-c.test.ts`

---

## 6. Sengaja tetap di luar

Angka pengikut publik, sort trending/populer, leaderboard, ticker aktivitas global, streak/badge, notifikasi realtime/push/email, komentar bersarang lebih dari satu level, reaksi emoji tambahan.

---

## 7. Risiko yang tetap dijaga

- Rate limit follow (`FOLLOW_PER_HOUR`).
- Query berbatas untuk strip / feed / inbox; hindari N+1.
- Inbox menyembunyikan komentar `hidden`.
- Salinan ID + EN di `lib/copy.ts`.

---

## 8. Keputusan produk (tertutup)

1. Fase A–C disetujui dan diimplementasikan.
2. Spec mengizinkan follow satu arah + Following filter; menolak angka pengikut publik dan notifikasi kompleks.
3. C5: karya non-pixel disembunyikan dari profil publik (`type: "pixel"`).

## 9. Selanjutnya (bukan fase komunitas baru)

Operator launch (lihat `IMPLEMENTATION-PLAN.md` §14 / B7): terapkan migrasi Supabase yang belum applied, walkthrough signed-in (persist, conversation, remix, admin hide), deploy. **Jangan** mulai B6 Common Space tanpa approve terpisah.
