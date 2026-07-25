"use client";

import { cn } from "@/lib/utils";

interface NeonBadgeProps {
  children: React.ReactNode;
  variant?: "pink" | "purple" | "blue" | "green";
  className?: string;
}

const variantStyles = {
  pink: "bg-neon-pink/20 text-neon-pink border-neon-pink/40",
  purple: "bg-neon-purple/20 text-neon-purple border-neon-purple/40",
  blue: "bg-neon-blue/20 text-neon-blue border-neon-blue/40",
  green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

export function NeonBadge({ children, variant = "pink", className }: NeonBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
