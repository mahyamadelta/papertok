/**
 * FeedCard.tsx — Kartu Paper utama di feed vertikal (ala TikTok)
 *
 * Ini komponen terpenting di app. Satu FeedCard = satu paper ilmiah.
 * Yang ditampilkan di kartu ini (dari atas ke bawah):
 * - Hero image (gambar cover) atau gradient + emoji kalau tidak ada gambar
 * - Badge kategori & sumber jurnal
 * - Judul paper + institusi
 * - "Inti Penelitian" (ringkasan AI) dengan highlight kata kunci
 * - ConceptDiagram (Input → Process → Output)
 * - Hasil utama (bullet points)
 * - FunFactCard (fakta menarik)
 * - Tombol "View Paper Details" → buka DetailScreen
 * - ActionSidebar (like, comment, bookmark, share) di kanan
 *
 * Animasi: framer-motion stagger (elemen muncul satu-per-satu saat kartu aktif)
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Clapperboard } from "lucide-react";
import Image from "next/image";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { FunFactCard } from "@/components/feed/FunFactCard";
import { ConceptDiagram } from "@/components/feed/ConceptDiagram";
import { ActionSidebar } from "@/components/feed/ActionSidebar";
import { StoryPlayer } from "@/components/feed/StoryPlayer";
import { useLanguage } from "@/i18n/LanguageContext";
import type { FeedItem, VideoStory } from "@/types";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  item: FeedItem;
  isActive: boolean;
  onOpenDetail: (item: FeedItem) => void;
}

// Source → accent colour used in the journal badge
const SOURCE_VARIANT: Record<string, "pink" | "purple" | "blue" | "green"> = {
  "arXiv":            "purple",
  "PLOS ONE":         "green",
  "Europe PMC":       "blue",
  "DOAJ":             "pink",
  "Semantic Scholar": "blue",
};

// Category placeholder colours for cards without an AI-generated image
const PLACEHOLDER_GRAD: Record<string, string> = {
  AI:       "from-violet-900/80 to-blue-900/80",
  Biology:  "from-emerald-900/80 to-teal-900/80",
  Physics:  "from-blue-900/80 to-indigo-900/80",
  Math:     "from-rose-900/80 to-pink-900/80",
  CS:       "from-cyan-900/80 to-blue-900/80",
  Astro:    "from-indigo-900/80 to-purple-900/80",
  Econ:     "from-amber-900/80 to-orange-900/80",
  Medicine: "from-red-900/80 to-rose-900/80",
  default:  "from-zinc-900/80 to-slate-900/80",
};

const PLACEHOLDER_EMOJI: Record<string, string> = {
  AI: "🤖", Biology: "🧬", Physics: "⚛️", Math: "📐",
  CS: "💻", Astro: "🔭", Econ: "📈", Medicine: "🏥", default: "📄",
};

function getPrimaryCategory(cats: string[]): string {
  for (const c of cats) {
    if (c in PLACEHOLDER_GRAD) return c;
  }
  return "default";
}

export function FeedCard({ item, isActive, onOpenDetail }: FeedCardProps) {
  const { paper } = item;
  const ai = paper.ai_processed;
  const { t } = useLanguage();
  const [imgError,      setImgError]      = useState(false);
  const [showStory,     setShowStory]     = useState(false);
  // Menyimpan story yang sudah di-generate — di-cache di sini supaya tidak generate ulang
  // kalau user tutup & buka lagi StoryPlayer di kartu yang sama
  const [cachedStory,   setCachedStory]   = useState<VideoStory | null>(paper.video_story ?? null);

  const primaryCat   = getPrimaryCategory(paper.categories);
  const gradClass    = PLACEHOLDER_GRAD[primaryCat];
  const emoji        = PLACEHOLDER_EMOJI[primaryCat] ?? "📄";
  const journalSrc   = paper.journal_source ?? "arXiv";
  const journalBadge = SOURCE_VARIANT[journalSrc] ?? "purple";
  const showImage    = !!paper.image_url && !imgError;

  return (
    <div className="feed-slide relative flex flex-col bg-bg overflow-hidden">
      {/* ── Hero image / gradient banner ── */}
      <div className="relative w-full flex-shrink-0" style={{ height: "38%" }}>
        <AnimatePresence mode="wait">
          {showImage ? (
            <motion.div
              key="hero-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={paper.image_url!}
                alt={paper.title}
                fill
                className="object-cover"
                onError={() => setImgError(true)}
                unoptimized // data-URIs aren't processed by next/image optimiser
              />
            </motion.div>
          ) : (
            <motion.div
              key="hero-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "w-full h-full flex items-center justify-center bg-gradient-to-br",
                gradClass
              )}
            >
              <span className="text-6xl opacity-70 select-none">{emoji}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom gradient fade into card body */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent pointer-events-none" />

        {/* Journal + category badges overlaid top-right */}
        <motion.div
          initial={isActive ? { opacity: 0, y: -6 } : false}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end"
        >
          <NeonBadge variant={journalBadge}>{journalSrc}</NeonBadge>
          {paper.categories.slice(0, 2).map((cat) => (
            <NeonBadge key={cat} variant={cat === "AI" ? "pink" : "purple"}>
              {cat}
            </NeonBadge>
          ))}
        </motion.div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        className="relative z-10 flex-1 overflow-y-auto px-4 pt-3 pb-28"
        style={{ scrollbarWidth: "none" }}
      >
        {/* ── Header ── */}
        <motion.div
          initial={isActive ? { opacity: 0, y: 10 } : false}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-3"
        >
          <span className="text-xs font-mono text-text-muted block mb-1">
            {paper.arxiv_id}
          </span>
          <h2 className="text-[20px] font-bold leading-tight text-text-primary mb-0.5">
            {paper.title}
          </h2>
          <p className="text-sm text-text-secondary">{paper.institution}</p>
        </motion.div>

        {/* ── Core Research ── */}
        {/*
         * If AI has finished processing → show the rich inti_penelitian summary.
         * If AI is still null (paper just fetched, not yet enriched) → fall back
         * to the raw abstract so the card is never blank for the user.
         */}
        <motion.div
          initial={isActive ? { opacity: 0, y: 14 } : false}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3, delay: 0.14 }}
          className="mb-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
            <h3 className="text-sm font-bold text-neon-pink uppercase tracking-wider">
              {ai ? t("card_core_research") : t("card_abstract")}
            </h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {ai
              ? highlightKeywords(ai.inti_penelitian)
              : (paper.abstract?.slice(0, 400).concat(
                  paper.abstract.length > 400 ? "…" : ""
                ) ?? t("card_no_summary"))}
          </p>
        </motion.div>

        {/* ── Concept Diagram ── */}
        {ai?.diagram && ai.diagram.length > 0 && (
          <motion.div
            initial={isActive ? { opacity: 0, y: 14 } : false}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.21 }}
            className="mb-4"
          >
            <ConceptDiagram steps={ai.diagram} />
          </motion.div>
        )}

        {/* ── Key Results ── */}
        {ai?.hasil_utama && ai.hasil_utama.length > 0 && (
          <motion.div
            initial={isActive ? { opacity: 0, y: 14 } : false}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.28 }}
            className="mb-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-neon-purple" />
              <h3 className="text-sm font-bold text-neon-purple uppercase tracking-wider">
                {t("card_key_results")}
              </h3>
            </div>
            <ul className="space-y-1.5">
              {ai.hasil_utama.map((result, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="text-neon-purple mt-0.5 flex-shrink-0">•</span>
                  <span>{result}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* ── Fun Fact ── */}
        {ai?.fun_fact && (
          <motion.div
            initial={isActive ? { opacity: 0, y: 14 } : false}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="mb-4"
          >
            <FunFactCard text={ai.fun_fact} />
          </motion.div>
        )}

        {/* ── CTA buttons: Watch Story + View Details ── */}
        <motion.div
          initial={isActive ? { opacity: 0 } : false}
          animate={isActive ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.44 }}
          className="flex gap-2"
        >
          {/* ── Watch Story — tombol utama fitur baru ── */}
          {/*
           * Tombol ini membuka StoryPlayer — sebuah "video" storytelling
           * yang berisi 5 scene narasi + gambar + Web Speech TTS.
           *
           * Pertama kali tap: Gemini generate skrip + HuggingFace generate 5 gambar
           * (sekitar 30–90 detik tergantung koneksi dan HuggingFace warmup).
           *
           * Tap berikutnya: langsung putar dari cache, tidak generate ulang.
           */}
          <button
            onClick={() => setShowStory(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl",
              "bg-neon-pink/20 border border-neon-pink/50 text-neon-pink text-sm font-bold",
              "hover:bg-neon-pink/30 active:scale-95 transition-all duration-150"
            )}
          >
            <Clapperboard size={15} />
            {cachedStory ? t("card_watch_story_cached") : t("card_watch_story")}
          </button>

          {/* ── View Paper Details ── */}
          <button
            onClick={() => onOpenDetail(item)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl",
              "border border-neon-pink/30 text-neon-pink text-sm font-semibold",
              "hover:bg-neon-pink/10 active:scale-95 transition-all duration-150"
            )}
          >
            <ExternalLink size={15} />
            {t("card_details")}
          </button>
        </motion.div>
      </div>

      {/* ── Action Sidebar ── */}
      <ActionSidebar item={item} />

      {/* ── Swipe hint ── */}
      <motion.div
        initial={isActive ? { opacity: 0 } : false}
        animate={isActive ? { opacity: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-20 pointer-events-none"
      >
        <p className="text-xs text-text-muted">{t("card_swipe_hint")}</p>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M2 2l6 6 6-6" stroke="#5a5a7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* ── Story Player — muncul sebagai full-screen overlay ── */}
      {/*
       * AnimatePresence dari framer-motion diperlukan supaya animasi keluar (exit)
       * berjalan dengan benar saat showStory berubah dari true ke false.
       */}
      <AnimatePresence>
        {showStory && (
          <StoryPlayer
            paper={{ ...paper, video_story: cachedStory }}
            onClose={() => setShowStory(false)}
            onStorySaved={(story) => {
              // Simpan ke local state — replay tidak akan generate ulang
              setCachedStory(story);
              // Juga update paper object supaya kalau kartu di-remount, story masih ada
              paper.video_story = story;
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline keyword highlighting
function highlightKeywords(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <span key={i} className="text-neon-pink font-semibold">{part.slice(2, -2)}</span>;
    if (part.startsWith("[") && part.endsWith("]"))
      return <span key={i} className="text-neon-purple font-medium">{part.slice(1, -1)}</span>;
    return part;
  });
}
