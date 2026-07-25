/**
 * services/ai/aiService.ts — Central AI Service
 * ===============================================
 *
 * ⭐  THIS IS THE ONLY FILE THAT OTHER SERVICES SHOULD IMPORT FOR AI FEATURES.
 *
 * Just as React components should not call paper APIs directly,
 * the paper providers should not call AI APIs directly either.
 * Instead, they (and any other service) call this AiService.
 *
 * This service decides:
 *   - Which AI provider to use (Gemini first, HuggingFace as fallback)
 *   - Whether to use a cache to avoid repeated API calls for the same paper
 *   - How to handle failures gracefully
 *
 * CURRENT PROVIDERS:
 *   - Gemini       (src/services/ai/gemini.ts)    — text/summaries
 *   - HuggingFace  (src/services/ai/huggingFace.ts) — images
 *
 * HOW TO ADD A NEW AI PROVIDER:
 *   1. Create a new file in src/services/ai/ that implements AiProvider
 *   2. Import it below in the "Provider instances" section
 *   3. Add it to the `this.providers` array in the constructor
 *   4. Done! AiService will automatically try it as a fallback.
 */

import type { ArxivPaper, AiProcessedContent } from "@/types";
import type { AiProvider } from "@/services/types";

// ── Provider instances ───────────────────────────────────────────────────────
// To disable a provider, remove it from the constructor's this.providers array.
//
// HOW TO ADD A NEW AI PROVIDER:
//   import { myNewAiProvider } from "./myNewAiProvider";
//   ... then add it to the array in the constructor below.

import { geminiProvider } from "./gemini";
import { huggingFaceProvider } from "./huggingFace";

// =============================================================================
// AiService class
// =============================================================================

class AiService {
  /**
   * Ordered list of text/summarisation AI providers.
   * The service tries them in order; first one to return a result wins.
   */
  private readonly providers: AiProvider[];

  /**
   * The provider dedicated to image generation.
   * Kept separate because image gen has a different method signature.
   */
  private readonly imageProvider: typeof huggingFaceProvider;

  constructor() {
    // ── Register text/summarisation providers ─────────────────────────────
    // Add new LLM providers here. Order = priority.
    this.providers = [
      geminiProvider,       // Primary: Google Gemini
      huggingFaceProvider,  // Fallback: HuggingFace open-source models
    ];

    // ── Register image provider ───────────────────────────────────────────
    this.imageProvider = huggingFaceProvider;
  }

  // ---------------------------------------------------------------------------
  // Public API — these methods are called by other services (not components)
  // ---------------------------------------------------------------------------

  /**
   * Generate AI-processed content for a paper.
   *
   * Tries each provider in order. Returns the first successful result.
   * Returns null if ALL providers fail or return null (e.g. no API keys set).
   *
   * @param paper - The raw paper object (title + abstract are most important)
   */
  async processPaper(
    paper: Pick<ArxivPaper, "title" | "abstract" | "authors" | "categories">
  ): Promise<AiProcessedContent | null> {
    for (const provider of this.providers) {
      try {
        const result = await provider.processPaper(paper);

        if (result !== null) {
          console.info(
            `[AiService] processPaper — processed "${paper.title}" with "${provider.name}"`
          );
          return result;
        }
      } catch (error) {
        console.error(
          `[AiService] processPaper — provider "${provider.name}" failed:`,
          error
        );
      }
    }

    console.warn(
      `[AiService] processPaper — all providers returned null for "${paper.title}".`,
      "Check that GEMINI_API_KEY or HUGGINGFACE_API_KEY is set in .env.local."
    );
    return null;
  }

  /**
   * Generate a hero image for a paper.
   *
   * Returns a base64 data-URI string or null if generation fails.
   *
   * @param paperTitle - The paper's title (used to build an image prompt)
   */
  async generateHeroImage(paperTitle: string): Promise<string | null> {
    try {
      const imageUrl = await this.imageProvider.generateHeroImage(paperTitle);

      if (imageUrl) {
        console.info(
          `[AiService] generateHeroImage — generated image for "${paperTitle}"`
        );
      }

      return imageUrl;
    } catch (error) {
      console.error(
        `[AiService] generateHeroImage — failed for "${paperTitle}":`,
        error
      );
      return null;
    }
  }
}

// =============================================================================
// Export a singleton
// =============================================================================

/**
 * Use this singleton everywhere (other services, API routes, server components).
 *
 * USAGE IN ANOTHER SERVICE:
 *   import { aiService } from "@/services/ai";
 *   const content = await aiService.processPaper(paper);
 *
 * DO NOT create `new AiService()` elsewhere — always use this export.
 */
export const aiService = new AiService();
