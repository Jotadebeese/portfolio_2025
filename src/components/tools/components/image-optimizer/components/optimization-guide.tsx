"use client";

import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Sparkles, Zap, Layers, Smartphone } from "lucide-react";
import clsx from "clsx";

export default function OptimizationGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-border-color bg-white flex flex-col rounded-md border border-dashed transition-all">
      {/* Header / Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between gap-2 p-3 text-left transition-all hover:bg-utils-scent-gray-01/15"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="text-utils-scent-orange h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            Web Image Optimization Cheatsheet & Best Practices
          </span>
          <span className="bg-utils-scent-gray-01/60 text-foreground/80 hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            Core Web Vitals (LCP)
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-foreground/60">
          <span className="text-[11px]">{isOpen ? "Hide Guide" : "Read Guide"}</span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {/* Expandable Guide Body */}
      {isOpen && (
        <div className="border-border-color border-t border-dashed p-3.5 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Column 1: Modern Formats */}
            <div className="border-border-color bg-background/40 flex flex-col gap-2 rounded-md border border-dashed p-3">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Layers className="text-code-blue h-3.5 w-3.5 shrink-0" />
                <span>Format Selection</span>
              </div>
              <ul className="text-foreground/80 space-y-2 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-foreground font-mono">WebP (Recommended):</strong>{" "}
                  Universal 97%+ browser support. Replaces both PNG and JPEG with alpha transparency and ~30% smaller file sizes.
                  <span className="text-foreground/60 mt-0.5 block text-[10px]">
                    *Note: Apple&apos;s WebKit engine does not support WebP canvas encoding; our tool automatically falls back to JPEG on iPhone/iPad to ensure true compression.
                  </span>
                </li>
                <li>
                  <strong className="text-foreground font-mono">PNG:</strong> Pure lossless. Keep only for UI screenshots with fine typography or graphics that cannot tolerate lossy compression.
                </li>
                <li>
                  <strong className="text-foreground font-mono">GIFs:</strong> Ancient 1987 format limited to 256 colors. We extract the first static frame to slash bloated file sizes by 90%+.
                </li>
              </ul>
            </div>

            {/* Column 2: The 80% Rule */}
            <div className="border-border-color bg-background/40 flex flex-col gap-2 rounded-md border border-dashed p-3">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="text-utils-scent-orange h-3.5 w-3.5 shrink-0" />
                <span>The 80% Quality Sweet Spot</span>
              </div>
              <p className="text-foreground/80 text-[11px] leading-relaxed">
                Compression is logarithmic, not linear. 80%–85% sits at the knee of the curve:
              </p>

              <div className="space-y-1.5 text-[11px]">
                {/* Tier 1: Sweet Spot */}
                <div className="border-border-color bg-white flex flex-col gap-0.5 rounded border p-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-foreground">
                      80% – 85% Quality
                    </span>
                    <span className="text-code-green bg-utils-scent-gray-01/60 rounded px-1.5 py-0.2 font-mono text-[10px] font-semibold">
                      Sweet Spot
                    </span>
                  </div>
                  <p className="text-foreground/80 text-[10.5px] leading-relaxed">
                    <strong className="text-code-green font-medium">~50%–75% byte reduction</strong>. Discards invisible camera sensor grain while retaining 98%+ perceptual fidelity (SSIM).
                  </p>
                </div>

                {/* Tier 2: 85% - 100% */}
                <div className="border-border-color bg-white flex flex-col gap-0.5 rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-foreground/80 font-medium">
                      85% – 100% Quality
                    </span>
                    <span className="text-code-rust font-mono text-[10px] font-semibold">
                      2× to 4× bloat
                    </span>
                  </div>
                  <p className="text-foreground/70 text-[10px] leading-relaxed">
                    Disproportionate file size increase with zero human-noticeable visual difference.
                  </p>
                </div>

                {/* Tier 3: Sub 70% */}
                <div className="border-border-color bg-white flex flex-col gap-0.5 rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-foreground/80 font-medium">
                      Below 70% Quality
                    </span>
                    <span className="text-foreground/60 font-mono text-[10px]">
                      Artifact risk
                    </span>
                  </div>
                  <p className="text-foreground/70 text-[10px] leading-relaxed">
                    Marginal byte savings, but edge ringing, blur, and color banding become visible.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Dimension Budgets & LCP */}
            <div className="border-border-color bg-background/40 flex flex-col gap-2 rounded-md border border-dashed p-3">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Zap className="text-code-green h-3.5 w-3.5 shrink-0" />
                <span>Dimension Budgets (LCP)</span>
              </div>
              <p className="text-foreground/80 text-[11px] leading-relaxed">
                Serving raw 4000px smartphone photos inside an 800px web card forces mobile browsers to decode millions of wasted pixels, severely harming Largest Contentful Paint (LCP):
              </p>
              <ul className="text-foreground/80 space-y-1 text-[11px]">
                <li>
                  <code className="text-foreground font-mono">1920px:</code> Full-bleed desktop hero banners
                </li>
                <li>
                  <code className="text-foreground font-mono">1280px:</code> Standard article & content containers
                </li>
                <li>
                  <code className="text-foreground font-mono">800px:</code> Product cards, thumbnails & mobile viewports
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
