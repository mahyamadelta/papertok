/**
 * services/index.ts — Root Barrel Export for All Services
 * =========================================================
 *
 * The top-level entry point for the entire services layer.
 *
 * In most cases you should import from a more specific path:
 *
 *   import { paperService } from "@/services/paper";   ✅ preferred
 *   import { aiService }    from "@/services/ai";      ✅ preferred
 *
 * But this file is here for convenience when you need multiple services:
 *
 *   import { paperService, aiService } from "@/services";
 *
 * =============================================================================
 * ARCHITECTURE OVERVIEW
 * =============================================================================
 *
 *   React Component / Next.js API Route
 *         │
 *         │  import { paperService } from "@/services/paper"
 *         ▼
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                        PaperService                                  │
 *   │   (src/services/paper/paperService.ts)                               │
 *   │                                                                      │
 *   │  The ONLY entry point for paper data in the frontend.                │
 *   │  Aggregates results from multiple providers.                         │
 *   └────────────┬──────────────────────────────────────────┬─────────────┘
 *                │                                          │
 *    ┌───────────▼───────────┐              ┌──────────────▼──────────────┐
 *    │   Paper Providers      │              │     AiService               │
 *    │                        │              │  (src/services/ai/)         │
 *    │  • ArxivProvider       │              │                              │
 *    │  • OpenAlexProvider    │              │  • GeminiProvider            │
 *    │  • SemanticScholar...  │              │  • HuggingFaceProvider       │
 *    │  • CoreProvider        │              └─────────────────────────────┘
 *    └────────────────────────┘
 *
 * =============================================================================
 * HOW TO ADD A NEW FEATURE
 * =============================================================================
 *
 *   Adding a new paper source:
 *     1. Create src/services/paper/mySource.ts (implement PaperProvider)
 *     2. Register in src/services/paper/paperService.ts → this.providers
 *     3. Re-export from src/services/paper/index.ts
 *
 *   Adding a new AI capability:
 *     1. Create src/services/ai/myModel.ts (implement AiProvider)
 *     2. Register in src/services/ai/aiService.ts → this.providers
 *     3. Re-export from src/services/ai/index.ts
 *
 *   Adding an entirely new service category (e.g. notifications, auth):
 *     1. Create src/services/myCategory/ directory
 *     2. Add its barrel export src/services/myCategory/index.ts
 *     3. Re-export it from this file (services/index.ts)
 */

export { paperService } from "./paper";
export { aiService } from "./ai";
