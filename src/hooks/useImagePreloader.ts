/**
 * hooks/useImagePreloader.ts — Background Image Pre-Generation Hook
 * ====================================================================
 *
 * This hook watches the feed store for papers without hero images and
 * fires off background HuggingFace image generation requests in parallel.
 *
 * STRATEGY FOR SPEED:
 *   - Papers load instantly with gradient/emoji placeholders (no blocking)
 *   - This hook runs AFTER mount, generating images in the background
 *   - As each image completes, it updates the store → UI re-renders
 *   - A Set tracks requested paper IDs to prevent duplicate requests
 *   - Concurrency is limited (3 at a time) to avoid rate limiting
 *
 * USAGE:
 *   Call useImagePreloader() in VerticalFeed — it has no return value,
 *   it just kicks off background work as a side effect.
 */

"use client";

import { useEffect, useRef } from "react";
import { useFeedStore } from "@/store/feedStore";

/**
 * Max number of concurrent image generation requests.
 * HuggingFace free tier has rate limits — 3 parallel is safe.
 */
const MAX_CONCURRENT = 3;

/**
 * Generates a hero image for a single paper by calling /api/ai.
 * Uses the paper's abstract as the prompt source for relevance.
 *
 * @returns base64 data-URI string, or null on failure
 */
async function generateImageForPaper(paper: {
  title: string;
  abstract: string;
  categories: string[];
}): Promise<string | null> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // FLUX.1-schnell is fast (~2-4s), but give extra margin for network
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        action: "generate-image",
        title: paper.title,
        abstract: paper.abstract,       // ← the abstract drives the visual prompt
        categories: paper.categories,
      }),
    });

    if (!response.ok) {
      console.warn(`[ImagePreloader] HTTP ${response.status} for "${paper.title.slice(0, 40)}"`);
      return null;
    }

    const data = (await response.json()) as { image_url: string | null };
    return data.image_url ?? null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[ImagePreloader] Failed for "${paper.title.slice(0, 40)}":`, msg);
    return null;
  }
}

/**
 * Background image pre-generation hook.
 *
 * Watches the store for papers without images and generates them
 * in batches of MAX_CONCURRENT, updating the store as each completes.
 */
export function useImagePreloader() {
  // Track which paper IDs we've already kicked off requests for.
  // Using a ref (not state) because we don't want re-renders from this.
  const requestedIds = useRef<Set<string>>(new Set());
  // Prevent overlapping batch runs
  const isRunning = useRef(false);

  useEffect(() => {
    // Subscribe to store changes — re-run whenever items change
    const unsubscribe = useFeedStore.subscribe(
      (state) => {
        const items = state.items;
        if (items.length === 0 || isRunning.current) return;

        // Find papers that need images (no image_url and not yet requested)
        const needsImage = items.filter(
          (item) =>
            !item.paper.image_url &&
            !requestedIds.current.has(item.paper.id) &&
            item.paper.abstract // must have abstract for prompt
        );

        if (needsImage.length === 0) return;

        // Mark all as requested immediately to prevent duplicate triggers
        for (const item of needsImage) {
          requestedIds.current.add(item.paper.id);
        }

        // Process in batches of MAX_CONCURRENT
        isRunning.current = true;

        (async () => {
          // Process all papers, MAX_CONCURRENT at a time
          for (let i = 0; i < needsImage.length; i += MAX_CONCURRENT) {
            const batch = needsImage.slice(i, i + MAX_CONCURRENT);

            // Fire all in this batch concurrently
            await Promise.allSettled(
              batch.map(async (item) => {
                const imageUrl = await generateImageForPaper({
                  title: item.paper.title,
                  abstract: item.paper.abstract,
                  categories: item.paper.categories,
                });

                if (imageUrl) {
                  // Reactively update the store — FeedCard will re-render
                  useFeedStore.getState().updatePaperImage(item.paper.id, imageUrl);
                  console.info(
                    `[ImagePreloader] ✓ Image ready for "${item.paper.title.slice(0, 40)}"`
                  );
                }
              })
            );
          }

          isRunning.current = false;
        })();
      }
    );

    // Also trigger immediately for any items already in the store
    const { items } = useFeedStore.getState();
    if (items.length > 0) {
      // Trigger the subscription manually by doing a no-op set
      // (Zustand subscriptions only fire on state changes)
      // Instead, just run the logic directly:
      const needsImage = items.filter(
        (item) =>
          !item.paper.image_url &&
          !requestedIds.current.has(item.paper.id) &&
          item.paper.abstract
      );

      if (needsImage.length > 0 && !isRunning.current) {
        for (const item of needsImage) {
          requestedIds.current.add(item.paper.id);
        }

        isRunning.current = true;

        (async () => {
          for (let i = 0; i < needsImage.length; i += MAX_CONCURRENT) {
            const batch = needsImage.slice(i, i + MAX_CONCURRENT);

            await Promise.allSettled(
              batch.map(async (item) => {
                const imageUrl = await generateImageForPaper({
                  title: item.paper.title,
                  abstract: item.paper.abstract,
                  categories: item.paper.categories,
                });

                if (imageUrl) {
                  useFeedStore.getState().updatePaperImage(item.paper.id, imageUrl);
                  console.info(
                    `[ImagePreloader] ✓ Image ready for "${item.paper.title.slice(0, 40)}"`
                  );
                }
              })
            );
          }

          isRunning.current = false;
        })();
      }
    }

    return () => unsubscribe();
  }, []); // Run once on mount — subscription handles subsequent updates
}
