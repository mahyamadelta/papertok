"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiagramStep } from "@/types";

interface ConceptDiagramProps {
  steps: DiagramStep[];
  className?: string;
}

const stepColors = {
  input: {
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
    label: "text-blue-400",
    dot: "bg-blue-400",
  },
  process: {
    border: "border-neon-purple/50",
    bg: "bg-neon-purple/10",
    label: "text-neon-purple",
    dot: "bg-neon-purple",
  },
  output: {
    border: "border-neon-pink/50",
    bg: "bg-neon-pink/10",
    label: "text-neon-pink",
    dot: "bg-neon-pink",
  },
} as const;

export function ConceptDiagram({ steps, className }: ConceptDiagramProps) {
  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      {steps.map((step, i) => {
        const colors = stepColors[step.position];
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            {/* Step card */}
            <div
              className={cn(
                "flex-1 rounded-xl border p-3 flex flex-col items-center text-center gap-1.5 min-h-[80px] justify-center",
                colors.border,
                colors.bg
              )}
            >
              {/* Visual placeholder – in prod: swap with AI-generated SVG icon */}
              <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center mb-0.5">
                <div className={cn("w-3 h-3 rounded-full", colors.dot)} />
              </div>
              <span className={cn("text-xs font-bold leading-tight", colors.label)}>
                {step.label}
              </span>
              <span className="text-[10px] text-text-secondary leading-tight">
                {step.sublabel}
              </span>
            </div>

            {/* Arrow connector */}
            {i < steps.length - 1 && (
              <ArrowRight size={14} className="text-text-muted flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
