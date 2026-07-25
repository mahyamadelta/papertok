"use client";

/**
 * LanguageSelector.tsx — Layar Pilih Bahasa (Splash Screen)
 * ===========================================================
 *
 * Komponen ini ditampilkan SATU KALI saja: saat user pertama kali
 * membuka aplikasi dan belum pernah memilih bahasa.
 *
 * Setelah user memilih, pilihan disimpan ke localStorage dan
 * layar ini tidak akan muncul lagi (sampai localStorage dihapus).
 *
 * TAMPILAN:
 * - Full-screen overlay gelap dengan konten di tengah
 * - Logo ArxivTok
 * - Judul "Choose Your Language"
 * - Dua tombol: English | Indonesia
 * - Tombol yang dipilih akan highlighted (border neon pink)
 * - Tombol konfirmasi di bawah
 *
 * CARA KERJA:
 * 1. Komponen ini hanya muncul kalau `hasChosen === false` (dari LanguageContext)
 * 2. User klik salah satu bahasa → setLanguage() dipanggil (update preview)
 * 3. User klik "Continue" → confirmLanguage() dipanggil → splash hilang
 *
 * UNTUK DEVELOPER BARU:
 * - Komponen ini sudah di-wire di layout.tsx — tidak perlu tambahkan manual
 * - Untuk menambah bahasa baru: tambahkan tombol baru di LANGUAGE_OPTIONS
 * - Teks dalam komponen ini TIDAK menggunakan t() karena kita belum tahu
 *   bahasa pilihan user — teks ditampilkan dalam kedua bahasa sekaligus
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Konfigurasi opsi bahasa
// Untuk menambah bahasa baru: tambahkan objek baru di sini
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageOption {
  code:    Language;   // kode bahasa (harus sama dengan key di TRANSLATIONS)
  flag:    string;     // emoji bendera
  name:    string;     // nama bahasa dalam bahasa itu sendiri
  tagline: string;     // deskripsi singkat
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code:    "en",
    flag:    "🇬🇧",
    name:    "English",
    tagline: "Continue in English",
  },
  {
    code:    "id",
    flag:    "🇮🇩",
    name:    "Indonesia",
    tagline: "Lanjutkan dalam Bahasa Indonesia",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Komponen
// ─────────────────────────────────────────────────────────────────────────────

export function LanguageSelector() {
  const { language, setLanguage, hasChosen, confirmLanguage } = useLanguage();

  // Bahasa yang sedang di-hover/diklik untuk preview sebelum konfirmasi
  const [selected, setSelected] = useState<Language>(language);

  // Kalau user sudah pernah pilih bahasa, komponen ini tidak dirender sama sekali
  if (hasChosen) return null;

  const handleSelect = (code: Language) => {
    setSelected(code);
    setLanguage(code); // update preview (agar t() sudah berubah di background)
  };

  const handleConfirm = () => {
    confirmLanguage(); // simpan ke localStorage + hilangkan splash
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        // Full-screen overlay di atas semua konten lain (z-50)
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg px-6"
      >
        {/* ── Logo ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          {/* Logo SVG sama dengan yang ada di DiscoveryScreen */}
          <div className="flex items-center gap-2 mb-3">
            <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
              <path d="M4 22L14 4l10 18H4z" fill="url(#lg-splash)" />
              <circle cx="20" cy="7" r="3" fill="#a855f7" />
              <defs>
                <linearGradient id="lg-splash" x1="4" y1="4" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ff2d78" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-2xl font-black tracking-tight gradient-text">ArxivTok</span>
          </div>
          <p className="text-xs text-text-muted font-mono uppercase tracking-widest">
            Scroll. Discover. Understand.
          </p>
        </motion.div>

        {/* ── Judul splash ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-center mb-8"
        >
          {/*
           * Teks judul ditampilkan dalam DUA bahasa sekaligus karena
           * kita belum tahu bahasa pilihan user.
           */}
          <h1 className="text-xl font-black text-text-primary">
            Choose Your Language
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Pilih Bahasa / Choose Language
          </p>
          <p className="text-xs text-text-muted mt-1">
            You can change this later • Bisa diubah nanti
          </p>
        </motion.div>

        {/* ── Tombol pilih bahasa ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-xs space-y-3 mb-8"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selected === option.code;
            return (
              <button
                key={option.code}
                onClick={() => handleSelect(option.code)}
                className={cn(
                  // Base style: kartu bahasa dengan border dan background
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl",
                  "border-2 transition-all duration-200",
                  "text-left",
                  // Style saat dipilih: border neon pink + background sedikit berwarna
                  isSelected
                    ? "border-neon-pink bg-neon-pink/10"
                    : "border-border bg-surface hover:border-border/80"
                )}
                aria-pressed={isSelected}
              >
                {/* Flag emoji */}
                <span className="text-3xl flex-shrink-0" role="img" aria-label={option.name}>
                  {option.flag}
                </span>

                {/* Nama dan deskripsi bahasa */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-base font-bold leading-tight",
                    isSelected ? "text-neon-pink" : "text-text-primary"
                  )}>
                    {option.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-snug">
                    {option.tagline}
                  </p>
                </div>

                {/* Checkmark — muncul saat bahasa ini dipilih */}
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                  isSelected
                    ? "border-neon-pink bg-neon-pink"
                    : "border-border"
                )}>
                  {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* ── Tombol konfirmasi ── */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          onClick={handleConfirm}
          className={cn(
            "w-full max-w-xs py-3.5 rounded-2xl",
            "bg-gradient-to-r from-neon-pink to-neon-purple",
            "text-white font-bold text-base",
            "transition-transform active:scale-95",
            "shadow-lg"
          )}
        >
          {/* Teks dalam dua bahasa: "Continue / Lanjutkan" */}
          {selected === "id" ? "Lanjutkan →" : "Continue →"}
        </motion.button>

        {/* ── Footer kecil ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-8 text-xs text-text-muted text-center"
        >
          ArxivTok · Open Science for Everyone
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
