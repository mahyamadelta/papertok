/**
 * app/api/ai/route.ts — Server-side AI Processing Proxy
 * =======================================================
 *
 * WHY THIS FILE EXISTS:
 *   API keys harus TIDAK PERNAH dikirim ke browser.
 *   File ini berjalan di SERVER — browser memanggil route ini, server yang
 *   memanggil LLM provider dengan key yang aman.
 *
 * PROVIDER ORDER (diatur oleh LLM_PROVIDER di bawah):
 *   1. Groq   — gratis, 14.400 req/day, tanpa kartu kredit ← DEFAULT
 *   2. Gemini — fallback kalau GROQ_API_KEY tidak diset
 *
 * UNTUK SWITCH PROVIDER:
 *   Ubah nilai LLM_PROVIDER di bawah, atau set env var LLM_PROVIDER di .env.local
 *   Tidak perlu ubah kode lain.
 *
 * ENDPOINTS:
 *   POST /api/ai  { action: "process-paper", paper: {...} }  → { ai_processed }
 *   POST /api/ai  { action: "generate-image", title: string } → { image_url }
 *   POST /api/ai  { action: "generate-story", paper: {...} }  → { story }
 */

import { NextRequest, NextResponse } from "next/server";
import type { AiProcessedContent } from "@/types";

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

/**
 * LLM_PROVIDER menentukan provider mana yang dipakai untuk text generation.
 *
 * Nilai yang valid:
 *   "groq"   — Groq (llama-3.1-8b-instant) — gratis, 14.400/day, tanpa kartu kredit
 *   "gemini" — Google Gemini 2.0 Flash Lite — gratis jika project baru, 1500/day
 *
 * Priority logic:
 *   - Kalau GROQ_API_KEY diset → pakai Groq (apapun nilai LLM_PROVIDER)
 *   - Kalau GROQ_API_KEY kosong, GEMINI_API_KEY diset → pakai Gemini
 *   - Keduanya kosong → return null (tidak crash)
 *
 * Untuk override manual, set di .env.local:  LLM_PROVIDER=gemini
 */
const LLM_PROVIDER = (process.env.LLM_PROVIDER ?? "groq") as "groq" | "gemini";

// ── Groq ────────────────────────────────────────────────────────────────────
// Groq adalah inference provider gratis yang menjalankan model open-source
// (LLaMA, Mixtral) dengan kecepatan sangat tinggi.
// Daftar key gratis di: https://console.groq.com → API Keys
//
// Model yang dipakai: llama-3.1-8b-instant
//   - Cepat, murah, cukup cerdas untuk summarisation
//   - Free tier: 14.400 req/day, 30 RPM, 6000 token/min
//
// Untuk ganti model Groq (kalau ingin lebih powerful):
//   "llama-3.3-70b-versatile" — lebih cerdas, quota lebih kecil (100 req/day free)
//   "mixtral-8x7b-32768"      — konteks panjang, bagus untuk abstrak panjang
const GROQ_API_KEY    = process.env.GROQ_API_KEY ?? "";
const GROQ_API_URL    = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL      = "llama-3.1-8b-instant";

// ── Gemini ───────────────────────────────────────────────────────────────────
// Fallback provider. Dipakai kalau GROQ_API_KEY tidak diset.
//
// Model: gemini-2.0-flash-lite
//   - Tersedia di semua key (confirmed via ListModels)
//   - Free tier HANYA jika project Google Cloud belum pernah aktifkan billing
//   - Kalau limit: 0, berarti project sudah punya billing — pakai Groq saja
const GEMINI_API_KEY  = process.env.GEMINI_API_KEY ?? "";
const GEMINI_API_URL  = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

// ── Image generation ─────────────────────────────────────────────────────
//
// PRIMARY: Pollinations.ai — gratis, tanpa API key, tidak butuh registrasi.
//   URL format: https://image.pollinations.ai/prompt/{prompt}?width=512&height=512
//   Confirmed reachable dari jaringan ini.
//
// FALLBACK: HuggingFace SDXL — pakai kalau HUGGINGFACE_API_KEY diset DAN
//   api-inference.huggingface.co bisa dijangkau dari jaringan kamu.
//   Di beberapa jaringan/ISP subdomain ini diblokir DNS.
const POLLINATIONS_URL    = "https://image.pollinations.ai/prompt";
const HF_INFERENCE_URL    = "https://router.huggingface.co/hf-inference/models";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ?? "";
const HF_IMAGE_MODEL      = "stabilityai/stable-diffusion-3-medium-diffusers";

/** Timeout untuk AI API calls */
const AI_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helper: pilih provider yang aktif
// ---------------------------------------------------------------------------

/**
 * Tentukan provider mana yang akan dipakai berdasarkan key yang tersedia.
 * Groq diutamakan karena free tier-nya lebih lega.
 */
function activeProvider(): "groq" | "gemini" | null {
  if (GROQ_API_KEY)   return "groq";
  if (GEMINI_API_KEY) return "gemini";
  return null;
}

/**
 * Panggil LLM (Groq atau Gemini) dengan prompt yang sama.
 * Return teks mentah dari model, atau null kalau gagal.
 *
 * Groq menggunakan OpenAI-compatible API (chat completions).
 * Gemini menggunakan Google generateContent API.
 * Prompt yang sama bisa dipakai untuk keduanya.
 *
 * @param prompt      - Teks prompt lengkap
 * @param temperature - Kreativitas (0.0–1.0). Rendah = faktual, tinggi = kreatif
 * @param maxTokens   - Batas panjang output
 */
async function callLLM(
  prompt: string,
  temperature: number,
  maxTokens: number
): Promise<string | null> {
  const provider = LLM_PROVIDER === "gemini" && GEMINI_API_KEY ? "gemini"
                 : GROQ_API_KEY                               ? "groq"
                 : GEMINI_API_KEY                             ? "gemini"
                 : null;

  if (!provider) {
    console.warn("[/api/ai] Tidak ada LLM key yang diset (GROQ_API_KEY atau GEMINI_API_KEY).");
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    if (provider === "groq") {
      // ── Groq: OpenAI-compatible chat completions ───────────────────────
      // Groq menggunakan format OpenAI, jadi kita bisa pakai fetch biasa.
      // Prompt dikirim sebagai "user" message — tidak perlu template khusus.
      const response = await fetch(GROQ_API_URL, {
        method:  "POST",
        signal:  controller.signal,
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          model:       GROQ_MODEL,
          temperature,
          max_tokens:  maxTokens,
          // response_format: json_object memastikan Groq return JSON murni
          // tanpa markdown code block (```json ... ```)
          response_format: { type: "json_object" },
          messages: [
            {
              role:    "system",
              content: "You are a helpful assistant. Always respond with valid JSON only.",
            },
            {
              role:    "user",
              content: prompt,
            },
          ],
        }),
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[/api/ai] Groq HTTP ${response.status}:`, errText.slice(0, 300));
        return null;
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? null;

    } else {
      // ── Gemini: generateContent API ───────────────────────────────────
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method:  "POST",
        signal:  controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[/api/ai] Gemini HTTP ${response.status}:`, errText.slice(0, 300));
        return null;
      }

      const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }

  } catch (error) {
    clearTimeout(timer);
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[/api/ai] ${provider} request gagal:`, msg);
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST handler — entry point utama
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    paper?: unknown;
    /** Judul paper — dipakai kalau abstract tidak tersedia */
    title?: string;
    /** Abstrak paper — kalau ada, LLM akan buat visual prompt dulu sebelum generate gambar */
    abstract?: string;
    /** Kategori paper — konteks tambahan untuk visual prompt */
    categories?: string[];
    scenes_count?: number;
    /**
     * Bahasa output untuk konten AI.
     * "en" = English, "id" = Indonesian (Bahasa Indonesia).
     * Default: "en" kalau tidak dikirim.
     */
    lang?: "en" | "id";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body harus berupa JSON yang valid." },
      { status: 400 }
    );
  }

  const { action, lang = "en" } = body;

  if (action === "process-paper")  return handleProcessPaper(body.paper, lang);
  if (action === "generate-image") return handleGenerateImage({
    title:      body.title ?? "",
    abstract:   body.abstract,
    categories: body.categories,
  });
  if (action === "generate-story") return handleGenerateStory(body.paper, lang);

  return NextResponse.json(
    { error: `Action tidak dikenal: "${action}". Gunakan "process-paper", "generate-image", atau "generate-story".` },
    { status: 400 }
  );
}

// ---------------------------------------------------------------------------
// Handler 1: Process Paper — ringkasan AI terstruktur
// ---------------------------------------------------------------------------

async function handleProcessPaper(paperData: unknown, lang: "en" | "id" = "en"): Promise<NextResponse> {
  if (!paperData || typeof paperData !== "object") {
    return NextResponse.json({ error: "Field 'paper' required." }, { status: 400 });
  }

  const paper = paperData as {
    title?: string; abstract?: string;
    authors?: string[]; categories?: string[];
  };

  if (!paper.title || !paper.abstract) {
    return NextResponse.json({ error: "Paper harus punya 'title' dan 'abstract'." }, { status: 400 });
  }

  if (!activeProvider()) {
    console.warn("[/api/ai] Tidak ada LLM key — skip AI processing.");
    return NextResponse.json({ ai_processed: null });
  }

  const prompt = buildProcessPaperPrompt(paper, lang);
  const rawText = await callLLM(prompt, 0.4, 2048);

  if (!rawText) return NextResponse.json({ ai_processed: null });

  try {
    const aiContent = sanitiseAiContent(JSON.parse(rawText) as Partial<AiProcessedContent>);
    console.info(`[/api/ai] (${activeProvider()}) process-paper OK: "${paper.title?.slice(0, 50)}"`);
    return NextResponse.json({ ai_processed: aiContent });
  } catch {
    console.error("[/api/ai] Gagal parse JSON process-paper:", rawText.slice(0, 200));
    return NextResponse.json({ ai_processed: null });
  }
}

// ---------------------------------------------------------------------------
// Handler 2: Generate Hero Image
// ---------------------------------------------------------------------------
//
// FLOW LENGKAP:
//   1. Terima judul + abstrak + kategori dari request
//   2. Kalau ada LLM key → minta LLM buat visual prompt yang vivid dari abstrak
//      Kalau tidak ada LLM key → pakai judul saja sebagai prompt (fallback sederhana)
//   3. Kirim visual prompt ke Pollinations.ai → terima gambar
//   4. Kalau Pollinations gagal → coba HuggingFace (fallback)
//
// Kenapa LLM perlu buat prompt dulu?
//   Judul paper biasanya teknis dan abstrak: "Phase-switchable nonreciprocal entanglement..."
//   Prompt gambar yang bagus harus konkret dan visual:
//   "glowing quantum particles entangled by light beams, dark laboratory background, neon blue"
//   LLM yang membaca abstrak bisa mengekstrak elemen visual yang relevan.

async function handleGenerateImage(params: {
  title: string;
  abstract?: string;
  categories?: string[];
}): Promise<NextResponse> {
  const { title, abstract, categories } = params;
  if (!title && !abstract) return NextResponse.json({ image_url: null });

  // ── Step 1: Buat visual prompt ─────────────────────────────────────────────
  // Strategy:
  //   - Kalau ada abstract → extract visual keywords langsung (fast, no LLM needed)
  //   - Kalau ada LLM key juga → use LLM for richer prompt
  //   - Fallback → build from title + category
  let visualPrompt: string;

  if (abstract && activeProvider()) {
    // Ada abstrak + LLM key → minta LLM buat prompt visual yang kaya
    const llmPrompt = buildImagePromptRequest({ title, abstract, categories });
    const rawText   = await callLLM(llmPrompt, 0.8, 200);

    // Parse hasil LLM — cukup ambil string plaintext, tidak perlu JSON
    const llmResult = rawText?.trim().replace(/^["']|["']$/g, "") ?? "";

    if (llmResult.length > 20) {
      visualPrompt = llmResult;
      console.info(`[/api/ai] Visual prompt dari LLM: "${visualPrompt.slice(0, 80)}"`);
    } else {
      // LLM return kosong atau terlalu pendek → fallback ke abstract-based prompt
      visualPrompt = buildAbstractPrompt(title, abstract, categories);
      console.warn("[/api/ai] LLM prompt terlalu pendek, pakai abstract prompt:", visualPrompt.slice(0, 60));
    }
  } else if (abstract) {
    // Ada abstrak tapi tidak ada LLM key → build prompt dari abstract keywords
    visualPrompt = buildAbstractPrompt(title, abstract, categories);
  } else {
    // Tidak ada abstrak → pakai judul saja
    visualPrompt = buildFallbackPrompt(title, categories);
  }

  // ── Step 2: Generate gambar — HuggingFace PRIMARY, Pollinations FALLBACK ──
  // HuggingFace FLUX.1-schnell is fast (~2-4s) and produces high quality
  const result = (HUGGINGFACE_API_KEY ? await tryHuggingFace(visualPrompt) : null)
    ?? await tryPollinations(visualPrompt);

  return NextResponse.json({ image_url: result });
}

/**
 * Meminta LLM membuat deskripsi visual yang vivid dari abstrak paper.
 *
 * Output yang diharapkan: string 1 baris, max 80 kata, deskripsi visual konkret
 * yang bisa langsung dipakai sebagai prompt image generation.
 *
 * Contoh output:
 *   "glowing quantum particles entangled by fiber optic cables, dark lab, neon blue,
 *    holographic data streams, cinematic, 8k, scientific illustration"
 */
function buildImagePromptRequest(paper: {
  title: string;
  abstract?: string;
  categories?: string[];
}): string {
  const cats = (paper.categories ?? []).join(", ") || "science";

  return `
You are a professional AI image prompt engineer.
Read this scientific paper and create a vivid, concrete visual prompt for an image generation AI.

Paper title: ${paper.title}
Field: ${cats}
Abstract: ${paper.abstract}

Rules:
- Output ONLY the image prompt, nothing else — no explanation, no quotes, no preamble
- Max 80 words
- Be specific and visual: objects, colors, lighting, mood, style
- Always end with: "dark background, neon accent colors, cinematic lighting, scientific illustration style, 4k"
- Avoid abstract concepts — translate them into visible objects and scenes
- Good example: "glowing DNA helix surrounded by flowing protein structures, microscopic view, teal and purple neon, dark background, neon accent colors, cinematic lighting, scientific illustration style, 4k"
- Bad example: "a representation of the research findings"

Visual prompt:`.trim();
}

/**
 * Fallback prompt kalau LLM tidak tersedia atau gagal.
 * Dibangun dari judul + kategori saja.
 */
function buildFallbackPrompt(title: string, categories?: string[]): string {
  // Map kategori ke elemen visual default
  const CAT_VISUALS: Record<string, string> = {
    AI:       "glowing neural network nodes, data streams, blue neon circuits",
    CS:       "holographic code, server racks, digital matrix",
    Physics:  "particle collision sparks, quantum waves, atom structures",
    Astro:    "nebula clouds, star formation, galaxy spiral",
    Biology:  "DNA double helix, cell membranes, protein structures",
    Math:     "geometric fractals, infinity symbols, golden ratio spirals",
    Econ:     "data charts rising, financial graphs, market flow",
    Medicine: "medical scan hologram, cell analysis, microscope view",
  };

  const cat      = (categories ?? []).find((c) => CAT_VISUALS[c]);
  const visual   = cat ? CAT_VISUALS[cat] : "scientific abstract patterns, formula symbols";
  const keywords = title.split(" ").slice(0, 5).join(" ");

  return `${visual}, inspired by "${keywords}", dark background, neon accent colors, cinematic lighting, scientific illustration style, 4k`;
}

/**
 * Build an image prompt directly from the paper's abstract.
 *
 * Extracts key noun phrases and scientific terms from the abstract,
 * then combines with category-specific visual elements for a rich prompt.
 * This is faster than calling an LLM and produces good results.
 */
function buildAbstractPrompt(
  title: string,
  abstract: string,
  categories?: string[]
): string {
  // Extract the most descriptive phrases from the abstract.
  // Strategy: take the first 2 sentences (usually the most descriptive),
  // filter for meaningful words, and limit length.
  const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const keyText = sentences.slice(0, 2).join(". ").trim();

  // Remove common academic filler words to keep the prompt visual
  const fillerWords = new Set([
    "we", "our", "this", "that", "the", "a", "an", "in", "of", "for", "to",
    "and", "or", "is", "are", "was", "were", "been", "be", "have", "has",
    "had", "do", "does", "did", "will", "would", "could", "should", "may",
    "can", "shall", "paper", "study", "propose", "proposed", "show", "present",
    "demonstrate", "results", "approach", "method", "using", "based", "however",
    "also", "which", "with", "from", "these", "those", "their", "its", "it",
    "by", "on", "at", "as", "but", "not", "no", "than", "more", "most",
    "such", "when", "where", "how", "what", "each", "all", "both",
  ]);

  const keywords = keyText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !fillerWords.has(w))
    .slice(0, 12)
    .join(", ");

  // Build the final prompt combining abstract keywords + visual style
  const catVisual = buildFallbackPrompt(title, categories).split(",")[0];

  return `Scientific illustration of ${keywords}, ${catVisual}, dark background, neon accent colors, cinematic lighting, digital art, 4k`;
}

/**
 * Generate image via Pollinations.ai — gratis, tanpa API key.
 *
 * Cara kerja: kirim prompt sebagai URL path, terima PNG langsung.
 * URL: https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true
 *
 * Keunggulan vs HuggingFace:
 *   - Tidak perlu API key
 *   - Tidak ada cold start (selalu warm)
 *   - Biasanya lebih cepat (5-15 detik)
 *   - Tidak diblokir di kebanyakan jaringan
 */
async function tryPollinations(paperTitle: string): Promise<string | null> {
  const prompt = encodeURIComponent(
    `Scientific illustration, digital art, minimalist: ${paperTitle}. ` +
    "Abstract visualization, dark background, neon accents, professional scientific style."
  );

  const url = `${POLLINATIONS_URL}/${prompt}?width=512&height=512&nologo=true&model=flux`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(url, {
      signal:  controller.signal,
      headers: { "Accept": "image/png,image/*" },
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[/api/ai] Pollinations HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn("[/api/ai] Pollinations return bukan image:", contentType);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) return null;

    const base64  = Buffer.from(arrayBuffer).toString("base64");
    const mime    = contentType.split(";")[0] ?? "image/jpeg";
    console.info(`[/api/ai] Pollinations image OK (${Math.round(arrayBuffer.byteLength / 1024)}KB): "${paperTitle.slice(0, 50)}"`);
    return `data:${mime};base64,${base64}`;

  } catch (error) {
    clearTimeout(timer);
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[/api/ai] Pollinations gagal:", msg);
    return null;
  }
}

/**
 * Generate image via HuggingFace SDXL — fallback kalau Pollinations gagal.
 * Butuh HUGGINGFACE_API_KEY. Mungkin diblokir di beberapa jaringan.
 */
async function tryHuggingFace(paperTitle: string): Promise<string | null> {
  const imagePrompt =
    `Scientific illustration, digital art, minimalist: ${paperTitle}. ` +
    "Abstract visualization, clean modern design, dark background, neon accents.";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${HF_INFERENCE_URL}/${HF_IMAGE_MODEL}`, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      },
      body: JSON.stringify({
        inputs: imagePrompt,
        parameters: { num_inference_steps: 15, guidance_scale: 7.0 },
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[/api/ai] HuggingFace HTTP ${response.status}:`, errText.slice(0, 120));
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      
      // If it's an object with an error (e.g. model loading)
      if (typeof data === 'object' && data !== null && 'error' in data) {
        if ((data as { error?: string }).error?.includes("loading")) {
          console.info("[/api/ai] HuggingFace model sedang loading, coba lagi nanti.");
        } else {
          console.warn("[/api/ai] HuggingFace return JSON error:", JSON.stringify(data).slice(0, 120));
        }
        return null;
      }

      // API returns a JSON string which is the base64 encoded image
      if (typeof data === 'string') {
        console.info(`[/api/ai] HF image OK (SD-3-medium base64 string): "${paperTitle.slice(0, 50)}"`);
        return `data:image/png;base64,${data}`;
      }

      console.warn("[/api/ai] HuggingFace return format tidak dikenali:", typeof data);
      return null;
    }

    // Fallback if it returns raw binary for some reason
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) return null;

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    console.info(`[/api/ai] HF image OK (${Math.round(arrayBuffer.byteLength / 1024)}KB): "${paperTitle.slice(0, 50)}"`);
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    clearTimeout(timer);
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[/api/ai] HuggingFace fetch error:", msg);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler 3: Generate Story Script — 5 scene narasi
// ---------------------------------------------------------------------------

async function handleGenerateStory(
  paperData: unknown,
  lang: "en" | "id" = "en"
): Promise<NextResponse> {
  if (!paperData || typeof paperData !== "object") {
    return NextResponse.json({ error: "Field 'paper' required." }, { status: 400 });
  }

  const paper = paperData as {
    title?: string; abstract?: string;
    authors?: string[]; categories?: string[];
    fun_fact?: string; inti_penelitian?: string;
  };

  if (!paper.title || !paper.abstract) {
    return NextResponse.json({ error: "Paper harus punya 'title' dan 'abstract'." }, { status: 400 });
  }

  if (!activeProvider()) {
    console.warn("[/api/ai] Tidak ada LLM key — tidak bisa generate story.");
    return NextResponse.json({ story: null });
  }

  const prompt  = buildStoryPrompt(paper, lang);
  const rawText = await callLLM(prompt, 0.7, 3000);

  if (!rawText) return NextResponse.json({ story: null });

  try {
    const story = sanitiseStory(JSON.parse(rawText) as RawStoryResponse);
    console.info(`[/api/ai] (${activeProvider()}) generate-story OK: "${paper.title?.slice(0, 50)}"`);
    return NextResponse.json({ story });
  } catch {
    console.error("[/api/ai] Gagal parse story JSON:", rawText.slice(0, 200));
    return NextResponse.json({ story: null });
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildProcessPaperPrompt(paper: {
  title?: string; abstract?: string;
  authors?: string[]; categories?: string[];
}, lang: "en" | "id" = "en"): string {
  const authorsText = (paper.authors ?? []).slice(0, 3).join(", ") || "Unknown";
  const catsText    = (paper.categories ?? []).join(", ") || "General";
  const language    = lang === "id" ? "bahasa Indonesia" : "English";

  return `
Kamu adalah asisten ilmiah yang membantu membuat ringkasan paper akademik yang menarik dan mudah dipahami.
Tuliskan SEMUA hasil dalam ${language}.

Paper:
- Judul: ${paper.title}
- Penulis: ${authorsText}
- Kategori: ${catsText}
- Abstrak: ${paper.abstract}

Tugas: Buat ringkasan menarik dalam format JSON persis seperti ini (tidak boleh ada field tambahan):

{
  "inti_penelitian": "1-2 kalimat yang menjelaskan inti riset ini dengan bahasa yang mudah dipahami orang awam",
  "hasil_utama": [
    "Hasil terpenting pertama dengan data spesifik jika ada",
    "Hasil terpenting kedua",
    "Hasil terpenting ketiga"
  ],
  "fun_fact": "Satu fakta mengejutkan atau menarik dari paper ini, awali dengan emoji yang relevan",
  "konsep_kunci": [
    { "term": "Istilah Teknis 1", "definition": "Penjelasan sederhana dengan analogi sehari-hari" },
    { "term": "Istilah Teknis 2", "definition": "Penjelasan sederhana dengan analogi sehari-hari" },
    { "term": "Istilah Teknis 3", "definition": "Penjelasan sederhana dengan analogi sehari-hari" }
  ],
  "diagram": [
    { "label": "Input/Data", "sublabel": "Apa yang dimasukkan", "description": "Penjelasan singkat tentang input", "position": "input" },
    { "label": "Metode/Proses", "sublabel": "Cara kerjanya", "description": "Penjelasan singkat tentang proses", "position": "process" },
    { "label": "Hasil/Output", "sublabel": "Apa yang dihasilkan", "description": "Penjelasan singkat tentang output", "position": "output" }
  ],
  "ringkasan_panjang": "Paragraf 3-4 kalimat yang menjelaskan paper secara lengkap untuk pembaca yang ingin tahu lebih",
  "insight_personal": "Kalimat singkat kenapa paper ini penting atau relevan, mulai dengan konteks bidangnya",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

PENTING:
- Gunakan ${language} yang natural dan menarik
- fun_fact harus benar-benar mengejutkan atau counter-intuitif
- tags harus berupa kata kunci teknis pendek untuk sistem rekomendasi
- Kembalikan HANYA JSON, tanpa teks lain di luar JSON
`.trim();
}

function buildStoryPrompt(paper: {
  title?: string; abstract?: string;
  authors?: string[]; categories?: string[];
  fun_fact?: string; inti_penelitian?: string;
}, lang: "en" | "id" = "en"): string {
  const catsText     = (paper.categories ?? []).join(", ") || "Ilmu pengetahuan";
  const extraContext = paper.inti_penelitian
    ? `\nRingkasan singkat: ${paper.inti_penelitian}` : "";
  const funFactHint  = paper.fun_fact
    ? `\nFun fact yang bisa jadi hook: ${paper.fun_fact}` : "";
  const language     = lang === "id" ? "bahasa Indonesia" : "English";

  return `
Kamu adalah narator konten sains seperti Kurzgesagt atau Veritasium.
Ubah paper ilmiah ini menjadi skrip storytelling 5 scene pendek. 
Tuliskan SEMUA narasi dan teks dalam ${language}.

Paper:
- Judul: ${paper.title}
- Kategori: ${catsText}
- Abstrak: ${paper.abstract}${extraContext}${funFactHint}

Format JSON yang harus dikembalikan (HANYA JSON, tidak ada teks lain):

{
  "story_title": "Judul story yang menarik dan clickable (versi populer dari judul paper)",
  "scenes": [
    {
      "title": "Hook",
      "narration": "Kalimat pembuka mengejutkan, 3-4 kalimat, cocok dibaca keras, awali dengan fakta mengejutkan atau pertanyaan retoris.",
      "visual_prompt": "short English visual description for image generation, max 15 words",
      "duration_seconds": 12
    },
    {
      "title": "Masalah",
      "narration": "Masalah yang diatasi, gunakan analogi sehari-hari, 3-4 kalimat.",
      "visual_prompt": "short English visual description, max 15 words",
      "duration_seconds": 14
    },
    {
      "title": "Metode",
      "narration": "Cara peneliti menyelesaikannya, bahasa sederhana, 3-4 kalimat.",
      "visual_prompt": "short English visual description, max 15 words",
      "duration_seconds": 14
    },
    {
      "title": "Hasil",
      "narration": "Temuan terpenting dengan angka konkret, buat terasa wow, 3-4 kalimat.",
      "visual_prompt": "short English visual description, max 15 words",
      "duration_seconds": 14
    },
    {
      "title": "Takeaway",
      "narration": "Kenapa ini penting, dampak masa depan, tutup dengan inspiring, 3-4 kalimat.",
      "visual_prompt": "short English visual description, max 15 words",
      "duration_seconds": 12
    }
  ]
}

ATURAN: narasi cocok untuk TTS (tidak ada rumus/tabel/bullet), bahasa Indonesia hidup, visual_prompt selalu Inggris.
`.trim();
}

// ---------------------------------------------------------------------------
// Sanitisers — pastikan output JSON dari LLM valid sebelum dikirim ke browser
// ---------------------------------------------------------------------------

function sanitiseAiContent(raw: Partial<AiProcessedContent>): AiProcessedContent {
  return {
    inti_penelitian:   typeof raw.inti_penelitian  === "string" ? raw.inti_penelitian  : "Ringkasan tidak tersedia.",
    hasil_utama:       Array.isArray(raw.hasil_utama)            ? raw.hasil_utama     : [],
    fun_fact:          typeof raw.fun_fact          === "string" ? raw.fun_fact         : "",
    konsep_kunci:      Array.isArray(raw.konsep_kunci) ? raw.konsep_kunci.map(k => ({
      term:       typeof k.term       === "string" ? k.term       : "",
      definition: typeof k.definition === "string" ? k.definition : "",
    })) : [],
    diagram: Array.isArray(raw.diagram) ? raw.diagram.map(d => ({
      label:       typeof d.label       === "string" ? d.label       : "",
      sublabel:    typeof d.sublabel    === "string" ? d.sublabel    : "",
      description: typeof d.description === "string" ? d.description : "",
      position:    (d.position === "input" || d.position === "process" || d.position === "output")
                     ? d.position : "process",
    })) : [],
    ringkasan_panjang: typeof raw.ringkasan_panjang === "string" ? raw.ringkasan_panjang : "",
    insight_personal:  typeof raw.insight_personal  === "string" ? raw.insight_personal  : "",
    tags:              Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [],
  };
}

interface RawStoryResponse {
  story_title?: unknown;
  scenes?: Array<{
    title?: unknown; narration?: unknown;
    visual_prompt?: unknown; duration_seconds?: unknown;
  }>;
}

function sanitiseStory(raw: RawStoryResponse) {
  const TITLES   = ["Hook", "Masalah", "Metode", "Hasil", "Takeaway"];
  const SECONDS  = [12, 14, 14, 14, 12];

  const scenes = Array.isArray(raw.scenes)
    ? raw.scenes.slice(0, 5).map((s, i) => ({
        title:            typeof s.title            === "string" ? s.title            : TITLES[i],
        narration:        typeof s.narration        === "string" ? s.narration        : "Narasi tidak tersedia.",
        visual_prompt:    typeof s.visual_prompt    === "string" ? s.visual_prompt    : "abstract scientific illustration, dark background",
        duration_seconds: typeof s.duration_seconds === "number" ? s.duration_seconds : SECONDS[i],
      }))
    : TITLES.map((title, i) => ({
        title, narration: "Narasi tidak tersedia.",
        visual_prompt: "abstract scientific illustration, dark background",
        duration_seconds: SECONDS[i],
      }));

  while (scenes.length < 5) {
    const i = scenes.length;
    scenes.push({
      title: TITLES[i] ?? "Scene", narration: "Narasi tidak tersedia.",
      visual_prompt: "abstract scientific illustration, dark background",
      duration_seconds: 12,
    });
  }

  return {
    story_title:  typeof raw.story_title === "string" ? raw.story_title : "Story Paper Ilmiah",
    scenes,
    scene_images: scenes.map(() => null) as (string | null)[],
  };
}
