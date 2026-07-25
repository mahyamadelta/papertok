/**
 * services/ai/huggingFace.ts — HuggingFace AI Provider
 * ======================================================
 *
 * File ini generate hero image untuk paper lewat server-side proxy kita.
 *
 * ALUR:
 *   Browser/Server → POST /api/ai?action=generate-image → HuggingFace SDXL
 *
 * KEY: HUGGINGFACE_API_KEY di .env.local — dibaca di src/app/api/ai/route.ts
 */

import type { ArxivPaper, AiProcessedContent } from "@/types";
import type { AiProvider } from "@/services/types";

// ---------------------------------------------------------------------------
// HuggingFaceProvider class
// ---------------------------------------------------------------------------

/**
 * Provider HuggingFace — dipakai terutama untuk generate hero image.
 *
 * processPaper() ada karena interface AiProvider memerlukannya,
 * tapi HuggingFace lebih cocok untuk gambar, bukan teks.
 * Untuk ringkasan teks, pakai GeminiProvider.
 */
export class HuggingFaceProvider implements AiProvider {
  readonly name = "HuggingFace";

  /**
   * Tidak diimplementasikan untuk teks — HuggingFace dipakai untuk gambar.
   * Return null supaya AiService lanjut ke provider berikutnya (tidak blocking).
   */
  async processPaper(
    _paper: Pick<ArxivPaper, "title" | "abstract" | "authors" | "categories">
  ): Promise<AiProcessedContent | null> {
    // HuggingFace tidak dipakai untuk summarisation — return null agar AiService skip
    return null;
  }

  /**
   * Generate hero image untuk paper menggunakan Stable Diffusion XL.
   *
   * Memanggil /api/ai (server-side) yang meneruskan ke HuggingFace.
   * Return base64 data-URI string, atau null jika gagal.
   *
   * @param paperTitle - Judul paper — dijadikan prompt untuk gambar
   * @returns          - "data:image/png;base64,..." atau null
   */
  async generateHeroImage(paperTitle: string): Promise<string | null> {
    if (!paperTitle) return null;

    try {
      const response = await fetch("/api/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // Image generation bisa memakan waktu — timeout 35 detik
        signal:  AbortSignal.timeout(35_000),
        body: JSON.stringify({
          action: "generate-image",
          title:  paperTitle,
        }),
      });

      if (!response.ok) {
        console.warn(`[${this.name}] /api/ai returned HTTP ${response.status} for image`);
        return null;
      }

      const data = await response.json() as { image_url: string | null };

      if (data.image_url) {
        console.info(`[${this.name}] Hero image berhasil dibuat untuk: "${paperTitle.slice(0, 50)}"`);
      }

      return data.image_url ?? null;

    } catch (error) {
      // Image generation bukan fitur kritis — gagal pun UI tetap jalan
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[${this.name}] generateHeroImage gagal (tidak kritis):`, msg);
      return null;
    }
  }
}

// Singleton — satu instance dipakai di seluruh app
export const huggingFaceProvider = new HuggingFaceProvider();
