# THE COMMONS — Instant Interaction Audit

> **Status:** **OUTDATED — HISTORICAL SNAPSHOT (17 Nov 2026).** Several claims in this document are contradicted by current source. In particular, `app/` now contains route-level `loading.tsx` files across major routes. Use `docs/audit/REPOSITORY_DISCOVERY.md` and `docs/audit/UX_CONSISTENCY_AUDIT.md` for current-state evidence.

**Dokumen:** `docs/INSTANT-INTERACTION-AUDIT.md`  
**Tanggal:** 17 Nov 2026  
**Sifat:** Evaluasi (bukan implementasi).  
**Acuan:** kualitas respons Instagram-like (segera, natural), bukan peniruan visual.  
**Dasar:** kode saat ini (setelah loading feedback + R1 studio guard).

---

## 1. Ringkasan

Loading label sudah ada pada banyak aksi async. Itu memperbaiki **konfirmasi proses**, belum **respons instan**.

| Lapisan | Kondisi sekarang |
|---|---|
| Input response (klik → perubahan UI lokal) | Lemah pada Apresiasi; kuat pada komentar (sudah optimistic) |
| Navigation response (klik → transisi halaman) | Link Next dipakai, tetapi hampir semua rute `instant = false` + menunggu data server; **tidak ada** `loading.tsx` |
| Visual feedback (disabled / label / skeleton) | Ada di form & galeri Explore; detail karya & profil tanpa shell loading |
| Data loading | Detail karya memblokir seluruh halaman sampai creation + conversation + reaction siap |
| Server confirmation | Mayoritas aksi masih *server-first* |

**Kesimpulan:** THE COMMONS belum setara aplikasi sosial modern pada *perceived performance*. Celah terbesar: **Apresiasi server-bound**, **navigasi detail tanpa streaming/shell**, **tidak ada route-level loading UI**.

Komentar sudah lebih maju dari yang diduga: optimistic insert + rollback sudah ada. Fork sudah benar menolak navigasi ke karya yang belum jadi (redirect hanya setelah insert berhasil).

---

## 2. A. Immediate Feedback — per interaksi

| Interaksi | Menunggu server sebelum UI berubah? | Feedback sekarang | Gap |
|---|---|---|---|
| **Appreciation** | **Ya** | Tombol `disabled` + label “Memproses…”; state aktif/count baru setelah action + revalidate | Harus langsung aktif/nonaktif seperti like |
| **Buka artwork** | **Ya (penuh)** | `Link` → halaman RSC menunggu `connection()` + `getPublishedCreation` + conversation + reaction | Harus langsung tampil shell + gambar prioritas |
| **Buka profil kreator** | **Ya** | Sama pola server page, tanpa `loading.tsx` / Suspense konten utama | Shell + grid skeleton |
| **Buka / kirim komentar** | Buka komposer: **tidak** (lokal). Kirim: **tidak** untuk list (optimistic) | Komposer expand lokal; catatan `tmp-…` muncul dulu | Hampir baik; kurang status “mengirim” pada baris + retry eksplisit |
| **Fork** | **Ya** | Label “Membuat fork…”; `redirect` server setelah sukses | Feedback instan OK; jangan optimistic-navigate |
| **Publish** | Sebagian | Status simpan / “Menerbitkan…”; dialog selesai setelah OK | Wajar tetap server-bound (side effect publik) |
| **Delete** | **Ya** | Dialog + “Menghapus…”; redirect setelah hapus | Wajar; jangan optimistic-hapus karya terbit |
| **Navigation (tab/header)** | Tergantung rute | Prefetch Link default; studio guard menyimpan dulu bila dirty | Di luar studio: kurang loading shell |
| **Form auth / settings / create** | **Ya** | Label proses | Wajar; tidak perlu optimistic login |

### Bukti kunci

- Apresiasi: `AppreciateForm` memakai `useActionState(toggleAppreciationAction)` — UI menunggu hasil server (`components/community/CreationCommunity.tsx`).
- Detail karya: `await connection()` lalu fetch creation, lalu `Promise.all` conversation + reaction sebelum render apa pun (`app/[lang]/(public)/creation/[id]/page.tsx`).
- Tidak ada file `loading.tsx` di `app/`.
- Semua halaman utama men-set `export const instant = false`.
- `PixelArt` memakai `<img>` tanpa `fetchPriority` / `priority` (`components/creations/PixelArt.tsx`).

---

## 3. B. Optimistic UI — evaluasi aman

### B1. Appreciation — **aman & prioritas tinggi**

| Kriteria | Penilaian |
|---|---|
| Konsistensi data | Toggle 1:1 unik per member+creation; mudah di-rollback |
| Kegagalan umum | Auth, karya hilang, jaringan |
| Double submit | Saat ini dicegah `disabled`; perlu antrean/serial + abaikan klik saat in-flight |
| Race | Klik cepat like→unlike harus di-serialkan ke intent terakhir |

**Rekomendasi:** Optimistic toggle lokal (`appreciated` + `count±1`) segera; fire server action di belakang; pada error kembalikan snapshot; jangan `useOptimistic` membabi buta tanpa kunci in-flight. **Jangan** ubah aturan “satu jenis apresiasi”.

### B2. Comments — **sebagian sudah ada; perhalus**

Sudah ada:

- `onOptimistic` → `pendingRoots` / `pendingReplies`
- `onPosted` mengganti `tmp-…` dengan id server
- `onFailed` menghapus sementara; isi textarea tetap (bisa kirim ulang)

Belum ada:

- Penanda visual “mengirim / gagal” pada baris sementara
- Tombol **Coba lagi** yang aman (kirim ulang body yang sama, tanpa duplikat bila request pertama ternyata sukses)
- Edit komentar: server-first (teks baru hanya setelah OK) — optimistic aman dengan rollback
- Hapus komentar: baris tetap sampai server OK — optimistic aman untuk milik sendiri
- Baris `tmp-…` tampil seperti komentar final (tanpa opacity / `aria-busy`)

**Rekomendasi:** Pertahankan optimistic insert. Tandai baris sementara; tambah retry aman setelah gagal jelas. Edit/hapus: optimistic lokal + rollback. **Jangan** longgarkan balasan satu tingkat / komposer tertutup.

### B3. Fork — **jangan optimistic navigate**

| Kriteria | Penilaian |
|---|---|
| Side effect | Salin storage source+cover + insert baris — mahal, bisa gagal di tengah |
| Navigasi ke editor kosong | Berbahaya |

**Rekomendasi:** Tetap server-first untuk *hasil*. Pertahankan label proses. Opsional: toast/status “Menyiapkan salinan…” tanpa mengubah rute sampai `redirect` sukses (sudah mendekati ini). **Jangan** buka `/create/[id]` sebelum id ada.

### B4. Publish / Delete — **bukan kandidat optimistic penuh**

- Publish mengubah visibilitas publik + validasi judul — butuh konfirmasi server (dialog selesai sudah tepat).
- Delete cascade komentar/apresiasi — optimistic hilangkan kartu di My Works boleh *setelah* konfirmasi dialog, dengan rollback jika action gagal; prioritas lebih rendah dari Apresiasi.

---

## 4. C. Instant Navigation

| Rute | Prefetch Link | Loading UI | Skeleton | Image priority | Blocking |
|---|---|---|---|---|---|
| Explore | Ya (kartu/filter) | Suspense + `GallerySkeleton` untuk hasil | Ya | Tidak | Filter di luar Suspense; list di dalam — relatif baik |
| Artwork detail | Ya dari kartu | **Tidak** | **Tidak** | **Tidak** | **Seluruh halaman** menunggu creation + community |
| Creator profile | Ya | **Tidak** | **Tidak** (kecuali pola serupa landing) | Tidak | Menunggu list karya |
| My Works | Ya | **Tidak** | **Tidak** | Tidak | Menunggu `listOwnCreations` |
| Studio `/create/[id]` | Dari My Works | **Tidak** | N/A (full chrome) | N/A | Menunggu owned creation + pixel source |
| Landing | Ya CTA | Suspense karya | `GallerySkeleton` | Tidak | OK |

### Temuan navigasi

1. **Tidak ada `loading.tsx`** → navigasi klien sering terasa “diam” sampai RSC siap.
2. **Detail karya tidak memecah streaming:** gambar, meta, engagement, conversation di satu server tree tanpa Suspense boundary untuk community.
3. **`instant = false` di mana-mana** — sesuai Cache Components/auth, tetapi memperbesar biaya perceived latency jika tidak diimbangi shell loading.
4. **Duplicate fetch risiko:** `generateMetadata` dan page sama-sama memanggil `getPublishedCreation` (dua round-trip serupa per request detail).
5. Kartu Explore memakai `Link` — prefetch default membantu; manfaat hilang jika target page tetap penuh blok.

### Target perilaku “buka artwork”

1. Klik kartu → transisi segera (loading shell atau partial).
2. Slot gambar utama muncul dulu (cover URL sudah diketahui dari kartu — bisa diteruskan sebagai hint, atau skeleton thumb→full).
3. Judul/meta stream menyusul.
4. Apresiasi/percakapan di Suspense terpisah (tidak menahan gambar).

---

## 5. D. Perceived Performance — model empat waktu

| Waktu | Definisi | Status THE COMMONS |
|---|---|---|
| **Input response** | &lt;100ms perubahan lokal | Apresiasi: buruk. Komentar kirim: baik. Alat studio: baik |
| **Navigation response** | Transisi/chrome segera | Lemah tanpa `loading.tsx` / streaming |
| **Visual feedback** | Disabled, label, skeleton | Sudah diperbaiki di form; kurang di navigasi & like |
| **Data loading** | Isi nyata | Detail & profil menunggu penuh |
| **Server confirmation** | OK/error final | Ada; sering digabung dengan feedback pertama (salah lapis) |

Prinsip yang belum dipegang: **feedback pertama ≠ konfirmasi server**.

---

## 6. Prioritas perbaikan (usulan implementasi nanti)

Urutan menurut dampak perceived performance / risiko:

| Irisan | Isi | Risiko |
|---|---|---|
| **I1** | Optimistic Apresiasi + anti-race | Rendah–sedang; jangan sentuh aturan reaksi |
| **I2** | `loading.tsx` (atau shell) untuk detail, profil, dashboard, create | Rendah; identitas pixel skeleton |
| **I3** | Pecah halaman detail: gambar/meta cepat; conversation + reaction di Suspense | Sedang; cek Cache Components / `connection()` |
| **I4** | `fetchPriority` pada cover detail; pertimbangkan hint dari kartu | Rendah |
| **I5** | Status + retry aman pada komentar optimistic | Rendah |
| **I6** | Kurangi double `getPublishedCreation` (metadata vs page) bila API Next mengizinkan | Rendah |
| **I7** | Optimistic hapus di My Works (opsional) | Sedang |
| **I8** | Label proses hapus di `StudioForm` (parity `WorksDeleteButton` / `useFormStatus`) | Rendah |

**Catatan teknis:** tidak ada `useOptimistic` di repo; `useTransition` hanya di `SpaceBoard` (bukan alur sosial).

**Di luar cakupan / jangan:**

- Optimistic fork-navigate.
- Optimistic publish ke publik tanpa konfirmasi server.
- Mengubah Artwork Conversation (satu tingkat, komposer tertutup, satu jenis apresiasi).
- Meniru UI Instagram (stories, infinite reels, dll.).

---

## 7. Kaitan dokumen lain

- Melengkapi `COMPREHENSIVE-UX-AUDIT.md` (fokus di sana: kehilangan data, auth, a11y — bukan perceived latency sosial).
- Loading label (iris sebelumnya) = prasyarat visual feedback; **bukan** pengganti optimistic UI.
- R1 studio guard tetap di atas kecepatan navigasi keluar studio (simpan dulu > instant leave).

---

## 8. Keputusan produk (terkunci 17 Nov 2026)

1. **I1–I3 disetujui** sebagai prioritas berikutnya: I1 + I2 = P0; I3 = P1 setelah loading/data fetching jelas.
2. **Placeholder cover dari kartu: tidak** untuk tahap pertama — skeleton generik saja.
3. **Loading UI: skeleton khusus per halaman** lewat `loading.tsx` per segment, bukan satu shell global.
4. Apresiasi optimistic: ikon + count segera; cegah klik ganda selama satu request; rollback + alert jika gagal; tanpa antrean toggle rumit.
5. Batasan tetap: satu jenis apresiasi; balasan satu tingkat; komposer tertutup; fork/publish/delete dan simpan studio tidak di-optimistikkan melebihi aturan di bagian 6.

---

## 9. Cross-check

Temuan di atas selaras dengan audit baca-kode terpisah ([Read-only audit of THE COMMONS](066f83d5-8721-4ca1-9f88-c9af7143277a)): komentar post/reply = pola terkuat; apresiasi = gap terbesar; fork/publish tetap blocking dengan sengaja; navigasi kurang shell karena tidak ada `loading.tsx` dan detail/dashboard/studio tanpa Suspense.
