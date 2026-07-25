/**
 * services/paper/openAlex.ts — OpenAlex API Provider
 * ====================================================
 *
 * This file fetches papers from OpenAlex (https://openalex.org).
 *
 * ABOUT OPENALEX:
 *   - Covers 250 million+ scholarly works across all disciplines
 *   - Free, no API key required for basic use
 *   - Returns JSON (easier than ArXiv's XML!)
 *   - Great for finding papers outside arXiv (biology, medicine, economics)
 *   - Docs: https://docs.openalex.org/
 *
 * IMPORTANT — HOW THIS WORKS:
 *   Like the ArXiv provider, this file calls our internal server-side proxy.
 *   The browser never talks to OpenAlex directly.
 *
 *     Browser → /api/papers?source=openalex&… → Server → OpenAlex → Browser
 *
 *   The server-side route (src/app/api/papers/route.ts) handles all
 *   communication with the OpenAlex API.
 *
 * HOW TO USE:
 *   Don't import this file in React components.
 *   Use PaperService (paperService.ts) — it will call this automatically
 *   as a fallback if ArXiv fails or returns no results.
 *
 * ENVIRONMENT VARIABLE:
 *   OPENALEX_API_URL — read by the server-side route, not this file.
 *   Set it in .env.local (copy from .env.local.example).
 */

import type { ArxivPaper } from "@/types";
import type { PaperProvider, FetchPapersOptions } from "@/services/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Path to our internal API proxy that handles the OpenAlex call server-side.
 */
const INTERNAL_API_PATH = "/api/papers";

/**
 * Default number of papers to fetch.
 */
const DEFAULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// OpenAlexProvider class
// ---------------------------------------------------------------------------

/**
 * Implements the PaperProvider interface for the OpenAlex data source.
 *
 * Used as the FALLBACK provider in PaperService when ArXiv fails.
 * Returns papers in the same ArxivPaper format so the UI works identically.
 */
export class OpenAlexProvider implements PaperProvider {
  /** Display name used in logs and error messages */
  readonly name = "OpenAlex";

  /**
   * Fetches a list of papers from OpenAlex.
   *
   * OpenAlex is particularly strong for:
   *   - Non-arXiv papers (biology, medicine, social sciences)
   *   - Citation counts and "influential paper" data
   *   - Open-access paper discovery
   *
   * @param options.query    - Keyword to search for
   * @param options.category - App category ID ("ai", "physics", "all", etc.)
   * @param options.limit    - Number of papers to return (default: 10)
   * @param options.offset   - Pagination offset (default: 0)
   *
   * @returns Array of ArxivPaper objects, or empty array on failure
   */
  async fetchPapers(options: FetchPapersOptions): Promise<ArxivPaper[]> {
    const {
      query    = "",
      category = "all",
      limit    = DEFAULT_LIMIT,
      offset   = 0,
    } = options;

    // ── Build the search query ─────────────────────────────────────────────
    // OpenAlex has good keyword search — use the query as-is,
    // or fall back to a category-based keyword if no query provided.
    const searchTerm = query || this.categoryToKeyword(category);

    // ── Build the proxy URL ────────────────────────────────────────────────
    const params = new URLSearchParams({
      source: "openalex",
      query:  searchTerm,
      limit:  String(limit),
      offset: String(offset),
    });

    const url = `${INTERNAL_API_PATH}?${params.toString()}`;

    // ── Make the request ───────────────────────────────────────────────────
    return this.safeFetch(url);
  }

  /**
   * Fetches a single paper by its OpenAlex Work ID (e.g. "W2741809807").
   *
   * @param id - The OpenAlex Work ID
   * @returns  - ArxivPaper if found, null otherwise
   */
  async fetchPaperById(id: string): Promise<ArxivPaper | null> {
    const params = new URLSearchParams({
      source: "openalex",
      id:     id,
    });

    const url = `${INTERNAL_API_PATH}?${params.toString()}`;
    const papers = await this.safeFetch(url);

    return papers[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Sends a GET request to our API proxy for OpenAlex data.
   *
   * Never throws — returns empty array on any error.
   *
   * @param url - The full URL to fetch
   * @returns   - Array of papers, or empty array on any error
   */
  private async safeFetch(url: string): Promise<ArxivPaper[]> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15_000), // 15 seconds timeout
      });

      if (!response.ok) {
        console.error(
          `[${this.name}] API request failed with HTTP ${response.status} for: ${url}`
        );
        return [];
      }

      const data = await response.json() as { papers?: ArxivPaper[]; error?: string };

      if (data.error) {
        console.error(`[${this.name}] API returned error: ${data.error}`);
        return [];
      }

      const papers = data.papers ?? [];
      console.info(`[${this.name}] Fetched ${papers.length} papers from "${url}"`);
      return papers;

    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        console.error(`[${this.name}] Request timed out after 15s for: ${url}`);
      } else {
        console.error(`[${this.name}] Fetch failed for "${url}":`, error);
      }
      return [];
    }
  }

  /**
   * Converts an app category ID to a sensible OpenAlex search keyword.
   *
   * OpenAlex uses keyword search rather than a fixed category taxonomy.
   * We map category IDs to representative keywords so OpenAlex returns
   * relevant papers even when no explicit query is given.
   *
   * @param categoryId - App category ID (e.g. "ai", "physics", "biology")
   * @returns          - A descriptive keyword for OpenAlex search
   *
   * TODO: Replace with OpenAlex's concept-based filtering once integrated:
   *   https://docs.openalex.org/api-entities/concepts
   *   This would be more precise than keyword matching.
   */
  private categoryToKeyword(categoryId: string): string {
    const KEYWORD_MAP: Record<string, string> = {
      ai:        "artificial intelligence machine learning",
      physics:   "quantum physics condensed matter",
      biology:   "molecular biology genomics protein",
      math:      "mathematics optimization algebra",
      cs:        "computer science algorithms",
      medicine:  "clinical medicine drug treatment",
      economics: "economics finance markets",
      astro:     "astrophysics cosmology telescope",
      all:       "science research",
    };

    return KEYWORD_MAP[categoryId.toLowerCase()] ?? "science research";
  }
}

// Export a singleton so the whole app shares one instance
export const openAlexProvider = new OpenAlexProvider();
