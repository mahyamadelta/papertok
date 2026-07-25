"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryChipsProps {
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function CategoryChips({ active, onChange, className }: CategoryChipsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 no-scrollbar",
        className
      )}
      style={{ scrollbarWidth: "none" }}
    >
      {CATEGORIES.map((cat: Category) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            active === cat.id
              ? "chip-active text-white glow-pink"
              : "bg-surface border border-border text-text-secondary hover:border-neon-pink/50 hover:text-text-primary"
          )}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
