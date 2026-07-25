"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bookmark, MoreHorizontal } from "lucide-react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ConceptDiagram } from "@/components/feed/ConceptDiagram";
import { FunFactCard } from "@/components/feed/FunFactCard";
import { useLanguage } from "@/i18n/LanguageContext";
import type { FeedItem, TabId } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { useFeedStore } from "@/store/feedStore";

interface DetailScreenProps {
  item: FeedItem;
  onClose: () => void;
}

export function DetailScreen({ item, onClose }: DetailScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ringkasan");
  const { bookmarkedPapers, toggleBookmark } = useFeedStore();
  const { t } = useLanguage();
  const isBookmarked = bookmarkedPapers.has(item.paper.id);
  const ai = item.paper.ai_processed;

  // Tabs built inside component so they can use t()
  const TABS: { id: TabId; label: string }[] = [
    { id: "ringkasan", label: t("detail_tab_summary") },
    { id: "konsep",    label: t("detail_tab_concepts") },
    { id: "diagram",   label: t("detail_tab_diagram") },
    { id: "detail",    label: t("detail_tab_paper") },
  ];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-bg overflow-hidden"
    >
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleBookmark(item.paper.id)}
            className="w-9 h-9 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors"
            aria-label="Save"
          >
            <Bookmark
              size={18}
              className={cn(isBookmarked ? "fill-yellow-400 text-yellow-400" : "")}
            />
          </button>
          <button className="w-9 h-9 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-mono text-neon-pink">{item.paper.arxiv_id}</span>
          <span className="text-xs text-text-muted">{formatDate(item.paper.published_at)}</span>
        </div>
        <h1 className="text-xl font-bold leading-tight text-text-primary mb-1">
          {item.paper.title}
        </h1>
        <p className="text-sm text-text-secondary">{item.paper.institution}</p>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 border-b border-border flex-shrink-0">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-neon-pink tab-active"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "ringkasan" && <RingkasanTab item={item} />}
            {activeTab === "konsep" && <KonsepTab item={item} />}
            {activeTab === "diagram" && <DiagramTab item={item} />}
            {activeTab === "detail" && <DetailPaperTab item={item} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════
   TAB: Summary
═══════════════════════════════════ */
function RingkasanTab({ item }: { item: FeedItem }) {
  const ai = item.paper.ai_processed;
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      {ai?.diagram && ai.diagram.length > 0 && (
        <GlassPanel className="p-4">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-neon-pink">⬡</span> {t("detail_core_diagram")}
          </h3>
          <ConceptDiagram steps={ai.diagram} />
          {ai.ringkasan_panjang && (
            <p className="text-xs text-text-secondary mt-3 leading-relaxed border-t border-border pt-3">
              {ai.ringkasan_panjang}
            </p>
          )}
        </GlassPanel>
      )}

      {ai?.konsep_kunci && ai.konsep_kunci.length > 0 && (
        <GlassPanel className="p-4">
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-neon-purple">◎</span> {t("detail_key_concepts")}
          </h3>
          <div className="space-y-2.5">
            {ai.konsep_kunci.map((k, i) => (
              <div key={i} className="flex items-start gap-3">
                <NeonBadge variant={i % 2 === 0 ? "pink" : "purple"} className="flex-shrink-0 mt-0.5">
                  {k.term}
                </NeonBadge>
                <span className="text-sm text-text-secondary leading-relaxed">{k.definition}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {ai?.insight_personal && (
        <GlassPanel className="p-4" neon>
          <h3 className="text-sm font-bold text-neon-pink mb-2 flex items-center gap-2">
            <span>✦</span> {t("detail_your_insight")}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">{ai.insight_personal}</p>
          <button className="mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors">
            {t("detail_why_matches")}
          </button>
        </GlassPanel>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Concepts
═══════════════════════════════════ */
function KonsepTab({ item }: { item: FeedItem }) {
  const ai = item.paper.ai_processed;
  const { t } = useLanguage();
  if (!ai) return <EmptyState />;

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">{t("detail_key_concepts")}</h3>
        <div className="space-y-3">
          {ai.konsep_kunci.map((k, i) => (
            <div key={i} className="border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    i % 2 === 0 ? "bg-neon-pink" : "bg-neon-purple"
                  )}
                />
                <span className="text-sm font-bold text-text-primary">{k.term}</span>
              </div>
              <p className="text-sm text-text-secondary pl-4 leading-relaxed">{k.definition}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      {ai.fun_fact && <FunFactCard text={ai.fun_fact} />}
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Diagram
═══════════════════════════════════ */
function DiagramTab({ item }: { item: FeedItem }) {
  const ai = item.paper.ai_processed;
  const { t } = useLanguage();
  if (!ai?.diagram) return <EmptyState />;

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
          <span className="text-neon-pink">⬡</span> {t("detail_core_diagram")}
        </h3>
        <ConceptDiagram steps={ai.diagram} className="mb-4" />

        {/* Step descriptions */}
        <div className="space-y-3 border-t border-border pt-4">
          {ai.diagram.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-neon-pink/20 border border-neon-pink/40 text-neon-pink text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                <p className="text-xs text-text-secondary mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {ai.ringkasan_panjang && (
        <GlassPanel className="p-4">
          <p className="text-sm text-text-secondary leading-relaxed">{ai.ringkasan_panjang}</p>
        </GlassPanel>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Detail Paper
═══════════════════════════════════ */
function DetailPaperTab({ item }: { item: FeedItem }) {
  const { paper } = item;
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">{t("detail_paper_info")}</h3>
        <dl className="space-y-2.5">
          <DetailRow label={t("detail_arxiv_id")}    value={paper.arxiv_id} />
          <DetailRow label={t("detail_institution")} value={paper.institution} />
          <DetailRow label={t("detail_published")}   value={formatDate(paper.published_at)} />
          <DetailRow label={t("detail_authors")}     value={paper.authors.join(", ")} />
          <DetailRow label={t("detail_categories")}  value={paper.categories.join(" · ")} />
        </dl>
      </GlassPanel>

      <GlassPanel className="p-4">
        <h3 className="text-sm font-bold text-text-primary mb-2">{t("detail_abstract")}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{paper.abstract}</p>
      </GlassPanel>

      <div className="flex gap-3">
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-neon-pink text-sm font-semibold hover:bg-neon-pink/20 transition-colors"
        >
          {t("detail_open_arxiv")}
        </a>
        <a
          href={paper.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-sm font-semibold hover:bg-neon-purple/20 transition-colors"
        >
          {t("detail_download_pdf")}
        </a>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-text-muted w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-text-secondary flex-1">{value}</span>
    </div>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-muted">
      <p>{t("detail_no_data")}</p>
    </div>
  );
}
