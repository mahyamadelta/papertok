/**
 * app/api/papers/route.ts — Server-side Paper Fetch Proxy
 * =========================================================
 *
 * WHY THIS FILE EXISTS:
 *   Browsers cannot call the ArXiv API directly because:
 *   1. ArXiv's servers block browser requests (CORS policy).
 *   2. ArXiv returns XML — harder to parse in the browser.
 *
 *   This Next.js API route runs on the SERVER (not in the browser).
 *   It fetches from ArXiv / OpenAlex, parses the response,
 *   and returns clean JSON to the browser.
 *
 * HOW TO CALL THIS ROUTE:
 *   GET /api/papers?source=arxiv&query=machine+learning&limit=10&offset=0&category=cs.AI
 *   GET /api/papers?source=arxiv&id=2401.12345
 *   GET /api/papers?source=openalex&query=quantum+computing&limit=10
 *
 * QUERY PARAMETERS:
 *   source    — "arxiv" or "openalex" (required)
 *   query     — search keyword (optional)
 *   category  — arxiv category prefix like "cs.AI" (optional)
 *   limit     — number of results (default: 10)
 *   offset    — pagination start (default: 0)
 *   id        — fetch a single paper by ID (optional)
 *
 * RETURNS:
 *   { papers: ArxivPaper[], total: number, source: string }
 *   or
 *   { error: string } on failure
 */

import { NextRequest, NextResponse } from "next/server";
import { parseArxivXml } from "@/services/paper/arxivParser";
import type { ArxivPaper } from "@/types";

// ---------------------------------------------------------------------------
// Environment variable configuration
// ---------------------------------------------------------------------------

/**
 * Base URL for the ArXiv API.
 * Reads from .env.local → ARXIV_API_URL
 * Falls back to the official public endpoint.
 */
const ARXIV_BASE_URL =
  process.env.ARXIV_API_URL ?? "https://export.arxiv.org/api/query";

/**
 * Base URL for the OpenAlex API.
 * Reads from .env.local → OPENALEX_API_URL
 */
const OPENALEX_BASE_URL =
  process.env.OPENALEX_API_URL ?? "https://api.openalex.org";

/**
 * Timeout for external API calls (in milliseconds).
 * 12 seconds — ArXiv can be slow under load.
 */
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Berapa paper yang akan diproses dengan AI per feed request.
 *
 * Nilai 0 dipilih karena:
 *   - Groq free tier hanya 6000 TPM — process-paper + generate-story sekaligus = TPM habis
 *   - Groq quota lebih baik disimpan untuk generate-story (Watch Story) saja
 *   - Paper tanpa AI tetap tampil dengan fallback ke abstrak mentah (FeedCard sudah handle ini)
 *
 * Ubah ke 1 kalau ingin feed enrichment aktif kembali (butuh Groq quota ekstra atau Gemini berbayar).
 */
const AI_PROCESS_COUNT = 0;

/**
 * Base URL untuk memanggil /api/ai dari dalam server context.
 * Server-to-server call butuh URL absolut (bukan relative path).
 */
const AI_ROUTE_BASE =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://arxivtok.vercel.app"
    : "http://localhost:3000");

/**
 * Timeout untuk image generation (server→server ke /api/ai generate-image).
 * Lebih panjang dari AI text karena Pollinations + Groq prompt building
 * bisa total memakan 30-50 detik.
 */
const IMAGE_TIMEOUT_MS = 50_000;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET handler — the browser sends a request here; we forward it to the
 * correct external API, parse the response, and return JSON.
 *
 * @param request - The incoming Next.js request object
 */
export async function GET(request: NextRequest) {
  // ── Read query parameters from the URL ────────────────────────────────────
  const { searchParams } = request.nextUrl;

  const source   = searchParams.get("source") ?? "arxiv";   // which API to call
  const query    = searchParams.get("query")  ?? "";         // keyword search
  const category = searchParams.get("category") ?? "";       // e.g. "cs.AI"
  const limit    = parseInt(searchParams.get("limit")  ?? "10", 10);
  const offset   = parseInt(searchParams.get("offset") ?? "0",  10);
  const paperId  = searchParams.get("id") ?? "";             // single-paper fetch
  // lang: bahasa untuk konten AI yang di-generate (ringkasan, diagram, dll)
  // "en" = English, "id" = Indonesian. Dikirim ke /api/ai saat enrichment.
  const lang     = (searchParams.get("lang") ?? "en") as "en" | "id";

  // ── Route to the correct provider ─────────────────────────────────────────
  try {
    if (source === "arxiv") {
      return await handleArxiv({ query, category, limit, offset, paperId, lang });
    }

    if (source === "openalex") {
      return await handleOpenAlex({ query, category, limit, offset, paperId });
    }

    // Unknown source — return a clear error
    return NextResponse.json(
      { error: `Unknown source "${source}". Use "arxiv" or "openalex".` },
      { status: 400 }
    );
  } catch (error) {
    // Catch-all: should not normally reach here because each handler has
    // its own try/catch, but just in case.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/papers] Unhandled error:", message);
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// ArXiv handler
// ---------------------------------------------------------------------------

/**
 * Calls the ArXiv API, parses the XML response, and returns JSON.
 *
 * ArXiv query syntax (used in search_query parameter):
 *   all:keyword    — search everywhere (title, abstract, authors…)
 *   cat:cs.AI      — filter by category
 *   ti:keyword     — search in title only
 *   au:author_name — search by author
 *
 * @param params.query    - Keyword to search for
 * @param params.category - ArXiv category prefix (e.g. "cs.AI", "physics")
 * @param params.limit    - Max number of results
 * @param params.offset   - Pagination offset
 * @param params.paperId  - If set, fetch a single paper by ArXiv ID
 */
async function handleArxiv(params: {
  query: string;
  category: string;
  limit: number;
  offset: number;
  paperId: string;
  lang?: "en" | "id";  // language for AI-generated content
}): Promise<NextResponse> {
  const { query, category, limit, offset, paperId, lang = "en" } = params;

  // Build the ArXiv query URL
  let arxivUrl: string;

  if (paperId) {
    // ── Single paper by ID ──────────────────────────────────────────────────
    // Example: https://export.arxiv.org/api/query?id_list=2401.12345
    arxivUrl = `${ARXIV_BASE_URL}?id_list=${encodeURIComponent(paperId)}`;
  } else {
    // ── Search / category feed ──────────────────────────────────────────────
    //
    // Build a search_query string combining keyword + category.
    // Examples:
    //   - category "cs.AI" only → "cat:cs.AI"
    //   - keyword only          → "all:machine learning"
    //   - both                  → "all:machine learning AND cat:cs.AI"
    //   - neither               → "all:machine learning" (default)

    let searchQuery: string;

    if (query && category) {
      searchQuery = `all:${query} AND cat:${category}`;
    } else if (category) {
      searchQuery = `cat:${category}`;
    } else if (query) {
      searchQuery = `all:${query}`;
    } else {
      // No filters: fetch latest papers across all subjects
      searchQuery = "all:machine learning OR all:quantum OR all:biology";
    }

    // Assemble the full URL with pagination
    const urlParams = new URLSearchParams({
      search_query: searchQuery,
      start:        String(offset),
      max_results:  String(limit),
      sortBy:       "submittedDate",
      sortOrder:    "descending",
    });

    arxivUrl = `${ARXIV_BASE_URL}?${urlParams.toString()}`;
  }

  // ── Fetch XML from ArXiv ──────────────────────────────────────────────────
  let xmlText: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(arxivUrl, {
      signal:  controller.signal,
      headers: {
        // Tell ArXiv who we are (good practice, avoids rate-limiting)
        "User-Agent": "ArxivTok/1.0 (https://github.com/arxivtok; educational project)",
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`ArXiv returned HTTP ${response.status}`);
    }

    xmlText = await response.text();
  } catch (error) {
    // Network failure, timeout, or bad HTTP status
    const message = error instanceof Error ? error.message : "Network error";
    console.error("[/api/papers] ArXiv fetch failed:", message);
    return NextResponse.json(
      { error: `Could not reach ArXiv API: ${message}`, papers: [] },
      { status: 503 }
    );
  }

  // ── Parse the XML into ArxivPaper objects ─────────────────────────────────
  let papers;
  try {
    papers = parseArxivXml(xmlText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse error";
    console.error("[/api/papers] ArXiv XML parse failed:", message);
    return NextResponse.json(
      { error: `Failed to parse ArXiv response: ${message}`, papers: [] },
      { status: 500 }
    );
  }

  // ── Enrich paper pertama dengan AI (paralel) ─────────────────────────────
  // Teruskan lang supaya LLM membuat ringkasan dalam bahasa yang benar
  const enriched = await enrichPapersWithAI(papers, lang);

  return NextResponse.json({
    papers: enriched,
    total:  enriched.length,
    source: "arxiv",
  });
}

// ---------------------------------------------------------------------------
// OpenAlex handler
// ---------------------------------------------------------------------------

/**
 * Calls the OpenAlex API and returns JSON.
 *
 * OpenAlex already returns JSON (no XML parsing needed!).
 * We map the OpenAlex Work shape into our ArxivPaper shape here.
 *
 * @param params.query    - Keyword to search for
 * @param params.category - Field-of-study filter (matched loosely)
 * @param params.limit    - Max number of results
 * @param params.offset   - Pagination offset
 * @param params.paperId  - OpenAlex Work ID (e.g. "W2741809807")
 */
async function handleOpenAlex(params: {
  query: string;
  category: string;
  limit: number;
  offset: number;
  paperId: string;
}): Promise<NextResponse> {
  const { query, limit, offset, paperId } = params;

  // Fields we want OpenAlex to return (reduces response size)
  const FIELDS = [
    "id", "title", "abstract_inverted_index",
    "authorships", "publication_date", "primary_location",
    "concepts", "open_access", "doi", "cited_by_count",
  ].join(",");

  let openAlexUrl: string;

  if (paperId) {
    // Single work by OpenAlex ID
    openAlexUrl = `${OPENALEX_BASE_URL}/works/${encodeURIComponent(paperId)}?select=${FIELDS}`;
  } else {
    // Search
    const urlParams = new URLSearchParams({
      search:    query || "machine learning",
      "per-page": String(limit),
      page:      String(Math.floor(offset / limit) + 1),
      select:    FIELDS,
      sort:      "publication_date:desc",
      // Filter: only open-access works (more likely to have PDFs)
      filter:    "is_oa:true",
    });

    openAlexUrl = `${OPENALEX_BASE_URL}/works?${urlParams.toString()}`;
  }

  // ── Fetch from OpenAlex ───────────────────────────────────────────────────
  let json: OpenAlexResponse | OpenAlexWork;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(openAlexUrl, {
      signal:  controller.signal,
      headers: {
        "User-Agent": "ArxivTok/1.0 (educational project)",
        "Accept":     "application/json",
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`OpenAlex returned HTTP ${response.status}`);
    }

    json = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    console.error("[/api/papers] OpenAlex fetch failed:", message);
    return NextResponse.json(
      { error: `Could not reach OpenAlex API: ${message}`, papers: [] },
      { status: 503 }
    );
  }

  // ── Normalise into ArxivPaper shape ───────────────────────────────────────
  let papers;
  try {
    if (paperId) {
      // Single work response — json is the work object directly
      const work = json as OpenAlexWork;
      const paper = normaliseOpenAlexWork(work);
      papers = paper ? [paper] : [];
    } else {
      // Search response — json has a `results` array
      const list = (json as OpenAlexResponse).results ?? [];
      papers = list.map(normaliseOpenAlexWork).filter(Boolean);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Normalise error";
    console.error("[/api/papers] OpenAlex normalise failed:", message);
    return NextResponse.json(
      { error: `Failed to process OpenAlex response: ${message}`, papers: [] },
      { status: 500 }
    );
  }

  return NextResponse.json({
    papers,
    total:  papers.length,
    source: "openalex",
  });
}

// ---------------------------------------------------------------------------
// OpenAlex type definitions (minimal — only fields we use)
// ---------------------------------------------------------------------------

/**
 * Shape of the list response from OpenAlex /works endpoint.
 * Only includes the fields we actually use.
 */
interface OpenAlexResponse {
  results: OpenAlexWork[];
  meta: { count: number; page: number };
}

/**
 * Shape of a single Work object from OpenAlex.
 * Typed minimally — only fields we map to ArxivPaper.
 */
interface OpenAlexWork {
  id: string;                                     // e.g. "https://openalex.org/W2741809807"
  title: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  authorships: Array<{
    author: { display_name: string };
    institutions: Array<{ display_name: string }>;
  }>;
  publication_date: string | null;                 // e.g. "2024-03-15"
  primary_location: {
    source?: { display_name?: string; host_organization_name?: string };
    pdf_url?: string;
    landing_page_url?: string;
  } | null;
  concepts: Array<{ display_name: string; score: number }>;
  open_access: { oa_url: string | null };
  doi: string | null;                              // e.g. "https://doi.org/10.1234/..."
}

// ---------------------------------------------------------------------------
// OpenAlex normaliser
// ---------------------------------------------------------------------------

/**
 * Converts an OpenAlex Work object into our ArxivPaper shape.
 *
 * Returns null if the work is missing essential fields (title + id).
 *
 * @param work - The raw OpenAlex Work JSON object
 */
function normaliseOpenAlexWork(work: OpenAlexWork | null) {
  // Guard against null / missing work
  if (!work || !work.id) return null;

  // ── Extract the numeric OpenAlex ID ──────────────────────────────────────
  // work.id looks like "https://openalex.org/W2741809807"
  const openAlexId = work.id.replace("https://openalex.org/", "");

  // ── Reconstruct abstract from inverted index ──────────────────────────────
  // OpenAlex stores abstracts as an "inverted index" (word → [position, …]).
  // We need to reassemble them in the correct order.
  const abstract = reconstructAbstract(work.abstract_inverted_index);

  // ── Extract authors ────────────────────────────────────────────────────────
  const authors = (work.authorships ?? []).map(
    (a) => a.author?.display_name ?? "Unknown Author"
  );

  // ── Extract institution ────────────────────────────────────────────────────
  const institution =
    work.authorships?.[0]?.institutions?.[0]?.display_name ?? "Unknown Institution";

  // ── Extract categories from top concepts (score > 0.3) ────────────────────
  const categories = (work.concepts ?? [])
    .filter((c) => c.score > 0.3)
    .map((c) => normaliseCategoryName(c.display_name))
    .slice(0, 3); // max 3 categories

  // ── Extract URLs ──────────────────────────────────────────────────────────
  const paperUrl =
    work.primary_location?.landing_page_url ??
    (work.doi ? `https://doi.org/${work.doi.replace("https://doi.org/", "")}` : `https://openalex.org/${openAlexId}`);

  const pdfUrl =
    work.primary_location?.pdf_url ??
    work.open_access?.oa_url ??
    paperUrl;

  // ── Journal source ────────────────────────────────────────────────────────
  const journalSource =
    work.primary_location?.source?.display_name ?? "OpenAlex";

  return {
    id:             openAlexId,
    arxiv_id:       openAlexId,            // reuse OpenAlex ID in the arxiv_id slot
    title:          work.title ?? "Untitled Paper",
    authors:        authors.length > 0 ? authors : ["Unknown Author"],
    institution,
    abstract:       abstract || "No abstract available.",
    categories:     categories.length > 0 ? categories : ["General"],
    published_at:   work.publication_date ? `${work.publication_date}T00:00:00Z` : new Date().toISOString(),
    url:            paperUrl,
    pdf_url:        pdfUrl,
    journal_source: journalSource,
    image_url:      null,
    ai_processed:   null,   // AI processing is a future step
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reconstructs a plain text abstract from an OpenAlex "inverted index".
 *
 * OpenAlex stores abstracts as: { "word": [pos1, pos2, …], … }
 * We need to place each word at its correct position in an array,
 * then join them with spaces.
 *
 * Example input:  { "Hello": [0], "world": [1] }
 * Example output: "Hello world"
 *
 * @param invertedIndex - The abstract_inverted_index from OpenAlex
 * @returns Reconstructed abstract string, or empty string if null
 */
function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null
): string {
  if (!invertedIndex) return "";

  // Build a sparse array where index[position] = word
  const words: string[] = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }

  // Fill any gaps (undefined positions) with empty string to avoid "undefined" in output
  return words.map((w) => w ?? "").join(" ").trim();
}

/**
 * Maps an OpenAlex concept name to a display category name used in the UI.
 *
 * The UI uses short names like "AI", "Physics", "Biology".
 * OpenAlex uses longer concept names like "Artificial intelligence", "Quantum mechanics".
 * This function maps them to the short names the UI expects.
 *
 * @param conceptName - The display_name from an OpenAlex concept
 * @returns Short category name, or the original name trimmed to 20 chars
 */
function normaliseCategoryName(conceptName: string): string {
  // Map of keyword substrings → short category name
  const MAP: [string, string][] = [
    ["artificial intelligence", "AI"],
    ["machine learning",        "AI"],
    ["deep learning",           "AI"],
    ["neural network",          "AI"],
    ["computer science",        "CS"],
    ["computer vision",         "CS"],
    ["natural language",        "CS"],
    ["quantum",                 "Physics"],
    ["physics",                 "Physics"],
    ["astrophys",               "Astro"],
    ["astronomy",               "Astro"],
    ["biology",                 "Biology"],
    ["genomics",                "Biology"],
    ["protein",                 "Biology"],
    ["mathemat",                "Math"],
    ["statistics",              "Math"],
    ["econom",                  "Econ"],
    ["finance",                 "Econ"],
    ["medicine",                "Medicine"],
    ["clinical",                "Medicine"],
    ["drug",                    "Medicine"],
  ];

  const lower = conceptName.toLowerCase();
  for (const [keyword, category] of MAP) {
    if (lower.includes(keyword)) return category;
  }

  // Not in our known list — return the first word (capitalised), max 20 chars
  return conceptName.split(" ")[0].slice(0, 20);
}

// ---------------------------------------------------------------------------
// AI Enrichment helper (dipanggil setelah fetch paper dari ArXiv/OpenAlex)
// ---------------------------------------------------------------------------

/**
 * Memproses paper dengan Gemini secara paralel — dijalankan di server.
 *
 * Hanya AI_PROCESS_COUNT paper pertama yang diproses (lebih cepat).
 * Paper sisanya dikembalikan dengan ai_processed: null.
 *
 * Kenapa diproses di sini (bukan di klien):
 *   - API keys hanya ada di server (tidak boleh dikirim ke browser)
 *   - Server-to-server call lebih cepat dari client → server → AI
 *   - Kalau AI gagal, papers tetap dikembalikan tanpa crash
 *
 * @param papers - Array paper hasil parse dari ArXiv/OpenAlex
 * @returns      - Array paper yang sama, dengan ai_processed terisi untuk N paper pertama
 */
async function enrichPapersWithAI(
  papers: ArxivPaper[],
  lang: "en" | "id" = "en"
): Promise<ArxivPaper[]> {
  // Butuh setidaknya satu LLM key untuk enrichment.
  // Cek GROQ_API_KEY (primary) ATAU GEMINI_API_KEY (fallback).
  const hasLLMKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasLLMKey) {
    return papers;
  }

  // Pisahkan paper yang akan di-enrich vs yang tidak
  const toEnrich = papers.slice(0, AI_PROCESS_COUNT);
  const noEnrich = papers.slice(AI_PROCESS_COUNT);

  // Proses AI_PROCESS_COUNT paper pertama secara PARALEL (Promise.all)
  // Setiap paper diproses dalam satu Promise yang menjalankan DUA hal bersamaan:
  //   1. LLM (Groq/Gemini) → AI text summary via /api/ai process-paper
  //   2. Image (Pollinations/HuggingFace) → Hero image via /api/ai generate-image
  // Keduanya berjalan PARALEL per paper — tidak menunggu satu selesai dulu.
  const enrichedSlice = await Promise.all(
    toEnrich.map(async (paper): Promise<ArxivPaper> => {
      // ── Jalankan text AI + image generation secara BERSAMAAN ──────────────
      // Promise.allSettled dipakai (bukan Promise.all) supaya kalau satu gagal,
      // yang lain tetap jalan — paper tidak di-discard.
      const [textResult, imageResult] = await Promise.allSettled([

        // ── 1. Text/Summary AI: Gemini via /api/ai ────────────────────────────
        // Memanggil server-to-server ke route /api/ai kita sendiri.
        // Route itu yang memegang GEMINI_API_KEY secara aman.
        (async (): Promise<ArxivPaper["ai_processed"]> => {
          const response = await fetch(`${AI_ROUTE_BASE}/api/ai`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            signal:  AbortSignal.timeout(28_000),
            body: JSON.stringify({
              action: "process-paper",
              // lang diteruskan supaya LLM menulis dalam bahasa yang dipilih user
              lang,
              paper: {
                title:      paper.title,
                abstract:   paper.abstract,
                authors:    paper.authors,
                categories: paper.categories,
              },
            }),
          });
          if (!response.ok) return null;
          const data = await response.json() as { ai_processed: ArxivPaper["ai_processed"] };
          return data.ai_processed ?? null;
        })(),

        // ── 2. Hero Image: lewat /api/ai generate-image ──────────────────────
        // Flow: abstrak + judul → LLM buat visual prompt → Pollinations generate
        //
        // Kenapa lewat /api/ai (bukan direct ke Pollinations)?
        // - /api/ai sudah punya logic LLM prompt building + Pollinations + HF fallback
        // - Tidak duplikasi kode
        // - Kalau ganti provider gambar, cukup ubah di satu tempat
        (async (): Promise<string | null> => {
          const response = await fetch(`${AI_ROUTE_BASE}/api/ai`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            signal:  AbortSignal.timeout(IMAGE_TIMEOUT_MS),
            body: JSON.stringify({
              action:     "generate-image",
              title:      paper.title,
              abstract:   paper.abstract,    // ← dikirim agar LLM bisa buat prompt visual
              categories: paper.categories,  // ← konteks kategori untuk fallback prompt
            }),
          });
          if (!response.ok) return null;
          const data = await response.json() as { image_url: string | null };
          return data.image_url ?? null;
        })(),

      ]);

      // ── Gabungkan hasilnya ke paper ────────────────────────────────────────
      // Kalau salah satu gagal (rejected) → pakai null, tidak crash
      const aiProcessed = textResult.status  === "fulfilled" ? textResult.value  : null;
      const imageUrl    = imageResult.status === "fulfilled" ? imageResult.value : null;

      if (imageUrl) {
        console.info(`[/api/papers] Hero image OK untuk: "${paper.title.slice(0, 50)}"`);
      }

      return { ...paper, ai_processed: aiProcessed, image_url: imageUrl };
    })
  );

  // Gabungkan kembali: paper yang di-enrich + paper yang tidak
  return [...enrichedSlice, ...noEnrich];
}
