"use client";

/**
 * LanguageContext.tsx — Konteks Bahasa Global
 * =============================================
 *
 * File ini menyediakan state bahasa ke SEMUA komponen di aplikasi.
 * Komponen manapun bisa tahu bahasa aktif dan mengubahnya lewat hook useLanguage().
 *
 * CARA KERJA:
 * 1. Saat pertama buka app, cek localStorage apakah user sudah pilih bahasa sebelumnya.
 * 2. Kalau belum ada → tampilkan LanguageSelector (layar pilih bahasa).
 * 3. Kalau sudah ada → langsung pakai bahasa yang tersimpan.
 * 4. User bisa ganti bahasa kapan saja lewat tombol di UI.
 * 5. Pilihan bahasa disimpan ke localStorage supaya tetap ada setelah refresh.
 *
 * CARA PAKAI DI KOMPONEN:
 *
 *   import { useLanguage } from "@/i18n/LanguageContext";
 *
 *   function MyComponent() {
 *     const { t, language, setLanguage } = useLanguage();
 *     return <p>{t("nav_home")}</p>;       // "Home" atau "Beranda"
 *   }
 *
 * UNTUK DEVELOPER BARU:
 * - `t(key)` = fungsi terjemahan utama. Terima key string, kembalikan teks.
 * - `language` = kode bahasa aktif: "en" atau "id"
 * - `setLanguage(lang)` = ubah bahasa (simpan ke localStorage otomatis)
 * - `hasChosen` = false kalau user belum pernah pilih bahasa (tampilkan splash)
 * - `confirmLanguage()` = tandai bahwa user sudah memilih → sembunyikan splash
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { TRANSLATIONS, type TranslationKey } from "./translations";

// ─────────────────────────────────────────────────────────────────────────────
// Tipe bahasa yang didukung
// Untuk menambah bahasa baru (misal: "ja"), tambahkan di sini.
// ─────────────────────────────────────────────────────────────────────────────

export type Language = "en" | "id";

// ─────────────────────────────────────────────────────────────────────────────
// Kunci localStorage untuk menyimpan pilihan bahasa user
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "arxivtok_language";

// ─────────────────────────────────────────────────────────────────────────────
// Shape dari context — ini yang bisa diakses komponen lewat useLanguage()
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  /** Kode bahasa aktif: "en" atau "id" */
  language: Language;

  /** Ubah bahasa. Otomatis disimpan ke localStorage. */
  setLanguage: (lang: Language) => void;

  /**
   * Fungsi terjemahan utama.
   * Contoh: t("nav_home") → "Home" (EN) atau "Beranda" (ID)
   */
  t: (key: TranslationKey) => string;

  /**
   * Apakah user sudah pernah memilih bahasa?
   * false = belum → LanguageSelector harus ditampilkan
   * true  = sudah → langsung masuk app
   */
  hasChosen: boolean;

  /**
   * Panggil ini setelah user memilih bahasa di splash screen.
   * Menyimpan pilihan ke localStorage dan menyembunyikan splash.
   */
  confirmLanguage: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Buat context dengan nilai default (akan di-override oleh Provider)
// ─────────────────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue>({
  language:        "en",
  setLanguage:     () => {},
  t:               (key) => key,      // fallback: tampilkan key-nya saja
  hasChosen:       true,              // default: tidak tampilkan splash
  confirmLanguage: () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider — bungkus app dengan komponen ini di layout.tsx
// ─────────────────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Bahasa aktif — default "en" sampai localStorage dicek
  const [language,  setLanguageState] = useState<Language>("en");

  // Apakah user sudah pernah pilih bahasa?
  // Mulai dengan true (jangan tampilkan splash) sampai localStorage dicek.
  // Ini penting supaya tidak ada flash layar pilih bahasa saat hydration.
  const [hasChosen, setHasChosen]     = useState(true);

  // ── Baca localStorage saat pertama kali mount (client-side only) ──────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;

    if (saved === "en" || saved === "id") {
      // User sudah pernah pilih → langsung pakai
      setLanguageState(saved);
      setHasChosen(true);
    } else {
      // Belum pernah pilih → tampilkan splash
      setHasChosen(false);
    }
  }, []);

  // ── Ubah bahasa dan simpan ke localStorage ────────────────────────────────
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  // ── Konfirmasi pilihan dari LanguageSelector ──────────────────────────────
  const confirmLanguage = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, language); // simpan bahasa yang sedang aktif
    setHasChosen(true);
  }, [language]);

  // ── Fungsi terjemahan ─────────────────────────────────────────────────────
  // useMemo: t() hanya dibuat ulang kalau language berubah (optimasi performance)
  const t = useMemo(() => {
    const dict = TRANSLATIONS[language];
    return (key: TranslationKey): string => dict[key] ?? key;
  }, [language]);

  // ── Nilai context yang dikirim ke semua child component ───────────────────
  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t, hasChosen, confirmLanguage }),
    [language, setLanguage, t, hasChosen, confirmLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — cara utama untuk mengakses context di komponen manapun
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook untuk menggunakan fitur i18n di komponen React.
 *
 * CONTOH PENGGUNAAN:
 *
 *   const { t, language, setLanguage } = useLanguage();
 *   <p>{t("bookmarks_title")}</p>
 *   <button onClick={() => setLanguage("id")}>Bahasa Indonesia</button>
 *
 * CATATAN:
 * - Harus dipanggil di dalam komponen yang dibungkus LanguageProvider.
 * - LanguageProvider ada di layout.tsx, jadi semua halaman sudah terbungkus.
 */
export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
