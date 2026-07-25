"use client";

/**
 * BottomNav.tsx — Navigasi bawah (Bottom Navigation)
 *
 * Bar navigasi yang selalu terlihat di bagian bawah layar.
 * Berisi 5 item: Home, For You, (plus button), Saved, Profile.
 *
 * Label setiap item diambil dari useLanguage() sehingga otomatis
 * berubah mengikuti bahasa yang dipilih user (EN / ID).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

// ─────────────────────────────────────────────────────────────────────────────
// Definisi item navigasi
// labelKey mengacu ke key di translations.ts — bukan teks hardcode
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{
  href:       string;
  icon:       React.ElementType;
  labelKey:   TranslationKey | "";  // "" = tidak ada label (untuk primary button)
  isPrimary?: boolean;
}> = [
  { href: "/",          icon: Home,     labelKey: "nav_home" },
  { href: "/feed",      icon: Compass,  labelKey: "nav_for_you" },
  { href: "/feed",      icon: Plus,     labelKey: "",            isPrimary: true },
  { href: "/bookmarks", icon: Bookmark, labelKey: "nav_saved" },
  { href: "/profile",   icon: User,     labelKey: "nav_profile" },
];

export function BottomNav() {
  const pathname    = usePathname();
  const { t }       = useLanguage();   // fungsi terjemahan

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg/95 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          // Terjemahkan label — kalau labelKey kosong (primary), hasilnya ""
          const label    = item.labelKey ? t(item.labelKey) : "";
          const isActive = pathname === item.href && !item.isPrimary;

          return (
            <Link
              key={label || "add"}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200",
                item.isPrimary && "relative -top-3"
              )}
            >
              {item.isPrimary ? (
                // Tombol plus di tengah — tampilan berbeda (bulat, gradient)
                <div className="w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center glow-pink shadow-lg">
                  <Plus size={24} className="text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <item.icon
                    size={22}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-neon-pink"
                        : "text-text-secondary group-hover:text-text-primary"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {/* Label teks di bawah ikon — tersembunyi kalau label kosong */}
                  {label && (
                    <span
                      className={cn(
                        "text-[10px] font-medium transition-colors",
                        isActive ? "text-neon-pink" : "text-text-muted"
                      )}
                    >
                      {label}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
