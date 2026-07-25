/**
 * services/paper/arxivParser.ts — ArXiv XML → ArxivPaper Parser
 * ================================================================
 *
 * PURPOSE:
 *   The ArXiv API returns data in XML (Atom feed) format.
 *   This file converts that raw XML text into an array of ArxivPaper objects
 *   that the rest of the app already knows how to use.
 *
 * IMPORTANT — THIS FILE HAS ONE JOB:
 *   Only parsing. No HTTP requests. No React. No UI logic.
 *   Keeping parsing separate makes it easy to test and replace.
 *
 * WHERE IT'S CALLED FROM:
 *   → src/app/api/papers/route.ts (server-side proxy)
 *   That route fetches the XML, then calls parseArxivXml() from here.
 *
 * ARXIV XML STRUCTURE (simplified):
 *   <feed>
 *     <entry>
 *       <id>http://arxiv.org/abs/2401.12345v1</id>
 *       <title>Paper Title Here</title>
 *       <summary>Abstract text here...</summary>
 *       <author><name>Alice Chen</name></author>
 *       <author><name>Bob Kumar</name></author>
 *       <published>2024-01-15T00:00:00Z</published>
 *       <category term="cs.AI" />
 *       <link href="http://arxiv.org/abs/2401.12345v1" rel="alternate" type="text/html" />
 *       <link href="http://arxiv.org/pdf/2401.12345v1" rel="related" type="application/pdf" />
 *     </entry>
 *     ... more entries ...
 *   </feed>
 */

import type { ArxivPaper } from "@/types";

// ---------------------------------------------------------------------------
// Main export: parseArxivXml()
// ---------------------------------------------------------------------------

/**
 * Converts a raw ArXiv XML string (Atom feed) into an array of ArxivPaper objects.
 *
 * If the XML is empty or contains no entries, returns an empty array.
 * If parsing fails completely, throws an Error with a descriptive message.
 *
 * @param xmlText - The raw XML string returned by the ArXiv API
 * @returns       - Array of normalised ArxivPaper objects (may be empty)
 *
 * @example
 *   const papers = parseArxivXml(rawXmlFromArxiv);
 *   // papers[0].title → "Diffusion Models for..."
 *   // papers[0].authors → ["Alice Chen", "Bob Kumar"]
 */
export function parseArxivXml(xmlText: string): ArxivPaper[] {
  // Guard: empty input
  if (!xmlText || xmlText.trim().length === 0) {
    return [];
  }

  // ── Extract all <entry> blocks ────────────────────────────────────────────
  // Each <entry>…</entry> block represents one paper.
  // We use a regex to extract all of them from the feed.
  const entryBlocks = extractEntryBlocks(xmlText);

  if (entryBlocks.length === 0) {
    // Either no results, or ArXiv returned an error feed
    // Check if it's an error response
    if (xmlText.includes("<error>") || xmlText.includes("Error")) {
      const errorMsg = extractTextBetweenTags(xmlText, "error") ||
                       extractTextBetweenTags(xmlText, "summary") ||
                       "ArXiv returned an error response";
      throw new Error(`ArXiv API error: ${errorMsg}`);
    }
    // No results — valid but empty
    return [];
  }

  // ── Parse each entry into an ArxivPaper ──────────────────────────────────
  const papers: ArxivPaper[] = [];

  for (const entryXml of entryBlocks) {
    try {
      const paper = parseEntry(entryXml);
      if (paper) {
        papers.push(paper);
      }
    } catch (error) {
      // Skip this entry but continue with the rest
      // (one bad entry shouldn't ruin the whole response)
      console.warn(
        "[arxivParser] Skipping malformed entry:",
        error instanceof Error ? error.message : error
      );
    }
  }

  return papers;
}

// ---------------------------------------------------------------------------
// Entry parser
// ---------------------------------------------------------------------------

/**
 * Converts one <entry> XML block into an ArxivPaper object.
 *
 * Returns null if the entry is missing required fields (id + title).
 *
 * @param entryXml - A single <entry>…</entry> XML string
 */
function parseEntry(entryXml: string): ArxivPaper | null {
  // ── ArXiv ID ──────────────────────────────────────────────────────────────
  // The <id> tag contains something like:
  //   http://arxiv.org/abs/2401.12345v1
  // We want just: "2401.12345"
  const rawId = extractTextBetweenTags(entryXml, "id");
  if (!rawId) return null;

  const arxivId = extractArxivId(rawId);
  if (!arxivId) return null;

  // ── Title ─────────────────────────────────────────────────────────────────
  // Title may have extra whitespace and newlines from the XML formatting
  const rawTitle = extractTextBetweenTags(entryXml, "title");
  if (!rawTitle) return null;

  const title = cleanWhitespace(rawTitle);

  // ── Abstract (called "summary" in ArXiv Atom) ─────────────────────────────
  const rawAbstract = extractTextBetweenTags(entryXml, "summary");
  const abstract = cleanWhitespace(rawAbstract ?? "No abstract available.");

  // ── Authors ───────────────────────────────────────────────────────────────
  // Multiple <author><name>…</name></author> blocks
  const authors = extractAllTextBetweenTags(
    entryXml,
    "name"
  ).map((n) => cleanWhitespace(n));

  // ── Institution ───────────────────────────────────────────────────────────
  // ArXiv doesn't return institution in the API directly.
  // We try to extract it from the author affiliation if present,
  // otherwise fall back to a generic label.
  const institution = extractAffiliation(entryXml) || "arXiv Preprint";

  // ── Published date ────────────────────────────────────────────────────────
  // <published>2024-01-15T00:00:00Z</published>
  const publishedAt =
    extractTextBetweenTags(entryXml, "published") ??
    new Date().toISOString();

  // ── Categories ────────────────────────────────────────────────────────────
  // ArXiv uses: <category term="cs.AI" scheme="…" />
  // We extract all "term" attributes and map them to display names.
  const rawCategories = extractCategoryTerms(entryXml);
  const categories = rawCategories
    .map(mapArxivCategoryToDisplay)
    .filter((c, i, arr) => arr.indexOf(c) === i) // deduplicate
    .slice(0, 3);                                 // max 3

  // ── URLs ──────────────────────────────────────────────────────────────────
  // ArXiv has two link types in each entry:
  //   rel="alternate" type="text/html" → abstract page URL
  //   rel="related"   type="application/pdf" → PDF download URL
  const htmlUrl = extractLinkHref(entryXml, "alternate") ??
                  `https://arxiv.org/abs/${arxivId}`;

  const pdfUrl  = extractLinkHref(entryXml, "related") ??
                  `https://arxiv.org/pdf/${arxivId}`;

  // ── Assemble final ArxivPaper object ─────────────────────────────────────
  return {
    id:             `arxiv-${arxivId}`,
    arxiv_id:       arxivId,
    title,
    authors:        authors.length > 0 ? authors : ["Unknown Author"],
    institution,
    abstract,
    categories:     categories.length > 0 ? categories : ["CS"],
    published_at:   publishedAt,
    url:            htmlUrl,
    pdf_url:        pdfUrl,
    journal_source: "arXiv",
    image_url:      null,       // ArXiv doesn't provide images; set to null
    ai_processed:   null,       // AI processing is a future step
  };
}

// ---------------------------------------------------------------------------
// XML extraction helpers
// (No external libraries — these use simple, readable regex patterns)
// ---------------------------------------------------------------------------

/**
 * Splits the full feed XML into individual <entry>…</entry> blocks.
 *
 * @param feedXml - The full ArXiv Atom feed XML string
 * @returns       - Array of individual <entry>…</entry> strings
 */
function extractEntryBlocks(feedXml: string): string[] {
  const matches: string[] = [];
  // Match everything between <entry> and </entry> (including both tags)
  const regex = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(feedXml)) !== null) {
    // match[0] is the full "<entry>…</entry>" string
    matches.push(match[0]);
  }

  return matches;
}

/**
 * Extracts the text content between a pair of XML tags.
 * Returns the first match, or null if the tag is not found.
 *
 * Examples:
 *   extractTextBetweenTags('<title>Hello World</title>', 'title') → "Hello World"
 *   extractTextBetweenTags('<foo/>', 'title') → null
 *
 * @param xml     - The XML string to search in
 * @param tagName - The XML tag name (without angle brackets)
 */
function extractTextBetweenTags(xml: string, tagName: string): string | null {
  // Build regex: <tagName>content</tagName>
  // [\s\S]*? = any character including newlines, non-greedy
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = regex.exec(xml);
  if (!match) return null;

  // match[1] = the captured group (content between the tags)
  return decodeXmlEntities(match[1]);
}

/**
 * Extracts text content from ALL occurrences of a tag (not just the first).
 * Used for extracting multiple <name> tags (one per author).
 *
 * @param xml     - The XML string to search in
 * @param tagName - The XML tag name
 * @returns       - Array of text content from all matching tags
 */
function extractAllTextBetweenTags(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    results.push(decodeXmlEntities(match[1]));
  }

  return results;
}

/**
 * Extracts the "term" attribute from ArXiv <category> elements.
 *
 * ArXiv XML looks like: <category term="cs.AI" scheme="http://…"/>
 * We want the value of the "term" attribute: "cs.AI"
 *
 * @param xml - The entry XML string
 * @returns   - Array of category term strings (e.g. ["cs.AI", "cs.LG"])
 */
function extractCategoryTerms(xml: string): string[] {
  const terms: string[] = [];
  // Match: <category term="SOMETHING" …/>
  const regex = /<category[^>]+term="([^"]+)"/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml)) !== null) {
    terms.push(match[1]);
  }

  return terms;
}

/**
 * Extracts the href attribute from a <link> element with a specific rel value.
 *
 * ArXiv XML:
 *   <link href="http://…" rel="alternate" type="text/html" />
 *   <link href="http://…" rel="related"   type="application/pdf" />
 *
 * @param xml - The entry XML string
 * @param rel - The rel attribute to match ("alternate" or "related")
 * @returns   - The href value, or null if not found
 */
function extractLinkHref(xml: string, rel: string): string | null {
  // Match: <link … href="URL" … rel="RELVALUE" … />
  // The attributes can appear in any order, so we need two regex passes.

  // Strategy: find all <link …/> tags, then check each for the right rel
  const linkRegex = /<link\s([^/]*)\/?>/gi;
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkRegex.exec(xml)) !== null) {
    const attrs = linkMatch[1]; // all attributes as a string
    if (attrs.includes(`rel="${rel}"`)) {
      // Found the right link — extract href
      const hrefMatch = /href="([^"]+)"/.exec(attrs);
      if (hrefMatch) return hrefMatch[1];
    }
  }

  return null;
}

/**
 * Tries to extract an affiliation/institution from the ArXiv entry.
 *
 * ArXiv sometimes includes: <arxiv:affiliation>MIT CSAIL</arxiv:affiliation>
 * This is optional and not always present.
 *
 * @param xml - The entry XML string
 * @returns   - Institution name or empty string
 */
function extractAffiliation(xml: string): string {
  // Try the arxiv:affiliation tag first
  const affiliation = extractTextBetweenTags(xml, "arxiv:affiliation");
  if (affiliation) return cleanWhitespace(affiliation);

  // Some entries have it under different namespace
  const affiliation2 = extractTextBetweenTags(xml, "affiliation");
  if (affiliation2) return cleanWhitespace(affiliation2);

  return "";
}

// ---------------------------------------------------------------------------
// String / text helpers
// ---------------------------------------------------------------------------

/**
 * Extracts just the numeric ArXiv ID from a full ArXiv URL or ID string.
 *
 * Input:  "http://arxiv.org/abs/2401.12345v1"
 * Output: "2401.12345"
 *
 * Input:  "2401.12345v2"
 * Output: "2401.12345"
 *
 * @param rawId - Raw ID string from the <id> tag
 */
function extractArxivId(rawId: string): string | null {
  // Pattern: 4 digits, dot, 4-5 digits (optional version suffix vN)
  const match = /(\d{4}\.\d{4,5})(?:v\d+)?/.exec(rawId);
  return match ? match[1] : null;
}

/**
 * Collapses multiple whitespace characters (spaces, tabs, newlines) into a
 * single space and trims leading/trailing whitespace.
 *
 * Needed because XML values often span multiple lines with indentation.
 *
 * @param text - Raw text that may contain extra whitespace
 */
function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Decodes common XML entity references into their character equivalents.
 *
 * XML entities that can appear in ArXiv data:
 *   &amp;  → &
 *   &lt;   → <
 *   &gt;   → >
 *   &quot; → "
 *   &apos; → '
 *
 * @param text - Raw XML text that may contain entity references
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    );
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

/**
 * Maps an ArXiv category code (e.g. "cs.AI") to a short display name
 * that matches what the UI expects ("AI", "Physics", "Biology", etc.)
 *
 * ArXiv category taxonomy:
 *   cs.*    → CS topics (cs.AI, cs.LG, cs.CV, etc.)
 *   physics.* or hep-*, cond-mat.*, gr-qc, quant-ph → Physics
 *   q-bio.* → Biology / Quantitative Biology
 *   math.*  → Mathematics
 *   econ.*  → Economics
 *   stat.*  → Statistics / Math
 *   astro-ph.* → Astrophysics
 *
 * @param category - Raw ArXiv category code like "cs.AI" or "quant-ph"
 * @returns        - Short display name for the UI
 */
function mapArxivCategoryToDisplay(category: string): string {
  const lower = category.toLowerCase();

  // AI / Machine Learning — most specific, check first
  if (lower === "cs.ai" || lower === "cs.lg" || lower === "cs.ne") return "AI";

  // Computer Science general
  if (lower.startsWith("cs.")) return "CS";

  // Physics sub-fields
  if (
    lower.startsWith("physics") ||
    lower.startsWith("hep-") ||
    lower.startsWith("cond-mat") ||
    lower === "gr-qc" ||
    lower === "nucl-th" ||
    lower === "nucl-ex"
  ) return "Physics";

  // Quantum physics → Physics
  if (lower === "quant-ph") return "Physics";

  // Astrophysics
  if (lower.startsWith("astro-ph")) return "Astro";

  // Biology / Quantitative Biology
  if (lower.startsWith("q-bio")) return "Biology";

  // Mathematics
  if (lower.startsWith("math")) return "Math";

  // Economics
  if (lower.startsWith("econ")) return "Econ";

  // Statistics → Math (close enough for display)
  if (lower.startsWith("stat")) return "Math";

  // Electrical Engineering / Systems Science
  if (lower.startsWith("eess")) return "CS";

  // Quantitative Finance → Economics
  if (lower.startsWith("q-fin")) return "Econ";

  // Fallback: return the prefix before the dot, capitalised
  // e.g. "nlin.CD" → "Nlin"
  const prefix = category.split(".")[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
}
