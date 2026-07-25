/**
 * services/ai/storyService.ts — Story Generation Service
 * ========================================================
 *
 * Service ini bertanggung jawab untuk:
 *   1. Meminta Gemini (via /api/ai) untuk membuat skrip story 5 scene
 *   2. Meminta HuggingFace (via /api/ai) untuk generate gambar per scene
 *      — gambar di-generate secara paralel, satu per scene
 *   3. Menggabungkan keduanya menjadi VideoStory yang siap diputar
 *
 * Dipanggil oleh StoryPlayer.tsx saat user tap "Watch Story" untuk pertama kali.
 * Setelah selesai, hasilnya disimpan di paper.video_story supaya tidak perlu
 * generate ulang kalau user replay.
 *
 * CARA KERJA:
 *   Browser → POST /api/ai (generate-story) → Gemini → skrip 5 scene
 *   Browser → POST /api/ai (generate-image) × 5 [paralel] → HuggingFace → 5 gambar
 *   Gabungkan → VideoStory lengkap
 *
 * HOW TO ADD TTS IN THE FUTURE:
 *   Kalau nanti ingin upgrade dari Web Speech API ke Gemini TTS:
 *   1. Tambah action "generate-tts" di /api/ai/route.ts
 *   2. Panggil di sini: const audioUrl = await generateTTS(scene.narration)
 *   3. Simpan audioUrl di StoryScene (tambah field audio_url? ke types/index.ts)
 *   4. Di StoryPlayer, pakai <audio src={audioUrl}> bukan speechSynthesis
 */

import type { VideoStory, ArxivPaper } from "@/types";

// ---------------------------------------------------------------------------
// generateStory() — entry point utama, dipanggil dari StoryPlayer
// ---------------------------------------------------------------------------

/**
 * Generate story lengkap untuk satu paper.
 *
 * Ini adalah fungsi async yang mungkin memakan waktu 30–90 detik
 * karena menggabungkan Gemini (teks) + 5× HuggingFace (gambar).
 *
 * Gunakan onProgress callback untuk update loading state di UI.
 *
 * @param paper      - Paper yang akan di-ceritakan
 * @param onProgress - Callback dipanggil setiap kali ada update progress (0.0–1.0)
 * @returns          - VideoStory lengkap, atau null jika gagal total
 */
export async function generateStory(
  paper: Pick<ArxivPaper, "title" | "abstract" | "authors" | "categories" | "ai_processed">,
  onProgress?: (progress: number, message: string) => void
): Promise<VideoStory | null> {

  const report = (progress: number, message: string) => {
    onProgress?.(progress, message);
  };

  // ── Step 1: Minta Gemini generate skrip story (5 scene) ─────────────────
  report(0.05, "Gemini sedang menulis skrip story…");

  let story: VideoStory | null = null;
  try {
    const response = await fetch("/api/ai", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  AbortSignal.timeout(40_000),
      body: JSON.stringify({
        action: "generate-story",
        paper: {
          title:            paper.title,
          abstract:         paper.abstract,
          authors:          paper.authors,
          categories:       paper.categories,
          // Kirim juga ringkasan AI kalau sudah ada — Gemini bisa pakai ini sebagai konteks
          fun_fact:         paper.ai_processed?.fun_fact,
          inti_penelitian:  paper.ai_processed?.inti_penelitian,
        },
      }),
    });

    if (!response.ok) {
      console.error("[storyService] /api/ai generate-story HTTP", response.status);
      return null;
    }

    const data = await response.json() as { story: VideoStory | null };
    story = data.story;

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[storyService] Gagal generate story script:", msg);
    return null;
  }

  if (!story) {
    console.warn("[storyService] Gemini return null story — tidak bisa lanjut.");
    return null;
  }

  report(0.2, "Skrip selesai! Mulai generate gambar per scene…");

  // ── Step 2: Generate gambar untuk setiap scene secara PARALEL ────────────
  //
  // Kita generate semua 5 gambar secara bersamaan (Promise.allSettled).
  // Kalau satu gagal → scene tetap ada, hanya tanpa gambar (pakai gradient fallback).
  //
  // Catatan: HuggingFace SDXL rata-rata butuh 15–40 detik per gambar.
  // Dengan paralel, total waktu ≈ waktu gambar terlambat (bukan jumlahnya).

  const imagePromises = story.scenes.map(async (scene, i) => {
    try {
      const response = await fetch("/api/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // Timeout per gambar 45 detik — SDXL bisa lambat kalau model baru di-load
        signal:  AbortSignal.timeout(45_000),
        body: JSON.stringify({
          action: "generate-image",
          // visual_prompt sudah dalam bahasa Inggris (dari Gemini)
          title:  scene.visual_prompt,
        }),
      });

      if (!response.ok) {
        console.warn(`[storyService] Gambar scene ${i + 1} gagal HTTP ${response.status}`);
        return null;
      }

      const data = await response.json() as { image_url: string | null };

      // Lapor progress — setiap gambar selesai = +16% (5 gambar = 80%, 0.2 sudah terpakai)
      report(0.2 + (i + 1) * 0.16, `Gambar scene ${i + 1}/5 selesai ✓`);

      return data.image_url ?? null;

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[storyService] Gambar scene ${i + 1} error (tidak kritis):`, msg);
      return null;
    }
  });

  // Tunggu semua gambar selesai (atau gagal)
  const imageResults = await Promise.allSettled(imagePromises);
  const sceneImages  = imageResults.map((r) =>
    r.status === "fulfilled" ? r.value : null
  );

  report(1.0, "Story siap!");

  // ── Step 3: Gabungkan skrip + gambar ─────────────────────────────────────
  return {
    ...story,
    scene_images: sceneImages,
  };
}
