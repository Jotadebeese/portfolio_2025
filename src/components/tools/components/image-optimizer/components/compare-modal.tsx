"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Download,
  Columns2,
  SplitSquareVertical,
  Check,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { ImageFileItem } from "../types";
import { formatBytes, calculateSavings } from "../utils/format";

type Props = {
  item: ImageFileItem;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
};

type ViewMode = "slider" | "side-by-side";

export default function CompareModal({
  item,
  isOpen,
  onClose,
  onDownload,
}: Props) {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>("slider");

  const containerRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    [],
  );

  const handleMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handlePointerMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handlePointerMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handlePointerMove]);

  if (!isOpen) return null;

  const savings =
    item.optimizedSize !== undefined
      ? calculateSavings(item.originalSize, item.optimizedSize)
      : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-color bg-white flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-xl"
      >
        {/* Modal Header */}
        <div className="border-border-color flex flex-wrap items-center justify-between gap-2 border-b border-dashed px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Columns2 className="text-utils-scent-orange h-4 w-4 shrink-0" />
            <h3 className="truncate text-xs sm:text-sm font-semibold text-foreground">
              Visual Inspection: {item.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-md border border-border-color bg-background p-0.5 text-xs">
              <button
                onClick={() => setViewMode("slider")}
                className={clsx(
                  "flex items-center gap-1 rounded px-2 py-1 transition-all cursor-pointer",
                  viewMode === "slider"
                    ? "bg-foreground text-background font-medium"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Split slider comparison"
              >
                <SplitSquareVertical className="h-3 w-3" />
                <span className="hidden sm:inline">Split Slider</span>
              </button>

              <button
                onClick={() => setViewMode("side-by-side")}
                className={clsx(
                  "flex items-center gap-1 rounded px-2 py-1 transition-all cursor-pointer",
                  viewMode === "side-by-side"
                    ? "bg-foreground text-background font-medium"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Side by side comparison"
              >
                <Columns2 className="h-3 w-3" />
                <span className="hidden sm:inline">Side by Side</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-all"
              aria-label="Close comparison modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Comparison Body */}
        <div className="relative flex-1 overflow-auto bg-[#f0f0f0] p-4 flex items-center justify-center min-h-[350px]">
          {viewMode === "slider" ? (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              style={
                item.originalDimensions.width > 0 &&
                item.originalDimensions.height > 0
                  ? {
                      aspectRatio: `${item.originalDimensions.width} / ${item.originalDimensions.height}`,
                    }
                  : undefined
              }
              className="border-border-color relative flex h-full max-h-[60vh] w-full max-w-3xl cursor-ew-resize items-center justify-center overflow-hidden rounded-md border bg-white select-none"
            >
              {/* Optimized Image (Background full width) */}
              <img
                src={item.optimizedUrl || item.originalUrl}
                alt="Optimized Preview"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              {/* Original Image (Foreground, clipped cleanly via CSS clipPath) */}
              <img
                src={item.originalUrl}
                alt="Original Preview"
                style={{
                  clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                }}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              {/* Interactive Divider Line with draggable pill */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 flex w-0.5 items-center justify-center bg-white shadow-md"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="bg-foreground text-background flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md text-[10px] font-bold">
                  ⇄
                </div>
              </div>

              {/* Labels */}
              <div className="pointer-events-none absolute top-2 left-2 z-10 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs">
                Original ({formatBytes(item.originalSize)})
              </div>
              <div className="pointer-events-none absolute top-2 right-2 z-10 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-xs">
                Optimized (
                {item.optimizedSize !== undefined
                  ? formatBytes(item.optimizedSize)
                  : ""}
                )
              </div>
            </div>
          ) : (
            /* Side-by-side view */
            <div className="grid h-full w-full max-h-[60vh] max-w-3xl grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Original Card */}
              <div className="border-border-color flex flex-col rounded-md border bg-white p-2">
                <div className="border-border-color mb-1.5 flex items-center justify-between border-b pb-1 text-[11px]">
                  <span className="font-semibold text-foreground">Original</span>
                  <span className="font-mono text-foreground/70">
                    {formatBytes(item.originalSize)} • {item.originalDimensions.width}×
                    {item.originalDimensions.height}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  <img
                    src={item.originalUrl}
                    alt="Original"
                    className="h-full w-full max-h-[45vh] object-contain"
                  />
                </div>
              </div>

              {/* Optimized Card */}
              <div className="border-border-color flex flex-col rounded-md border bg-white p-2">
                <div className="border-border-color mb-1.5 flex items-center justify-between border-b pb-1 text-[11px]">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    Optimized
                    {savings && savings.isReduced && (
                      <span className="text-code-green bg-utils-scent-gray-01/60 rounded px-1 text-[10px] font-bold">
                        -{savings.percentSaved}%
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-foreground/70">
                    {item.optimizedSize !== undefined
                      ? formatBytes(item.optimizedSize)
                      : "..."}{" "}
                    •{" "}
                    {item.optimizedDimensions
                      ? `${item.optimizedDimensions.width}×${item.optimizedDimensions.height}`
                      : ""}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  <img
                    src={item.optimizedUrl || item.originalUrl}
                    alt="Optimized"
                    className="h-full w-full max-h-[45vh] object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-border-color bg-white flex flex-wrap items-center justify-between gap-3 border-t border-dashed px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-foreground/80">
            {savings && savings.isReduced ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="text-code-green h-3.5 w-3.5" />
                <span>
                  Saved{" "}
                  <strong className="text-code-green">
                    {formatBytes(savings.bytesSaved)} ({savings.percentSaved}%)
                  </strong>{" "}
                  with no perceptible loss in quality.
                </span>
              </span>
            ) : (
              <span>Image already highly compressed.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 cursor-pointer rounded-md border px-3 py-1.5 transition-all"
            >
              Close
            </button>

            <button
              onClick={onDownload}
              className="bg-foreground text-background flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all hover:opacity-90"
            >
              <Download className="text-utils-scent-orange h-3.5 w-3.5" />
              <span>Download Optimized</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
