import type { Bi } from "@/lib/i18n";
import type { CreationCategory, CreationType } from "@/lib/site";

export const copy = {
  skip: { id: "Lewati ke konten", en: "Skip to content" } satisfies Bi,
  homeAria: { id: "THE COMMONS — beranda", en: "THE COMMONS — home" } satisfies Bi,
  navAria: { id: "Utama", en: "Main" } satisfies Bi,
  openMenu: { id: "Buka menu", en: "Open menu" } satisfies Bi,
  closeMenu: { id: "Tutup menu", en: "Close menu" } satisfies Bi,
  switchToEn: { id: "Switch to English", en: "Switch to English" } satisfies Bi,
  switchToId: { id: "Ganti ke Bahasa Indonesia", en: "Ganti ke Bahasa Indonesia" } satisfies Bi,

  tagline: { id: "Tempat yang dibuat bersama.", en: "A place made by everyone." } satisfies Bi,
  description: {
    id: "Komunitas pixel art publik. Buat karya di Playground, pamerkan di Jelajah, dan apresiasi karya orang lain.",
    en: "A public pixel art community. Make work in the Playground, show it on Explore, and appreciate other people’s art.",
  } satisfies Bi,

  nav: {
    explore: { id: "Jelajah", en: "Explore" } satisfies Bi,
    space: { id: "Ruang Bersama (nanti)", en: "Common Space (later)" } satisfies Bi,
    create: { id: "Buat", en: "Create" } satisfies Bi,
    join: { id: "Gabung", en: "Join" } satisfies Bi,
    signIn: { id: "Masuk", en: "Sign in" } satisfies Bi,
    profile: { id: "Profil", en: "Profile" } satisfies Bi,
    account: { id: "Akun", en: "Account" } satisfies Bi,
    settings: { id: "Pengaturan", en: "Settings" } satisfies Bi,
    dashboard: { id: "Kelola karya", en: "Manage works" } satisfies Bi,
    admin: { id: "Moderasi", en: "Moderation" } satisfies Bi,
    signOut: { id: "Keluar", en: "Sign out" } satisfies Bi,
  },

  landingIntro: {
    id: "Rumah publik untuk pixel art. Lihat karya orang lain, atau gabung dan gambar sendiri.",
    en: "A public home for pixel art. Look at other people’s work, or join and draw your own.",
  } satisfies Bi,
  landingExplore: { id: "Jelajahi karya", en: "Explore creations" } satisfies Bi,
  landingCreate: { id: "Buat karya", en: "Create artwork" } satisfies Bi,
  landingSpace: { id: "Ruang Bersama (nanti)", en: "Common Space (later)" } satisfies Bi,
  landingJoin: { id: "Gabung untuk berkarya", en: "Join to create" } satisfies Bi,
  landingSpaceNote: {
    id: "Ruang Bersama, kanvas pixel raksasa bersama, akan datang kemudian. Itu bukan pusat THE COMMONS.",
    en: "Common Space, a giant shared pixel canvas, comes later. It is not the center of THE COMMONS.",
  } satisfies Bi,
  modesHeading: { id: "Cara THE COMMONS bekerja", en: "How THE COMMONS works" } satisfies Bi,
  mode1: { id: "Buat", en: "Make" } satisfies Bi,
  personalTitle: { id: "Playground", en: "Playground" } satisfies Bi,
  personalBody: {
    id: "Gambar pixel art milikmu, simpan draf, pratinjau, lalu terbitkan. Karya bisa dibuka lagi dan dilanjutkan.",
    en: "Draw your own pixel art, save a draft, preview it, then publish. You can reopen a work and keep developing it.",
  } satisfies Bi,
  mode2: { id: "Pamerkan", en: "Show" } satisfies Bi,
  collectiveTitle: { id: "Jelajah dan profil", en: "Explore and profiles" } satisfies Bi,
  collectiveBody: {
    id: "Karya terbit muncul di galeri dan di profil kreator. Pengunjung bisa melihat tanpa akun.",
    en: "Published work appears in the gallery and on the creator’s profile. Visitors can look without an account.",
  } satisfies Bi,
  principlesHeading: { id: "Cara kerja THE COMMONS", en: "How THE COMMONS works" } satisfies Bi,
  contributionTitle: { id: "Kontribusi di atas popularitas", en: "Contribution over popularity" } satisfies Bi,
  contributionBody: {
    id: "THE COMMONS mendorong partisipasi dan kolaborasi, bukan likes, jumlah pengikut, atau peringkat.",
    en: "THE COMMONS encourages participation and collaboration rather than likes, follower counts, or rankings.",
  } satisfies Bi,
  viewTitle: { id: "Lihat bebas, berkarya dengan akun", en: "View freely, contribute with an account" } satisfies Bi,
  viewBody: {
    id: "Pengunjung publik dapat melihat karya terbit. Akun diperlukan untuk membuat, berkomentar, atau mengapresiasi.",
    en: "Public visitors can view published work. An account is required to create, comment, or appreciate.",
  } satisfies Bi,
  ownerLine: {
    id: "Pemilik produk menyediakan ruangnya; anggota menentukan menjadi apa ruang itu.",
    en: "The product owner provides the space; members determine what the space becomes.",
  } satisfies Bi,

  exploreEyebrow: { id: "Galeri", en: "Gallery" } satisfies Bi,
  exploreTitle: { id: "Jelajah", en: "Explore" } satisfies Bi,
  exploreIntro: {
    id: "Karya pixel terbaru. Saring berdasarkan ukuran kanvas atau cari judul.",
    en: "Newest pixel works. Filter by canvas size or search titles.",
  } satisfies Bi,
  exploreLoadError: { id: "Galeri tidak bisa dimuat.", en: "The gallery could not be loaded." } satisfies Bi,
  exploreLoadHint: {
    id: "Periksa jaringan, lalu coba lagi. Karya yang sudah terbit tidak hilang.",
    en: "Check your connection, then try again. Published work is still there.",
  } satisfies Bi,
  exploreRetry: { id: "Coba lagi", en: "Try again" } satisfies Bi,
  exploreMeta: {
    id: "Galeri publik pixel art di THE COMMONS.",
    en: "Public pixel art gallery on THE COMMONS.",
  } satisfies Bi,
  filterAll: { id: "Semua", en: "All" } satisfies Bi,
  categoryAria: { id: "Saring berdasarkan ukuran karya", en: "Filter by artwork size" } satisfies Bi,
  categoryAll: { id: "Semua ukuran", en: "All sizes" } satisfies Bi,
  categoryLabel: { id: "Ukuran", en: "Size" } satisfies Bi,
  exploreEmptySize: {
    id: "Belum ada karya dengan ukuran ini. Coba ukuran lain atau hapus filter.",
    en: "No works at this size yet. Try another size or clear the filter.",
  } satisfies Bi,
  exploreSearchLabel: { id: "Cari karya", en: "Search works" } satisfies Bi,
  exploreSearchPlaceholder: {
    id: "Cari judul…",
    en: "Search titles…",
  } satisfies Bi,
  exploreSearchSubmit: { id: "Cari", en: "Search" } satisfies Bi,
  exploreSearchEmpty: {
    id: "Tidak ada karya yang cocok. Ubah kata kunci atau filter, lalu coba lagi.",
    en: "No matching works. Change the search or filters, then try again.",
  } satisfies Bi,
  exploreEmptyTitle: { id: "Belum ada karya terbit", en: "No published creations yet" } satisfies Bi,
  exploreEmptyAll: {
    id: "Galerinya masih kosong. Ketika anggota memublikasikan pixel art, karya akan muncul di sini dari yang terbaru. Pengunjung publik boleh melihat; akun diperlukan untuk berkarya.",
    en: "The gallery is empty. When members publish pixel art, works will appear here newest first. Public visitors can view; an account is required to create.",
  } satisfies Bi,

  spaceEyebrow: { id: "Nanti", en: "Later" } satisfies Bi,
  spaceTitle: { id: "Ruang Bersama", en: "Common Space" } satisfies Bi,
  spaceIntro: {
    id: "Kanvas pixel raksasa bersama akan datang kemudian. Halaman ini bukan pusat THE COMMONS — komunitas dan Playground-lah intinya.",
    en: "A giant shared pixel canvas will come later. This page is not the center of THE COMMONS — the community and the Playground are.",
  } satisfies Bi,
  spaceMeta: {
    id: "Ruang Bersama adalah kanvas bersama nanti, bukan pusat produk.",
    en: "Common Space is a later shared canvas, not the product center.",
  } satisfies Bi,
  spaceLegacyKicker: { id: "Arsip", en: "Archive" } satisfies Bi,
  spaceLegacyNote: {
    id: "Papan SVG lama tetap di sini supaya penempatan yang sudah ada tidak hilang. Ini bukan kanvas pixel raksasa yang akan datang, dan bukan Playground.",
    en: "The previous SVG board stays here so existing placements are not lost. It is not the giant pixel canvas that will come later, and it is not the Playground.",
  } satisfies Bi,
  spaceCanvasTitle: { id: "Kanvas Ruang Bersama", en: "Common Space canvas" } satisfies Bi,
  spaceCanvasDesc: {
    id: "Kanvas bersama memakai sistem koordinat 0 sampai 1000. Asal di kiri atas. Penempatan tetap proporsional saat kanvas menyesuaikan layar.",
    en: "The shared canvas uses a 0 to 1000 coordinate system. Origin is top-left. Placements stay proportional as the canvas scales.",
  } satisfies Bi,
  spaceCaption: {
    id: "Koordinat kanvas dinormalisasi ke 0 0 1000 1000 agar penempatan tetap proporsional di layar mana pun.",
    en: "Canvas coordinates are normalized to 0 0 1000 1000 so placements scale on any screen.",
  } satisfies Bi,
  spaceEmptyTitle: { id: "Kanvas masih kosong", en: "The canvas is empty" } satisfies Bi,
  spaceEmptyBody: {
    id: "Belum ada elemen. Pengunjung publik boleh melihat. Akun diperlukan untuk menambah teks atau bentuk. Kontribusi muncul setelah disimpan.",
    en: "No elements yet. Public visitors can view. An account is required to add text or shapes. Contributions appear after they are saved.",
  } satisfies Bi,
  spaceAddText: { id: "Tambah teks", en: "Add text" } satisfies Bi,
  spaceAddRect: { id: "Tambah persegi", en: "Add rectangle" } satisfies Bi,
  spaceAddCircle: { id: "Tambah lingkaran", en: "Add circle" } satisfies Bi,
  spaceSelect: { id: "Pilih / pindahkan", en: "Select / move" } satisfies Bi,
  spacePlaceHint: {
    id: "Klik kanvas untuk meletakkan. Geser elemenmu sendiri untuk memindahkan.",
    en: "Click the canvas to place. Drag your own element to move it.",
  } satisfies Bi,
  spaceSignIn: {
    id: "Masuk untuk menambah ke kanvas.",
    en: "Sign in to add to the canvas.",
  } satisfies Bi,
  spaceDelete: { id: "Hapus elemen ini", en: "Delete this element" } satisfies Bi,
  spaceContributors: { id: "Kontributor", en: "Contributors" } satisfies Bi,
  spaceYours: { id: "Milikmu", en: "Yours" } satisfies Bi,
  spaceTextBody: { id: "Teks", en: "Text" } satisfies Bi,
  spacePlace: { id: "Letakkan", en: "Place" } satisfies Bi,
  spaceFontSize: { id: "Ukuran", en: "Size" } satisfies Bi,
  pixelPrototypeNote: {
    id: "Prototype lokal. Gambar hanya di perangkat ini, belum tersimpan, dan belum dibagikan. SVG lama tetap ada di balik flag.",
    en: "Local prototype. Drawing stays on this device; it is not saved or shared. The previous SVG canvas remains behind the flag.",
  } satisfies Bi,
  pixelIntro: {
    id: "Satu kanvas piksel 512 × 512. Pensil, penghapus, palet, zoom, dan geser. Belum ada penyimpanan.",
    en: "One 512 × 512 pixel canvas. Pencil, eraser, palette, zoom, and pan. Nothing is stored yet.",
  } satisfies Bi,
  pixelPencil: { id: "Pensil", en: "Pencil" } satisfies Bi,
  pixelEraser: { id: "Penghapus", en: "Eraser" } satisfies Bi,
  pixelPan: { id: "Geser", en: "Pan" } satisfies Bi,
  pixelZoomIn: { id: "Perbesar", en: "Zoom in" } satisfies Bi,
  pixelZoomOut: { id: "Perkecil", en: "Zoom out" } satisfies Bi,
  pixelFit: { id: "Muat", en: "Fit" } satisfies Bi,
  pixelColor: { id: "Warna", en: "Color" } satisfies Bi,
  pixelHint: {
    id: "Satu jari menggambar. Dua jari menggeser. Roda tetikus mengubah zoom. Penghapus mengembalikan ke kertas.",
    en: "One finger draws. Two fingers pan. The mouse wheel zooms. The eraser restores paper.",
  } satisfies Bi,
  pixelLocal: { id: "hanya di memori", en: "in memory only" } satisfies Bi,
  pixelUndo: { id: "Urungkan", en: "Undo" } satisfies Bi,
  pixelRedo: { id: "Ulangi", en: "Redo" } satisfies Bi,
  pixelStudioNote: {
    id: "Gambar disimpan sebagai sumber editor, bukan PNG. Simpan draf supaya karyamu bisa dibuka lagi.",
    en: "The drawing is stored as editor source, not as the PNG. Save a draft so you can reopen the work.",
  } satisfies Bi,
  pixelLoadError: {
    id: "Sumber editor tidak bisa dibaca. Kanvas dimulai kosong. Simpan draf untuk menulis ulang sumbernya.",
    en: "The editor source could not be read. The canvas starts empty. Save a draft to rewrite the source.",
  } satisfies Bi,
  pixelPreviewAlt: { id: "Pratinjau pixel art", en: "Pixel art preview" } satisfies Bi,
  pixelMore: { id: "Lainnya", en: "More" } satisfies Bi,
  pixelPaletteMore: { id: "Palet", en: "Palette" } satisfies Bi,
  pixelHex: { id: "Kode HEX", en: "HEX code" } satisfies Bi,
  pixelPickColor: { id: "Pilih warna", en: "Pick a color" } satisfies Bi,
  pixelRecent: { id: "Baru dipakai", en: "Recent" } satisfies Bi,
  pixelFavorites: { id: "Favorit", en: "Favorites" } satisfies Bi,
  pixelUseColor: { id: "Pakai warna ini", en: "Use this color" } satisfies Bi,
  pixelFavoriteAdd: { id: "Tambah ke favorit", en: "Add to favorites" } satisfies Bi,
  pixelFavoriteRemove: { id: "Hapus dari favorit", en: "Remove from favorites" } satisfies Bi,
  pixelShortcuts: { id: "Pintasan", en: "Shortcuts" } satisfies Bi,
  pixelNoRecent: { id: "Belum ada warna baru.", en: "No recent colors yet." } satisfies Bi,
  pixelNoFavorites: { id: "Belum ada favorit.", en: "No favorites yet." } satisfies Bi,
  pixelPaletteFull: {
    id: "Palet karya ini sudah penuh (64 warna). Pakai warna yang sudah ada di karya.",
    en: "This work’s palette is full (64 colors). Use a color already in the work.",
  } satisfies Bi,
  pixelHexInvalid: {
    id: "Masukkan kode HEX enam digit, misalnya #FF5C5C.",
    en: "Enter a six-digit HEX code, for example #FF5C5C.",
  } satisfies Bi,
  pixelSaving: { id: "Menyimpan…", en: "Saving…" } satisfies Bi,
  pixelSavedJustNow: { id: "Tersimpan", en: "Saved" } satisfies Bi,
  pixelUnsaved: { id: "Belum tersimpan", en: "Unsaved" } satisfies Bi,
  pixelOffline: {
    id: "Tidak ada jaringan. Goresan tetap di kanvas sampai bisa disimpan.",
    en: "You are offline. Strokes stay on the canvas until they can be saved.",
  } satisfies Bi,
  pixelBack: { id: "Kembali", en: "Back" } satisfies Bi,
  createBackToWorks: { id: "Kembali ke karyamu", en: "Back to your work" } satisfies Bi,
  pixelUntitled: { id: "Tanpa judul", en: "Untitled" } satisfies Bi,
  sizePickerIntro: {
    id: "Pilih resolusi karya dulu. Angka ini adalah jumlah piksel, bukan ukuran di layar — kanvas kecil tetap bisa diperbesar saat menggambar.",
    en: "Pick the artwork resolution first. These numbers are pixels in the work, not how big it looks on screen — a small canvas still zooms while you draw.",
  } satisfies Bi,
  sizeCustom: { id: "Kustom", en: "Custom" } satisfies Bi,
  sizeCustomHint: {
    id: "Lebar dan tinggi 8–512. Contoh: 128 × 64 untuk objek mendatar.",
    en: "Width and height 8–512. Example: 128 × 64 for a wide sprite.",
  } satisfies Bi,
  sizeWidth: { id: "Lebar", en: "Width" } satisfies Bi,
  sizeHeight: { id: "Tinggi", en: "Height" } satisfies Bi,
  sizeStart: { id: "Mulai menggambar", en: "Start drawing" } satisfies Bi,
  sizeSelected: { id: "Dipilih", en: "Selected" } satisfies Bi,

  createEyebrow: { id: "Playground", en: "Playground" } satisfies Bi,
  createTitle: { id: "Buat", en: "Create" } satisfies Bi,
  createIntro: {
    id: "Pilih ukuran kanvas, lalu mulai menggambar. Draf tersimpan sendiri. Karya yang sudah ada dikelola di Karyamu.",
    en: "Pick a canvas size, then start drawing. Drafts save on their own. Existing work lives in Your works.",
  } satisfies Bi,
  createManageLink: {
    id: "Kelola karya yang sudah ada",
    en: "Manage existing works",
  } satisfies Bi,
  createMeta: {
    id: "Pixel Art Playground. Akun diperlukan untuk berkarya.",
    en: "Pixel Art Playground. An account is required to create.",
  } satisfies Bi,
  createEmptyTitle: { id: "Belum ada karya", en: "No creations yet" } satisfies Bi,
  createEmptyBody: {
    id: "Mulai draf pixel art. Draf hanya terlihat olehmu sampai kamu menerbitkannya.",
    en: "Start a pixel art draft. Drafts stay private until you publish.",
  } satisfies Bi,
  createStart: { id: "Mulai karya", en: "Start artwork" } satisfies Bi,
  createTitleLabel: { id: "Judul", en: "Title" } satisfies Bi,
  createTypeLabel: { id: "Jenis", en: "Type" } satisfies Bi,
  createBodyLabel: { id: "Isi", en: "Body" } satisfies Bi,
  createContextLabel: { id: "Konteks", en: "Context" } satisfies Bi,
  createPromptLabel: { id: "Ajakan menyambung", en: "Continuation prompt" } satisfies Bi,
  createPromptHint: {
    id: "Opsional. Satu kalimat untuk orang yang ingin menyambung cerita ini nanti.",
    en: "Optional. One line for someone who wants to continue this story later.",
  } satisfies Bi,
  createSaveDraft: { id: "Simpan draf", en: "Save draft" } satisfies Bi,
  createPublish: { id: "Terbitkan", en: "Publish" } satisfies Bi,
  createPreview: { id: "Pratinjau", en: "Preview" } satisfies Bi,
  createEdit: { id: "Sunting", en: "Edit" } satisfies Bi,
  createEditThis: { id: "Sunting karya ini", en: "Edit this work" } satisfies Bi,
  createDelete: { id: "Hapus", en: "Delete" } satisfies Bi,
  createDeleteConfirm: {
    id: "Hapus karya ini? Tindakan ini tidak bisa dibatalkan.",
    en: "Delete this work? This cannot be undone.",
  } satisfies Bi,
  createCancel: { id: "Batal", en: "Cancel" } satisfies Bi,
  createViewPublic: { id: "Lihat halaman publik", en: "View public page" } satisfies Bi,
  createSaved: { id: "Draf disimpan.", en: "Draft saved." } satisfies Bi,
  createPublished: { id: "Karya diterbitkan.", en: "Published." } satisfies Bi,
  createUnpublish: { id: "Tarik terbit", en: "Unpublish" } satisfies Bi,
  createUnpublished: {
    id: "Karya ditarik dari publik. Sumber dan gambar tetap ada sebagai draf.",
    en: "Unpublished. The source and image stay as a draft.",
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
    id: "Belum ada elemen. Tambah persegi, lingkaran, atau teks. SVG dibuat dari data yang divalidasi, bukan markup bebas.",
    en: "No elements yet. Add a rectangle, circle, or text. SVG is generated from validated data, not freeform markup.",
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
  byAuthor: { id: "oleh", en: "by" } satisfies Bi,
  creationNotFound: { id: "Karya tidak ditemukan.", en: "That creation was not found." } satisfies Bi,
  creationMeta: {
    id: "Karya terbit di THE COMMONS.",
    en: "A published work on THE COMMONS.",
  } satisfies Bi,

  appreciate: { id: "Apresiasi", en: "Appreciate" } satisfies Bi,
  appreciated: { id: "Diapresiasi", en: "Appreciated" } satisfies Bi,
  share: { id: "Bagikan", en: "Share" } satisfies Bi,
  shareCopied: { id: "Tautan disalin.", en: "Link copied." } satisfies Bi,
  fork: { id: "Fork", en: "Fork" } satisfies Bi,
  forkedFrom: { id: "Fork dari", en: "Forked from" } satisfies Bi,
  forkedUnavailable: {
    id: "Fork dari karya yang sudah tidak publik.",
    en: "Forked from a work that is no longer public.",
  } satisfies Bi,
  commentsTitle: { id: "Percakapan", en: "Conversation" } satisfies Bi,
  commentsEmpty: {
    id: "Belum ada percakapan. Sampaikan kesanmu pada karyanya.",
    en: "No conversation yet. Leave a note about the artwork.",
  } satisfies Bi,
  conversationPrompt: {
    id: "Bagaimana menurutmu tentang karya ini?",
    en: "What do you think about this artwork?",
  } satisfies Bi,
  conversationSend: { id: "Kirim", en: "Send" } satisfies Bi,
  conversationReply: { id: "Balas", en: "Reply" } satisfies Bi,
  conversationReplyTo: { id: "Balas", en: "Reply to" } satisfies Bi,
  conversationEdit: { id: "Ubah", en: "Edit" } satisfies Bi,
  conversationSave: { id: "Simpan", en: "Save" } satisfies Bi,
  conversationEdited: { id: "diedit", en: "edited" } satisfies Bi,
  conversationLoadEarlier: {
    id: "Muat percakapan sebelumnya",
    en: "Load earlier notes",
  } satisfies Bi,
  commentLabel: { id: "Catatan", en: "Note" } satisfies Bi,
  commentSubmit: { id: "Kirim", en: "Send" } satisfies Bi,
  commentPosted: { id: "Catatan terkirim.", en: "Note posted." } satisfies Bi,
  commentSignIn: {
    id: "Masuk untuk ikut percakapan atau mengapresiasi.",
    en: "Sign in to join the conversation or appreciate.",
  } satisfies Bi,
  commentDelete: { id: "Hapus komentar", en: "Delete comment" } satisfies Bi,
  commentDeleteConfirm: {
    id: "Hapus komentar ini?",
    en: "Delete this comment?",
  } satisfies Bi,
  report: { id: "Laporkan", en: "Report" } satisfies Bi,
  reportTitle: { id: "Laporkan konten", en: "Report content" } satisfies Bi,
  reportReason: { id: "Alasan", en: "Reason" } satisfies Bi,
  reportDetails: { id: "Keterangan (opsional)", en: "Details (optional)" } satisfies Bi,
  reportSubmit: { id: "Kirim laporan", en: "Submit report" } satisfies Bi,
  reportThanks: {
    id: "Laporan diterima. Tim moderasi akan meninjaunya.",
    en: "Report received. Moderators will review it.",
  } satisfies Bi,
  reportSignIn: {
    id: "Masuk untuk melaporkan konten.",
    en: "Sign in to report content.",
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
    id: "Dasbor laporan dan penyembunyian konten.",
    en: "Report review and content hiding.",
  } satisfies Bi,
  adminIntro: {
    id: "Hanya admin yang bisa membuka halaman ini. Sembunyikan konten yang dilaporkan, atau pulihkan jika laporan tidak beralasan. Banding ditangani langsung oleh pemilik proyek, tanpa formulir terpisah.",
    en: "Only admins can open this page. Hide reported content, or restore it if the report does not hold. Appeals are handled by the project owner; there is no separate form.",
  } satisfies Bi,
  adminEmpty: {
    id: "Tidak ada laporan pada filter ini.",
    en: "No reports in this filter.",
  } satisfies Bi,
  adminFilter: { id: "Status laporan", en: "Report status" } satisfies Bi,
  adminPending: { id: "Menunggu", en: "Pending" } satisfies Bi,
  adminReviewed: { id: "Ditinjau", en: "Reviewed" } satisfies Bi,
  adminResolved: { id: "Selesai", en: "Resolved" } satisfies Bi,
  adminAll: { id: "Semua", en: "All" } satisfies Bi,
  adminHide: { id: "Sembunyikan", en: "Hide" } satisfies Bi,
  adminRestore: { id: "Pulihkan", en: "Restore" } satisfies Bi,
  adminReview: { id: "Tandai ditinjau", en: "Mark reviewed" } satisfies Bi,
  adminResolve: { id: "Selesaikan", en: "Resolve" } satisfies Bi,
  adminReporter: { id: "Pelapor", en: "Reporter" } satisfies Bi,
  adminTarget: { id: "Sasaran", en: "Target" } satisfies Bi,
  adminHidden: { id: "Tersembunyi dari publik", en: "Hidden from the public" } satisfies Bi,
  adminTargetTypes: {
    creation: { id: "Karya", en: "Creation" } satisfies Bi,
    comment: { id: "Komentar", en: "Comment" } satisfies Bi,
    space_element: { id: "Elemen Ruang Bersama", en: "Common Space element" } satisfies Bi,
  },

  loginTitle: { id: "Masuk", en: "Sign in" } satisfies Bi,
  loginMeta: {
    id: "Masuk ke THE COMMONS dengan email.",
    en: "Sign in to THE COMMONS with email.",
  } satisfies Bi,
  loginSubmit: { id: "Masuk", en: "Sign in" } satisfies Bi,
  loginToRegister: { id: "Belum punya akun? Gabung", en: "No account yet? Join" } satisfies Bi,

  registerTitle: { id: "Gabung", en: "Join" } satisfies Bi,
  registerMeta: {
    id: "Buat akun anggota THE COMMONS.",
    en: "Create a THE COMMONS member account.",
  } satisfies Bi,
  registerSubmit: { id: "Buat akun", en: "Create account" } satisfies Bi,
  registerToLogin: { id: "Sudah punya akun? Masuk", en: "Already a member? Sign in" } satisfies Bi,
  registerEmailSent: {
    id: "Jika alamat ini bisa dipakai, kami mengirim tautan untuk menyelesaikan pendaftaran.",
    en: "If this address can be used, we sent a link to finish joining.",
  } satisfies Bi,

  emailLabel: { id: "Email", en: "Email" } satisfies Bi,
  passwordLabel: { id: "Kata sandi", en: "Password" } satisfies Bi,
  usernameLabel: { id: "Nama pengguna", en: "Username" } satisfies Bi,
  displayNameLabel: { id: "Nama tampilan", en: "Display name" } satisfies Bi,
  bioLabel: { id: "Bio", en: "Bio" } satisfies Bi,
  roleLabel: { id: "Peran", en: "Role" } satisfies Bi,
  usernameHint: {
    id: "3–20 karakter: huruf kecil, angka, dan garis bawah.",
    en: "3–20 characters: lowercase letters, numbers, and underscores.",
  } satisfies Bi,
  passwordHint: { id: "Minimal 8 karakter.", en: "At least 8 characters." } satisfies Bi,
  roleHint: {
    id: "Peran tidak bisa diubah sendiri.",
    en: "You cannot change your own role.",
  } satisfies Bi,

  dashboardTitle: { id: "Karyamu", en: "Your works" } satisfies Bi,
  dashboardMeta: {
    id: "Kelola draf dan karya terbit milikmu.",
    en: "Manage your drafts and published works.",
  } satisfies Bi,
  dashboardHello: { id: "Halo", en: "Hello" } satisfies Bi,
  dashboardBody: {
    id: "Ini ruang anggota. Publik bisa melihat profilmu. Buat karya dari Buat, lalu pamerkan di Jelajah.",
    en: "This is your member space. The public can view your profile. Make work in Create, then show it on Explore.",
  } satisfies Bi,
  worksTitle: { id: "Karyamu", en: "Your works" } satisfies Bi,
  worksMeta: {
    id: "Kelola draf dan karya terbit milikmu.",
    en: "Manage your drafts and published works.",
  } satisfies Bi,
  worksIntro: {
    id: "Draf hanya terlihat olehmu. Karya terbit muncul di Jelajah dan di profil.",
    en: "Drafts stay private. Published works appear on Explore and your profile.",
  } satisfies Bi,
  worksNew: { id: "Karya baru", en: "New work" } satisfies Bi,
  worksDrafts: { id: "Draf", en: "Drafts" } satisfies Bi,
  worksPublished: { id: "Terbit", en: "Published" } satisfies Bi,
  worksEmptyDrafts: {
    id: "Belum ada draf. Mulai karya baru untuk menggambar.",
    en: "No drafts yet. Start a new work to draw.",
  } satisfies Bi,
  worksEmptyPublished: {
    id: "Belum ada karya terbit. Terbitkan dari Playground saat siap.",
    en: "No published works yet. Publish from the Playground when you are ready.",
  } satisfies Bi,
  worksContinue: { id: "Lanjutkan", en: "Continue" } satisfies Bi,
  worksView: { id: "Lihat", en: "View" } satisfies Bi,
  worksUnnamed: { id: "Belum dinamai", en: "Not named yet" } satisfies Bi,
  worksNamePlaceholder: { id: "Nama karya", en: "Work name" } satisfies Bi,
  worksNamePublishTitle: { id: "Nama sebelum terbit", en: "Name before publishing" } satisfies Bi,
  worksNamePublishHint: {
    id: "Karya terbit butuh nama supaya mudah ditemukan.",
    en: "Published works need a name so people can find them.",
  } satisfies Bi,
  worksPublishDoneTitle: { id: "Karya diterbitkan", en: "Work published" } satisfies Bi,
  worksPublishDoneBody: {
    id: "Karya ini sekarang ada di Jelajah dan di profilmu.",
    en: "This work is now on Explore and your profile.",
  } satisfies Bi,
  worksViewWork: { id: "Lihat karya", en: "View work" } satisfies Bi,
  worksKeepEditing: { id: "Tetap di kanvas", en: "Stay on canvas" } satisfies Bi,

  settingsTitle: { id: "Pengaturan profil", en: "Profile settings" } satisfies Bi,
  settingsMeta: {
    id: "Sunting profilmu. Hanya kamu yang bisa mengubahnya.",
    en: "Edit your profile. Only you can change it.",
  } satisfies Bi,
  settingsBack: { id: "Kembali ke profil", en: "Back to profile" } satisfies Bi,
  settingsSave: { id: "Simpan", en: "Save" } satisfies Bi,
  settingsSaved: { id: "Profil disimpan.", en: "Profile saved." } satisfies Bi,

  profileTitle: { id: "Profil", en: "Profile" } satisfies Bi,
  profileEmptyCreations: {
    id: "Belum ada karya terbit di profil ini.",
    en: "No published creations on this profile yet.",
  } satisfies Bi,
  profileEmptyBody: {
    id: "Karya yang sudah terbit akan muncul di sini.",
    en: "Published creations will appear here.",
  } satisfies Bi,
  profileNotFound: { id: "Profil tidak ditemukan.", en: "Profile not found." } satisfies Bi,
  memberSince: { id: "Anggota sejak", en: "Member since" } satisfies Bi,

  errors: {
    generic_auth: {
      id: "Email atau kata sandi tidak bisa dipakai.",
      en: "That email or password could not be used.",
    } satisfies Bi,
    generic_register: {
      id: "Akun tidak bisa dibuat sekarang.",
      en: "The account could not be created right now.",
    } satisfies Bi,
    invalid_input: {
      id: "Periksa isianmu lalu coba lagi.",
      en: "Check your details and try again.",
    } satisfies Bi,
    username_taken: {
      id: "Nama pengguna itu sudah dipakai.",
      en: "That username is already taken.",
    } satisfies Bi,
    username_format: {
      id: "Nama pengguna harus 3–20 karakter: huruf kecil, angka, atau garis bawah.",
      en: "Username must be 3–20 lowercase letters, numbers, or underscores.",
    } satisfies Bi,
    username_reserved: {
      id: "Nama pengguna itu tidak tersedia.",
      en: "That username is not available.",
    } satisfies Bi,
    not_authenticated: {
      id: "Masuk dulu untuk melanjutkan.",
      en: "Sign in to continue.",
    } satisfies Bi,
    forbidden: {
      id: "Kamu tidak diizinkan melakukan itu.",
      en: "You are not allowed to do that.",
    } satisfies Bi,
    payload_too_large: {
      id: "Isinya terlalu besar.",
      en: "That content is too large.",
    } satisfies Bi,
    limit_reached: {
      id: "Batas untuk akun ini sudah tercapai. Coba lagi nanti.",
      en: "This account has reached a limit. Try again later.",
    } satisfies Bi,
    not_found: {
      id: "Tidak ditemukan.",
      en: "Not found.",
    } satisfies Bi,
    title_required: {
      id: "Isi nama karya sebelum menerbitkan.",
      en: "Give the work a name before publishing.",
    } satisfies Bi,
    not_configured: {
      id: "Autentikasi belum dikonfigurasi di lingkungan ini.",
      en: "Authentication is not configured in this environment.",
    } satisfies Bi,
  },
};

export const pixelSizePresetLabels = {
  icon: {
    name: { id: "Ikon", en: "Icon" } satisfies Bi,
    use: { id: "Ikon sangat sederhana", en: "Very simple icons" } satisfies Bi,
  },
  small: {
    name: { id: "Kecil", en: "Small" } satisfies Bi,
    use: { id: "Ikon dan item", en: "Icons and items" } satisfies Bi,
  },
  sprite: {
    name: { id: "Sprite", en: "Sprite" } satisfies Bi,
    use: { id: "Karakter dan objek", en: "Characters and objects" } satisfies Bi,
  },
  medium: {
    name: { id: "Sedang", en: "Medium" } satisfies Bi,
    use: { id: "Ilustrasi sederhana", en: "Simple illustrations" } satisfies Bi,
  },
  large: {
    name: { id: "Besar", en: "Large" } satisfies Bi,
    use: { id: "Lukisan pixel art", en: "Pixel paintings" } satisfies Bi,
  },
  poster: {
    name: { id: "Poster", en: "Poster" } satisfies Bi,
    use: { id: "Karya dengan detail besar", en: "Work with large detail" } satisfies Bi,
  },
} as const;

export const creationTypeLabels: Record<CreationType, Bi> = {
  pixel: { id: "Pixel", en: "Pixel" },
  text: { id: "Tulisan", en: "Text" },
  visual: { id: "Visual", en: "Visual" },
  idea: { id: "Ide", en: "Idea" },
  story: { id: "Cerita", en: "Story" },
};

export const creationCategoryLabels: Record<CreationCategory, Bi> = {
  icon: pixelSizePresetLabels.icon.name,
  small: pixelSizePresetLabels.small.name,
  sprite: pixelSizePresetLabels.sprite.name,
  medium: pixelSizePresetLabels.medium.name,
  large: pixelSizePresetLabels.large.name,
  poster: pixelSizePresetLabels.poster.name,
  custom: { id: "Kustom", en: "Custom" },
};
