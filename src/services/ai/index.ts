/**
 * services/ai/index.ts — Barrel Export for AI Services
 * ======================================================
 *
 * This file re-exports everything from the AI services layer
 * so that the rest of the app can import from a clean, short path:
 *
 *   import { aiService } from "@/services/ai";
 *
 * HOW TO ADD A NEW AI PROVIDER:
 *   Export its singleton from this file (optional — only if other parts
 *   of the app need direct provider access for testing or advanced use).
 */

// ── Main service (use this in other services & API routes) ──────────────────
export { aiService } from "./aiService";

// ── Individual providers (exported for testing or advanced use only) ────────
export { geminiProvider } from "./gemini";
export { huggingFaceProvider } from "./huggingFace";
