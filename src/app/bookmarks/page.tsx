/**
 * bookmarks/page.tsx — Halaman Bookmark (Saved Papers)
 *
 * Halaman ini menampilkan daftar paper yang sudah di-bookmark oleh user.
 * Sebelumnya: bug — menampilkan SEMUA paper dari mock data.
 * Sekarang: hanya menampilkan paper yang ID-nya ada di bookmarkedPapers (dari Zustand store).
 * Kalau belum ada bookmark, tampilkan pesan kosong.
 */

"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { useFeedStore } from "@/store/feedStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { Bookmark } from "lucide-react";
import Link from "next/link";

export default function BookmarksPage() {
  // Ambil daftar ID paper yang di-bookmark DAN semua paper yang ada di store
  // Ini penting: paper real dari ArXiv ada di store, bukan di MOCK_FEED
  const bookmarkedPapers = useFeedStore((s) => s.bookmarkedPapers);
  const storeItems       = useFeedStore((s) => s.items);
  const { t }            = useLanguage();

  // Filter dari store items — ini mencakup paper real maupun mock
  // Paper yang di-bookmark tapi sudah tidak ada di store (scroll habis) tidak akan muncul
  // → solusi permanen: persist bookmarks ke localStorage (bisa ditambahkan nanti)
  const savedPapers = storeItems.filter((item) =>
    bookmarkedPapers.has(item.paper.id)
  );

  return (
    <main className="relative max-w-lg mx-auto h-dvh overflow-hidden bg-bg flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">{t("bookmarks_title")}</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {t("bookmarks_subtitle")}
        </p>
      </div>

      {/* ── Daftar Bookmark ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ scrollbarWidth: "none" }}
      >
        {savedPapers.length > 0 ? (
          // Kalau ada bookmark, tampilkan daftar paper
          savedPapers.map((item) => (
            <Link key={item.paper.id} href="/feed">
              <GlassPanel className="p-4 hover:border-neon-pink/30 transition-colors">
                <div className="flex gap-2 mb-1.5">
                  {item.paper.categories.map((c) => (
                    <NeonBadge
                      key={c}
                      variant={c === "AI" ? "pink" : "purple"}
                    >
                      {c}
                    </NeonBadge>
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-text-primary line-clamp-2 mb-1">
                  {item.paper.title}
                </h3>
                <p className="text-xs text-text-muted font-mono">
                  {item.paper.arxiv_id}
                </p>
              </GlassPanel>
            </Link>
          ))
        ) : (
          // Kalau belum ada bookmark, tampilkan pesan kosong
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Bookmark size={48} className="text-text-muted mb-3" />
            <p className="text-text-secondary text-sm">
              {t("bookmarks_empty_title")}
            </p>
            <p className="text-text-muted text-xs mt-1">
              {t("bookmarks_empty_hint")}
            </p>
          </div>
        )}
        <div className="h-20" />
      </div>

      <BottomNav />
    </main>
  );
}
