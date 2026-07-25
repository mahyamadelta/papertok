/**
 * feedStore.ts — State Global ArxivTok (Zustand)
 *
 * File ini adalah "otak" dari frontend. Menggunakan Zustand untuk menyimpan data global:
 * - Daftar paper di feed (items)
 * - Index paper yang sedang dilihat user (currentIndex)
 * - Daftar paper yang di-like dan di-bookmark
 * - Status loading, kategori aktif, dll
 *
 * Semua komponen bisa baca & ubah state dari sini.
 * Misalnya: ketika user tap ❤️, ActionSidebar memanggil toggleLike() di store ini.
 */

import { create } from "zustand";
import type { FeedStore, FeedItem } from "@/types";
import { logInteraction } from "@/lib/api";
import { MOCK_FEED } from "@/lib/mockData";
// Import the central PaperService — this is now our source of paper data.
// PaperService tries ArXiv first, then OpenAlex, then falls back to mock data.
// We no longer call the FastAPI backend for feed data.
import { paperService } from "@/services/paper";

// ── Identitas User ───────────────────────────────────────────────────────────
// Setiap user dapat ID unik yang disimpan di localStorage browser.
// ID ini dikirim ke backend untuk personalisasi feed.

function getUserId(): string {
  if (typeof window === "undefined") return "anon";
  let uid = localStorage.getItem("arxivtok_user_id");
  if (!uid) {
    uid = `u_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("arxivtok_user_id", uid);
  }
  return uid;
}

/** Returns true and marks as returning on first call; false on all subsequent calls. */
function checkAndMarkNewUser(): boolean {
  if (typeof window === "undefined") return false;
  const seen = localStorage.getItem("arxivtok_seen");
  if (!seen) {
    localStorage.setItem("arxivtok_seen", "1");
    return true;
  }
  return false;
}

// ── Fisher-Yates shuffle ────────────────────────────────────────────────────
// Algoritma pengacakan array (Fisher-Yates). Dipakai untuk user baru:
// urutan feed diacak supaya semua topik dapat kesempatan tampil.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Bobot interaksi (harus sama dengan backend recommender.py) ──────────────
// Nilai ini menentukan seberapa kuat pengaruh tiap aksi terhadap rekomendasi.
const WEIGHTS: Record<string, number> = {
  like: 3.0,      // like = sinyal terkuat
  bookmark: 2.5,  // bookmark = sinyal kuat
  share: 2.0,     // share = sinyal sedang
  view: 0.3,      // view = sinyal lemah
};

// ── Re-scorer sisi client ───────────────────────────────────────────────────
// Fungsi ini menghitung ulang urutan feed BERDASARKAN aksi user lokal (like/bookmark).
// Cara kerja:
// 1. Hitung "vektor preferensi" — kumpulan tag yang disukai user + bobotnya
// 2. Untuk setiap paper, hitung skor seberapa cocok dengan preferensi user
// 3. Paper yang sudah di-like turun ke bawah (sudah dikonsumsi)
// 4. Urutkan ulang dari skor tertinggi
// Kalau user belum ada interaksi (baru), urutan asli dipertahankan.

function reScoreItems(
  items: FeedItem[],
  liked: Set<string>,
  bookmarked: Set<string>
): FeedItem[] {
  // Bangun vektor preferensi: kategori/tag → total bobot
  const pref: Record<string, number> = {};

  for (const item of items) {
    const pid = item.paper.id;
    let w = 0;
    if (liked.has(pid))      w += WEIGHTS.like;      // tambah bobot like
    if (bookmarked.has(pid)) w += WEIGHTS.bookmark;  // tambah bobot bookmark
    if (w === 0) continue;  // paper ini tidak diinteraksi, skip

    // Kumpulkan semua tag dari kategori + tag AI
    const tags = [
      ...item.paper.categories,
      ...(item.paper.ai_processed?.tags ?? []),
    ];
    for (const tag of tags) {
      pref[tag] = (pref[tag] ?? 0) + w;
    }
  }

  // Belum ada sinyal preferensi → pertahankan urutan asli
  if (Object.keys(pref).length === 0) return items;

  // Hitung ulang skor untuk setiap paper
  const scored = items.map((item) => {
    const tags = [
      ...item.paper.categories,
      ...(item.paper.ai_processed?.tags ?? []),
    ];
    const affinity =
      tags.reduce((sum, t) => sum + (pref[t] ?? 0), 0) /
      Math.max(tags.length, 1);

    // Already-liked papers drop to the bottom (already consumed)
    const likedPenalty = liked.has(item.paper.id) ? -10 : 0;

    const newScore =
      Math.min(1, affinity / 5) * 0.7 +
      item.recommendation_score * 0.3 +
      likedPenalty;

    return {
      ...item,
      recommendation_score: Math.max(0, newScore),
      reason_tags: tags.filter((t) => (pref[t] ?? 0) > 0).slice(0, 3),
    };
  });

  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);
  return scored;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFeedStore = create<FeedStore>((set, get) => ({
  items: [],
  currentIndex: 0,
  isLoading: false,
  activeCategory: "all",
  isNewUser: false,
  likedPapers: new Set(),
  bookmarkedPapers: new Set(),

  setCurrentIndex: (index) => {
    set({ currentIndex: index });
    const item = get().items[index];
    if (item) {
      logInteraction({
        user_id: getUserId(),
        paper_id: item.paper.id,
        interaction_type: "view",
      }).catch(() => {});
    }
  },

  setActiveCategory: (cat) => {
    set({ activeCategory: cat, items: [], currentIndex: 0 });
    get().fetchFeed(cat);
  },

  toggleLike: (paperId) => {
    const liked = new Set(get().likedPapers);
    const isLiking = !liked.has(paperId);
    isLiking ? liked.add(paperId) : liked.delete(paperId);
    set({ likedPapers: liked });

    // Immediately re-score the feed so liked topics bubble up.
    // Once the user has made their first like, they're no longer "new".
    const rescored = reScoreItems(get().items, liked, get().bookmarkedPapers);
    set({ items: rescored, isNewUser: false });

    logInteraction({
      user_id: getUserId(),
      paper_id: paperId,
      interaction_type: "like",
    }).catch(() => {});
  },

  toggleBookmark: (paperId) => {
    const bm = new Set(get().bookmarkedPapers);
    bm.has(paperId) ? bm.delete(paperId) : bm.add(paperId);
    set({ bookmarkedPapers: bm });

    const rescored = reScoreItems(get().items, get().likedPapers, bm);
    set({ items: rescored });

    logInteraction({
      user_id: getUserId(),
      paper_id: paperId,
      interaction_type: "bookmark",
    }).catch(() => {});
  },

  reScore: () => {
    const rescored = reScoreItems(
      get().items,
      get().likedPapers,
      get().bookmarkedPapers
    );
    set({ items: rescored });
  },

  updatePaperImage: (paperId: string, imageUrl: string) => {
    set({
      items: get().items.map((item) =>
        item.paper.id === paperId
          ? { ...item, paper: { ...item.paper, image_url: imageUrl } }
          : item
      ),
    });
  },

  fetchFeed: async (categoryId) => {
    set({ isLoading: true });

    // Detect first-ever visit before any async work
    const isNew = checkAndMarkNewUser();

    // Helper: apply ordering rules to a raw paper list.
    //   - New user     → random order (every topic gets a fair chance)
    //   - Returning    → scored by past likes/bookmarks
    const applyOrder = (raw: FeedItem[]): FeedItem[] => {
      if (isNew) return shuffle(raw);
      return reScoreItems(raw, get().likedPapers, get().bookmarkedPapers);
    };

    // Baca bahasa dari localStorage — disimpan oleh LanguageContext
    // Kalau belum ada (pertama buka), default "en"
    const lang = (
      typeof window !== "undefined"
        ? (localStorage.getItem("arxivtok_language") as "en" | "id" | null)
        : null
    ) ?? "en";

    try {
      // ── Step 1: Try real APIs via PaperService ─────────────────────────
      // PaperService will:
      //   1. Try ArXiv (real papers from https://export.arxiv.org)
      //   2. If ArXiv fails → try OpenAlex
      //   3. If both fail  → return MOCK_FEED automatically
      //
      // This means this try block will ALWAYS succeed — paperService
      // never throws. It always returns at least the mock data.
      const category = categoryId ?? get().activeCategory;
      const feedItems = await paperService.fetchFeed(category, 10, 0, lang);
      set({ items: applyOrder(feedItems), isLoading: false, isNewUser: isNew });
    } catch {
      // This catch block is a last-resort safety net.
      // In normal operation, paperService.fetchFeed() handles all errors
      // internally and returns mock data rather than throwing.
      // We only reach here if something truly unexpected happens
      // (e.g. JavaScript runtime error, out of memory, etc.)
      console.error("[feedStore] Unexpected error in fetchFeed — using mock data");
      set({ items: applyOrder(MOCK_FEED), isLoading: false, isNewUser: isNew });
    }
  },
}));
