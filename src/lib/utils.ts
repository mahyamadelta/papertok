/**
 * utils.ts — Utilitas umum untuk ArxivTok
 *
 * File ini berisi fungsi-fungsi helper yang dipakai oleh banyak komponen:
 * - cn()       → menggabungkan class CSS Tailwind dengan aman
 * - formatDate → memformat tanggal ISO ke format yang ramah dibaca
 * - CATEGORIES → daftar kategori paper yang tersedia di app
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Category } from "@/types";

// ── cn() ────────────────────────────────────────────────────────────────────
// Menggabungkan banyak class CSS jadi satu string.
// twMerge memastikan tidak ada konflik antar class Tailwind (misalnya "p-2 p-4" → "p-4").
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── formatDate() ────────────────────────────────────────────────────────────
// Mengubah tanggal ISO (misalnya "2024-03-15T10:30:00Z") jadi format yang enak dibaca.
// Contoh output: "15 Mar 2024"
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    // Kalau tanggal tidak valid, kembalikan string aslinya
    return isoDate;
  }
}

// ── CATEGORIES ──────────────────────────────────────────────────────────────
// Daftar kategori yang bisa dipilih user di halaman Discovery.
// Setiap kategori punya: id (untuk query API), label (tampilan), emoji (ikon), dan arxiv_prefix (untuk fetch arXiv).
export const CATEGORIES: Category[] = [
  { id: "all",         label: "Semua",      emoji: "🌟", arxiv_prefix: "" },
  { id: "ai",          label: "AI / ML",     emoji: "🤖", arxiv_prefix: "cs.AI" },
  { id: "physics",     label: "Fisika",      emoji: "⚛️", arxiv_prefix: "physics" },
  { id: "biology",     label: "Biologi",     emoji: "🧬", arxiv_prefix: "q-bio" },
  { id: "math",        label: "Matematika",  emoji: "📐", arxiv_prefix: "math" },
  { id: "cs",          label: "CS Umum",     emoji: "💻", arxiv_prefix: "cs" },
  { id: "medicine",    label: "Kedokteran",   emoji: "🏥", arxiv_prefix: "q-bio.QM" },
  { id: "economics",   label: "Ekonomi",     emoji: "📊", arxiv_prefix: "econ" },
];
