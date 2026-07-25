/**
 * services/paper/arxiv.ts — ArXiv API Provider
 * ===============================================
 *
 * This file fetches papers from the ArXiv preprint server.
 *
 * IMPORTANT — HOW THIS WORKS:
 *   The browser cannot call the ArXiv API directly (CORS restriction).
 *   Instead, this provider calls our own server-side API route:
 *
 *     Browser → /api/papers?source=arxiv&… → Next.js server → ArXiv → Browser
 *
 *   The server-side route (src/app/api/papers/route.ts) handles:
 *     - Actually fetching from https://export.arxiv.org/api/query
 *     - Parsing the XML response
 *     - Returning clean JSON
 *
 * HOW TO USE:
 *   Don't import this file in React components.
 *   Use PaperService (paperService.ts) — it will call this automatically.
 *
 * ENVIRONMENT VARIABLE:
 *   ARXIV_API_URL — read by the server-side route, not this file.
 *   Set it in .env.local (copy from .env.local.example).
 */

import type { ArxivPaper } from "@/types";
import type { PaperProvider, FetchPapersOptions } from "@/services/types";
import { CATEGORIES } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * The base URL for our internal API route that proxies ArXiv requests.
 *
 * In development:  http://localhost:3000/api/papers
 * In production:   https://your-domain.com/api/papers
 *
 * We use a relative path ("/api/papers") so it works in both environments
 * without any configuration.
 */
const INTERNAL_API_PATH = "/api/papers";

/**
 * Default number of papers to fetch per request.
 */
const DEFAULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// ArxivProvider class
// ---------------------------------------------------------------------------

/**
 * Implements the PaperProvider interface for the ArXiv data source.
 *
 * Communicates with the ArXiv API through our server-side proxy route.
 * Returns ArxivPaper[] that the rest of the app already understands.
 */
export class ArxivProvider implements PaperProvider {
  /** Display name used in logs and error messages */
  readonly name = "ArXiv";

  /**
   * Fetches a list of papers from ArXiv.
   *
   * Builds a URL to our internal API proxy with the right search parameters,
   * sends a GET request, and returns the paper array.
   *
   * @param options.query    - Keyword to search for (e.g. "diffusion models")
   * @param options.category - App category ID (e.g. "ai", "physics", "all")
   *                           Mapped to the ArXiv prefix automatically.
   * @param options.limit    - Number of papers to return (default: 10)
   * @param options.offset   - Pagination offset, i.e. skip N results (default: 0)
   *
   * @returns Array of ArxivPaper objects, or empty array on failure
   */
  async fetchPapers(options: FetchPapersOptions): Promise<ArxivPaper[]> {
    const {
      query    = "",
      category = "all",
      limit    = DEFAULT_LIMIT,
      offset   = 0,
      lang,            // "en" | "id" — forwarded to /api/papers → /api/ai
    } = options;

    // ── Map app category id → ArXiv category prefix ────────────────────────
    // The app uses short ids like "ai", "physics", "biology".
    // ArXiv needs category prefixes like "cs.AI", "physics", "q-bio".
    // We look up the mapping from src/lib/utils.ts CATEGORIES array.
    const arxivCategory = this.mapCategoryToArxivPrefix(category);

    // ── Build the proxy URL ────────────────────────────────────────────────
    const params = new URLSearchParams({
      source: "arxiv",
      limit:  String(limit),
      offset: String(offset),
    });

    // Only add non-empty values (avoids "?query=&category=" in the URL)
    if (query)         params.set("query",    query);
    if (arxivCategory) params.set("category", arxivCategory);
    // Forward language so the server-side AI enrichment prompt uses
    // the correct language when generating summaries.
    if (lang)          params.set("lang",     lang);

    const url = `${INTERNAL_API_PATH}?${params.toString()}`;

    // ── Make the request ───────────────────────────────────────────────────
    return this.safeFetch(url);
  }

  /**
   * Fetches a single paper by its ArXiv ID (e.g. "2401.12345").
   *
   * @param id - The ArXiv ID to look up
   * @returns  - ArxivPaper if found, null if not found or on error
   */
  async fetchPaperById(id: string): Promise<ArxivPaper | null> {
    const params = new URLSearchParams({
      source: "arxiv",
      id:     id,
    });

    const url = `${INTERNAL_API_PATH}?${params.toString()}`;
    const papers = await this.safeFetch(url);

    // The API returns an array even for single-paper requests.
    // Return the first result, or null if not found.
    return papers[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Sends a GET request to our API proxy and returns the papers array.
   *
   * "safe" means it never throws — if anything goes wrong, it logs the
   * error and returns an empty array instead of crashing the app.
   *
   * @param url - The full URL to fetch (e.g. "/api/papers?source=arxiv&…")
   * @returns   - Array of papers, or empty array on any error
   */
  private async safeFetch(url: string): Promise<ArxivPaper[]> {
    try {
      const response = await fetch(url, {
        // Set a timeout so we don't hang forever if the server is slow
        signal: AbortSignal.timeout(15_000), // 15 seconds
      });

      // Check if the HTTP request itself succeeded (status 200–299)
      if (!response.ok) {
        console.error(
          `[${this.name}] API request failed with HTTP ${response.status} for: ${url}`
        );
        return [];
      }

      // Parse the JSON response body
      const data = await response.json() as { papers?: ArxivPaper[]; error?: string };

      // Check if the server returned an application-level error
      if (data.error) {
        console.error(`[${this.name}] API returned error: ${data.error}`);
        return [];
      }

      // Return the papers array, defaulting to [] if missing
      const papers = data.papers ?? [];
      console.info(`[${this.name}] Fetched ${papers.length} papers from "${url}"`);
      return papers;

    } catch (error) {
      // This catches: network failure, timeout, JSON parse error
      if (error instanceof Error && error.name === "TimeoutError") {
        console.error(`[${this.name}] Request timed out after 15s for: ${url}`);
      } else {
        console.error(`[${this.name}] Fetch failed for "${url}":`, error);
      }
      return [];
    }
  }

  /**
   * Converts an app category ID to the matching ArXiv category prefix.
   *
   * The CATEGORIES array in src/lib/utils.ts stores the mapping.
   * Each category has an `arxiv_prefix` field for exactly this purpose.
   *
   * Examples:
   *   "ai"       → "cs.AI"
   *   "physics"  → "physics"
   *   "biology"  → "q-bio"
   *   "all"      → "" (no category filter)
   *
   * @param categoryId - The app-level category ID (e.g. "ai", "physics")
   * @returns          - ArXiv category prefix, or "" for "all"
   */
  private mapCategoryToArxivPrefix(categoryId: string): string {
    if (categoryId === "all") return "";

    // Look up the category in the CATEGORIES list from utils.ts
    const found = CATEGORIES.find(
      (cat) => cat.id.toLowerCase() === categoryId.toLowerCase()
    );

    // Return the arxiv_prefix if found, otherwise return the id as-is
    // (allows passing raw ArXiv prefixes like "cs.AI" directly)
    return found?.arxiv_prefix ?? categoryId;
  }
}

// Export a singleton so the whole app shares one instance
export const arxivProvider = new ArxivProvider();
