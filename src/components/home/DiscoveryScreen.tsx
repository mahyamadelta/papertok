"use client";

/**
 * DiscoveryScreen.tsx — Halaman Home (route "/")
 *
 * Menampilkan:
 * - Header dengan logo, tombol search, notif
 * - Category chips untuk filter topik
 * - Featured card — paper terbaru dari feed real (atau mock kalau belum siap)
 * - Daftar paper yang bisa di-scroll
 *
 * Data bersumber dari feedStore (sama dengan VerticalFeed di "/feed").
 * Fetch dilakukan otomatis saat halaman pertama kali dibuka.
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Bell, TrendingUp, RefreshCw } from "lucide-react";
import { CategoryChips } from "@/components/ui/CategoryChips";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { useFeedStore } from "@/store/feedStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { MOCK_FEED } from "@/lib/mockData";

// Map category display-name → emoji (untuk icon di list paper)
const CATEGORY_ICON: Record<string, string> = {
  AI: "🤖", CS: "💻", Physics: "⚛️", Astro: "🔭",
  Biology: "🧬", Math: "📐", Econ: "📈", Medicine: "🏥", default: "📄",
};

function paperIcon(categories: string[]): string {
  for (const c of categories) {
    if (CATEGORY_ICON[c]) return CATEGORY_ICON[c];
  }
  return CATEGORY_ICON.default;
}

export function DiscoveryScreen() {
  const {
    items,
    activeCategory,
    setActiveCategory,
    likedPapers,
    isLoading,
    fetchFeed,
  } = useFeedStore();
  const { t } = useLanguage();

  // Fetch paper real saat halaman pertama dibuka
  // Kalau store sudah punya data (user balik dari /feed), pakai yang ada
  useEffect(() => {
    if (items.length === 0) {
      fetchFeed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pakai data dari store kalau sudah ada, fallback ke mock kalau masih loading
  const feedItems = items.length > 0 ? items : MOCK_FEED;

  // Paper featured = paper pertama di feed (skor tertinggi)
  const featured = feedItems[0];

  // Daftar paper untuk list bawah, filter berdasarkan kategori aktif
  const allPapers = activeCategory === "all"
    ? feedItems
    : feedItems.filter((item) =>
        item.paper.categories.some(
          (c) => c.toLowerCase() === activeCategory.toLowerCase()
        )
      );

  return (
    <div
      className="h-full flex flex-col overflow-y-auto bg-bg"
      style={{ scrollbarWidth: "none" }}
    >
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 22L14 4l10 18H4z" fill="url(#lg)" />
              <circle cx="20" cy="7" r="3" fill="#a855f7" />
              <defs>
                <linearGradient id="lg" x1="4" y1="4" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ff2d78" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-lg font-black tracking-tight gradient-text">ArxivTok</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol refresh — fetch ulang paper terbaru */}
            <button
              onClick={() => fetchFeed(activeCategory)}
              disabled={isLoading}
              className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:border-neon-pink/50 transition-colors disabled:opacity-50"
              aria-label="Refresh feed"
            >
              <RefreshCw
                size={15}
                className={isLoading ? "animate-spin text-neon-pink" : ""}
              />
            </button>
            <button className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:border-neon-pink/50 transition-colors">
              <Search size={16} />
            </button>
            <button className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:border-neon-pink/50 transition-colors">
              <Bell size={16} />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <CategoryChips active={activeCategory} onChange={setActiveCategory} />
      </div>

      {/* ── Hero Copy ── */}
      <div className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-black leading-tight text-text-primary">
            {t("home_headline")}{" "}
            <span className="gradient-text">{t("home_headline_accent")}</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {t("home_subtitle")}
          </p>
        </motion.div>
      </div>

      {/* ── Featured card ── */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-1.5">
            <TrendingUp size={15} className="text-neon-pink" />
            {likedPapers.size > 0 ? t("home_trending_personalised") : t("home_trending_default")}
          </h2>
          <Link href="/profile">
            <button className="text-xs text-neon-pink font-medium hover:underline">
              {t("home_adjust_interests")}
            </button>
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 mb-4 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-neon-pink border-t-transparent animate-spin" />
            <p className="text-xs text-text-muted">{t("home_fetching")}</p>
          </div>
        ) : (
          <Link href="/feed">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-violet-950 to-fuchsia-950 p-4 mb-4 relative hover:border-neon-pink/40 transition-colors"
            >
              <div className="mb-3">
                <NeonBadge variant="purple">
                  {featured?.paper.journal_source ?? "arXiv"}
                </NeonBadge>
              </div>

              {/* Tampilkan fun fact kalau ada, fallback ke abstrak pendek */}
              <p className="text-sm text-white leading-relaxed mb-4 font-medium line-clamp-3">
                {featured?.paper.ai_processed?.fun_fact
                  ?? featured?.paper.abstract?.slice(0, 160).concat("…")
                  ?? "Discover the latest research from arXiv."}
              </p>

              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-neon-pink/40 to-neon-purple/40 border border-white/10 mb-3 flex items-center justify-center">
                <span className="text-3xl">{paperIcon(featured?.paper.categories ?? [])}</span>
              </div>

              <p className="text-xs font-mono text-text-muted mb-1">
                {featured?.paper.arxiv_id}
              </p>
              <p className="text-sm font-semibold text-white/80 line-clamp-1 mb-2">
                {featured?.paper.title}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {(featured?.paper.categories ?? []).map((c) => (
                  <NeonBadge key={c} variant={c === "AI" ? "pink" : "purple"}>{c}</NeonBadge>
                ))}
              </div>
            </motion.div>
          </Link>
        )}

        {/* ── Paper list header ── */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-text-primary">
            {activeCategory === "all"
              ? t("home_all_papers")
              : t("home_category_papers").replace("{category}", activeCategory)}
            <span className="ml-2 text-xs text-text-muted font-normal">
              ({allPapers.length})
            </span>
          </h3>
          <Link href="/feed">
            <span className="text-xs text-neon-pink font-medium hover:underline">
              {t("home_open_feed")}
            </span>
          </Link>
        </div>

        {/* ── Scrollable paper list ── */}
        {allPapers.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center py-12 text-text-muted gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-sm">{t("home_no_papers")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allPapers.map((item, i) => (
              <Link key={item.paper.id} href="/feed">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.03, duration: 0.3 }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 hover:border-neon-pink/30 transition-colors"
                >
                  {/* Category icon */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-neon-pink/20 to-neon-purple/20 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-lg">{paperIcon(item.paper.categories)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary leading-tight line-clamp-2 mb-1">
                      {item.paper.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-mono text-text-muted">
                        {item.paper.arxiv_id}
                      </p>
                      <div className="flex gap-1">
                        {item.paper.categories.slice(0, 2).map((c) => (
                          <NeonBadge
                            key={c}
                            variant={c === "AI" ? "pink" : "purple"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {c}
                          </NeonBadge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom padding for nav */}
      <div className="h-24" />
    </div>
  );
}
