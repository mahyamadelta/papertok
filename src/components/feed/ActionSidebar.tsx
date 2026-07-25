"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedStore } from "@/store/feedStore";
import { logInteraction } from "@/lib/api";
import type { FeedItem } from "@/types";

interface ActionSidebarProps {
  item: FeedItem;
  onCommentClick?: () => void;
}

export function ActionSidebar({ item, onCommentClick }: ActionSidebarProps) {
  const { likedPapers, bookmarkedPapers, toggleLike, toggleBookmark } = useFeedStore();
  const paperId = item.paper.id;
  const isLiked = likedPapers.has(paperId);
  const isBookmarked = bookmarkedPapers.has(paperId);

  return (
    <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-20">
      {/* Like */}
      <ActionButton
        onClick={() => toggleLike(paperId)}
        active={isLiked}
        activeColor="text-neon-pink"
        label="Like paper"
      >
        <motion.div
          animate={isLiked ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Heart
            size={28}
            className={cn(
              "transition-colors",
              isLiked ? "fill-neon-pink text-neon-pink" : "text-white"
            )}
          />
        </motion.div>
      </ActionButton>

      {/* Comments */}
      <ActionButton onClick={onCommentClick} label="Comments">
        <MessageCircle size={28} className="text-white" />
      </ActionButton>

      {/* Bookmark */}
      <ActionButton
        onClick={() => toggleBookmark(paperId)}
        active={isBookmarked}
        activeColor="text-yellow-400"
        label="Save paper"
      >
        <motion.div
          animate={isBookmarked ? { scale: [1, 1.3, 0.95, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Bookmark
            size={28}
            className={cn(
              "transition-colors",
              isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-white"
            )}
          />
        </motion.div>
      </ActionButton>
    </div>
  );
}

interface ActionButtonProps {
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
  label: string;
  children: React.ReactNode;
}

function ActionButton({
  onClick,
  active,
  activeColor = "text-neon-pink",
  label,
  children,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center group"
      aria-label={label}
    >
      <motion.div
        whileTap={{ scale: 0.85 }}
        className={cn(
          "w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all duration-200",
          active ? activeColor : "group-hover:bg-white/10"
        )}
      >
        {children}
      </motion.div>
    </button>
  );
}
