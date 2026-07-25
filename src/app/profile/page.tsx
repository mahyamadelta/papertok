/**
 * app/profile/page.tsx — Halaman Profil User
 *
 * Menampilkan:
 * - Avatar & username user
 * - Statistik (papers viewed, liked, saved)
 * - Chip kategori minat user
 * - Daftar kategori favorit
 *
 * Semua angka statistik diambil langsung dari Zustand store (data real):
 * - "Papers Viewed" = jumlah total paper yang ada di feed store (items.length)
 * - "Liked"         = jumlah paper yang di-like (likedPapers.size)
 * - "Saved"         = jumlah paper yang di-bookmark (bookmarkedPapers.size)
 */

"use client";

import { BottomNav } from "@/components/layout/BottomNav";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { CategoryChips } from "@/components/ui/CategoryChips";
import { useFeedStore } from "@/store/feedStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { CATEGORIES } from "@/lib/utils";

export default function ProfilePage() {
  // Ambil semua state yang dibutuhkan dari global store
  const {
    items,              // semua paper yang sudah di-load ke feed
    likedPapers,        // Set berisi ID paper yang di-like user
    bookmarkedPapers,   // Set berisi ID paper yang di-bookmark user
    activeCategory,
    setActiveCategory,
  } = useFeedStore();
  const { t } = useLanguage();

  return (
    <main className="relative max-w-lg mx-auto h-dvh overflow-hidden bg-bg flex flex-col">
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* ── Avatar & nama ── */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-neon flex items-center justify-center text-3xl mb-3 glow-pink">
            🧑‍🔬
          </div>
          <h2 className="text-lg font-bold text-text-primary">{t("profile_username")}</h2>
          <p className="text-sm text-text-secondary">{t("profile_handle")}</p>

          {/* ── Statistik — semua dari store, tidak ada hardcode ── */}
          <div className="flex gap-8 mt-4">
            {[
              { label: t("profile_stat_viewed"), value: String(items.length) },
              { label: t("profile_stat_liked"),  value: String(likedPapers.size) },
              { label: t("profile_stat_saved"),  value: String(bookmarkedPapers.size) },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-xl font-black text-text-primary">{s.value}</span>
                <span className="text-xs text-text-secondary">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Minat: chip kategori ── */}
        <div className="px-4 pb-6">
          <h3 className="text-sm font-bold text-text-primary mb-3">{t("profile_my_interests")}</h3>
          <CategoryChips active={activeCategory} onChange={setActiveCategory} />
        </div>

        {/* ── Kategori favorit ── */}
        <div className="px-4 pb-6">
          <GlassPanel className="p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">{t("profile_fav_categories")}</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.slice(1, 5).map((c) => (
                <NeonBadge key={c.id} variant={c.id === "ai" ? "pink" : "purple"}>
                  {c.emoji} {c.label}
                </NeonBadge>
              ))}
            </div>
          </GlassPanel>
        </div>

        <div className="h-20" />
      </div>
      <BottomNav />
    </main>
  );
}
