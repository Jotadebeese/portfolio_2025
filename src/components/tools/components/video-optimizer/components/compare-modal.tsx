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
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0 - 100

  // Detect if video was trimmed or has cut sections
  const effectiveTrim = item.trim || item.lastCompressedSettings?.trim;
  const effectiveSections = item.sections || item.lastCompressedSettings?.sections;

  const isTrimmedOrCut = hasEffectiveTrim(
    item.duration,
    effectiveTrim,
    effectiveSections,
  );

  const keptRanges = useMemo(
    () =>
      getKeptRanges(
        item.duration,
        effectiveTrim,
        effectiveSections,
      ),
    [item.duration, effectiveTrim, effectiveSections],
  );

  // Sync mode: "cut-range" (frame-synchronized to the cut) vs "full-timeline" (full original timeline)
  const [syncMode, setSyncMode] = useState<SyncMode>("cut-range");

  // Track playback timecodes independently
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

  // When modal opens or item changes, reset timecodes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      return;
    }
    const startOrig = isTrimmedOrCut ? keptRanges[0]?.start ?? 0 : 0;
    setCompCurrentTime(0);
    setOrigCurrentTime(startOrig);

    if (compVideoRef.current) compVideoRef.current.currentTime = 0;
    if (origVideoRef.current) origVideoRef.current.currentTime = startOrig;
  }, [isOpen, item.id, isTrimmedOrCut, keptRanges]);

  // Lock body scroll and listen for Escape / Space keys
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Read metadata for durations
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

  // Determine master timeline parameters based on current sync mode
  const isCutSync = isTrimmedOrCut && syncMode === "cut-range";
  const masterDuration = isCutSync ? compDuration : origDuration || 1;
  const masterCurrentTime = isCutSync ? compCurrentTime : origCurrentTime;

  // Check if original video is currently inside the cut range (in full-timeline mode)
  const origCutStatus = useMemo(
    () => mapOrigTimeToCompTime(origCurrentTime, keptRanges),
    [origCurrentTime, keptRanges],
  );

  // Synchronized playback toggle
  const togglePlayPause = () => {
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;
    if (!v1 || !v2) return;

    if (isPlaying) {
      v1.pause();
      v2.pause();
      setIsPlaying(false);
    } else {
      if (isCutSync) {
        // Frame-matched mode: align original video to compressed video's timestamp
        const targetOrig = mapCompTimeToOrigTime(v2.currentTime, keptRanges);
        v1.currentTime = targetOrig;
        v2.play().catch(() => {});
        v1.play().catch(() => {});
      } else {
        // Full timeline mode: start v1, play v2 only if inside cut range
        v1.play().catch(() => {});
        const { compTime, isInside } = mapOrigTimeToCompTime(v1.currentTime, keptRanges);
        v2.currentTime = compTime;
        if (isInside) {
          v2.play().catch(() => {});
        } else {
          v2.pause();
        }
      }
      setIsPlaying(true);
    }
  };

  // Compressed video time update (drives playback in "cut-range" mode)
  const handleCompTimeUpdate = () => {
    if (!compVideoRef.current) return;
    const tc = compVideoRef.current.currentTime;
    setCompCurrentTime(tc);

    if (isCutSync) {
      const targetOrig = mapCompTimeToOrigTime(tc, keptRanges);
      setOrigCurrentTime(targetOrig);
      if (origVideoRef.current) {
        // Maintain tight sync (< 0.15s drift)
        if (Math.abs(origVideoRef.current.currentTime - targetOrig) > 0.15) {
          origVideoRef.current.currentTime = targetOrig;
        }
      }
    }
  };

  // Original video time update (drives playback in "full-timeline" mode or untrimmed)
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

  // Video ended handlers
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

  // Scrubber seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;

    if (isCutSync) {
      // Seek in cut space
      setCompCurrentTime(t);
      if (v2) v2.currentTime = t;
      const targetOrig = mapCompTimeToOrigTime(t, keptRanges);
      setOrigCurrentTime(targetOrig);
      if (v1) v1.currentTime = targetOrig;
    } else {
      // Seek in full original space
      setOrigCurrentTime(t);
      if (v1) v1.currentTime = t;
      const { compTime } = mapOrigTimeToCompTime(t, keptRanges);
      setCompCurrentTime(compTime);
      if (v2) v2.currentTime = compTime;
    }
  };

  // Jump by delta seconds
  const jumpTime = (delta: number) => {
    const newTime = Math.max(0, Math.min(masterDuration, masterCurrentTime + delta));
    handleSeek({
      target: { value: String(newTime) },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  // Switch between sync modes
  const handleToggleSyncMode = (newMode: SyncMode) => {
    setSyncMode(newMode);
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;
    if (newMode === "cut-range") {
      // Align to start of cut
      if (v2) v2.currentTime = 0;
      if (v1) v1.currentTime = keptRanges[0]?.start ?? 0;
      setCompCurrentTime(0);
      setOrigCurrentTime(keptRanges[0]?.start ?? 0);
    } else {
      // Reset to 0 of full original
      if (v1) v1.currentTime = 0;
      if (v2) v2.currentTime = 0;
      setOrigCurrentTime(0);
      setCompCurrentTime(0);
    }
  };

  // Split drag handler
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

  // Restore playback and timestamps when switching viewMode (side-by-side <-> split)
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
        className="border-border-color flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-md bg-white shadow-2xl overscroll-contain"
      >
        {/* Modal Header */}
        <div className="border-border-color flex flex-wrap items-center justify-between gap-2 border-b border-dashed p-3">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-foreground text-sm font-semibold truncate max-w-xs sm:max-w-md">
              Visual Inspection: {item.name}
            </h4>

            {savings && (
              <span className="bg-emerald-500/10 text-emerald-600 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium shrink-0">
                Saved {formatBytes(savings.bytesSaved)} (-{savings.percentSaved}%)
              </span>
            )}

            {isTrimmedOrCut && (
              <span className="border border-utils-scent-orange/40 bg-utils-scent-orange/10 text-utils-scent-orange rounded-md px-2 py-0.5 font-mono text-[11px] font-medium shrink-0 flex items-center gap-1">
                <Scissors size={10} />
                <span>Cut: {formatDuration(compDuration)} of {formatDuration(origDuration)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Mode Selector (only when video is trimmed or cut) */}
            {isTrimmedOrCut && (
              <div className="border border-border-color bg-utils-scent-gray-01/30 flex items-center rounded-md p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleSyncMode("cut-range")}
                  className={clsx(
                    "flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono transition-all",
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
                    "flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono transition-all",
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
        <div className="relative flex h-[54vh] min-h-[380px] max-h-[60vh] w-full items-center justify-center overflow-hidden bg-black/95 p-3 select-none">
          {viewMode === "side-by-side" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full h-full">
              {/* Left: Original */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden rounded bg-black border border-white/10 h-full">
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
                <span className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white/90 border border-white/20">
                  Original &bull; {formatBytes(item.originalSize)}
                </span>
                <span className="absolute bottom-2 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/80">
                  {item.originalDimensions.width} &times; {item.originalDimensions.height} &bull; {formatDuration(origCurrentTime)} / {formatDuration(origDuration)}
                </span>
              </div>

              {/* Right: Compressed */}
              <div className="relative flex flex-col items-center justify-center overflow-hidden rounded bg-black border border-white/10 h-full">
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
                <span className="absolute top-2 right-2 bg-emerald-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                  Compressed &bull; {item.compressedSize ? formatBytes(item.compressedSize) : ""}
                </span>
                <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white/80">
                  {item.compressedDimensions?.width} &times; {item.compressedDimensions?.height} &bull; {formatDuration(compCurrentTime)} / {formatDuration(compDuration)}
                </span>

                {/* Notice in full-timeline mode when outside cut */}
                {!isCutSync && !origCutStatus.isInside && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none p-4 text-center">
                    <span className="bg-black/90 text-white/90 border border-white/20 rounded px-2.5 py-1 text-xs font-mono">
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
              className="relative h-full w-full flex items-center justify-center overflow-hidden cursor-ew-resize select-none touch-none rounded bg-black"
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
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
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
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              />

              {/* Split Divider Line and Draggable Knob */}
              <div
                className="absolute top-0 bottom-0 z-30 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.85)] pointer-events-none"
                style={{ left: `${splitPos}%` }}
              >
                <div className="bg-foreground text-background absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                  &harr;
                </div>
              </div>

              {/* Corner Info Badges */}
              <div className="absolute top-3 left-3 z-30 pointer-events-none">
                <span className="bg-black/85 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-mono text-white border border-white/20 shadow-md">
                  Original ({formatBytes(item.originalSize)}) &bull; {formatDuration(origCurrentTime)}
                </span>
              </div>
              <div className="absolute top-3 right-3 z-30 pointer-events-none">
                <span className="bg-emerald-950/85 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-mono text-emerald-300 border border-emerald-500/40 shadow-md">
                  Compressed ({item.compressedSize ? formatBytes(item.compressedSize) : ""}) &bull; {formatDuration(compCurrentTime)}
                </span>
              </div>

              {/* Split position percentage pill at bottom */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <span className="bg-black/85 backdrop-blur-xs text-white/80 border border-white/15 rounded-full px-2.5 py-0.5 text-[10px] font-mono shadow-md">
                  {Math.round(splitPos)}% / {100 - Math.round(splitPos)}%
                </span>
              </div>

              {/* Notice in full-timeline mode when outside cut */}
              {!isCutSync && !origCutStatus.isInside && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="bg-black/90 text-white/90 border border-white/20 rounded px-2.5 py-1 text-xs font-mono shadow-md">
                    ✂️ Outside cut range ({formatDuration(origCurrentTime)})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Master Playback Controls Bar */}
        <div className="border-border-color bg-utils-scent-gray-01/20 border-t p-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="bg-foreground text-background hover:bg-foreground/90 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Jump buttons */}
            <button
              type="button"
              onClick={() => jumpTime(-5)}
              className="text-foreground/70 hover:text-foreground h-7 px-1.5 flex items-center gap-0.5 rounded cursor-pointer font-mono text-[11px]"
              title="Jump back 5s"
            >
              <RotateCcw size={12} />
              <span>5s</span>
            </button>

            {/* Current / Total Master Time */}
            <span className="font-mono text-xs text-foreground shrink-0 min-w-[75px]">
              {formatDuration(masterCurrentTime)} / {formatDuration(masterDuration)}
            </span>

            {/* Synchronized Timeline Scrubber with Kept Region Indicators */}
            <div className="relative flex-1 flex items-center h-6">
              {/* Highlight kept regions on track in full-timeline mode */}
              {!isCutSync && isTrimmedOrCut && (
                <div className="absolute inset-x-0 h-1.5 rounded-lg bg-neutral-200 pointer-events-none overflow-hidden">
                  {keptRanges.map((range, idx) => {
                    const leftPct = (range.start / origDuration) * 100;
                    const widthPct = ((range.end - range.start) / origDuration) * 100;
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 bg-utils-scent-orange/50"
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
                className="relative z-10 w-full accent-utils-scent-orange bg-utils-scent-gray-01/60 h-1.5 cursor-pointer appearance-none rounded-lg"
              />
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={clsx(
                "border flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer shrink-0",
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
              className="text-foreground/70 hover:text-foreground h-7 w-7 flex items-center justify-center rounded cursor-pointer transition-colors shrink-0"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Direct Download Button */}
            <button
              type="button"
              onClick={onDownload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
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
