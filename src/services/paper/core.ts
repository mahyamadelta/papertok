/**
 * services/paper/core.ts — CORE API Provider
 * ============================================
 *
 * This file handles all communication with the CORE (COnnecting REpositories) API.
 *
 * ABOUT CORE:
 *   - Aggregates full-text open-access papers from 10,000+ repositories
 *   - Unique value: full-text search (not just abstracts!)
 *   - API key is required for production use
 *   - Docs: https://api.core.ac.uk/docs/v3
 *
 * HOW TO USE:
 *   Don't call this file directly from a React component.
 *   Use PaperService (paperService.ts) instead.
 *
 * ENVIRONMENT VARIABLE:
 *   CORE_API_KEY — required for authenticated access
 *   Get yours at: https://core.ac.uk/services/api
 *   Configured in: .env.local (copy from .env.local.example)
 */

import type { ArxivPaper } from "@/types";
import type { PaperProvider, FetchPapersOptions } from "@/services/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CORE_BASE_URL = "https://api.core.ac.uk/v3";

/**
 * The API key for CORE.
 * Required for accessing the full API (higher quotas, full-text data).
 *
 * ⚠️  SERVER-SIDE-ONLY — never prefix with NEXT_PUBLIC_.
 *     If this is empty, fetchPapers() will return an empty array and log a warning.
 */
const CORE_API_KEY = process.env.CORE_API_KEY ?? "";

// ---------------------------------------------------------------------------
// CoreProvider class
// ---------------------------------------------------------------------------

/**
 * Implements the PaperProvider interface for the CORE data source.
 *
 * STATUS: 🏗️  Architecture stub — HTTP calls are not implemented yet.
 */
export class CoreProvider implements PaperProvider {
  /** Display name used in logs and error messages */
  readonly name = "CORE";

  /**
   * Fetch papers from CORE matching the given options.
   *
   * IMPLEMENTATION STEPS (when ready to build):
   *   1. Check that CORE_API_KEY is set; if not, warn and return []
   *   2. POST to `${CORE_BASE_URL}/search/works` with JSON body:
   *      { "q": query, "limit": limit, "offset": offset }
   *   3. Add header: `Authorization: Bearer ${CORE_API_KEY}`
   *   4. Response shape: { results: CoreWork[], totalHits: number }
   *   5. Map each `result` to ArxivPaper using normaliseWork()
   *   6. Return the mapped array
   */
  async fetchPapers(options: FetchPapersOptions): Promise<ArxivPaper[]> {
    // Guard: warn if no API key is configured
    if (!CORE_API_KEY) {
      console.warn(
        `[${this.name}] CORE_API_KEY is not set in .env.local — skipping.`
      );
      return [];
    }

    // TODO: implement real CORE API call
    // Example endpoint:
    //   POST ${CORE_BASE_URL}/search/works
    //   Headers: { Authorization: `Bearer ${CORE_API_KEY}` }
    //   Body: { q: options.query, limit: options.limit, offset: options.offset }
    console.warn(
      `[${this.name}] fetchPapers() is not implemented yet.`,
      "Options received:",
      options
    );
    return [];
  }

  /**
   * Fetch a single work by its CORE ID (numeric string).
   *
   * IMPLEMENTATION STEPS (when ready to build):
   *   1. GET `${CORE_BASE_URL}/works/${id}`
   *   2. Add header: `Authorization: Bearer ${CORE_API_KEY}`
   *   3. Map result with normaliseWork()
   *   4. Return it, or null on 404
   */
  async fetchPaperById(id: string): Promise<ArxivPaper | null> {
    if (!CORE_API_KEY) {
      console.warn(`[${this.name}] CORE_API_KEY is not set — skipping.`);
      return null;
    }
    // TODO: implement real CORE single-work fetch
    console.warn(`[${this.name}] fetchPaperById() is not implemented yet.`, {
      id,
    });
    return null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a CORE Work object into our ArxivPaper shape.
   *
   * Key fields to map:
   *   work.id           → id
   *   work.doi          → url
   *   work.title        → title
   *   work.authors      → authors (array of { name })
   *   work.abstract     → abstract
   *   work.topics       → categories
   *   work.publishedDate → published_at
   *   work.downloadUrl  → pdf_url
   *
   * TODO: implement once you start parsing real API responses.
   */
  // private normaliseWork(work: Record<string, unknown>): ArxivPaper { ... }
}

// Export a singleton so the whole app shares one instance
export const coreProvider = new CoreProvider();
