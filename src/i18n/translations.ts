/**
 * translations.ts — Semua string UI dalam dua bahasa
 * =====================================================
 *
 * File ini adalah "kamus" aplikasi.
 * Setiap teks yang ditampilkan kepada user disimpan di sini dalam
 * dua versi: Inggris (en) dan Indonesia (id).
 *
 * CARA MENAMBAH STRING BARU:
 * 1. Tambahkan key baru di objek `en` dengan teks bahasa Inggris.
 * 2. Tambahkan key yang SAMA di objek `id` dengan teks bahasa Indonesia.
 * 3. Panggil `const { t } = useLanguage()` di komponen React.
 * 4. Gunakan `t("key_baru")` di JSX.
 *
 * CARA MENAMBAH BAHASA BARU (misal: Jepang):
 * 1. Tambahkan `ja: { ... }` di bawah `id`.
 * 2. Update tipe `Language` di LanguageContext.tsx → tambahkan `"ja"`.
 * 3. Tambahkan opsi di LanguageSelector.tsx.
 *
 * CATATAN UNTUK DEVELOPER BARU:
 * - Jangan hardcode teks UI langsung di komponen React.
 * - Selalu tambahkan string di sini dulu, lalu panggil dengan t().
 * - Kalau ada teks dinamis (e.g. "5 papers"), gunakan fungsi:
 *     t("papers_count").replace("{n}", String(count))
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipe: daftar semua key yang valid
// TypeScript akan error kalau ada key yang hilang di salah satu bahasa.
// ─────────────────────────────────────────────────────────────────────────────

export type TranslationKey =
  // ── Language Selector ──
  | "lang_select_title"
  | "lang_select_subtitle"
  | "lang_en"
  | "lang_id"
  | "lang_en_desc"
  | "lang_id_desc"

  // ── Bottom Nav ──
  | "nav_home"
  | "nav_for_you"
  | "nav_saved"
  | "nav_profile"

  // ── Discovery Screen (Home) ──
  | "home_headline"
  | "home_headline_accent"
  | "home_subtitle"
  | "home_trending_personalised"
  | "home_trending_default"
  | "home_adjust_interests"
  | "home_loading"
  | "home_open_feed"
  | "home_all_papers"
  | "home_category_papers"
  | "home_no_papers"
  | "home_no_papers_hint"
  | "home_fetching"

  // ── Feed Page ──
  | "feed_tab_for_you"
  | "feed_tab_following"
  | "feed_status_exploring"
  | "feed_status_personalised"

  // ── Feed Card ──
  | "card_core_research"
  | "card_abstract"
  | "card_key_results"
  | "card_watch_story"
  | "card_watch_story_cached"
  | "card_details"
  | "card_swipe_hint"
  | "card_no_summary"

  // ── Bookmarks Page ──
  | "bookmarks_title"
  | "bookmarks_subtitle"
  | "bookmarks_empty_title"
  | "bookmarks_empty_hint"

  // ── Profile Page ──
  | "profile_username"
  | "profile_handle"
  | "profile_stat_viewed"
  | "profile_stat_liked"
  | "profile_stat_saved"
  | "profile_my_interests"
  | "profile_fav_categories"

  // ── Detail Screen (tabs) ──
  | "detail_tab_summary"
  | "detail_tab_concepts"
  | "detail_tab_diagram"
  | "detail_tab_paper"
  | "detail_core_diagram"
  | "detail_key_concepts"
  | "detail_your_insight"
  | "detail_why_matches"
  | "detail_paper_info"
  | "detail_arxiv_id"
  | "detail_institution"
  | "detail_published"
  | "detail_authors"
  | "detail_categories"
  | "detail_abstract"
  | "detail_open_arxiv"
  | "detail_download_pdf"
  | "detail_no_data"

  // ── Story Player ──
  | "story_generating"
  | "story_generating_desc"
  | "story_one_time_note"
  | "story_error_title"
  | "story_error_desc"
  | "story_error_retry"
  | "story_finished_title"
  | "story_finished_replay"
  | "story_finished_close"
  | "story_label";

// ─────────────────────────────────────────────────────────────────────────────
// Tipe objek terjemahan — setiap key WAJIB ada nilainya
// ─────────────────────────────────────────────────────────────────────────────

type Translations = Record<TranslationKey, string>;

// ─────────────────────────────────────────────────────────────────────────────
// 🇬🇧 English
// ─────────────────────────────────────────────────────────────────────────────

const en: Translations = {
  // Language Selector
  lang_select_title:      "Choose Your Language",
  lang_select_subtitle:   "You can change this later in Settings",
  lang_en:                "English",
  lang_id:                "Indonesia",
  lang_en_desc:           "Continue in English",
  lang_id_desc:           "Lanjutkan dalam Bahasa Indonesia",

  // Bottom Nav
  nav_home:               "Home",
  nav_for_you:            "For You",
  nav_saved:              "Saved",
  nav_profile:            "Profile",

  // Discovery Screen
  home_headline:          "Scientific journals.",
  home_headline_accent:   "As easy as TikTok.",
  home_subtitle:          "Summaries, concepts, and diagrams from arXiv papers — personalised for your interests.",
  home_trending_personalised: "Recommended for you ✨",
  home_trending_default:  "For you today ✨",
  home_adjust_interests:  "Adjust interests →",
  home_loading:           "Fetching latest papers…",
  home_open_feed:         "Open feed →",
  home_all_papers:        "All Papers",
  home_category_papers:   "{category} Papers",
  home_no_papers:         "No papers in this category yet.",
  home_no_papers_hint:    "Try a different category above.",
  home_fetching:          "Fetching latest papers…",

  // Feed Page
  feed_tab_for_you:       "For You",
  feed_tab_following:     "Following",
  feed_status_exploring:  "Exploring",
  feed_status_personalised: "Personalised",

  // Feed Card
  card_core_research:     "Core Research",
  card_abstract:          "Abstract",
  card_key_results:       "Key Results",
  card_watch_story:       "✨ Watch Story",
  card_watch_story_cached:"▶ Watch Story",
  card_details:           "Details",
  card_swipe_hint:        "Swipe up for the next paper",
  card_no_summary:        "No summary available for this paper.",

  // Bookmarks
  bookmarks_title:        "Saved Papers",
  bookmarks_subtitle:     "Papers you have bookmarked",
  bookmarks_empty_title:  "No saved papers yet.",
  bookmarks_empty_hint:   "Tap the bookmark icon on any paper to save it.",

  // Profile
  profile_username:       "Young Researcher",
  profile_handle:         "@arxivtok_user",
  profile_stat_viewed:    "Papers Viewed",
  profile_stat_liked:     "Liked",
  profile_stat_saved:     "Saved",
  profile_my_interests:   "My Interests",
  profile_fav_categories: "Favourite Categories",

  // Detail Screen
  detail_tab_summary:     "Summary",
  detail_tab_concepts:    "Concepts",
  detail_tab_diagram:     "Diagram",
  detail_tab_paper:       "Paper Detail",
  detail_core_diagram:    "Core Diagram",
  detail_key_concepts:    "Key Concepts",
  detail_your_insight:    "Your Insight",
  detail_why_matches:     "Why this matches? ▾",
  detail_paper_info:      "Paper Information",
  detail_arxiv_id:        "arXiv ID",
  detail_institution:     "Institution",
  detail_published:       "Published",
  detail_authors:         "Authors",
  detail_categories:      "Categories",
  detail_abstract:        "Abstract",
  detail_open_arxiv:      "Open on arXiv",
  detail_download_pdf:    "Download PDF",
  detail_no_data:         "No data available yet.",

  // Story Player
  story_generating:       "Creating story…",
  story_generating_desc:  "Writing script and generating 5 scene images.",
  story_one_time_note:    "This only happens once — the story is saved for instant replay.",
  story_error_title:      "Failed to create story",
  story_error_desc:       "Make sure GROQ_API_KEY is set in .env.local and your internet is connected.",
  story_error_retry:      "Try again",
  story_finished_title:   "Story finished 🎉",
  story_finished_replay:  "Replay",
  story_finished_close:   "Close",
  story_label:            "ArxivTok Story",
};

// ─────────────────────────────────────────────────────────────────────────────
// 🇮🇩 Indonesian (Bahasa Indonesia)
// ─────────────────────────────────────────────────────────────────────────────

const id: Translations = {
  // Language Selector
  lang_select_title:      "Pilih Bahasa",
  lang_select_subtitle:   "Kamu bisa mengubah ini nanti di Pengaturan",
  lang_en:                "English",
  lang_id:                "Indonesia",
  lang_en_desc:           "Continue in English",
  lang_id_desc:           "Lanjutkan dalam Bahasa Indonesia",

  // Bottom Nav
  nav_home:               "Beranda",
  nav_for_you:            "Untukmu",
  nav_saved:              "Disimpan",
  nav_profile:            "Profil",

  // Discovery Screen
  home_headline:          "Jurnal ilmiah.",
  home_headline_accent:   "Semudah scroll TikTok.",
  home_subtitle:          "Ringkasan, konsep, dan diagram dari paper arXiv — disesuaikan dengan minatmu.",
  home_trending_personalised: "Direkomendasikan untukmu ✨",
  home_trending_default:  "Untukmu hari ini ✨",
  home_adjust_interests:  "Atur minat →",
  home_loading:           "Mengambil paper terbaru…",
  home_open_feed:         "Buka feed →",
  home_all_papers:        "Semua Paper",
  home_category_papers:   "Paper {category}",
  home_no_papers:         "Belum ada paper di kategori ini.",
  home_no_papers_hint:    "Coba kategori lain di atas.",
  home_fetching:          "Mengambil paper terbaru…",

  // Feed Page
  feed_tab_for_you:       "Untukmu",
  feed_tab_following:     "Mengikuti",
  feed_status_exploring:  "Menjelajah",
  feed_status_personalised: "Dipersonalisasi",

  // Feed Card
  card_core_research:     "Inti Penelitian",
  card_abstract:          "Abstrak",
  card_key_results:       "Hasil Utama",
  card_watch_story:       "✨ Tonton Story",
  card_watch_story_cached:"▶ Tonton Story",
  card_details:           "Detail",
  card_swipe_hint:        "Geser ke atas untuk paper berikutnya",
  card_no_summary:        "Ringkasan belum tersedia untuk paper ini.",

  // Bookmarks
  bookmarks_title:        "Paper Tersimpan",
  bookmarks_subtitle:     "Paper yang kamu simpan",
  bookmarks_empty_title:  "Belum ada paper yang disimpan.",
  bookmarks_empty_hint:   "Ketuk ikon bookmark pada paper untuk menyimpannya.",

  // Profile
  profile_username:       "Peneliti Muda",
  profile_handle:         "@arxivtok_user",
  profile_stat_viewed:    "Paper Dilihat",
  profile_stat_liked:     "Disukai",
  profile_stat_saved:     "Disimpan",
  profile_my_interests:   "Minat Saya",
  profile_fav_categories: "Kategori Favorit",

  // Detail Screen
  detail_tab_summary:     "Ringkasan",
  detail_tab_concepts:    "Konsep",
  detail_tab_diagram:     "Diagram",
  detail_tab_paper:       "Detail Paper",
  detail_core_diagram:    "Diagram Utama",
  detail_key_concepts:    "Konsep Kunci",
  detail_your_insight:    "Insightmu",
  detail_why_matches:     "Mengapa ini cocok? ▾",
  detail_paper_info:      "Informasi Paper",
  detail_arxiv_id:        "arXiv ID",
  detail_institution:     "Institusi",
  detail_published:       "Diterbitkan",
  detail_authors:         "Penulis",
  detail_categories:      "Kategori",
  detail_abstract:        "Abstrak",
  detail_open_arxiv:      "Buka di arXiv",
  detail_download_pdf:    "Unduh PDF",
  detail_no_data:         "Belum ada data tersedia.",

  // Story Player
  story_generating:       "Membuat story…",
  story_generating_desc:  "Menulis skrip dan membuat 5 gambar scene.",
  story_one_time_note:    "Ini hanya sekali — story disimpan untuk diputar ulang langsung.",
  story_error_title:      "Gagal membuat story",
  story_error_desc:       "Pastikan GROQ_API_KEY sudah diset di .env.local dan koneksi internet tersedia.",
  story_error_retry:      "Coba lagi",
  story_finished_title:   "Story selesai 🎉",
  story_finished_replay:  "Putar ulang",
  story_finished_close:   "Selesai",
  story_label:            "ArxivTok Story",
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semua terjemahan yang tersedia.
 *
 * Cara menggunakan langsung (tanpa hook):
 *   import { TRANSLATIONS } from "@/i18n/translations";
 *   const text = TRANSLATIONS["id"]["nav_home"]; // "Beranda"
 *
 * Tapi normalnya pakai hook: const { t } = useLanguage();
 */
export const TRANSLATIONS: Record<"en" | "id", Translations> = { en, id };
