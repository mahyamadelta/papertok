/**
 * services/paper/index.ts — Barrel Export for Paper Services
 * ============================================================
 *
 * This file re-exports everything from the paper services layer
 * so that the rest of the app can import from a single, short path:
 *
 *   import { paperService } from "@/services/paper";
 *
 * instead of the longer:
 *
 *   import { paperService } from "@/services/paper/paperService";
 *
 * HOW TO ADD A NEW PROVIDER:
 *   Export its singleton from this file (optional — only if other parts of
 *   the app need direct access to the provider). In most cases, you only
 *   need to export paperService.
 */

// ── Main service (use this in components & API routes) ──────────────────────
export { paperService } from "./paperService";

// ── Individual providers (exported for testing or advanced use only) ────────
export { arxivProvider } from "./arxiv";
export { openAlexProvider } from "./openAlex";
export { semanticScholarProvider } from "./semanticScholar";
export { coreProvider } from "./core";
