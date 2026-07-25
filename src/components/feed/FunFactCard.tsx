"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunFactCardProps {
  text: string;
  className?: string;
}

export function FunFactCard({ text, className }: FunFactCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 relative overflow-hidden",
        "bg-gradient-to-br from-violet-900/80 to-fuchsia-900/80",
        "border border-violet-500/30",
        className
      )}
    >
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />

      <div className="relative flex gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          <Star size={16} className="fill-yellow-400 text-yellow-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-yellow-300 mb-1.5 tracking-wide uppercase">
            Fun Fact
          </p>
          <p className="text-sm text-white/90 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}
