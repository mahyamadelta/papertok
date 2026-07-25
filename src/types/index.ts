/**
 * types/index.ts — Definisi tipe data (TypeScript interfaces) untuk ArxivTok
 *
 * File ini mendefinisikan "bentuk" semua data yang dipakai di seluruh app.
 * Pikirkan ini seperti cetakan kue — semua data harus mengikuti bentuk ini.
 * Kalau data tidak sesuai, TypeScript akan kasih warning saat coding.
 *
 * Tipe utama:
 * - ArxivPaper       → data lengkap satu paper jurnal
 * - AiProcessedContent → hasil AI (ringkasan, fun fact, diagram, dll)
 * - FeedItem         → paper + skor rekomendasi (untuk urutan feed)
 * - FeedStore        → bentuk state global app (Zustand)
 */

// ── ArxivPaper ──────────────────────────────────────────────────────────────
// Tipe data lengkap untuk satu paper jurnal ilmiah.
// Sebagian besar field wajib, beberapa opsional (tanda ?).
export interface ArxivPaper {
  id: string;
  arxiv_id: string;
  title: string;
  authors: string[];
  institution: string;
  abstract: string;
  categories: string[];
  published_at: string; // ISO date string
  url: string;
  pdf_url: string;
  /** Source journal / preprint server e.g. "arXiv", "PLOS ONE", "Europe PMC" */
  journal_source?: string;
  /** Full journal display name */
  journal_name?: string;
  /** AI-generated hero image (HF data-URI or null when unavailable) */
  image_url?: string | null;
  ai_processed: AiProcessedContent | null;
  /**
   * AI-generated video story — di-generate on-demand saat user tap "Watch Story".
   * null = belum pernah di-generate.
   * Disimpan di sini supaya tidak perlu generate ulang kalau user replay.
   */
  video_story?: VideoStory | null;
}

export interface AiProcessedContent {
  inti_penelitian: string;  // core research summary
  hasil_utama: string[];    // bullet list of main results
  fun_fact: string;
  konsep_kunci: KonsepKunci[];
  diagram: DiagramStep[];
  ringkasan_panjang: string;
  insight_personal: string;
  tags: string[];
}

// ── VideoStory ───────────────────────────────────────────────────────────────
// Hasil AI generate story — 5 scene narasi untuk Story Player.
// Di-generate on-demand saat user tap "Watch Story".

/**
 * Satu scene dalam story video (ada 5 scene per paper).
 * Setiap scene punya teks narasi yang dibacakan + deskripsi visual untuk gambar.
 */
export interface StoryScene {
  /** Judul singkat scene, ditampilkan sebagai chapter label */
  title: string;
  /**
   * Teks narasi lengkap — inilah yang dibacakan oleh Web Speech API.
   * Ditulis dengan bahasa natural, cocok diucapkan, bukan kalimat akademis.
   */
  narration: string;
  /**
   * Deskripsi visual untuk generate gambar SDXL.
   * Contoh: "glowing neural network diagram on dark background"
   */
  visual_prompt: string;
  /**
   * Durasi perkiraan scene dalam detik (dihitung dari panjang narasi).
   * Dipakai untuk sinkronisasi progress bar.
   */
  duration_seconds: number;
}

/**
 * Satu story lengkap untuk satu paper.
 * Berisi 5 scene berurutan + judul story.
 */
export interface VideoStory {
  /** Judul story yang ditampilkan di header player */
  story_title: string;
  /** 5 scene berurutan: hook → masalah → metode → hasil → takeaway */
  scenes: StoryScene[];
  /** Gambar yang sudah di-generate untuk setiap scene (indexed sama dengan scenes[]) */
  scene_images: (string | null)[];
}

export interface KonsepKunci {
  term: string;
  definition: string;
}

export interface DiagramStep {
  label: string;
  sublabel: string;
  description: string;
  position: "input" | "process" | "output";
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
  arxiv_prefix: string;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  paper_id: string;
  interaction_type: "like" | "bookmark" | "share" | "view" | "skip";
  dwell_time_ms?: number;
  created_at: string;
}

export interface FeedItem {
  paper: ArxivPaper;
  recommendation_score: number;
  reason_tags: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  interest_categories: string[];
  interaction_count: number;
}

// UI state types
export type TabId = "ringkasan" | "konsep" | "diagram" | "detail";

export interface FeedStore {
  items: FeedItem[];
  currentIndex: number;
  isLoading: boolean;
  activeCategory: string;
  /** True only on a user's very first session; triggers random feed order. */
  isNewUser: boolean;
  setCurrentIndex: (index: number) => void;
  setActiveCategory: (cat: string) => void;
  likedPapers: Set<string>;
  bookmarkedPapers: Set<string>;
  toggleLike: (paperId: string) => void;
  toggleBookmark: (paperId: string) => void;
  fetchFeed: (categoryId?: string) => Promise<void>;
  /** Re-scores the current in-memory feed using local interaction history. */
  reScore: () => void;
  /** Update a single paper's hero image (called by the background image preloader). */
  updatePaperImage: (paperId: string, imageUrl: string) => void;
}
