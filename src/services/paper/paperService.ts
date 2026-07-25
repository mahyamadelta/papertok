/**
 * services/paper/paperService.ts — Central Paper Service
 * ========================================================
 *
 * ⭐  THIS IS THE ONLY FILE THAT REACT COMPONENTS SHOULD IMPORT FOR PAPER DATA.
 *
 * React components must NEVER call external APIs (ArXiv, OpenAlex, etc.) directly.
 * Instead, they call methods on this PaperService, which decides:
 *   - Which provider(s) to use
 *   - How to combine / deduplicate results
 *   - Whether to use a cache
 *   - How to handle errors and fallbacks
 *
 * CURRENT PROVIDERS:
 *   - ArXiv          (src/services/paper/arxiv.ts)
 *   - OpenAlex       (src/services/paper/openAlex.ts)
 *   - Semantic Scholar (src/services/paper/semanticScholar.ts)
 *   - CORE           (src/services/paper/core.ts)
 *
 * HOW TO ADD A NEW PROVIDER:
 *   1. Create a new file in src/services/paper/ that implements PaperProvider
 *   2. Import it below in the "Provider instances" section
 *   3. Add it to the `this.providers` array in the constructor
 *   4. Done! All methods in this service will automatically consider it.
 *
 * HOW TO ADD A NEW METHOD:
 *   1. Add the method to this class (e.g. fetchByAuthor, fetchTrending)
 *   2. Call the relevant provider(s) inside the method
 *   3. Export the singleton `paperService` below — no other changes needed
 */

import type { FeedItem, ArxivPaper } from "@/types";
import type { PaperProvider, FetchPapersOptions } from "@/services/types";
import { MOCK_FEED } from "@/lib/mockData";

// ── Provider instances ───────────────────────────────────────────────────────
// Import the providers you want to enable here.
// To disable a provider, simply remove it from this list.
//
// HOW TO ADD A NEW PROVIDER:
//   import { myNewProvider } from "./myNewProvider";
//   ... then add it to the array in the constructor below.

import { arxivProvider } from "./arxiv";
import { openAlexProvider } from "./openAlex";
import { semanticScholarProvider } from "./semanticScholar";
import { coreProvider } from "./core";

// =============================================================================
// PaperService class
// =============================================================================

class PaperService {
  /**
   * The list of active paper providers.
   * Methods in this class iterate over this list to fetch data.
   *
   * Order matters: providers listed first are tried first (in fetchFeed,
   * the first provider to return results wins).
   */
  private readonly providers: PaperProvider[];

  constructor() {
    // ── Register providers here ───────────────────────────────────────────
    // To disable a provider, remove it from this array.
    // To change priority, reorder the array.
    this.providers = [
      arxivProvider,     // Primary: free, no key required
      openAlexProvider,  // Secondary: broader coverage, fallback

      // ── Stubs — tambahkan kembali setelah diimplementasikan ──────────────
      // semanticScholarProvider, // belum impl — akan log warn setiap request
      // coreProvider,            // belum impl — butuh CORE_API_KEY
    ];
  }

  // ---------------------------------------------------------------------------
  // Public API — these are the methods React components should use
  // ---------------------------------------------------------------------------

  /**
   * Fetch a feed of papers for a given category.
   *
   * This is the main entry point for the VerticalFeed component.
   *
   * Strategy:
   *   1. Try each provider in order until one returns results
   *   2. If ALL providers fail (or are not yet implemented), fall back to mock data
   *   3. Wrap results as FeedItem[] with a default recommendation_score
   *
   * @param category  - Category filter (e.g. "ai", "physics", "all")
   * @param limit     - Number of papers to return (default: 10)
   * @param offset    - Pagination offset (default: 0)
   */
  async fetchFeed(
    category: string = "all",
    limit: number = 10,
    offset: number = 0,
    lang?: "en" | "id"   // language for AI-generated content ("en" or "id")
  ): Promise<FeedItem[]> {
    const options: FetchPapersOptions = {
      query: category !== "all" ? category : undefined,
      category,
      limit,
      offset,
      lang,              // forwarded all the way to the LLM prompt
    };

    // Try each provider in order; return the first successful result
    for (const provider of this.providers) {
      try {
        const papers = await provider.fetchPapers(options);

        if (papers.length > 0) {
          console.info(
            `[PaperService] fetchFeed — got ${papers.length} results from "${provider.name}"`
          );
          return this.wrapAsFeedItems(papers, provider.name);
        }
      } catch (error) {
        // Log the error but continue to the next provider
        console.error(
          `[PaperService] fetchFeed — provider "${provider.name}" failed:`,
          error
        );
      }
    }

    // All providers returned empty or threw — fall back to mock data
    console.warn(
      "[PaperService] fetchFeed — all providers empty/failed. Using mock data."
    );
    return MOCK_FEED;
  }

  /**
   * Search for papers matching a free-text query.
   *
   * Strategy: same as fetchFeed — tries providers in order, falls back to
   * filtering mock data by title/abstract if all providers fail.
   *
   * @param query   - The search string entered by the user
   * @param limit   - Number of results to return (default: 10)
   */
  async searchPapers(query: string, limit: number = 10): Promise<FeedItem[]> {
    const options: FetchPapersOptions = { query, limit };

    for (const provider of this.providers) {
      try {
        const papers = await provider.fetchPapers(options);

        if (papers.length > 0) {
          console.info(
            `[PaperService] searchPapers — got ${papers.length} results from "${provider.name}"`
          );
          return this.wrapAsFeedItems(papers, provider.name);
        }
      } catch (error) {
        console.error(
          `[PaperService] searchPapers — provider "${provider.name}" failed:`,
          error
        );
      }
    }

    // Fallback: filter mock data by title keyword
    console.warn(
      "[PaperService] searchPapers — all providers empty/failed. Filtering mock data."
    );
    const lowerQuery = query.toLowerCase();
    return MOCK_FEED.filter(
      (item) =>
        item.paper.title.toLowerCase().includes(lowerQuery) ||
        item.paper.abstract.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Fetch the latest papers submitted to ArXiv, regardless of category.
   *
   * "Latest" means sorted by submission date, most recent first.
   * Used by future "New today" features or refresh buttons.
   *
   * @param limit - Number of papers to return (default: 10)
   * @returns     - Array of recent papers, falling back to mock data
   */
  async getLatest(limit: number = 10): Promise<FeedItem[]> {
    // Fetch with no keyword, no category, sorted by date
    const options: FetchPapersOptions = {
      limit,
      offset:  0,
      sortBy:  "date",
    };

    // Try each provider; ArXiv is best for "latest" since it's the primary
    // preprint server and updates continuously.
    for (const provider of this.providers) {
      try {
        const papers = await provider.fetchPapers(options);

        if (papers.length > 0) {
          console.info(
            `[PaperService] getLatest — got ${papers.length} results from "${provider.name}"`
          );
          return this.wrapAsFeedItems(papers, provider.name);
        }
      } catch (error) {
        console.error(
          `[PaperService] getLatest — provider "${provider.name}" failed:`,
          error
        );
      }
    }

    // All providers failed — return mock data
    console.warn("[PaperService] getLatest — all providers failed. Using mock data.");
    return MOCK_FEED;
  }

  /**
   * Fetch a single paper by ID from the first provider that finds it.
   *
   * @param id - The paper's ID (can be an ArXiv ID, OpenAlex ID, etc.)
   */
  async fetchPaperById(id: string): Promise<ArxivPaper | null> {
    for (const provider of this.providers) {
      try {
        const paper = await provider.fetchPaperById(id);
        if (paper) {
          console.info(
            `[PaperService] fetchPaperById — found "${id}" in "${provider.name}"`
          );
          return paper;
        }
      } catch (error) {
        console.error(
          `[PaperService] fetchPaperById — provider "${provider.name}" failed:`,
          error
        );
      }
    }

    // Not found in any provider — try mock data as last resort
    const mockItem = MOCK_FEED.find(
      (item) => item.paper.id === id || item.paper.arxiv_id === id
    );
    return mockItem?.paper ?? null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Wraps a flat list of ArxivPaper objects into FeedItem[] format.
   *
   * FeedItem adds a `recommendation_score` and `reason_tags` to each paper.
   * For now, all scores default to 0.5 (neutral). A recommendation engine
   * can be plugged in here later to score papers by user preferences.
   *
   * @param papers  - Raw paper list from a provider
   * @param source  - Provider name (used as a reason tag)
   */
  private wrapAsFeedItems(papers: ArxivPaper[], source: string): FeedItem[] {
    return papers.map((paper) => ({
      paper,
      recommendation_score: 0.5, // TODO: replace with real scoring logic
      reason_tags: [source, ...(paper.categories ?? [])],
    }));
  }
}

// =============================================================================
// Export a singleton
// =============================================================================

/**
 * Use this singleton everywhere in the app.
 *
 * USAGE IN A COMPONENT OR API ROUTE:
 *   import { paperService } from "@/services/paper";
 *   const feed = await paperService.fetchFeed("ai", 10);
 *
 * DO NOT create `new PaperService()` elsewhere — always use this export.
 */
export const paperService = new PaperService();
