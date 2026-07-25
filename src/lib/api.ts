/**
 * api.ts — Klien HTTP untuk berkomunikasi dengan backend ArxivTok
 *
 * File ini menangani semua request ke API FastAPI backend:
 * - getFeed()        → mengambil feed paper yang dipersonalisasi
 * - logInteraction() → mencatat aksi user (like, bookmark, view, dll)
 *
 * URL backend diambil dari environment variable NEXT_PUBLIC_API_URL.
 * Kalau backend tidak bisa dijangkau, fungsi akan throw error
 * (yang kemudian ditangkap oleh caller untuk fallback ke mock data).
 */

import axios from "axios";
import type { FeedItem } from "@/types";

// ── Base URL ────────────────────────────────────────────────────────────────
// URL backend API. Default ke localhost:8000 kalau env variable tidak diset.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Buat instance axios dengan konfigurasi default
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // 15 detik timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// ── getFeed() ──────────────────────────────────────────────────────────────
// Mengambil feed paper dari backend.
//
// Parameter:
// - category  → filter kategori (misal "ai", "physics", "all")
// - page      → halaman ke berapa (mulai dari 1)
// - limit     → berapa paper yang diminta
// - refresh   → kalau true, backend akan fetch 1 paper baru dulu sebelum return feed
//
// Return: array FeedItem (paper + skor rekomendasi + alasan)
export async function getFeed(
  category: string = "all",
  page: number = 1,
  limit: number = 10,
  refresh: boolean = false
): Promise<FeedItem[]> {
  const res = await api.get("/feed", {
    params: { category, page, limit, refresh },
  });
  return res.data;
}

// ── logInteraction() ──────────────────────────────────────────────────────
// Mengirim aksi user ke backend (like, bookmark, view, skip, share).
// Backend akan mencatatnya di database dan update counter paper.
//
// Parameter:
// - data.user_id           → ID user (dari localStorage)
// - data.paper_id          → ID paper yang diinteraksi
// - data.interaction_type  → tipe aksi ("like" | "bookmark" | "view" | "skip" | "share")
// - data.dwell_time_ms     → (opsional) berapa lama user melihat paper (dalam milidetik)
export async function logInteraction(data: {
  user_id: string;
  paper_id: string;
  interaction_type: string;
  dwell_time_ms?: number;
}): Promise<void> {
  await api.post("/interactions", data);
}

// ── getBookmarks() ──────────────────────────────────────────────────────────
// Mengambil daftar paper yang di-bookmark user dari backend.
export async function getBookmarks(): Promise<FeedItem[]> {
  const res = await api.get("/bookmarks");
  return res.data;
}

// ── searchPapers() ──────────────────────────────────────────────────────────
// Mencari paper berdasarkan kata kunci di judul atau abstrak.
export async function searchPapers(query: string): Promise<FeedItem[]> {
  const res = await api.get("/search", {
    params: { q: query },
  });
  return res.data;
}
