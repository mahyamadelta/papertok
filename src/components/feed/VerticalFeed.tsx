/**
 * VerticalFeed.tsx — Container feed vertikal (scroll-snap ala TikTok)
 *
 * Cara kerja:
 * 1. Ambil data feed dari Zustand store (paper real dari ArXiv/OpenAlex)
 * 2. Render setiap FeedCard dalam container scroll-snap
 * 3. IntersectionObserver mendeteksi kartu yang sedang aktif
 * 4. Saat user hampir sampai akhir, fetch lebih banyak paper (infinite scroll)
 * 5. Setiap kartu aktif berubah → kirim event "view" ke backend
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { FeedCard } from "@/components/feed/FeedCard";
import { useFeedStore } from "@/store/feedStore";
import type { FeedItem } from "@/types";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { MOCK_FEED } from "@/lib/mockData";

interface VerticalFeedProps {
  onOpenDetail: (item: FeedItem) => void;
}

/**
 * Menambahkan lebih banyak item ke daftar lokal untuk infinite scroll.
 *
 * Strategi:
 * 1. Kalau store punya lebih banyak paper dari yang ditampilkan → pakai itu
 * 2. Kalau sudah habis → ulangi paper yang ada dengan ID unik (tetap bisa scroll)
 *
 * @param current   - Daftar item yang sedang ditampilkan
 * @param storePool - Semua paper yang ada di store
 */
function extendFeed(current: FeedItem[], storePool: FeedItem[]): FeedItem[] {
  const existingIds = new Set(current.map((i) => i.paper.id));

  // Ambil paper dari store yang belum ada di daftar tampil
  const newFromStore = storePool.filter((i) => !existingIds.has(i.paper.id));

  if (newFromStore.length > 0) {
    // Masih ada paper baru di store — tambahkan sampai 5 per batch
    return [...current, ...newFromStore.slice(0, 5)];
  }

  // Store sudah habis — recycle pool dengan ID unik supaya bisa scroll terus
  // Pakai seluruh pool (store kalau ada, fallback ke mock)
  const recyclePool = storePool.length > 0 ? storePool : MOCK_FEED;
  const pass        = Math.floor(current.length / recyclePool.length);

  // Filter out the last 3 papers shown so we don't immediately repeat them
  const lastFewIds = new Set(current.slice(-3).map((i) => i.paper.id.split("-r")[0]));
  const availablePool = recyclePool.filter((i) => !lastFewIds.has(i.paper.id));
  
  // Pilih 5 item acak dari pool yang tersisa
  const shuffledPool = [...availablePool].sort(() => Math.random() - 0.5);
  const batch       = shuffledPool.slice(0, 5).map((i, idx) => ({
    ...i,
    // Tambahkan Math.random() di akhir ID supaya selalu unik meskipun di-shuffle berulang kali
    paper: { ...i.paper, id: `${i.paper.id}-r${pass}-${idx}-${Math.floor(Math.random() * 10000)}` },
  }));

  return [...current, ...batch];
}

export function VerticalFeed({ onOpenDetail }: VerticalFeedProps) {
  const { items, currentIndex, setCurrentIndex, isLoading, fetchFeed, activeCategory } =
    useFeedStore();

  // ── Background image pre-generation ────────────────────────────────────────
  // This hook watches the store for papers without images and generates them
  // in the background using HuggingFace. Images appear progressively as they
  // are ready — no user-facing wait time.
  useImagePreloader();

  const containerRef     = useRef<HTMLDivElement>(null);
  const slideRefs        = useRef<(HTMLDivElement | null)[]>([]);
  const [localItems, setLocalItems] = useState<FeedItem[]>([]);
  const isLoadingMore    = useRef(false);
  const prevCategoryRef  = useRef(activeCategory);

  // ── Bootstrap: fetch paper saat pertama kali mount ─────────────────────────
  useEffect(() => {
    if (items.length === 0) {
      fetchFeed().catch(() => {
        useFeedStore.setState({ items: MOCK_FEED, isLoading: false });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync localItems dengan store ────────────────────────────────────────────
  // Jalankan saat: store items berubah (fetch selesai, kategori ganti)
  useEffect(() => {
    const source      = items.length > 0 ? items : MOCK_FEED;
    const catChanged  = prevCategoryRef.current !== activeCategory;
    prevCategoryRef.current = activeCategory;

    if (localItems.length === 0 || catChanged) {
      // Inisialisasi awal atau ganti kategori — reset total
      setLocalItems(extendFeed(source, source));
    } else {
      // Store diupdate (misal selesai fetch atau ada update gambar AI)
      // Jaga posisi scroll tidak loncat, tapi sinkronkan data paper yang ada
      setLocalItems((prev) => {
        // 1. Update data paper yang sudah ada di localItems
        const updatedPrev = prev.map((localItem) => {
          // Tangani ID recycle (contoh: "1234.5678-r1-0")
          const baseId = localItem.paper.id.split("-r")[0];
          const updatedSourceItem = source.find((s) => s.paper.id === baseId);
          if (updatedSourceItem) {
            // Update data paper (seperti image_url) tapi pertahankan ID lokal
            return {
              ...localItem,
              paper: { ...updatedSourceItem.paper, id: localItem.paper.id },
            };
          }
          return localItem;
        });

        // 2. Tambahkan paper yang benar-benar baru dari store
        const existingBaseIds = new Set(prev.map((i) => i.paper.id.split("-r")[0]));
        const incoming = source.filter((i) => !existingBaseIds.has(i.paper.id));

        // Jika tidak ada paper baru tapi ada update gambar, kita harus return reference baru
        // agar React melakukan re-render.
        return [...updatedPrev, ...incoming];
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeCategory]);

  // ── IntersectionObserver: deteksi kartu aktif & trigger infinite scroll ─────
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const idx = slideRefs.current.findIndex((el) => el === entry.target);
        if (idx === -1 || idx === currentIndex) return;

        setCurrentIndex(idx);

        // Tambah lebih banyak item kalau tinggal 3 slide lagi
        if (idx >= localItems.length - 3 && !isLoadingMore.current) {
          isLoadingMore.current = true;
          setLocalItems((prev) => {
            const storePool = useFeedStore.getState().items;
            const next      = extendFeed(prev, storePool.length > 0 ? storePool : MOCK_FEED);
            isLoadingMore.current = false;
            return next;
          });
        }
      });
    },
    [currentIndex, setCurrentIndex, localItems.length]
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root,
      threshold: 0.6,
    });

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [localItems, handleIntersect]);

  // ── Loading screen — tampil hanya saat fetch pertama kali ──────────────────
  if (isLoading && localItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-neon-pink border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm">Loading papers for you…</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="feed-container">
      {localItems.map((item, index) => (
        <div
          key={`${item.paper.id}-${index}`}
          ref={(el: HTMLDivElement | null) => {
            slideRefs.current[index] = el;
          }}
          className="feed-slide"
        >
          <FeedCard
            item={item}
            isActive={index === currentIndex}
            onOpenDetail={onOpenDetail}
          />
        </div>
      ))}
    </div>
  );
}
