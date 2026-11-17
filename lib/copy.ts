import type { Bi } from "@/lib/i18n";
import { formatPixelSize, PIXEL_SIZE_PRESETS, type PixelSizePresetId } from "@/lib/pixel";
import type { CreationCategory, CreationType } from "@/lib/site";

export const copy = {
  skip: { id: "Lewati", en: "Skip" } satisfies Bi,
  homeAria: { id: "THE COMMONS — beranda", en: "THE COMMONS — home" } satisfies Bi,
  navAria: { id: "Utama", en: "Main" } satisfies Bi,
  openMenu: { id: "Buka menu", en: "Open menu" } satisfies Bi,
  closeMenu: { id: "Tutup menu", en: "Close menu" } satisfies Bi,
  switchToEn: { id: "English", en: "English" } satisfies Bi,
  switchToId: { id: "Bahasa Indonesia", en: "Bahasa Indonesia" } satisfies Bi,

  tagline: { id: "Dibuat bersama.", en: "Made together." } satisfies Bi,
  description: {
    id: "Pixel art publik.",
    en: "Public pixel art.",
  } satisfies Bi,

  nav: {
    explore: { id: "Jelajah", en: "Explore" } satisfies Bi,
    space: { id: "Ruang (nanti)", en: "Space (later)" } satisfies Bi,
    create: { id: "Buat", en: "Create" } satisfies Bi,
    join: { id: "Gabung", en: "Join" } satisfies Bi,
    signIn: { id: "Masuk", en: "Sign in" } satisfies Bi,
    profile: { id: "Profil", en: "Profile" } satisfies Bi,
    account: { id: "Akun", en: "Account" } satisfies Bi,
    settings: { id: "Pengaturan", en: "Settings" } satisfies Bi,
    dashboard: { id: "Karya", en: "Works" } satisfies Bi,
    responses: { id: "Respon", en: "Responses" } satisfies Bi,
    admin: { id: "Moderasi", en: "Moderation" } satisfies Bi,
    signOut: { id: "Keluar", en: "Sign out" } satisfies Bi,
  },

  landingIntro: {
    id: "Pixel art publik.",
    en: "Public pixel art.",
  } satisfies Bi,
  landingExplore: { id: "Jelajah", en: "Explore" } satisfies Bi,
  landingCreate: { id: "Buat", en: "Create" } satisfies Bi,
  landingSpace: { id: "Ruang (nanti)", en: "Space (later)" } satisfies Bi,
  landingJoin: { id: "Gabung", en: "Join" } satisfies Bi,
  landingSpaceNote: {
    id: "Kanvas bersama nanti.",
    en: "Shared canvas later.",
  } satisfies Bi,
  modesHeading: { id: "Cara kerja", en: "How it works" } satisfies Bi,
  mode1: { id: "Buat", en: "Make" } satisfies Bi,
  personalTitle: { id: "Playground", en: "Playground" } satisfies Bi,
  personalBody: {
    id: "Gambar, simpan, terbitkan.",
    en: "Draw, save, publish.",
  } satisfies Bi,
  mode2: { id: "Pamerkan", en: "Show" } satisfies Bi,
  collectiveTitle: { id: "Jelajah", en: "Explore" } satisfies Bi,
  collectiveBody: {
    id: "Karya terbit di galeri.",
    en: "Published works in gallery.",
  } satisfies Bi,
  principlesHeading: { id: "Cara kerja", en: "How it works" } satisfies Bi,
  contributionTitle: { id: "Partisipasi dulu", en: "Participation first" } satisfies Bi,
  contributionBody: {
    id: "Bukan soal popularitas.",
    en: "Not about popularity.",
  } satisfies Bi,
  viewTitle: { id: "Lihat bebas", en: "View freely" } satisfies Bi,
  viewBody: {
    id: "Akun untuk berkarya.",
    en: "Account to create.",
  } satisfies Bi,
  ownerLine: {
    id: "Ruang milik bersama.",
    en: "A shared space.",
  } satisfies Bi,

  exploreEyebrow: { id: "Galeri", en: "Gallery" } satisfies Bi,
  exploreTitle: { id: "Jelajah", en: "Explore" } satisfies Bi,
  exploreIntro: {
    id: "Karya terbaru.",
    en: "Newest works.",
  } satisfies Bi,
  exploreLoadError: { id: "Gagal memuat.", en: "Could not load." } satisfies Bi,
  exploreLoadHint: {
    id: "Coba lagi.",
    en: "Try again.",
  } satisfies Bi,
  exploreRetry: { id: "Coba lagi", en: "Try again" } satisfies Bi,
  exploreMeta: {
    id: "Galeri pixel art.",
    en: "Pixel art gallery.",
  } satisfies Bi,
  filterAll: { id: "Semua", en: "All" } satisfies Bi,
  categoryAria: { id: "Saring ukuran", en: "Filter by size" } satisfies Bi,
  categoryFilterSummary: { id: "Ukuran", en: "Size" } satisfies Bi,
  categoryAll: { id: "Semua", en: "All" } satisfies Bi,
  categoryLabel: { id: "Ukuran", en: "Size" } satisfies Bi,
  exploreEmptySize: {
    id: "Kosong untuk ukuran ini.",
    en: "Nothing at this size.",
  } satisfies Bi,
  exploreSearchLabel: { id: "Cari karya", en: "Search works" } satisfies Bi,
  exploreSearchPlaceholder: {
    id: "Cari judul…",
    en: "Search titles…",
  } satisfies Bi,
  exploreSearchSubmit: { id: "Cari", en: "Search" } satisfies Bi,
  exploreSearchEmpty: {
    id: "Tidak ada hasil.",
    en: "No results.",
  } satisfies Bi,
  exploreEmptyTitle: { id: "Belum ada karya", en: "No works yet" } satisfies Bi,
  exploreEmptyAll: {
    id: "Galeri masih kosong.",
    en: "Gallery is empty.",
  } satisfies Bi,

  spaceEyebrow: { id: "Nanti", en: "Later" } satisfies Bi,
  spaceTitle: { id: "Ruang Bersama", en: "Common Space" } satisfies Bi,
  spaceIntro: {
    id: "Kanvas bersama nanti.",
    en: "Shared canvas later.",
  } satisfies Bi,
  spaceMeta: {
    id: "Kanvas bersama nanti.",
    en: "Shared canvas later.",
  } satisfies Bi,
  spaceLegacyKicker: { id: "Arsip", en: "Archive" } satisfies Bi,
  spaceLegacyNote: {
    id: "Arsip papan lama.",
    en: "Legacy board archive.",
  } satisfies Bi,
  spaceCanvasTitle: { id: "Kanvas Ruang Bersama", en: "Common Space canvas" } satisfies Bi,
  spaceCanvasDesc: {
    id: "Koordinat 0–1000.",
    en: "Coordinates 0–1000.",
  } satisfies Bi,
  spaceCaption: {
    id: "Skala proporsional.",
    en: "Scales with screen.",
  } satisfies Bi,
  spaceEmptyTitle: { id: "Kanvas kosong", en: "Canvas empty" } satisfies Bi,
  spaceEmptyBody: {
    id: "Belum ada elemen.",
    en: "No elements yet.",
  } satisfies Bi,
  spaceAddText: { id: "Tambah teks", en: "Add text" } satisfies Bi,
  spaceAddRect: { id: "Tambah persegi", en: "Add rectangle" } satisfies Bi,
  spaceAddCircle: { id: "Tambah lingkaran", en: "Add circle" } satisfies Bi,
  spaceSelect: { id: "Pilih", en: "Select" } satisfies Bi,
  spacePlaceHint: {
    id: "Klik untuk meletakkan.",
    en: "Click to place.",
  } satisfies Bi,
  spaceSignIn: {
    id: "Masuk untuk menambah.",
    en: "Sign in to add.",
  } satisfies Bi,
  spaceDelete: { id: "Hapus", en: "Delete" } satisfies Bi,
  spaceContributors: { id: "Kontributor", en: "Contributors" } satisfies Bi,
  spaceYours: { id: "Milikmu", en: "Yours" } satisfies Bi,
  spaceTextBody: { id: "Teks", en: "Text" } satisfies Bi,
  spacePlace: { id: "Letakkan", en: "Place" } satisfies Bi,
  spaceFontSize: { id: "Ukuran", en: "Size" } satisfies Bi,
  pixelPrototypeNote: {
    id: "Prototype lokal.",
    en: "Local prototype.",
  } satisfies Bi,
  pixelIntro: {
    id: "Kanvas 512×512.",
    en: "512×512 canvas.",
  } satisfies Bi,
  pixelTools: { id: "Alat gambar", en: "Drawing tools" } satisfies Bi,
  pixelPencil: { id: "Pensil", en: "Pencil" } satisfies Bi,
  pixelEraser: { id: "Penghapus", en: "Eraser" } satisfies Bi,
  pixelPan: { id: "Geser", en: "Pan" } satisfies Bi,
  pixelEyedropper: { id: "Pipet", en: "Eyedropper" } satisfies Bi,
  pixelFill: { id: "Isi", en: "Fill" } satisfies Bi,
  pixelLine: { id: "Garis", en: "Line" } satisfies Bi,
  pixelRect: { id: "Kotak", en: "Rectangle" } satisfies Bi,
  pixelEllipse: { id: "Elips", en: "Ellipse" } satisfies Bi,
  pixelSelect: { id: "Seleksi", en: "Select" } satisfies Bi,
  pixelClearCanvas: { id: "Kosongkan kanvas", en: "Clear canvas" } satisfies Bi,
  pixelFlipH: { id: "Cermin H", en: "Flip H" } satisfies Bi,
  pixelFlipV: { id: "Cermin V", en: "Flip V" } satisfies Bi,
  pixelRotate90: { id: "Putar 90°", en: "Rotate 90°" } satisfies Bi,
  pixelRotateNeedSquare: {
    id: "Perlu kanvas persegi.",
    en: "Needs square canvas.",
  } satisfies Bi,
  pixelBrushSize: { id: "Ukuran kuas", en: "Brush size" } satisfies Bi,
  pixelGridToggle: { id: "Kisi", en: "Grid" } satisfies Bi,
  pixelSymmetry: { id: "Simetri", en: "Symmetry" } satisfies Bi,
  pixelSymmetryOff: { id: "Mati", en: "Off" } satisfies Bi,
  pixelSymmetryX: { id: "Horizontal", en: "Horizontal" } satisfies Bi,
  pixelSymmetryY: { id: "Vertikal", en: "Vertical" } satisfies Bi,
  pixelSymmetryXY: { id: "Keduanya", en: "Both" } satisfies Bi,
  pixelPaletteManage: { id: "Kelola palet", en: "Manage palette" } satisfies Bi,
  pixelPaletteManageHint: {
    id: "Ganti atau hapus warna.",
    en: "Replace or remove color.",
  } satisfies Bi,
  pixelPaletteEmpty: { id: "Belum ada warna.", en: "No colors yet." } satisfies Bi,
  pixelReplaceWith: { id: "Ganti dengan HEX", en: "Replace with HEX" } satisfies Bi,
  pixelReplaceColor: { id: "Ganti warna", en: "Replace color" } satisfies Bi,
  pixelRemoveColor: { id: "Hapus", en: "Remove" } satisfies Bi,
  pixelPaletteFullStroke: {
    id: "Palet penuh (64).",
    en: "Palette full (64).",
  } satisfies Bi,
  pixelZoomIn: { id: "Perbesar", en: "Zoom in" } satisfies Bi,
  pixelZoomOut: { id: "Perkecil", en: "Zoom out" } satisfies Bi,
  pixelFit: { id: "Muat", en: "Fit" } satisfies Bi,
  pixelColor: { id: "Warna", en: "Color" } satisfies Bi,
  pixelHint: {
    id: "Gambar · zoom · geser.",
    en: "Draw · zoom · pan.",
  } satisfies Bi,
  pixelLocal: { id: "hanya di memori", en: "in memory only" } satisfies Bi,
  pixelUndo: { id: "Urungkan", en: "Undo" } satisfies Bi,
  pixelRedo: { id: "Ulangi", en: "Redo" } satisfies Bi,
  pixelStudioNote: {
    id: "Simpan untuk membuka lagi.",
    en: "Save to reopen.",
  } satisfies Bi,
  pixelLoadError: {
    id: "Sumber gagal dibaca.",
    en: "Could not read source.",
  } satisfies Bi,
  pixelPreviewAlt: { id: "Pratinjau pixel art", en: "Pixel art preview" } satisfies Bi,
  pixelMore: { id: "Lainnya", en: "More" } satisfies Bi,
  pixelPaletteMore: { id: "Palet", en: "Palette" } satisfies Bi,
  pixelHex: { id: "Kode HEX", en: "HEX code" } satisfies Bi,
  pixelPickColor: { id: "Pilih warna", en: "Pick a color" } satisfies Bi,
  pixelRecent: { id: "Baru dipakai", en: "Recent" } satisfies Bi,
  pixelFavorites: { id: "Favorit", en: "Favorites" } satisfies Bi,
  pixelUseColor: { id: "Pakai warna ini", en: "Use this color" } satisfies Bi,
  pixelFavoriteAdd: { id: "Favoritkan", en: "Favorite" } satisfies Bi,
  pixelFavoriteRemove: { id: "Hapus favorit", en: "Unfavorite" } satisfies Bi,
  pixelShortcuts: { id: "Pintasan", en: "Shortcuts" } satisfies Bi,
  pixelNoRecent: { id: "Belum ada.", en: "None yet." } satisfies Bi,
  pixelNoFavorites: { id: "Belum ada.", en: "None yet." } satisfies Bi,
  pixelPaletteFull: {
    id: "Palet penuh (64).",
    en: "Palette full (64).",
  } satisfies Bi,
  pixelHexInvalid: {
    id: "HEX enam digit.",
    en: "Six-digit HEX.",
  } satisfies Bi,
  pixelSaving: { id: "Menyimpan…", en: "Saving…" } satisfies Bi,
  pixelSavedJustNow: { id: "Tersimpan", en: "Saved" } satisfies Bi,
  pixelUnsaved: { id: "Belum tersimpan", en: "Unsaved" } satisfies Bi,
  pixelPublishing: { id: "Menerbitkan…", en: "Publishing…" } satisfies Bi,
  pixelLeaving: { id: "Keluar…", en: "Leaving…" } satisfies Bi,
  pixelUnpublishing: { id: "Menarik terbit…", en: "Unpublishing…" } satisfies Bi,
  pixelLeaveBlockedTitle: {
    id: "Belum bisa keluar",
    en: "Could not leave",
  } satisfies Bi,
  pixelLeaveBlockedBody: {
    id: "Gagal menyimpan.",
    en: "Save failed.",
  } satisfies Bi,
  pixelLeaveUnsavedTitle: {
    id: "Belum disimpan",
    en: "Unsaved changes",
  } satisfies Bi,
  pixelLeaveUnsavedBody: {
    id: "Simpan atau buang.",
    en: "Save or discard.",
  } satisfies Bi,
  pixelLeaveRetry: { id: "Coba lagi", en: "Try again" } satisfies Bi,
  pixelLeaveDiscard: {
    id: "Buang & keluar",
    en: "Discard & leave",
  } satisfies Bi,
  createSaveChanges: { id: "Simpan perubahan", en: "Save changes" } satisfies Bi,
  pixelOffline: {
    id: "Offline.",
    en: "Offline.",
  } satisfies Bi,
  pixelBack: { id: "Kembali", en: "Back" } satisfies Bi,
  actionWorking: { id: "Memproses…", en: "Working…" } satisfies Bi,
  createBackToWorks: { id: "Karyamu", en: "Your works" } satisfies Bi,
  pixelUntitled: { id: "Tanpa judul", en: "Untitled" } satisfies Bi,
  sizePickerIntro: {
    id: "Pilih ukuran.",
    en: "Pick a size.",
  } satisfies Bi,
  sizeCustom: { id: "Kustom", en: "Custom" } satisfies Bi,
  sizeCustomHint: {
    id: "8–512 piksel.",
    en: "8–512 pixels.",
  } satisfies Bi,
  sizeWidth: { id: "Lebar", en: "Width" } satisfies Bi,
  sizeHeight: { id: "Tinggi", en: "Height" } satisfies Bi,
  sizeRangeError: {
    id: "{min}–{max}.",
    en: "{min}–{max}.",
  } satisfies Bi,
  sizeStart: { id: "Mulai", en: "Start" } satisfies Bi,
  sizeStarting: { id: "Menyiapkan…", en: "Preparing…" } satisfies Bi,
  sizeSelected: { id: "Dipilih", en: "Selected" } satisfies Bi,

  createEyebrow: { id: "Playground", en: "Playground" } satisfies Bi,
  createTitle: { id: "Buat", en: "Create" } satisfies Bi,
  createIntro: {
    id: "Pilih ukuran.",
    en: "Pick a size.",
  } satisfies Bi,
  createManageLink: {
    id: "Kelola karya",
    en: "Manage works",
  } satisfies Bi,
  createMeta: {
    id: "Playground pixel art.",
    en: "Pixel art playground.",
  } satisfies Bi,
  createEmptyTitle: { id: "Belum ada karya", en: "No creations yet" } satisfies Bi,
  createEmptyBody: {
    id: "Mulai draf baru.",
    en: "Start a draft.",
  } satisfies Bi,
  createStart: { id: "Mulai karya", en: "Start artwork" } satisfies Bi,
  createTitleLabel: { id: "Judul", en: "Title" } satisfies Bi,
  createCaptionLabel: { id: "Caption", en: "Caption" } satisfies Bi,
  createCaptionPlaceholder: {
    id: "Caption (opsional)",
    en: "Caption (optional)",
  } satisfies Bi,
  createCaptionHint: {
    id: "Maks. 500 karakter.",
    en: "Max 500 characters.",
  } satisfies Bi,
  createDetailsMenu: { id: "Caption & hashtag", en: "Caption & hashtags" } satisfies Bi,
  createDetailsTitle: { id: "Keterangan karya", en: "Work details" } satisfies Bi,
  createDetailsDone: { id: "Selesai", en: "Done" } satisfies Bi,
  createTagsLabel: { id: "Hashtag", en: "Hashtags" } satisfies Bi,
  createTagsPlaceholder: {
    id: "Tambah tag",
    en: "Add a tag",
  } satisfies Bi,
  createTagsHint: {
    id: "Maks. 5 tag.",
    en: "Up to 5 tags.",
  } satisfies Bi,
  createTagsFull: { id: "Batas 5 tag", en: "5-tag limit" } satisfies Bi,
  createTagInvalid: {
    id: "Tag tidak valid.",
    en: "Invalid tag.",
  } satisfies Bi,
  createTagRemove: { id: "Hapus {tag}", en: "Remove {tag}" } satisfies Bi,
  colorPaletteTitle: { id: "Palet warna", en: "Color palette" } satisfies Bi,
  colorPaletteHint: {
    id: "Warna yang dipakai.",
    en: "Colors used.",
  } satisfies Bi,
  colorPaletteEmpty: {
    id: "Belum ada tinta.",
    en: "No ink yet.",
  } satisfies Bi,
  colorPaletteShowAll: { id: "Lihat semua", en: "Show all" } satisfies Bi,
  colorPaletteShowLess: { id: "Lebih sedikit", en: "Show less" } satisfies Bi,
  colorHexCopied: { id: "HEX disalin", en: "HEX copied" } satisfies Bi,
  colorCopyHex: { id: "Salin {hex}", en: "Copy {hex}" } satisfies Bi,
  createTypeLabel: { id: "Jenis", en: "Type" } satisfies Bi,
  createBodyLabel: { id: "Isi", en: "Body" } satisfies Bi,
  createContextLabel: { id: "Konteks", en: "Context" } satisfies Bi,
  createPromptLabel: { id: "Ajakan menyambung", en: "Continuation prompt" } satisfies Bi,
  createPromptHint: {
    id: "Opsional.",
    en: "Optional.",
  } satisfies Bi,
  createSaveDraft: { id: "Simpan draf", en: "Save draft" } satisfies Bi,
  createPublish: { id: "Terbitkan", en: "Publish" } satisfies Bi,
  createPreview: { id: "Pratinjau", en: "Preview" } satisfies Bi,
  createEdit: { id: "Sunting", en: "Edit" } satisfies Bi,
  createEditThis: { id: "Sunting", en: "Edit" } satisfies Bi,
  createDelete: { id: "Hapus", en: "Delete" } satisfies Bi,
  createDeleting: { id: "Menghapus…", en: "Deleting…" } satisfies Bi,
  createDeleteConfirm: {
    id: "Hapus karya ini?",
    en: "Delete this work?",
  } satisfies Bi,
  createDeleteConfirmTitle: {
    id: "Hapus “{title}”?",
    en: "Delete “{title}”?",
  } satisfies Bi,
  createDeleteConfirmPublished: {
    id: "Komentar ikut terhapus.",
    en: "Comments removed too.",
  } satisfies Bi,
  createDeleteUnpublishHint: {
    id: "Atau tarik terbit.",
    en: "Or unpublish.",
  } satisfies Bi,
  createCancel: { id: "Batal", en: "Cancel" } satisfies Bi,
  createViewPublic: { id: "Lihat publik", en: "View public" } satisfies Bi,
  createSaved: { id: "Tersimpan.", en: "Saved." } satisfies Bi,
  createPublished: { id: "Terbit.", en: "Published." } satisfies Bi,
  createUnpublish: { id: "Tarik terbit", en: "Unpublish" } satisfies Bi,
  createUnpublished: {
    id: "Ditarik ke draf.",
    en: "Back to draft.",
  } satisfies Bi,
  createDraftBadge: { id: "Draf", en: "Draft" } satisfies Bi,
  createPublishedBadge: { id: "Terbit", en: "Published" } satisfies Bi,
  createHiddenBadge: { id: "Tersembunyi", en: "Hidden" } satisfies Bi,
  createOwnHeading: { id: "Karyamu", en: "Your works" } satisfies Bi,
  createNewHeading: { id: "Karya baru", en: "New work" } satisfies Bi,
  visualAddRect: { id: "Tambah persegi", en: "Add rectangle" } satisfies Bi,
  visualAddCircle: { id: "Tambah lingkaran", en: "Add circle" } satisfies Bi,
  visualAddText: { id: "Tambah teks", en: "Add text" } satisfies Bi,
  visualEmpty: {
    id: "Belum ada elemen.",
    en: "No elements yet.",
  } satisfies Bi,
  visualFill: { id: "Warna", en: "Fill" } satisfies Bi,
  visualRemove: { id: "Hapus elemen", en: "Remove element" } satisfies Bi,
  visualX: { id: "X", en: "X" } satisfies Bi,
  visualY: { id: "Y", en: "Y" } satisfies Bi,
  visualW: { id: "Lebar", en: "Width" } satisfies Bi,
  visualH: { id: "Tinggi", en: "Height" } satisfies Bi,
  visualR: { id: "Jari-jari", en: "Radius" } satisfies Bi,
  visualCanvasTitle: { id: "Komposisi visual", en: "Visual composition" } satisfies Bi,
  pagePrev: { id: "Sebelumnya", en: "Previous" } satisfies Bi,
  pageNext: { id: "Berikutnya", en: "Next" } satisfies Bi,
  explorePaginationAria: { id: "Halaman galeri", en: "Gallery pages" } satisfies Bi,
  explorePageStatus: {
    id: "Halaman {page} dari {pages}",
    en: "Page {page} of {pages}",
  } satisfies Bi,
  byAuthor: { id: "oleh", en: "by" } satisfies Bi,
  creationBack: { id: "Ke jelajah", en: "To explore" } satisfies Bi,
  creationNotFound: { id: "Tidak ditemukan.", en: "Not found." } satisfies Bi,
  creationMeta: {
    id: "Karya terbit.",
    en: "Published work.",
  } satisfies Bi,

  appreciate: { id: "Apresiasi", en: "Appreciate" } satisfies Bi,
  appreciateWorking: { id: "Memproses…", en: "Working…" } satisfies Bi,
  appreciated: { id: "Diapresiasi", en: "Appreciated" } satisfies Bi,
  share: { id: "Bagikan", en: "Share" } satisfies Bi,
  shareCopied: { id: "Disalin.", en: "Copied." } satisfies Bi,
  downloadArtwork: { id: "Unduh", en: "Download" } satisfies Bi,
  downloadWorking: { id: "Menyiapkan…", en: "Preparing…" } satisfies Bi,
  downloadScaleLabel: { id: "Ukuran unduhan", en: "Download size" } satisfies Bi,
  downloadScaleHint: {
    id: "Hanya file unduhan — ukuran karya di situs tidak berubah.",
    en: "Download file only — on-site artwork size stays the same.",
  } satisfies Bi,
  downloadScaleOption: {
    id: "{scale}× · {size}",
    en: "{scale}× · {size}",
  } satisfies Bi,
  downloadEstimate: {
    id: "Perkiraan {size}",
    en: "About {size}",
  } satisfies Bi,
  downloadFailed: {
    id: "Gagal menyiapkan unduhan.",
    en: "Could not prepare the download.",
  } satisfies Bi,
  allowPngDownload: {
    id: "Izinkan unduh",
    en: "Allow download",
  } satisfies Bi,
  downloadDisclaimer: {
    id: "Unduh PNG resmi.",
    en: "Official PNG download.",
  } satisfies Bi,
  downloadPermissionFailed: {
    id: "Gagal memperbarui.",
    en: "Update failed.",
  } satisfies Bi,
  fork: { id: "Remix", en: "Remix" } satisfies Bi,
  forkWorking: { id: "Membuat remix…", en: "Remixing…" } satisfies Bi,
  forkedFrom: { id: "Remix dari", en: "Remixed from" } satisfies Bi,
  forkedUnavailable: {
    id: "Asal tidak publik.",
    en: "Source not public.",
  } satisfies Bi,
  remixFrom: { id: "Remix dari", en: "Remix of" } satisfies Bi,
  remixCount: { id: "{count} remix", en: "{count} remixes" } satisfies Bi,
  remixSignIn: {
    id: "Masuk untuk remix.",
    en: "Sign in to remix.",
  } satisfies Bi,
  creatorOtherWorks: {
    id: "Karya lain dari @{username}",
    en: "More from @{username}",
  } satisfies Bi,
  follow: { id: "Ikuti", en: "Follow" } satisfies Bi,
  following: { id: "Mengikuti", en: "Following" } satisfies Bi,
  followWorking: { id: "Memproses…", en: "Working…" } satisfies Bi,
  followSignIn: {
    id: "Masuk untuk mengikuti.",
    en: "Sign in to follow.",
  } satisfies Bi,
  exploreFeedAll: { id: "Semua", en: "All" } satisfies Bi,
  exploreFeedFollowing: { id: "Mengikuti", en: "Following" } satisfies Bi,
  exploreFollowingEmpty: {
    id: "Belum mengikuti siapa pun. Kunjungi profil kreator.",
    en: "Not following anyone yet. Visit a creator profile.",
  } satisfies Bi,
  exploreFollowingGuest: {
    id: "Masuk untuk melihat karya dari yang kamu ikuti.",
    en: "Sign in to see work from people you follow.",
  } satisfies Bi,
  similarWorksTitle: { id: "Karya serupa", en: "Similar works" } satisfies Bi,
  newCreatorsTitle: { id: "Kreator baru", en: "New creators" } satisfies Bi,
  newCreatorsMore: {
    id: "+{count} lagi",
    en: "+{count} more",
  } satisfies Bi,
  newCreatorsSeeAll: { id: "Lihat semua", en: "See all" } satisfies Bi,
  newCreatorsMeta: {
    id: "Kenali orang yang baru menerbitkan pixel.",
    en: "Meet people who just published pixel work.",
  } satisfies Bi,
  newCreatorsIntro: {
    id: "Kreator dengan karya pixel terbaru. Buka profil untuk melihat etalase mereka.",
    en: "Creators with the newest pixel work. Open a profile to see their gallery.",
  } satisfies Bi,
  newCreatorsEmpty: {
    id: "Belum ada kreator untuk ditampilkan.",
    en: "No creators to show yet.",
  } satisfies Bi,
  newCreatorsLatest: {
    id: "Karya terbaru",
    en: "Latest work",
  } satisfies Bi,
  cardNotesCount: { id: "{count} catatan", en: "{count} notes" } satisfies Bi,
  feedNewBadge: { id: "Baru", en: "New" } satisfies Bi,
  commentsTitle: { id: "Percakapan", en: "Conversation" } satisfies Bi,
  commentsEmpty: {
    id: "Belum ada catatan.",
    en: "No notes yet.",
  } satisfies Bi,
  conversationPrompt: {
    id: "Tulis catatan…",
    en: "Write a note…",
  } satisfies Bi,
  conversationPromptSize: {
    id: "Catatan untuk kanvas {size}…",
    en: "A note for this {size} canvas…",
  } satisfies Bi,
  conversationGuestPrompt: {
    id: "Masuk untuk menulis catatan.",
    en: "Sign in to leave a note.",
  } satisfies Bi,
  conversationSend: { id: "Kirim", en: "Send" } satisfies Bi,
  conversationSending: { id: "Mengirim…", en: "Sending…" } satisfies Bi,
  conversationSendFailed: {
    id: "Tidak terkirim.",
    en: "Not sent.",
  } satisfies Bi,
  conversationRetry: { id: "Coba lagi", en: "Try again" } satisfies Bi,
  conversationDiscard: { id: "Buang", en: "Discard" } satisfies Bi,
  conversationReply: { id: "Balas", en: "Reply" } satisfies Bi,
  conversationReplyTo: { id: "Balas", en: "Reply to" } satisfies Bi,
  conversationEdit: { id: "Ubah", en: "Edit" } satisfies Bi,
  conversationSave: { id: "Simpan", en: "Save" } satisfies Bi,
  conversationEdited: { id: "diedit", en: "edited" } satisfies Bi,
  conversationLoadEarlier: {
    id: "Muat sebelumnya",
    en: "Load earlier",
  } satisfies Bi,
  conversationLoadingEarlier: {
    id: "Memuat…",
    en: "Loading…",
  } satisfies Bi,
  commentLabel: { id: "Catatan", en: "Note" } satisfies Bi,
  commentSubmit: { id: "Kirim", en: "Send" } satisfies Bi,
  commentSubmitting: { id: "Mengirim…", en: "Sending…" } satisfies Bi,
  commentPosted: { id: "Catatan terkirim.", en: "Note posted." } satisfies Bi,
  commentSignIn: {
    id: "Masuk untuk ikut.",
    en: "Sign in to join.",
  } satisfies Bi,
  commentDelete: { id: "Hapus", en: "Delete" } satisfies Bi,
  commentDeleteConfirm: {
    id: "Hapus catatan?",
    en: "Delete note?",
  } satisfies Bi,
  report: { id: "Laporkan", en: "Report" } satisfies Bi,
  reportTitle: { id: "Laporkan konten", en: "Report content" } satisfies Bi,
  reportReason: { id: "Alasan", en: "Reason" } satisfies Bi,
  reportDetails: { id: "Keterangan", en: "Details" } satisfies Bi,
  reportSubmit: { id: "Kirim laporan", en: "Submit report" } satisfies Bi,
  reportSubmitting: { id: "Mengirim laporan…", en: "Submitting report…" } satisfies Bi,
  reportThanks: {
    id: "Laporan diterima.",
    en: "Report received.",
  } satisfies Bi,
  reportSignIn: {
    id: "Masuk untuk lapor.",
    en: "Sign in to report.",
  } satisfies Bi,
  reportReasons: {
    spam: { id: "Spam", en: "Spam" } satisfies Bi,
    harassment: { id: "Pelecehan", en: "Harassment" } satisfies Bi,
    illegal: { id: "Konten ilegal", en: "Illegal content" } satisfies Bi,
    off_topic: { id: "Tidak relevan", en: "Off topic" } satisfies Bi,
    other: { id: "Lainnya", en: "Other" } satisfies Bi,
  },

  adminTitle: { id: "Moderasi", en: "Moderation" } satisfies Bi,
  adminMeta: {
    id: "Moderasi laporan.",
    en: "Report moderation.",
  } satisfies Bi,
  adminIntro: {
    id: "Kelola laporan.",
    en: "Review reports.",
  } satisfies Bi,
  adminEmpty: {
    id: "Tidak ada laporan.",
    en: "No reports.",
  } satisfies Bi,
  adminFilter: { id: "Status laporan", en: "Report status" } satisfies Bi,
  adminPending: { id: "Menunggu", en: "Pending" } satisfies Bi,
  adminReviewed: { id: "Ditinjau", en: "Reviewed" } satisfies Bi,
  adminResolved: { id: "Selesai", en: "Resolved" } satisfies Bi,
  adminAll: { id: "Semua", en: "All" } satisfies Bi,
  adminHide: { id: "Sembunyikan", en: "Hide" } satisfies Bi,
  adminRestore: { id: "Pulihkan", en: "Restore" } satisfies Bi,
  adminReview: { id: "Ditinjau", en: "Reviewed" } satisfies Bi,
  adminResolve: { id: "Selesaikan", en: "Resolve" } satisfies Bi,
  adminWorking: { id: "Memproses…", en: "Working…" } satisfies Bi,
  adminReporter: { id: "Pelapor", en: "Reporter" } satisfies Bi,
  adminTarget: { id: "Sasaran", en: "Target" } satisfies Bi,
  adminHidden: { id: "Tersembunyi", en: "Hidden" } satisfies Bi,
  adminTargetTypes: {
    creation: { id: "Karya", en: "Creation" } satisfies Bi,
    comment: { id: "Komentar", en: "Comment" } satisfies Bi,
    space_element: { id: "Elemen ruang", en: "Space element" } satisfies Bi,
  },

  loginTitle: { id: "Masuk", en: "Sign in" } satisfies Bi,
  loginMeta: {
    id: "Masuk dengan email.",
    en: "Sign in with email.",
  } satisfies Bi,
  loginSubmit: { id: "Masuk", en: "Sign in" } satisfies Bi,
  loginSubmitting: { id: "Masuk…", en: "Signing in…" } satisfies Bi,
  loginToRegister: { id: "Gabung", en: "Join" } satisfies Bi,
  loginForgotPassword: { id: "Lupa kata sandi?", en: "Forgot password?" } satisfies Bi,

  forgotPasswordTitle: { id: "Lupa kata sandi", en: "Forgot password" } satisfies Bi,
  forgotPasswordMeta: {
    id: "Atur kata sandi baru.",
    en: "Set a new password.",
  } satisfies Bi,
  forgotPasswordSubmit: { id: "Kirim tautan", en: "Send link" } satisfies Bi,
  forgotPasswordSubmitting: { id: "Mengirim…", en: "Sending…" } satisfies Bi,
  forgotPasswordSent: {
    id: "Cek email jika terdaftar.",
    en: "Check email if registered.",
  } satisfies Bi,
  forgotPasswordBack: { id: "Ke masuk", en: "Back to sign in" } satisfies Bi,

  resetPasswordTitle: { id: "Kata sandi baru", en: "New password" } satisfies Bi,
  resetPasswordMeta: {
    id: "Kata sandi baru.",
    en: "New password.",
  } satisfies Bi,
  resetPasswordSubmit: { id: "Simpan kata sandi", en: "Save password" } satisfies Bi,
  resetPasswordSubmitting: { id: "Menyimpan…", en: "Saving…" } satisfies Bi,
  resetPasswordDone: {
    id: "Kata sandi diperbarui.",
    en: "Password updated.",
  } satisfies Bi,
  resetPasswordInvalid: {
    id: "Tautan tidak valid.",
    en: "Invalid link.",
  } satisfies Bi,
  resetPasswordConfirmLabel: {
    id: "Ulangi kata sandi",
    en: "Confirm password",
  } satisfies Bi,

  registerTitle: { id: "Gabung", en: "Join" } satisfies Bi,
  registerMeta: {
    id: "Buat akun anggota.",
    en: "Create a member account.",
  } satisfies Bi,
  registerSubmit: { id: "Buat akun", en: "Create account" } satisfies Bi,
  registerSubmitting: { id: "Membuat akun…", en: "Creating account…" } satisfies Bi,
  registerToLogin: { id: "Masuk", en: "Sign in" } satisfies Bi,
  registerEmailSent: {
    id: "Cek email untuk lanjut.",
    en: "Check email to continue.",
  } satisfies Bi,
  registerEmailSentTo: {
    id: "Cek inbox {email}.",
    en: "Check inbox {email}.",
  } satisfies Bi,
  registerResend: { id: "Kirim ulang tautan", en: "Resend link" } satisfies Bi,
  registerResending: { id: "Mengirim ulang…", en: "Resending…" } satisfies Bi,
  registerResent: {
    id: "Tautan dikirim ulang.",
    en: "Link resent.",
  } satisfies Bi,
  registerChangeEmail: {
    id: "Email lain",
    en: "Other email",
  } satisfies Bi,

  emailLabel: { id: "Email", en: "Email" } satisfies Bi,
  passwordLabel: { id: "Kata sandi", en: "Password" } satisfies Bi,
  usernameLabel: { id: "Nama pengguna", en: "Username" } satisfies Bi,
  displayNameLabel: { id: "Nama tampilan", en: "Display name" } satisfies Bi,
  bioLabel: { id: "Bio", en: "Bio" } satisfies Bi,
  avatarPhotoLabel: { id: "Foto profil", en: "Profile photo" } satisfies Bi,
  avatarPhotoHint: {
    id: "JPEG, PNG, WebP · max 512 KB.",
    en: "JPEG, PNG, WebP · max 512 KB.",
  } satisfies Bi,
  avatarCompressFailed: {
    id: "Masih terlalu besar.",
    en: "Still too large.",
  } satisfies Bi,
  avatarUploading: { id: "Mengunggah…", en: "Uploading…" } satisfies Bi,
  avatarRemove: { id: "Hapus foto", en: "Remove photo" } satisfies Bi,
  avatarRemoving: { id: "Menghapus…", en: "Removing…" } satisfies Bi,
  avatarChooseFile: { id: "Pilih gambar", en: "Choose image" } satisfies Bi,
  roleLabel: { id: "Peran", en: "Role" } satisfies Bi,
  usernameHint: {
    id: "3–20: a–z, 0–9, _.",
    en: "3–20: a–z, 0–9, _.",
  } satisfies Bi,
  passwordHint: { id: "Min. 8 karakter.", en: "Min. 8 characters." } satisfies Bi,
  roleHint: {
    id: "Tidak bisa diubah.",
    en: "Cannot change.",
  } satisfies Bi,

  dashboardTitle: { id: "Karyamu", en: "Your works" } satisfies Bi,
  dashboardMeta: {
    id: "Kelola karyamu.",
    en: "Manage your works.",
  } satisfies Bi,
  dashboardHello: { id: "Halo", en: "Hello" } satisfies Bi,
  dashboardBody: {
    id: "Kelola karya milikmu.",
    en: "Manage your works.",
  } satisfies Bi,
  worksBack: { id: "Ke profil", en: "To profile" } satisfies Bi,
  responsesTitle: { id: "Respon", en: "Responses" } satisfies Bi,
  responsesMeta: {
    id: "Catatan, apresiasi, dan remix untuk karyamu.",
    en: "Notes, appreciations, and remixes on your works.",
  } satisfies Bi,
  responsesIntro: {
    id: "Catatan, apresiasi, dan remix pada karya terbit milikmu.",
    en: "Notes, appreciations, and remixes on your published works.",
  } satisfies Bi,
  responsesEmpty: {
    id: "Belum ada respon pada karya terbitmu.",
    en: "No responses on your published works yet.",
  } satisfies Bi,
  responsesNew: { id: "Baru", en: "New" } satisfies Bi,
  responsesComment: {
    id: "{user} menulis catatan di {title}",
    en: "{user} left a note on {title}",
  } satisfies Bi,
  responsesReply: {
    id: "{user} membalas di {title}",
    en: "{user} replied on {title}",
  } satisfies Bi,
  responsesAppreciate: {
    id: "{user} mengapresiasi {title}",
    en: "{user} appreciated {title}",
  } satisfies Bi,
  responsesRemix: {
    id: "{user} me-remix {title}",
    en: "{user} remixed {title}",
  } satisfies Bi,
  responsesNavDot: { id: "Ada respon baru", en: "New responses" } satisfies Bi,
  quietRackTitle: {
    id: "Belum ada percakapan",
    en: "Waiting for a note",
  } satisfies Bi,
  quietRackHint: {
    id: "Karya baru yang masih sepi — tulis catatan pertama.",
    en: "New works still quiet — leave the first note.",
  } satisfies Bi,
  createInspirationTitle: {
    id: "Inspirasi komunitas",
    en: "Community inspiration",
  } satisfies Bi,
  createInspirationSize: {
    id: "Karya {size} terbaru",
    en: "Latest {size} works",
  } satisfies Bi,
  createRemixPrompt: {
    id: "Belum punya ide? Remix karya di Jelajah.",
    en: "No idea yet? Remix a work on Explore.",
  } satisfies Bi,
  worksTitle: { id: "Karyamu", en: "Your works" } satisfies Bi,
  worksMeta: {
    id: "Kelola draf dan karya terbit milikmu.",
    en: "Manage your drafts and published works.",
  } satisfies Bi,
  worksIntro: {
    id: "Draf privat · terbit publik.",
    en: "Drafts private · published public.",
  } satisfies Bi,
  worksNew: { id: "Karya baru", en: "New work" } satisfies Bi,
  worksDrafts: { id: "Draf", en: "Drafts" } satisfies Bi,
  worksPublished: { id: "Terbit", en: "Published" } satisfies Bi,
  worksEmptyDrafts: {
    id: "Belum ada draf.",
    en: "No drafts yet.",
  } satisfies Bi,
  worksEmptyPublished: {
    id: "Belum ada terbit.",
    en: "None published yet.",
  } satisfies Bi,
  worksContinue: { id: "Lanjutkan", en: "Continue" } satisfies Bi,
  worksView: { id: "Lihat", en: "View" } satisfies Bi,
  worksUnnamed: { id: "Belum dinamai", en: "Not named yet" } satisfies Bi,
  worksNamePlaceholder: { id: "Nama karya", en: "Work name" } satisfies Bi,
  worksNamePublishTitle: { id: "Nama karya", en: "Work name" } satisfies Bi,
  worksNamePublishHint: {
    id: "Nama wajib untuk terbit.",
    en: "Name required to publish.",
  } satisfies Bi,
  worksPublishDoneTitle: { id: "Karya diterbitkan", en: "Work published" } satisfies Bi,
  worksPublishDoneBody: {
    id: "Sudah di Jelajah — siap dikomentari.",
    en: "On Explore — ready for notes.",
  } satisfies Bi,
  worksPublishCaptionNudgeTitle: {
    id: "Tambah caption?",
    en: "Add a caption?",
  } satisfies Bi,
  worksPublishCaptionNudgeBody: {
    id: "Caption membantu percakapan. Bisa dilewati.",
    en: "Captions help conversation. Optional.",
  } satisfies Bi,
  worksPublishCaptionSkip: { id: "Lewati", en: "Skip" } satisfies Bi,
  worksPublishCaptionAdd: { id: "Tambah caption", en: "Add caption" } satisfies Bi,
  worksPublishAddCaptionHint: {
    id: "Belum ada caption — tambah dari menu Caption.",
    en: "No caption yet — add one from Caption.",
  } satisfies Bi,
  worksViewWork: { id: "Lihat karya", en: "View work" } satisfies Bi,
  worksKeepEditing: { id: "Tetap di kanvas", en: "Stay on canvas" } satisfies Bi,

  settingsTitle: { id: "Pengaturan", en: "Settings" } satisfies Bi,
  settingsMeta: {
    id: "Sunting profil.",
    en: "Edit profile.",
  } satisfies Bi,
  settingsBack: { id: "Ke profil", en: "To profile" } satisfies Bi,
  settingsSave: { id: "Simpan", en: "Save" } satisfies Bi,
  settingsSaving: { id: "Menyimpan…", en: "Saving…" } satisfies Bi,
  settingsSaved: { id: "Tersimpan.", en: "Saved." } satisfies Bi,
  settingsLanguage: { id: "Bahasa", en: "Language" } satisfies Bi,
  settingsLanguageHint: {
    id: "Bahasa antarmuka.",
    en: "Interface language.",
  } satisfies Bi,
  settingsSession: { id: "Sesi", en: "Session" } satisfies Bi,
  settingsSignOutHint: {
    id: "Keluar dari perangkat ini.",
    en: "Sign out here.",
  } satisfies Bi,

  profileTitle: { id: "Profil", en: "Profile" } satisfies Bi,
  profileWorksHeading: { id: "Karya terbit", en: "Published works" } satisfies Bi,
  profileWorksCount: {
    id: "{count} karya",
    en: "{count} works",
  } satisfies Bi,
  profileEmptyCreations: {
    id: "Belum ada karya.",
    en: "No works yet.",
  } satisfies Bi,
  profileEmptyBody: {
    id: "Karya terbit di sini.",
    en: "Published works here.",
  } satisfies Bi,
  profileNotFound: { id: "Tidak ditemukan.", en: "Not found." } satisfies Bi,
  memberSince: { id: "Anggota sejak", en: "Member since" } satisfies Bi,

  errors: {
    generic_auth: {
      id: "Login gagal.",
      en: "Sign-in failed.",
    } satisfies Bi,
    generic_register: {
      id: "Gagal mendaftar.",
      en: "Could not register.",
    } satisfies Bi,
    email_not_confirmed: {
      id: "Konfirmasi email dulu.",
      en: "Confirm email first.",
    } satisfies Bi,
    invalid_input: {
      id: "Periksa isian.",
      en: "Check your details.",
    } satisfies Bi,
    invalid_email: {
      id: "Email tidak valid.",
      en: "Invalid email.",
    } satisfies Bi,
    invalid_password: {
      id: "Min. 8 karakter.",
      en: "Min. 8 characters.",
    } satisfies Bi,
    password_mismatch: {
      id: "Kata sandi tidak sama.",
      en: "Passwords do not match.",
    } satisfies Bi,
    username_taken: {
      id: "Username dipakai.",
      en: "Username taken.",
    } satisfies Bi,
    username_format: {
      id: "Username 3–20: a–z, 0–9, _.",
      en: "Username 3–20: a–z, 0–9, _.",
    } satisfies Bi,
    username_reserved: {
      id: "Username tidak tersedia.",
      en: "Username unavailable.",
    } satisfies Bi,
    not_authenticated: {
      id: "Masuk dulu.",
      en: "Sign in first.",
    } satisfies Bi,
    forbidden: {
      id: "Tidak diizinkan.",
      en: "Not allowed.",
    } satisfies Bi,
    payload_too_large: {
      id: "Terlalu besar.",
      en: "Too large.",
    } satisfies Bi,
    limit_reached: {
      id: "Batas tercapai.",
      en: "Limit reached.",
    } satisfies Bi,
    not_found: {
      id: "Tidak ditemukan.",
      en: "Not found.",
    } satisfies Bi,
    title_required: {
      id: "Nama wajib.",
      en: "Name required.",
    } satisfies Bi,
    not_configured: {
      id: "Auth belum siap.",
      en: "Auth not configured.",
    } satisfies Bi,
  },
};

const pixelSizePresetUse: Record<PixelSizePresetId, Bi> = {
  icon: { id: "Ikon", en: "Icons" },
  small: { id: "Item", en: "Items" },
  sprite: { id: "Sprite", en: "Sprites" },
  medium: { id: "Ilustrasi", en: "Illustrations" },
  large: { id: "Lukisan", en: "Paintings" },
  poster: { id: "Detail besar", en: "Large detail" },
};

function pixelSizeNameBi(width: number, height: number): Bi {
  const label = formatPixelSize(width, height);
  return { id: label, en: label };
}

export const pixelSizePresetLabels = Object.fromEntries(
  PIXEL_SIZE_PRESETS.map((item) => [
    item.id,
    {
      name: pixelSizeNameBi(item.width, item.height),
      use: pixelSizePresetUse[item.id],
    },
  ]),
) as Record<PixelSizePresetId, { name: Bi; use: Bi }>;

export const creationTypeLabels: Record<CreationType, Bi> = {
  pixel: { id: "Pixel", en: "Pixel" },
  text: { id: "Tulisan", en: "Text" },
  visual: { id: "Visual", en: "Visual" },
  idea: { id: "Ide", en: "Idea" },
  story: { id: "Cerita", en: "Story" },
};

export const creationCategoryLabels: Record<CreationCategory, Bi> = {
  ...Object.fromEntries(
    PIXEL_SIZE_PRESETS.map((item) => [item.id, pixelSizeNameBi(item.width, item.height)]),
  ),
  custom: { id: "Kustom", en: "Custom" },
} as Record<CreationCategory, Bi>;
