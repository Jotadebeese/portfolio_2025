"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Layers,
} from "lucide-react";

export default function OptimizationGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-border-color flex flex-col rounded-md border border-dashed bg-white transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-utils-scent-gray-01/10 flex cursor-pointer items-center justify-between gap-2 p-3 text-left transition-all"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="text-foreground text-xs">
            Web Image Optimization Cheatsheet & Best Practices
          </span>
          <span className="bg-utils-scent-gray-01/60 text-foreground/80 hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            Core Web Vitals (LCP)
          </span>
        </div>

        <div className="text-foreground/70 flex items-center gap-1 text-xs">
          <span className="text-[11px]">
            {isOpen ? "Hide Guide" : "Read Guide"}
          </span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-border-color border-dashed px-2 pb-2 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="bg-background/40 flex flex-col gap-2 rounded-md p-3">
              <div className="text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>Format Selection</span>
              </div>
              <ul className="text-foreground space-y-2 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-foreground font-mono">
                    WebP (Recommended):
                  </strong>{" "}
                  Universal 97%+ browser support. Replaces both PNG and JPEG
                  with alpha transparency and ~30% smaller file sizes.
                  <span className="text-foreground/70 mt-1 block rounded bg-white p-2 text-[10px]">
                    *Note: Apple&apos;s WebKit engine does not support WebP
                    canvas encoding; our tool automatically falls back to JPEG
                    on iPhone/iPad to ensure true compression.
                  </span>
                </li>
                <li>
                  <strong className="text-foreground font-mono">PNG:</strong>{" "}
                  Pure lossless. Keep only for UI screenshots with fine
                  typography or graphics that cannot tolerate lossy compression.
                </li>
                <li>
                  <strong className="text-foreground font-mono">GIFs:</strong>{" "}
                  Ancient 1987 format limited to 256 colors. We extract the
                  first static frame to slash bloated file sizes by 90%+.
                </li>
              </ul>
            </div>

            <div className="bg-background/40 flex flex-col gap-2 rounded-md p-3">
              <div className="text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>The 80% Quality Sweet Spot</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">
                Compression is logarithmic, not linear. 80%–85% sits at the knee
                of the curve:
              </p>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex flex-col gap-1 rounded bg-white p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-mono">
                      80% – 85% Quality
                    </span>
                    <span className="text-code-green bg-utils-scent-gray-01/40 py-0.2 rounded px-1.5 font-mono text-[10px]">
                      Sweet Spot
                    </span>
                  </div>
                  <p className="text-foreground text-[10px] leading-relaxed">
                    <span className="text-code-green">
                      ~50%–75% byte reduction
                    </span>
                    . Discards invisible camera sensor grain while retaining
                    98%+ perceptual fidelity (SSIM).
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded bg-white p-2">
                  <span className="text-foreground font-mono">
                    85% – 100% Quality
                  </span>
                  <p className="text-foreground text-[10px] leading-relaxed">
                    Disproportionate file size increase with zero
                    human-noticeable visual difference.
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded bg-white p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-mono">
                      Below 70% Quality
                    </span>
                    <span className="text-foreground/70 font-mono text-[10px]">
                      Artifact risk
                    </span>
                  </div>
                  <p className="text-foreground text-[10px] leading-relaxed">
                    Marginal byte savings, but edge ringing, blur, and color
                    banding become visible.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background/40 flex flex-col gap-2 rounded-md p-3">
              <div className="text-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Dimension Budgets (LCP)</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">
                Serving raw 4000px smartphone photos inside an 800px web card
                forces mobile browsers to decode millions of wasted pixels,
                severely harming Largest Contentful Paint (LCP):
              </p>
              <ul className="text-foreground space-y-1 text-[11px]">
                <li>
                  <code className="text-foreground font-mono">1920px:</code>{" "}
                  Full-bleed desktop hero banners
                </li>
                <li>
                  <code className="text-foreground font-mono">1280px:</code>{" "}
                  Standard article & content containers
                </li>
                <li>
                  <code className="text-foreground font-mono">800px:</code>{" "}
                  Product cards, thumbnails & mobile viewports
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
