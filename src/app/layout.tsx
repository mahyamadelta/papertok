/**
 * app/layout.tsx — Layout Utama (Root Layout)
 *
 * File ini membungkus SEMUA halaman di app. Setiap halaman (home, feed, bookmarks,
 * profile) akan dirender di dalam {children} di sini.
 *
 * Yang dilakukan file ini:
 * - Set metadata (judul tab browser, deskripsi, favicon)
 * - Set viewport (mobile-first, disable zoom)
 * - Set warna background gelap & font default
 * - Bungkus seluruh app dengan LanguageProvider (konteks bahasa global)
 * - Tampilkan LanguageSelector (splash pilih bahasa) saat pertama kali buka app
 *
 * UNTUK DEVELOPER BARU:
 * - LanguageProvider harus ada di sini (root) supaya SEMUA halaman bisa akses t()
 * - LanguageSelector otomatis tersembunyi setelah user pilih bahasa
 * - Jangan hapus LanguageProvider dari sini
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";

// ── Provider bahasa (konteks global untuk i18n) ──────────────────────────────
import { LanguageProvider } from "@/i18n/LanguageContext";

// ── Splash screen pilih bahasa (hanya muncul saat pertama buka) ─────────────
import { LanguageSelector } from "@/components/ui/LanguageSelector";

// ── Metadata untuk SEO & browser tab ────────────────────────────────────────
export const metadata: Metadata = {
  title: "ArxivTok — Scroll. Discover. Understand.",
  description:
    "Scientific papers, as easy as scrolling TikTok. Summaries, concepts, and diagrams from arXiv — personalised for your interests.",
  icons: { icon: "/favicon.ico" },
};

// ── Konfigurasi viewport (tampilan mobile) ──────────────────────────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,      // disable pinch-zoom (kayak TikTok)
  themeColor: "#0a0a0f", // warna background gelap
};

// ── Komponen RootLayout ─────────────────────────────────────────────────────
// children = konten halaman yang akan dirender di dalam layout ini.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      {/* bg-bg = background gelap, text-text-primary = warna teks utama */}
      <body className="bg-bg text-text-primary font-sans antialiased">
        {/*
         * LanguageProvider membungkus seluruh app.
         * Semua komponen di dalam sini bisa menggunakan useLanguage()
         * untuk mendapatkan fungsi t() dan state bahasa aktif.
         */}
        <LanguageProvider>
          {/*
           * LanguageSelector = full-screen splash pilih bahasa.
           * Hanya muncul kalau user belum pernah pilih bahasa (hasChosen === false).
           * Setelah user pilih, komponen ini otomatis hilang dan tidak muncul lagi.
           */}
          <LanguageSelector />

          {/* Konten halaman utama */}
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
