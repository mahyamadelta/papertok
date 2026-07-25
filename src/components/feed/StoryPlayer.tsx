/**
 * StoryPlayer.tsx — Animated Story Player
 * =========================================
 *
 * Komponen ini adalah "video player" untuk story paper ilmiah.
 * Karena kita tidak pakai video file sungguhan (.mp4), komponen ini
 * mensimulasikan pengalaman video dengan:
 *
 *   - Gambar SDXL (1 per scene) yang slide berganti dengan animasi CSS
 *   - Narasi dibacakan oleh Web Speech API (built-in browser, gratis)
 *   - Progress bar berjalan sinkron dengan durasi audio
 *   - Scene indicator (titik-titik di bawah) menunjukkan posisi aktif
 *   - Tombol Play / Pause / Replay
 *   - Swipe/tap untuk skip scene berikutnya
 *
 * LIFECYCLE:
 *   1. User tap "Watch Story" di FeedCard
 *   2. StoryPlayer muncul (slide dari bawah, framer-motion)
 *   3. Kalau story belum ada → panggil generateStory() (loading screen)
 *   4. Kalau story sudah ada → langsung play
 *   5. Tiap scene: tampilkan gambar → jalankan narasi TTS → progress bar habis → scene berikutnya
 *   6. Scene terakhir selesai → tampilkan layar "Story Selesai"
 *
 * CATATAN WEB SPEECH API:
 *   - Gratis, built-in di semua browser modern
 *   - Kualitas suara tergantung OS/browser — Chrome lebih bagus dari Firefox
 *   - Di iOS Safari perlu gesture user untuk mulai (sudah di-handle dengan tombol Play)
 *   - Bahasa: id-ID (Indonesia) — fallback ke en-US kalau tidak tersedia
 *
 * UPGRADE PATH:
 *   Untuk upgrade ke Gemini TTS nanti:
 *   1. Ganti fungsi speakNarration() → pakai audio element dengan URL dari /api/ai TTS
 *   2. Tidak perlu ubah komponen lain
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Loader2 } from "lucide-react";
import Image from "next/image";
import type { ArxivPaper, VideoStory } from "@/types";
import { generateStory } from "@/services/ai/storyService";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StoryPlayerProps {
  /** Paper yang akan dijadikan story */
  paper: ArxivPaper;
  /** Callback untuk menutup player */
  onClose: () => void;
  /**
   * Callback untuk menyimpan story yang sudah di-generate ke paper.video_story
   * supaya tidak perlu generate ulang kalau user buka lagi.
   */
  onStorySaved: (story: VideoStory) => void;
}

// ---------------------------------------------------------------------------
// Warna per scene index (untuk background kalau gambar belum ada / gagal)
// ---------------------------------------------------------------------------

const SCENE_GRADIENTS = [
  "from-violet-900 via-purple-900 to-blue-900",    // Hook — misterius
  "from-red-900 via-rose-900 to-pink-900",          // Masalah — tegang
  "from-cyan-900 via-teal-900 to-emerald-900",      // Metode — proses
  "from-amber-900 via-orange-900 to-yellow-900",    // Hasil — wow
  "from-indigo-900 via-blue-900 to-violet-900",     // Takeaway — inspiratif
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StoryPlayer({ paper, onClose, onStorySaved }: StoryPlayerProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [story,        setStory]        = useState<VideoStory | null>(paper.video_story ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress,  setGenProgress]  = useState(0);
  const [genMessage,   setGenMessage]   = useState("");
  const { t } = useLanguage();
  const [genError,     setGenError]     = useState(false);

  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [progress,     setProgress]     = useState(0); // 0–1 progress bar scene aktif
  const [isFinished,   setIsFinished]   = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const speechRef     = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef   = useRef(0);    // mirror progress untuk avoid stale closure
  const sceneRef      = useRef(0);    // mirror currentScene
  const playingRef    = useRef(false); // mirror isPlaying

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Hentikan semua TTS dan timer yang sedang berjalan */
  const stopAll = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    playingRef.current = false;
  }, []);

  /** Membacakan teks dengan Web Speech API */
  const speakNarration = useCallback((text: string, durationSec: number, onDone: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      // Browser tidak support Web Speech — langsung panggil onDone setelah durasi
      timerRef.current = setTimeout(onDone, durationSec * 1000) as unknown as ReturnType<typeof setInterval>;
      return;
    }

    window.speechSynthesis.cancel(); // Hentikan narasi sebelumnya kalau ada

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    // ── Pilih suara Indonesia kalau tersedia ──────────────────────────────
    // Web Speech API pilih suara dari OS. Kualitas bervariasi per browser/OS.
    // id-ID tersedia di Chrome di Windows & Android. Fallback ke en-US.
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.startsWith("id"));
    if (idVoice) {
      utterance.voice = idVoice;
      utterance.lang  = "id-ID";
    } else {
      utterance.lang  = "en-US";
    }

    utterance.rate   = 0.95;  // sedikit lebih lambat dari default — lebih mudah didengar
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;

    utterance.onend     = () => { if (playingRef.current) onDone(); };
    utterance.onerror   = () => { if (playingRef.current) onDone(); };

    window.speechSynthesis.speak(utterance);
  }, []);

  /** Mulai scene tertentu: set state, jalankan progress bar + TTS */
  const startScene = useCallback((idx: number, storyData: VideoStory) => {
    if (idx >= storyData.scenes.length) {
      // Semua scene selesai
      stopAll();
      setIsPlaying(false);
      setIsFinished(true);
      return;
    }

    const scene    = storyData.scenes[idx];
    const duration = (scene.duration_seconds ?? 12) * 1000; // ms

    setCurrentScene(idx);
    sceneRef.current   = idx;
    setProgress(0);
    progressRef.current = 0;

    // Progress bar: update setiap 100ms
    const startTime = Date.now();
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p       = Math.min(elapsed / duration, 1);
      progressRef.current = p;
      setProgress(p);

      if (p >= 1) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
      }
    }, 100);

    // TTS narasi — saat selesai, maju ke scene berikutnya
    speakNarration(scene.narration, scene.duration_seconds, () => {
      startScene(idx + 1, storyData);
    });
  }, [stopAll, speakNarration]);

  // ── Generate story kalau belum ada ────────────────────────────────────────
  useEffect(() => {
    if (story) return; // sudah ada, tidak perlu generate

    setIsGenerating(true);
    setGenError(false);

    generateStory(paper, (progress, message) => {
      setGenProgress(progress);
      setGenMessage(message);
    }).then((result) => {
      setIsGenerating(false);
      if (result) {
        setStory(result);
        onStorySaved(result); // simpan ke parent supaya tidak generate ulang
      } else {
        setGenError(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup saat unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // ── Voices mungkin belum loaded saat mount — onvoiceschanged ──────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {}; // trigger load
    }
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────

  const handlePlay = () => {
    if (!story) return;
    if (isFinished) {
      // Replay dari scene pertama — reset semua state dulu, lalu mulai scene 0
      setIsFinished(false);
      setCurrentScene(0);
      sceneRef.current = 0;
      setProgress(0);
      progressRef.current = 0;
      setIsPlaying(true);
      playingRef.current = true;
      startScene(0, story);
      return;
    }
    setIsPlaying(true);
    playingRef.current = true;
    startScene(currentScene, story);
  };

  const handlePause = () => {
    stopAll();
    setIsPlaying(false);
  };

  const handleReplay = () => {
    if (!story) return;
    stopAll();
    setIsFinished(false);
    setCurrentScene(0);
    setProgress(0);
    setIsPlaying(true);
    playingRef.current = true;
    startScene(0, story);
  };

  const handleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (typeof window !== "undefined" && speechRef.current) {
      speechRef.current.volume = newMuted ? 0 : 1;
    }
  };

  const handleNextScene = () => {
    if (!story) return;
    const next = currentScene + 1;
    if (next >= story.scenes.length) return;
    stopAll();
    if (isPlaying) {
      playingRef.current = true;
      setIsPlaying(true);
      startScene(next, story);
    } else {
      setCurrentScene(next);
      sceneRef.current = next;
      setProgress(0);
    }
  };

  const handleSceneDot = (idx: number) => {
    if (!story) return;
    stopAll();
    setIsFinished(false);
    setProgress(0);
    if (isPlaying) {
      playingRef.current = true;
      setIsPlaying(true);
      startScene(idx, story);
    } else {
      setCurrentScene(idx);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 flex flex-col bg-black overflow-hidden"
    >
      {/* ── Close button (top-right) ── */}
      <button
        onClick={() => { stopAll(); onClose(); }}
        className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center"
        aria-label="Tutup story"
      >
        <X size={18} className="text-white" />
      </button>

      {/* ═══════════════════════════════════
          LOADING STATE — sedang generate
      ════════════════════════════════════ */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
          <div className="relative w-20 h-20">
            <div className="w-20 h-20 rounded-full border-4 border-white/10" />
            <div
              className="absolute inset-0 rounded-full border-4 border-t-neon-pink border-r-transparent border-b-transparent border-l-transparent animate-spin"
            />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base mb-1">{t("story_generating")}</p>
            <p className="text-white/60 text-sm">{genMessage || t("story_generating_desc")}</p>
          </div>
          {/* Progress bar */}
          <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-neon-pink rounded-full"
              animate={{ width: `${genProgress * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-white/30 text-xs text-center max-w-xs">
            {t("story_one_time_note")}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════
          ERROR STATE — generate gagal
      ════════════════════════════════════ */}
      {genError && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
          <span className="text-4xl">😞</span>
          <p className="text-white font-bold">{t("story_error_title")}</p>
          <p className="text-white/50 text-sm">
            {t("story_error_desc")}
          </p>
          <button
            onClick={() => { setGenError(false); setIsGenerating(true); setGenProgress(0); }}
            className="mt-2 px-5 py-2.5 rounded-xl bg-neon-pink/20 border border-neon-pink/40 text-neon-pink text-sm font-semibold"
          >
            {t("story_error_retry")}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════
          STORY PLAYER — story sudah siap
      ════════════════════════════════════ */}
      {story && !isGenerating && !genError && (
        <>
          {/* ── Scene visual (background) ── */}
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {story.scene_images[currentScene] ? (
                  <Image
                    src={story.scene_images[currentScene]!}
                    alt={story.scenes[currentScene]?.title ?? ""}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className={cn(
                      "w-full h-full bg-gradient-to-br",
                      SCENE_GRADIENTS[currentScene] ?? SCENE_GRADIENTS[0]
                    )}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Overlay gelap di bawah untuk baca teks */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            {/* Overlay gelap di atas */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
          </div>

          {/* ── Story title (top) ── */}
          <div className="relative z-10 px-5 pt-5 pb-2">
            <p className="text-white/60 text-xs font-mono uppercase tracking-widest mb-0.5">
              {t("story_label")}
            </p>
            <p className="text-white font-bold text-sm line-clamp-1 pr-12">
              {story.story_title}
            </p>
          </div>

          {/* ── Scene progress bar (top) ── */}
          <div className="relative z-10 flex gap-1.5 px-5 pb-3">
            {story.scenes.map((_, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full bg-white/25 overflow-hidden"
              >
                <motion.div
                  className="h-full bg-white rounded-full"
                  animate={{
                    width: i < currentScene
                      ? "100%"
                      : i === currentScene
                        ? `${progress * 100}%`
                        : "0%",
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            ))}
          </div>

          {/* ── Tap zone: ketuk kiri/kanan untuk prev/next scene ── */}
          <div className="absolute inset-0 z-10 flex">
            <div
              className="flex-1"
              onClick={() => {
                if (currentScene > 0) handleSceneDot(currentScene - 1);
              }}
            />
            <div className="flex-1" onClick={handleNextScene} />
          </div>

          {/* ── Content bawah (narasi + kontrol) ── */}
          <div className="relative z-20 mt-auto px-5 pb-10 pt-4">

            {/* Scene label + indicator dots */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-neon-pink uppercase tracking-wider">
                {story.scenes[currentScene]?.title ?? `Scene ${currentScene + 1}`}
              </span>
              <span className="text-white/30 text-xs">
                {currentScene + 1} / {story.scenes.length}
              </span>
            </div>

            {/* Teks narasi — animasi key berubah tiap scene */}
            <AnimatePresence mode="wait">
              <motion.p
                key={currentScene}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-white text-[16px] font-medium leading-relaxed mb-5 line-clamp-5"
              >
                {story.scenes[currentScene]?.narration ?? ""}
              </motion.p>
            </AnimatePresence>

            {/* Controls row */}
            <div className="flex items-center justify-between">

              {/* Scene dots */}
              <div className="flex gap-1.5">
                {story.scenes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleSceneDot(i)}
                    className={cn(
                      "rounded-full transition-all duration-200",
                      i === currentScene
                        ? "w-5 h-2 bg-white"
                        : "w-2 h-2 bg-white/40 hover:bg-white/60"
                    )}
                    aria-label={`Scene ${i + 1}`}
                  />
                ))}
              </div>

              {/* Play / Pause / Replay + Mute */}
              <div className="flex items-center gap-3">
                {/* Mute */}
                <button
                  onClick={handleMute}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted
                    ? <VolumeX size={18} className="text-white/60" />
                    : <Volume2 size={18} className="text-white" />
                  }
                </button>

                {/* Replay */}
                <button
                  onClick={handleReplay}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                  aria-label="Replay dari awal"
                >
                  <RotateCcw size={18} className="text-white" />
                </button>

                {/* Play / Pause — tombol utama (lebih besar) */}
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="w-14 h-14 rounded-full bg-neon-pink border-2 border-neon-pink/50 flex items-center justify-center shadow-lg"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying
                    ? <Pause size={22} className="text-white fill-white" />
                    : <Play  size={22} className="text-white fill-white ml-0.5" />
                  }
                </button>
              </div>
            </div>

            {/* Pesan "Story Selesai" */}
            <AnimatePresence>
              {isFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-10 pt-4 bg-black/80"
                >
                  <p className="text-white font-bold mb-1">{t("story_finished_title")}</p>
                  <p className="text-white/50 text-xs mb-4">
                    {story.story_title}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReplay}
                      className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold flex items-center gap-2"
                    >
                      <RotateCcw size={15} /> {t("story_finished_replay")}
                    </button>
                    <button
                      onClick={() => { stopAll(); onClose(); }}
                      className="px-5 py-2.5 rounded-xl bg-neon-pink text-white text-sm font-semibold"
                    >
                      {t("story_finished_close")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}
