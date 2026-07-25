"use client";

import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  neon?: boolean;
}

export function GlassPanel({ children, className, neon }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/80 backdrop-blur-sm",
        neon ? "border-neon-pink/30" : "border-border",
        className
      )}
    >
      {children}
    </div>
  );
}
