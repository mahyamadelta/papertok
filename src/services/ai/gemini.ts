/**
 * services/ai/gemini.ts — Google Gemini AI Provider
 * ===================================================
 *
 * File ini mengirim paper ke Gemini lewat server-side proxy kita.
 *
 * ALUR:
 *   Browser/Server → POST /api/ai?action=process-paper → Gemini API
 *
 * Kenapa lewat proxy:
 *   - GEMINI_API_KEY tidak boleh ada di browser (security)
 *   - Route /api/ai yang menyimpan dan memakai key di server
 *
 * KEY: GEMINI_API_KEY di .env.local — dibaca di src/app/api/ai/route.ts
 */

import type { ArxivPaper, AiProcessedContent } from "@/types";
import type { AiProvider } from "@/services/types";

// ---------------------------------------------------------------------------
// GeminiProvider class
// ---------------------------------------------------------------------------

/**
 * Mengimplementasikan AiProvider interface untuk Google Gemini.
 *
 * Memanggil /api/ai (server-side proxy) yang kemudian meneruskan ke Gemini.
 * Jika gagal, return null — UI tetap tampil tanpa konten AI.
 */
export class GeminiProvider implements AiProvider {
  readonly name = "Gemini";

  /**
   * Memproses paper dengan Gemini — menghasilkan ringkasan, fun fact, diagram, dll.
   *
   * @param paper - Paper yang akan diproses (title + abstract paling penting)
   * @returns     - AiProcessedContent lengkap, atau null jika gagal
   */
  async processPaper(
    paper: Pick<ArxivPaper, "title" | "abstract" | "authors" | "categories">
  ): Promise<AiProcessedContent | null> {
    try {
      const response = await fetch("/api/ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        // Timeout 35 detik — lebih lama dari route timeout (30s) supaya error terbaca
        signal:  AbortSignal.timeout(35_000),
        body: JSON.stringify({
          action: "process-paper",
          paper: {
            title:      paper.title,
            abstract:   paper.abstract,
            authors:    paper.authors,
            categories: paper.categories,
          },
        }),
      });

      if (!response.ok) {
        console.error(`[${this.name}] /api/ai returned HTTP ${response.status}`);
        return null;
      }

      const data = await response.json() as { ai_processed: AiProcessedContent | null };

      if (!data.ai_processed) {
        // Server memproses tapi tidak dapat hasil (key tidak ada, timeout, dll)
        console.warn(`[${this.name}] Server returned null ai_processed for: "${paper.title.slice(0, 50)}"`);
        return null;
      }

      console.info(`[${this.name}] Berhasil memproses: "${paper.title.slice(0, 50)}"`);
      return data.ai_processed;

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("TimeoutError") || msg.includes("abort")) {
        console.error(`[${this.name}] Request timeout setelah 35 detik.`);
      } else {
        console.error(`[${this.name}] processPaper gagal:`, msg);
      }
      return null;
    }
  }
}

// Singleton — satu instance dipakai di seluruh app
export const geminiProvider = new GeminiProvider();
