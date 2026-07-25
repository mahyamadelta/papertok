/**
 * app/feed/page.tsx — Halaman Feed (TikTok-style) — route "/feed"
 *
 * Halaman utama berisi feed vertikal ala TikTok. User scroll ke atas/bawah
 * untuk berpindah paper (snap scrolling).
 *
 * Yang ditampilkan:
 * - Header dengan tab "For You" / "Following" + badge status rekomendasi
 * - VerticalFeed (container scroll-snap berisi FeedCard per paper)
 * - DetailScreen overlay (muncul saat user tap "View Paper Details")
 * - BottomNav
 *
 * Badge status menunjukkan:
 * - "Exploring" (biru)  → user baru, feed diacak
 * - "Personalised" (pink) → feed sudah disesuaikan dengan minat user
 */

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Shuffle } from "lucide-react";
import { VerticalFeed } from "@/components/feed/VerticalFeed";
import { DetailScreen } from "@/components/detail/DetailScreen";
import { BottomNav } from "@/components/layout/BottomNav";
import { useFeedStore } from "@/store/feedStore";
import { useLanguage } from "@/i18n/LanguageContext";
import type { FeedItem } from "@/types";

export default function FeedPage() {
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);
  const { likedPapers, bookmarkedPapers, isNewUser } = useFeedStore();
  const { t } = useLanguage();

  const hasInteractions = likedPapers.size + bookmarkedPapers.size > 0;

  return (
    <main className="relative max-w-lg mx-auto h-dvh overflow-hidden bg-bg">
      {/* ── Feed tab header ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-6 px-4 pt-4 pb-2 bg-bg/80 backdrop-blur-sm border-b border-border">
        <button className="text-sm font-bold text-neon-pink border-b-2 border-neon-pink pb-1">
          {t("feed_tab_for_you")}
        </button>
        <button className="text-sm font-medium text-text-secondary pb-1">
          {t("feed_tab_following")}
        </button>

        {/* Live recommendation status badge */}
        <div className="ml-auto">
          <AnimatePresence mode="wait">
            {isNewUser ? (
              <motion.div
                key="new"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon-blue/15 border border-neon-blue/30 text-neon-blue text-[11px] font-semibold"
              >
                <Shuffle size={11} />
                {t("feed_status_exploring")}
              </motion.div>
            ) : hasInteractions ? (
              <motion.div
                key="rec"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon-pink/15 border border-neon-pink/30 text-neon-pink text-[11px] font-semibold"
              >
                <Sparkles size={11} />
                {t("feed_status_personalised")}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-text-muted"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pt-12 h-full">
        <VerticalFeed onOpenDetail={setDetailItem} />
      </div>

      <AnimatePresence>
        {detailItem && (
          <DetailScreen item={detailItem} onClose={() => setDetailItem(null)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}
