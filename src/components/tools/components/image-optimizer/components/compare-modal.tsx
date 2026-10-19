"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Download,
  Columns2,
  SplitSquareVertical,
  Sparkles,
  ArrowRightLeft,
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

  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen, onClose]);

  const handlePointerMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handlePointerMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-color flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md bg-white shadow-xl overscroll-contain"
      >
        <div className="border-border-color flex flex-wrap items-center justify-between gap-2 border-b border-dashed p-3">
          <h4>Visual Inspection: {item.name}</h4>
          <div className="flex items-center gap-2">
            <div className="border-border-color bg-background flex items-center rounded-md border p-0.5 text-xs">
              <button
                onClick={() => setViewMode("slider")}
                className={clsx(
                  "flex cursor-pointer items-center gap-1 rounded px-2 py-1 transition-all",
                  viewMode === "slider"
                    ? "bg-foreground text-background"
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
                  "flex cursor-pointer items-center gap-1 rounded px-2 py-1 transition-all",
                  viewMode === "side-by-side"
                    ? "bg-foreground text-background"
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

        <div className="relative flex min-h-[350px] flex-1 items-center justify-center overflow-auto bg-white p-4">
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
              className="relative flex h-full max-h-[60vh] w-full max-w-3xl cursor-ew-resize items-center justify-center overflow-hidden select-none touch-none"
            >
              <img
                src={item.optimizedUrl || item.originalUrl}
                alt="Optimized Preview"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              <img
                src={item.originalUrl}
                alt="Original Preview"
                style={{
                  clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                }}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 flex w-0.5 items-center justify-center bg-white shadow-md"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="bg-foreground text-background flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white text-[10px] shadow-md">
                  <ArrowRightLeft className="h-3 w-3" />
                </div>
              </div>

              <div className="pointer-events-none absolute top-2 left-2 z-10 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
                Original ({formatBytes(item.originalSize)})
              </div>
              <div className="pointer-events-none absolute top-2 right-2 z-10 rounded bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
                Optimized (
                {item.optimizedSize !== undefined
                  ? formatBytes(item.optimizedSize)
                  : ""}
                )
              </div>
            </div>
          ) : (
            <div className="grid h-full max-h-[60vh] w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 bg-white">
                <div className="flex flex-1 justify-center overflow-hidden">
                  <img
                    src={item.originalUrl}
                    alt="Original"
                    className="h-full max-h-[45vh] w-full object-contain"
                  />
                </div>
                <div className="border-border-color flex items-center justify-between border-b py-1 text-[11px]">
                  <span className="text-foreground">Original</span>
                  <span className="text-foreground/70 font-mono">
                    {formatBytes(item.originalSize)} •{" "}
                    {item.originalDimensions.width}×
                    {item.originalDimensions.height}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 bg-white">
                <div className="flex flex-1 items-center justify-center overflow-hidden">
                  <img
                    src={item.optimizedUrl || item.originalUrl}
                    alt="Optimized"
                    className="h-full max-h-[45vh] w-full object-contain"
                  />
                </div>
                <div className="border-border-color flex items-center justify-between border-b py-1 text-[11px]">
                  <span className="text-foreground flex items-center gap-1">
                    Optimized
                    {savings && savings.isReduced && (
                      <span className="text-code-green bg-utils-scent-gray-01/40 rounded px-1 text-[10px]">
                        -{savings.percentSaved}%
                      </span>
                    )}
                  </span>
                  <span className="text-foreground/70 font-mono">
                    {item.optimizedSize !== undefined
                      ? formatBytes(item.optimizedSize)
                      : "..."}{" "}
                    •{" "}
                    {item.optimizedDimensions
                      ? `${item.optimizedDimensions.width}×${item.optimizedDimensions.height}`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-border-color flex flex-wrap items-center justify-between gap-3 border-t border-dashed bg-white p-3 text-xs">
          <div className="text-foreground flex items-center gap-2">
            {savings && savings.isReduced && (
              <span className="flex items-center gap-1.5">
                Saved{" "}
                <span className="text-code-green font-mono">
                  {formatBytes(savings.bytesSaved)} ({savings.percentSaved}%)
                </span>{" "}
              </span>
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
              className="bg-background border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Optimized</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
