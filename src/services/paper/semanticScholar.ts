/**
 * services/paper/semanticScholar.ts — Semantic Scholar API Provider
 * ==================================================================
 *
 * This file handles all communication with the Semantic Scholar API.
 *
 * ABOUT SEMANTIC SCHOLAR:
 *   - Free tier available (no key), but rate-limited to ~100 req/5min
 *   - With an API key: much higher limits
 *   - Unique feature: citation graph data (who cites whom)
 *   - Useful for finding "influential papers" in a field
 *   - Docs: https://api.semanticscholar.org/api-docs/
 *
 * HOW TO USE:
 *   Don't call this file directly from a React component.
 *   Use PaperService (paperService.ts) instead.
 *
 * ENVIRONMENT VARIABLE:
 *   SEMANTIC_SCHOLAR_API_KEY — optional key for higher rate limits
 *   Get yours at: https://www.semanticscholar.org/product/api
 *   Configured in: .env.local (copy from .env.local.example)
 */

import type { ArxivPaper } from "@/types";
import type { PaperProvider, FetchPapersOptions } from "@/services/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1";

/**
 * The API key for Semantic Scholar.
 * If not set, requests will still work but at a lower rate limit.
 *
 * ⚠️  This is a SERVER-SIDE-ONLY variable (no NEXT_PUBLIC_ prefix).
 *     Never expose this key to the browser.
 */
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY ?? "";

// ---------------------------------------------------------------------------
// SemanticScholarProvider class
// ---------------------------------------------------------------------------

/**
 * Implements the PaperProvider interface for the Semantic Scholar data source.
 *
 * STATUS: 🏗️  Architecture stub — HTTP calls are not implemented yet.
 */
export class SemanticScholarProvider implements PaperProvider {
  /** Display name used in logs and error messages */
  readonly name = "Semantic Scholar";

  /**
   * Fetch papers from Semantic Scholar matching the given options.
   *
   * IMPLEMENTATION STEPS (when ready to build):
   *   1. Build URL: `${SEMANTIC_SCHOLAR_BASE_URL}/paper/search?query=${query}&limit=${limit}`
   *   2. Add header: `x-api-key: ${SEMANTIC_SCHOLAR_API_KEY}` (if key is set)
   *   3. Response shape: { data: Paper[], total: number, offset: number }
   *   4. Map each `data` item to ArxivPaper using normalisePaper()
   *   5. Return the mapped array
   *
   * Useful fields to request (add to `fields` param):
   *   title, abstract, authors, year, externalIds, citationCount, fieldsOfStudy
   */
  async fetchPapers(options: FetchPapersOptions): Promise<ArxivPaper[]> {
    // TODO: implement real Semantic Scholar API call
    // Example endpoint:
    //   GET ${SEMANTIC_SCHOLAR_BASE_URL}/paper/search
    //     ?query=${query}
    //     &fields=title,abstract,authors,year,externalIds,citationCount
    //     &limit=${limit}
    //     &offset=${offset}
    console.warn(
      `[${this.name}] fetchPapers() is not implemented yet.`,
      "Options received:",
      options
    );
    return [];
  }

  /**
   * Fetch a single paper by its Semantic Scholar Paper ID.
   *
   * IMPLEMENTATION STEPS (when ready to build):
   *   1. GET `${SEMANTIC_SCHOLAR_BASE_URL}/paper/${id}?fields=title,abstract,...`
   *   2. Map result with normalisePaper()
   *   3. Return it, or null on 404
   *
   * Tip: you can also use ArXiv IDs with the prefix "ARXIV:2401.12345"
   */
  async fetchPaperById(id: string): Promise<ArxivPaper | null> {
    // TODO: implement real Semantic Scholar single-paper fetch
    console.warn(`[${this.name}] fetchPaperById() is not implemented yet.`, {
      id,
    });
    return null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a Semantic Scholar Paper object into our ArxivPaper shape.
   *
   * Key fields to map:
   *   paper.paperId           → id
   *   paper.externalIds.ArXiv → arxiv_id
   *   paper.title             → title
   *   paper.authors[].name    → authors
   *   paper.abstract          → abstract
   *   paper.fieldsOfStudy     → categories
   *   paper.year              → published_at (construct ISO string)
   *   paper.citationCount     → (can be stored as extra metadata)
   *
   * TODO: implement once you start parsing real API responses.
   */
  // private normalisePaper(paper: Record<string, unknown>): ArxivPaper { ... }
}

// Export a singleton so the whole app shares one instance
export const semanticScholarProvider = new SemanticScholarProvider();
