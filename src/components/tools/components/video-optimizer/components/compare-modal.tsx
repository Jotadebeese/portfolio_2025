"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Download,
  Columns2,
  SplitSquareVertical,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Link2,
  Clock,
  Scissors,
} from "lucide-react";
import clsx from "clsx";
import { VideoFileItem } from "../types";
import {
  formatBytes,
  formatDuration,
  calculateSavings,
  hasEffectiveTrim,
  getKeptRanges,
  mapCompTimeToOrigTime,
  mapOrigTimeToCompTime,
  getEffectiveVideoDuration,
} from "../utils/format";

type Props = {
  item: VideoFileItem;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
};

type ViewMode = "side-by-side" | "split";
type SyncMode = "cut-range" | "full-timeline";

export default function CompareModal({
  item,
  isOpen,
  onClose,
  onDownload,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [splitPos, setSplitPos] = useState<number>(50);

  const effectiveTrim = item.trim || item.lastCompressedSettings?.trim;
  const effectiveSections =
    item.sections || item.lastCompressedSettings?.sections;

  const isTrimmedOrCut = hasEffectiveTrim(
    item.duration,
    effectiveTrim,
    effectiveSections,
  );

  const keptRanges = useMemo(
    () => getKeptRanges(item.duration, effectiveTrim, effectiveSections),
    [item.duration, effectiveTrim, effectiveSections],
  );

  const [syncMode, setSyncMode] = useState<SyncMode>("cut-range");

  const [origCurrentTime, setOrigCurrentTime] = useState<number>(0);
  const [compCurrentTime, setCompCurrentTime] = useState<number>(0);

  const [origDuration, setOrigDuration] = useState<number>(item.duration || 0);
  const [compDuration, setCompDuration] = useState<number>(
    item.compressedDuration ||
      getEffectiveVideoDuration(
        item.duration,
        effectiveTrim,
        effectiveSections,
      ) ||
      item.duration ||
      0,
  );

  const origVideoRef = useRef<HTMLVideoElement>(null);
  const compVideoRef = useRef<HTMLVideoElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplit = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      return;
    }
    const startOrig = isTrimmedOrCut ? (keptRanges[0]?.start ?? 0) : 0;
    setCompCurrentTime(0);
    setOrigCurrentTime(startOrig);

    if (compVideoRef.current) compVideoRef.current.currentTime = 0;
    if (origVideoRef.current) origVideoRef.current.currentTime = startOrig;
  }, [isOpen, item.id, isTrimmedOrCut, keptRanges]);

  const isCutSync = isTrimmedOrCut && syncMode === "cut-range";
  const masterDuration = isCutSync ? compDuration : origDuration || 1;
  const masterCurrentTime = isCutSync ? compCurrentTime : origCurrentTime;

  const origCutStatus = useMemo(
    () => mapOrigTimeToCompTime(origCurrentTime, keptRanges),
    [origCurrentTime, keptRanges],
  );

  const togglePlayPause = useCallback(() => {
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;
    if (!v1 || !v2) return;

    if (isPlaying) {
      v1.pause();
      v2.pause();
      setIsPlaying(false);
    } else {
      if (isCutSync) {
        const targetOrig = mapCompTimeToOrigTime(v2.currentTime, keptRanges);
        v1.currentTime = targetOrig;
        v2.play().catch(() => {});
        v1.play().catch(() => {});
      } else {
        v1.play().catch(() => {});
        const { compTime, isInside } = mapOrigTimeToCompTime(
          v1.currentTime,
          keptRanges,
        );
        v2.currentTime = compTime;
        if (isInside) {
          v2.play().catch(() => {});
        } else {
          v2.pause();
        }
      }
      setIsPlaying(true);
    }
  }, [isPlaying, isCutSync, keptRanges]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, togglePlayPause]);

  const handleOrigLoadedMetadata = () => {
    if (origVideoRef.current && origVideoRef.current.duration > 0) {
      setOrigDuration(origVideoRef.current.duration);
      if (origCurrentTime > 0) {
        origVideoRef.current.currentTime = origCurrentTime;
      }
      if (isPlaying) {
        origVideoRef.current.play().catch(() => {});
      }
    }
  };

  const handleCompLoadedMetadata = () => {
    if (compVideoRef.current && compVideoRef.current.duration > 0) {
      setCompDuration(compVideoRef.current.duration);
      if (compCurrentTime > 0) {
        compVideoRef.current.currentTime = compCurrentTime;
      }
      if (isPlaying) {
        compVideoRef.current.play().catch(() => {});
      }
    }
  };

  const handleCompTimeUpdate = () => {
    if (!compVideoRef.current) return;
    const tc = compVideoRef.current.currentTime;
    setCompCurrentTime(tc);

    if (isCutSync) {
      const targetOrig = mapCompTimeToOrigTime(tc, keptRanges);
      setOrigCurrentTime(targetOrig);
      if (origVideoRef.current) {
        if (Math.abs(origVideoRef.current.currentTime - targetOrig) > 0.15) {
          origVideoRef.current.currentTime = targetOrig;
        }
      }
    }
  };

  const handleOrigTimeUpdate = () => {
    if (!origVideoRef.current) return;
    const to = origVideoRef.current.currentTime;
    setOrigCurrentTime(to);

    if (!isCutSync) {
      const { compTime, isInside } = mapOrigTimeToCompTime(to, keptRanges);
      setCompCurrentTime(compTime);
      if (compVideoRef.current) {
        if (isInside) {
          if (compVideoRef.current.paused && isPlaying) {
            compVideoRef.current.play().catch(() => {});
          }
          if (Math.abs(compVideoRef.current.currentTime - compTime) > 0.15) {
            compVideoRef.current.currentTime = compTime;
          }
        } else {
          if (!compVideoRef.current.paused) {
            compVideoRef.current.pause();
          }
        }
      }
    }
  };

  const handleCompEnded = () => {
    if (isCutSync) {
      if (isLooping) {
        const v1 = origVideoRef.current;
        const v2 = compVideoRef.current;
        if (v1 && v2) {
          v2.currentTime = 0;
          v1.currentTime = keptRanges[0]?.start ?? 0;
          v2.play().catch(() => {});
          v1.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        origVideoRef.current?.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleOrigEnded = () => {
    if (!isCutSync) {
      if (isLooping) {
        const v1 = origVideoRef.current;
        const v2 = compVideoRef.current;
        if (v1 && v2) {
          v1.currentTime = 0;
          v2.currentTime = 0;
          v1.play().catch(() => {});
          if (keptRanges[0]?.start === 0) v2.play().catch(() => {});
          setIsPlaying(true);
        }
      } else {
        compVideoRef.current?.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;

    if (isCutSync) {
      setCompCurrentTime(t);
      if (v2) v2.currentTime = t;
      const targetOrig = mapCompTimeToOrigTime(t, keptRanges);
      setOrigCurrentTime(targetOrig);
      if (v1) v1.currentTime = targetOrig;
    } else {
      setOrigCurrentTime(t);
      if (v1) v1.currentTime = t;
      const { compTime } = mapOrigTimeToCompTime(t, keptRanges);
      setCompCurrentTime(compTime);
      if (v2) v2.currentTime = compTime;
    }
  };

  const jumpTime = (delta: number) => {
    const newTime = Math.max(
      0,
      Math.min(masterDuration, masterCurrentTime + delta),
    );
    handleSeek({
      target: { value: String(newTime) },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleToggleSyncMode = (newMode: SyncMode) => {
    setSyncMode(newMode);
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;
    if (newMode === "cut-range") {
      if (v2) v2.currentTime = 0;
      if (v1) v1.currentTime = keptRanges[0]?.start ?? 0;
      setCompCurrentTime(0);
      setOrigCurrentTime(keptRanges[0]?.start ?? 0);
    } else {
      if (v1) v1.currentTime = 0;
      if (v2) v2.currentTime = 0;
      setOrigCurrentTime(0);
      setCompCurrentTime(0);
    }
  };

  const handleSplitMove = useCallback((clientX: number) => {
    if (!splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    const pct = Math.max(1, Math.min(99, (x / rect.width) * 100));
    setSplitPos(pct);
  }, []);

  const handleSplitPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingSplit.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handleSplitMove(e.clientX);
  };

  const handleSplitPointerMove = (e: React.PointerEvent) => {
    if (isDraggingSplit.current) {
      handleSplitMove(e.clientX);
    }
  };

  const handleSplitPointerUp = (e: React.PointerEvent) => {
    isDraggingSplit.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;
    if (v1 && v2) {
      v1.currentTime = origCurrentTime;
      v2.currentTime = compCurrentTime;
      if (isPlaying) {
        v1.play().catch(() => {});
        v2.play().catch(() => {});
      }
    }
  }, [viewMode]);

  if (!isOpen || !item.compressedUrl) return null;

  const savings =
    item.compressedSize !== undefined
      ? calculateSavings(item.originalSize, item.compressedSize)
      : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs select-none sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-color flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden overscroll-contain rounded-md bg-white shadow-2xl"
      >
        <div className="border-border-color flex flex-wrap items-center justify-between gap-2 border-b border-dashed p-3">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="text-foreground max-w-xs truncate text-sm font-semibold sm:max-w-md">
              Visual Inspection: {item.name}
            </h4>

            {savings && (
              <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-600">
                Saved {formatBytes(savings.bytesSaved)} (-{savings.percentSaved}
                %)
              </span>
            )}

            {isTrimmedOrCut && (
              <span className="border-utils-scent-orange/40 bg-utils-scent-orange/10 text-utils-scent-orange flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium">
                <Scissors size={10} />
                <span>
                  Cut: {formatDuration(compDuration)} of{" "}
                  {formatDuration(origDuration)}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Mode Selector (only when video is trimmed or cut) */}
            {isTrimmedOrCut && (
              <div className="border-border-color bg-utils-scent-gray-01/30 flex items-center rounded-md border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleSyncMode("cut-range")}
                  className={clsx(
                    "flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition-all",
                    syncMode === "cut-range"
                      ? "bg-foreground text-background font-semibold shadow-2xs"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                  title="Lock playback frame-by-frame to the edited cut for pixel-accurate quality inspection"
                >
                  <Link2 size={11} />
                  <span>Matched Frames</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSyncMode("full-timeline")}
                  className={clsx(
                    "flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition-all",
                    syncMode === "full-timeline"
                      ? "bg-foreground text-background font-semibold shadow-2xs"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                  title="Play the full source video timeline (shows where the cut sits along the entire file)"
                >
                  <Clock size={11} />
                  <span>Full Timeline</span>
                </button>
              </div>
            )}

            {/* View Mode Toggle: Side by Side vs Split Slider */}
            <div className="border-border-color bg-background flex items-center rounded-md border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("side-by-side")}
                className={clsx(
                  "flex cursor-pointer items-center gap-1 rounded px-2.5 py-1 text-xs transition-all",
                  viewMode === "side-by-side"
                    ? "bg-foreground text-background font-medium shadow-2xs"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Side by side view"
              >
                <Columns2 className="h-3 w-3" />
                <span className="hidden sm:inline">Side by Side</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={clsx(
                  "flex cursor-pointer items-center gap-1 rounded px-2.5 py-1 text-xs transition-all",
                  viewMode === "split"
                    ? "bg-foreground text-background font-medium shadow-2xs"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Split slider view"
              >
                <SplitSquareVertical className="h-3 w-3" />
                <span className="hidden sm:inline">Split Slider</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-all"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="relative flex h-[54vh] max-h-[60vh] min-h-[380px] w-full items-center justify-center overflow-hidden bg-black/95 p-3 select-none">
          {viewMode === "side-by-side" ? (
            <div className="grid h-full w-full grid-cols-1 gap-3 md:grid-cols-2">
              {/* Left: Original */}
              <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded border border-white/10 bg-black">
                <video
                  ref={origVideoRef}
                  src={item.originalUrl}
                  muted={isMuted}
                  playsInline
                  onLoadedMetadata={handleOrigLoadedMetadata}
                  onTimeUpdate={handleOrigTimeUpdate}
                  onEnded={handleOrigEnded}
                  className="max-h-full w-full object-contain"
                />
                <span className="absolute top-2 left-2 rounded border border-white/20 bg-black/80 px-2 py-0.5 font-mono text-[10px] text-white/90">
                  Original &bull; {formatBytes(item.originalSize)}
                </span>
                <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-white/80">
                  {item.originalDimensions.width} &times;{" "}
                  {item.originalDimensions.height} &bull;{" "}
                  {formatDuration(origCurrentTime)} /{" "}
                  {formatDuration(origDuration)}
                </span>
              </div>

              {/* Right: Compressed */}
              <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded border border-white/10 bg-black">
                <video
                  ref={compVideoRef}
                  src={item.compressedUrl}
                  muted={isMuted}
                  playsInline
                  onLoadedMetadata={handleCompLoadedMetadata}
                  onTimeUpdate={handleCompTimeUpdate}
                  onEnded={handleCompEnded}
                  className="max-h-full w-full object-contain"
                />
                <span className="absolute top-2 right-2 rounded border border-emerald-500/30 bg-emerald-950/80 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  Compressed &bull;{" "}
                  {item.compressedSize ? formatBytes(item.compressedSize) : ""}
                </span>
                <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-white/80">
                  {item.compressedDimensions?.width} &times;{" "}
                  {item.compressedDimensions?.height} &bull;{" "}
                  {formatDuration(compCurrentTime)} /{" "}
                  {formatDuration(compDuration)}
                </span>

                {/* Notice in full-timeline mode when outside cut */}
                {!isCutSync && !origCutStatus.isInside && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center">
                    <span className="rounded border border-white/20 bg-black/90 px-2.5 py-1 font-mono text-xs text-white/90">
                      ✂️ Outside cut range ({formatDuration(origCurrentTime)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Split View */
            <div
              ref={splitContainerRef}
              onPointerDown={handleSplitPointerDown}
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
              onPointerCancel={handleSplitPointerUp}
              className="relative flex h-full w-full cursor-ew-resize touch-none items-center justify-center overflow-hidden rounded bg-black select-none"
            >
              {/* Compressed (Underneath / Base layer) */}
              <video
                ref={compVideoRef}
                src={item.compressedUrl}
                muted={isMuted}
                playsInline
                onLoadedMetadata={handleCompLoadedMetadata}
                onTimeUpdate={handleCompTimeUpdate}
                onEnded={handleCompEnded}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              {/* Original (Clipped on top: reveals 0..splitPos%) */}
              <video
                ref={origVideoRef}
                src={item.originalUrl}
                muted={isMuted}
                playsInline
                onLoadedMetadata={handleOrigLoadedMetadata}
                onTimeUpdate={handleOrigTimeUpdate}
                onEnded={handleOrigEnded}
                style={{
                  clipPath: `inset(0 ${100 - splitPos}% 0 0)`,
                }}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />

              {/* Split Divider Line and Draggable Knob */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.85)]"
                style={{ left: `${splitPos}%` }}
              >
                <div className="bg-foreground text-background absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                  &harr;
                </div>
              </div>

              {/* Corner Info Badges */}
              <div className="pointer-events-none absolute top-3 left-3 z-30">
                <span className="rounded border border-white/20 bg-black/85 px-2.5 py-1 font-mono text-[11px] text-white shadow-md backdrop-blur-xs">
                  Original ({formatBytes(item.originalSize)}) &bull;{" "}
                  {formatDuration(origCurrentTime)}
                </span>
              </div>
              <div className="pointer-events-none absolute top-3 right-3 z-30">
                <span className="rounded border border-emerald-500/40 bg-emerald-950/85 px-2.5 py-1 font-mono text-[11px] text-emerald-300 shadow-md backdrop-blur-xs">
                  Compressed (
                  {item.compressedSize ? formatBytes(item.compressedSize) : ""})
                  &bull; {formatDuration(compCurrentTime)}
                </span>
              </div>

              {/* Split position percentage pill at bottom */}
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
                <span className="rounded-full border border-white/15 bg-black/85 px-2.5 py-0.5 font-mono text-[10px] text-white/80 shadow-md backdrop-blur-xs">
                  {Math.round(splitPos)}% / {100 - Math.round(splitPos)}%
                </span>
              </div>

              {/* Notice in full-timeline mode when outside cut */}
              {!isCutSync && !origCutStatus.isInside && (
                <div className="pointer-events-none absolute top-12 left-1/2 z-30 -translate-x-1/2">
                  <span className="rounded border border-white/20 bg-black/90 px-2.5 py-1 font-mono text-xs text-white/90 shadow-md">
                    ✂️ Outside cut range ({formatDuration(origCurrentTime)})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Master Playback Controls Bar */}
        <div className="border-border-color bg-utils-scent-gray-01/20 flex flex-col gap-2 border-t p-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="bg-foreground text-background hover:bg-foreground/90 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
              )}
            </button>

            {/* Jump buttons */}
            <button
              type="button"
              onClick={() => jumpTime(-5)}
              className="text-foreground/70 hover:text-foreground flex h-7 cursor-pointer items-center gap-0.5 rounded px-1.5 font-mono text-[11px]"
              title="Jump back 5s"
            >
              <RotateCcw size={12} />
              <span>5s</span>
            </button>

            {/* Current / Total Master Time */}
            <span className="text-foreground min-w-[75px] shrink-0 font-mono text-xs">
              {formatDuration(masterCurrentTime)} /{" "}
              {formatDuration(masterDuration)}
            </span>

            {/* Synchronized Timeline Scrubber with Kept Region Indicators */}
            <div className="relative flex h-6 flex-1 items-center">
              {/* Highlight kept regions on track in full-timeline mode */}
              {!isCutSync && isTrimmedOrCut && (
                <div className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-lg bg-neutral-200">
                  {keptRanges.map((range, idx) => {
                    const leftPct = (range.start / origDuration) * 100;
                    const widthPct =
                      ((range.end - range.start) / origDuration) * 100;
                    return (
                      <div
                        key={idx}
                        className="bg-utils-scent-orange/50 absolute top-0 bottom-0"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              <input
                type="range"
                min="0"
                max={masterDuration || 1}
                step="0.05"
                value={masterCurrentTime}
                onChange={handleSeek}
                className="accent-utils-scent-orange bg-utils-scent-gray-01/60 relative z-10 h-1.5 w-full cursor-pointer appearance-none rounded-lg"
              />
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={clsx(
                "flex shrink-0 cursor-pointer items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] transition-colors",
                isLooping
                  ? "border-utils-scent-orange bg-utils-scent-orange/15 text-utils-scent-orange font-semibold"
                  : "border-border-color text-foreground/70 hover:text-foreground bg-white",
              )}
              title="Loop preview playback continuously"
            >
              <Repeat size={12} />
              <span>Loop</span>
            </button>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="text-foreground/70 hover:text-foreground flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Direct Download Button */}
            <button
              type="button"
              onClick={onDownload}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
