/**
 * services/types.ts — Shared Types for the Service Layer
 * =========================================================
 *
 * This file defines the "contracts" (interfaces) that every paper provider
 * and every AI provider must follow.
 *
 * WHY THIS EXISTS:
 *   When you have multiple data sources (ArXiv, OpenAlex, Semantic Scholar…),
 *   you want them all to return data in the same shape so the rest of the app
 *   doesn't need to know WHERE the data came from — just what it looks like.
 *
 * HOW TO ADD A NEW PROVIDER:
 *   - Paper source → implement the `PaperProvider` interface below
 *   - AI feature   → implement the `AiProvider` interface below
 */

import type { FeedItem, ArxivPaper, AiProcessedContent } from "@/types";

// =============================================================================
// Paper Provider Contract
// =============================================================================

/**
 * Every external paper source (ArXiv, OpenAlex, Semantic Scholar, CORE…)
 * must implement this interface.
 *
 * This ensures PaperService can call any provider the same way,
 * without caring about the provider's internal HTTP logic.
 */
export interface PaperProvider {
  /**
   * A human-readable name for this provider.
   * Used in logs and error messages.
   * Example: "ArXiv", "OpenAlex"
   */
  name: string;

  /**
   * Fetch a list of papers matching the given search options.
   * Returns an array of ArxivPaper objects (normalised to our internal format).
   */
  fetchPapers(options: FetchPapersOptions): Promise<ArxivPaper[]>;

  /**
   * Fetch a single paper by its provider-specific ID.
   * Returns null if the paper is not found.
   */
  fetchPaperById(id: string): Promise<ArxivPaper | null>;
}

/**
 * Options you can pass when fetching papers from any provider.
 * Not every provider supports every option — unsupported ones are ignored.
 */
export interface FetchPapersOptions {
  /** Free-text search query, e.g. "diffusion models for protein folding" */
  query?: string;

  /**
   * Category filter, e.g. "cs.AI", "physics", "all"
   * Exact values depend on the provider.
   */
  category?: string;

  /** How many papers to return (default: 10) */
  limit?: number;

  /** Pagination offset — skip this many results before returning */
  offset?: number;

  /** Sort order (not all providers support this) */
  sortBy?: "relevance" | "date" | "citations";

  /**
   * Language for AI-generated content.
   * "en" = English summaries/story, "id" = Indonesian (Bahasa Indonesia).
   * Defaults to "en" if not provided.
   * This is forwarded to /api/ai so the LLM generates in the correct language.
   */
  lang?: "en" | "id";
}

// =============================================================================
// AI Provider Contract
// =============================================================================

/**
 * Every AI/LLM service (Gemini, HuggingFace…) must implement this interface.
 *
 * This ensures AiService can swap providers without touching the rest of the code.
 */
export interface AiProvider {
  /**
   * A human-readable name for this provider.
   * Used in logs and error messages.
   * Example: "Gemini", "HuggingFace"
   */
  name: string;

  /**
   * Given a raw paper (with title + abstract), generate the AI-processed
   * content: summary, fun fact, key concepts, diagram steps, etc.
   *
   * Returns null if the provider fails or is not configured.
   */
  processPaper(
    paper: Pick<ArxivPaper, "title" | "abstract" | "authors" | "categories">
  ): Promise<AiProcessedContent | null>;
}

// =============================================================================
// Shared result wrappers
// =============================================================================

/**
 * Wraps any service call result with metadata.
 * Useful for debugging which provider supplied the data.
 */
export interface ServiceResult<T> {
  data: T;
  /** Which provider returned this data */
  source: string;
  /** True if this came from a local cache */
  fromCache: boolean;
}
