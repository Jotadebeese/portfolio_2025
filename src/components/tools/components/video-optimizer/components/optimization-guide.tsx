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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-utils-scent-gray-01/10 flex cursor-pointer items-center justify-between gap-2 p-3 text-left transition-all"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="text-foreground text-xs">
            Web Video Optimization Cheatsheet & Best Practices
          </span>
          <span className="bg-utils-scent-gray-01/60 text-foreground/80 hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            WebCodecs & HTML5 Video
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
                <span>Codec & Audio Selection</span>
              </div>
              <ul className="text-foreground space-y-2 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-foreground font-mono">
                    MP4 (H.264 / AVC):
                  </strong>{" "}
                  Universal 99%+ hardware-accelerated decoding across iOS
                  Safari, Chrome, Firefox, and mobile devices. Best default for
                  general sharing and single-source{" "}
                  <code className="font-mono">&lt;video&gt;</code> tags.
                </li>
                <li>
                  <strong className="text-foreground font-mono">
                    WebM (VP9):
                  </strong>{" "}
                  Royalty-free modern codec delivering ~20%–35% smaller files at
                  equivalent visual quality. Ideal as the primary{" "}
                  <code className="font-mono">&lt;source&gt;</code> with MP4 as
                  fallback.
                </li>
                <li>
                  <strong className="text-foreground font-mono">
                    Mute Audio:
                  </strong>{" "}
                  Stripping silent or ambient audio tracks saves ~128 kbps (~1
                  MB/min) and is required by browsers for{" "}
                  <code className="font-mono">autoplay muted loop</code> hero
                  videos.
                </li>
              </ul>
            </div>

            <div className="bg-background/40 flex flex-col gap-2 rounded-md p-3">
              <div className="text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Quality & Target Size Tuning</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">
                Screen recordings and raw camera clips use high capture bitrates
                optimized for real-time writing rather than web delivery:
              </p>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex flex-col gap-1 rounded bg-white p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-mono">
                      75% – 85% Quality
                    </span>
                    <span className="text-code-green bg-utils-scent-gray-01/40 py-0.2 rounded px-1.5 font-mono text-[10px]">
                      Sweet Spot
                    </span>
                  </div>
                  <p className="text-foreground text-[10px] leading-relaxed">
                    <span className="text-code-green">
                      ~60%–85% byte reduction
                    </span>
                    . Preserves crisp UI typography and motion while removing
                    redundant inter-frame noise.
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded bg-white p-2">
                  <span className="text-foreground font-mono">
                    Fit to Size (8 MB / 10 MB / 25 MB)
                  </span>
                  <p className="text-foreground text-[10px] leading-relaxed">
                    Calculates the exact bitrate budget (and adapts resolution
                    if needed) to guarantee clips fit Discord, GitHub PRs, or
                    CMS upload caps.
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded bg-white p-2">
                  <span className="text-foreground font-mono">
                    Edit Studio (Multi-Cut Trim)
                  </span>
                  <p className="text-foreground text-[10px] leading-relaxed">
                    Splitting and cutting dead air or loading pauses reduces
                    file size linearly before compression even starts.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background/40 flex flex-col gap-2 rounded-md p-3">
              <div className="text-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Resolution Budgets</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">
                Serving raw 4K (<code className="font-mono">3840×2160</code>)
                video inside a 1080p container forces mobile GPUs to decode 4×
                the pixels, draining battery and stalling scroll performance:
              </p>
              <ul className="text-foreground space-y-1.5 text-[11px]">
                <li>
                  <code className="text-foreground font-mono">1080p:</code>{" "}
                  Full-width desktop hero loops & high-detail UI walkthroughs
                </li>
                <li>
                  <code className="text-foreground font-mono">720p:</code>{" "}
                  Blog embeds, documentation clips & GitHub PR demos
                </li>
                <li>
                  <code className="text-foreground font-mono">480p:</code>{" "}
                  Compact card previews, mobile loops & chat attachments
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
