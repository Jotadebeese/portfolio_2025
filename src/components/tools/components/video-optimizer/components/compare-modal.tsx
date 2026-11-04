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
  ArrowRightLeft,
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

  const effectiveTrim = item.lastCompressedSettings
    ? item.lastCompressedSettings.trim
    : item.trim;
  const effectiveSections = item.lastCompressedSettings
    ? item.lastCompressedSettings.sections
    : item.sections;

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
      v1.playbackRate = 1;
      v2.playbackRate = 1;
      if (isCutSync) {
        const exactOrig = mapCompTimeToOrigTime(v2.currentTime, keptRanges);
        if (Math.abs(v1.currentTime - exactOrig) > 0.004) {
          v1.currentTime = exactOrig;
        }
        setOrigCurrentTime(exactOrig);
        setCompCurrentTime(v2.currentTime);
      } else {
        const { compTime } = mapOrigTimeToCompTime(v1.currentTime, keptRanges);
        if (Math.abs(v2.currentTime - compTime) > 0.004) {
          v2.currentTime = compTime;
        }
        setOrigCurrentTime(v1.currentTime);
        setCompCurrentTime(compTime);
      }
      setIsPlaying(false);
    } else {
      v1.playbackRate = 1;
      v2.playbackRate = 1;
      if (isCutSync) {
        const tc =
          v2.currentTime >= compDuration - 0.05 ? 0 : v2.currentTime;
        const targetOrig = mapCompTimeToOrigTime(tc, keptRanges);
        v2.currentTime = tc;
        v1.currentTime = targetOrig;
        setCompCurrentTime(tc);
        setOrigCurrentTime(targetOrig);
        v2.play().catch(() => {});
        v1.play().catch(() => {});
      } else {
        const to =
          v1.currentTime >= origDuration - 0.05 ? 0 : v1.currentTime;
        v1.currentTime = to;
        const { compTime, isInside } = mapOrigTimeToCompTime(to, keptRanges);
        v2.currentTime = compTime;
        setOrigCurrentTime(to);
        setCompCurrentTime(compTime);
        v1.play().catch(() => {});
        if (isInside) {
          v2.play().catch(() => {});
        } else {
          v2.pause();
        }
      }
      setIsPlaying(true);
    }
  }, [isPlaying, isCutSync, keptRanges, compDuration, origDuration]);

  // High-frequency requestAnimationFrame drift-lock loop:
  // Uses proportional playbackRate micro-adjustment (0.85x..1.18x) to eliminate
  // 2-5 frame 4K decode lag without triggering keyframe seek stalls.
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    let rafId: number;
    const syncFrame = () => {
      const v1 = origVideoRef.current;
      const v2 = compVideoRef.current;
      if (v1 && v2) {
        if (isCutSync) {
          const tc = v2.currentTime;
          const targetOrig = mapCompTimeToOrigTime(tc, keptRanges);
          const drift = targetOrig - v1.currentTime;
          if (!v1.seeking) {
            if (Math.abs(drift) > 0.35) {
              v1. playbackRate = 1;
              v1.currentTime = targetOrig;
            } else if (Math.abs(drift) > 0.012) {
              const rate = Math.max(0.85, Math.min(1.18, 1 + drift * 1.5));
              if (Math.abs(v1.playbackRate - rate) > 0.01) {
                v1.playbackRate = rate;
              }
            } else if (v1.playbackRate !== 1) {
              v1.playbackRate = 1;
            }
          }
        } else {
          const to = v1.currentTime;
          const { compTime, isInside } = mapOrigTimeToCompTime(to, keptRanges);
          if (isInside && !v2.seeking) {
            const drift = compTime - v2.currentTime;
            if (Math.abs(drift) > 0.35) {
              v2.playbackRate = 1;
              v2.currentTime = compTime;
            } else if (Math.abs(drift) > 0.012) {
              const rate = Math.max(0.85, Math.min(1.18, 1 + drift * 1.5));
              if (Math.abs(v2.playbackRate - rate) > 0.01) {
                v2.playbackRate = rate;
              }
            } else if (v2.playbackRate !== 1) {
              v2.playbackRate = 1;
            }
          }
        }
      }
      rafId = requestAnimationFrame(syncFrame);
    };

    rafId = requestAnimationFrame(syncFrame);
    return () => {
      cancelAnimationFrame(rafId);
      if (origVideoRef.current) origVideoRef.current.playbackRate = 1;
      if (compVideoRef.current) compVideoRef.current.playbackRate = 1;
    };
  }, [isOpen, isPlaying, isCutSync, keptRanges]);

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

    if (isCutSync) {
      setCompCurrentTime(tc);
      const targetOrig = mapCompTimeToOrigTime(tc, keptRanges);
      setOrigCurrentTime(targetOrig);
      if (origVideoRef.current) {
        if (isPlaying && origVideoRef.current.paused) {
          origVideoRef.current.play().catch(() => {});
        }
        if (Math.abs(origVideoRef.current.currentTime - targetOrig) > 0.3) {
          origVideoRef.current.currentTime = targetOrig;
        }
      }
    }
  };

  const handleOrigTimeUpdate = () => {
    if (!origVideoRef.current) return;
    const to = origVideoRef.current.currentTime;

    if (!isCutSync) {
      setOrigCurrentTime(to);
      const { compTime, isInside } = mapOrigTimeToCompTime(to, keptRanges);
      setCompCurrentTime(compTime);
      if (compVideoRef.current) {
        if (isInside) {
          if (compVideoRef.current.paused && isPlaying) {
            compVideoRef.current.play().catch(() => {});
          }
          if (Math.abs(compVideoRef.current.currentTime - compTime) > 0.3) {
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
    if (newMode === syncMode) return;
    setSyncMode(newMode);
    const v1 = origVideoRef.current;
    const v2 = compVideoRef.current;
    if (!v1 || !v2) return;

    if (newMode === "cut-range") {
      const { compTime } = mapOrigTimeToCompTime(v1.currentTime, keptRanges);
      const targetComp =
        compTime >= compDuration - 0.05 ? 0 : Math.max(0, compTime);
      const targetOrig = mapCompTimeToOrigTime(targetComp, keptRanges);
      v2.currentTime = targetComp;
      v1.currentTime = targetOrig;
      setCompCurrentTime(targetComp);
      setOrigCurrentTime(targetOrig);
      if (isPlaying) {
        v2.play().catch(() => {});
        v1.play().catch(() => {});
      }
    } else {
      const targetOrig = mapCompTimeToOrigTime(v2.currentTime, keptRanges);
      const { compTime, isInside } = mapOrigTimeToCompTime(
        targetOrig,
        keptRanges,
      );
      v1.currentTime = targetOrig;
      v2.currentTime = compTime;
      setOrigCurrentTime(targetOrig);
      setCompCurrentTime(compTime);
      if (isPlaying) {
        v1.play().catch(() => {});
        if (isInside) {
          v2.play().catch(() => {});
        } else {
          v2.pause();
        }
      }
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

  if (!isOpen || !item.compressedUrl) return null;

  const savings =
    item.compressedSize !== undefined
      ? calculateSavings(item.originalSize, item.compressedSize)
      : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs select-none sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-color flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden overscroll-contain rounded-md border bg-white shadow-xl"
      >
        <div className="border-border-color flex items-center justify-between gap-2 border-b border-dashed px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h4
              title={`Visual Inspection: ${item.name}`}
              className="min-w-0 truncate"
            >
              <span className="hidden md:inline">Visual Inspection: </span>
              {item.name}
            </h4>

            {savings && (
              <span className="bg-utils-scent-gray-01/40 text-code-green hidden shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] sm:inline-flex">
                <span className="hidden lg:inline">
                  Saved {formatBytes(savings.bytesSaved)} (
                </span>
                -{savings.percentSaved}%<span className="hidden lg:inline">)</span>
              </span>
            )}

            {isTrimmedOrCut && (
              <span className="border-border-color bg-utils-scent-gray-01/30 text-foreground/80 hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] md:inline-flex">
                <Scissors size={10} className="text-code-rust" />
                <span>
                  <span className="hidden xl:inline">Cut: </span>
                  {formatDuration(compDuration)} /{" "}
                  {formatDuration(origDuration)}
                </span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Sync Mode Selector (only when video is trimmed or cut) */}
            {isTrimmedOrCut && (
              <div className="border-border-color bg-background flex shrink-0 items-center rounded-md border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleSyncMode("cut-range")}
                  className={clsx(
                    "flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-mono text-[11px] whitespace-nowrap transition-all",
                    syncMode === "cut-range"
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                  title="Lock playback frame-by-frame to the edited cut for pixel-accurate quality inspection"
                >
                  <Link2 size={11} />
                  <span className="hidden sm:inline">Matched</span>
                  <span className="hidden lg:inline"> Frames</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleSyncMode("full-timeline")}
                  className={clsx(
                    "flex cursor-pointer items-center gap-1 rounded px-2 py-1 font-mono text-[11px] whitespace-nowrap transition-all",
                    syncMode === "full-timeline"
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                  title="Play the full source video timeline (shows where the cut sits along the entire file)"
                >
                  <Clock size={11} />
                  <span className="hidden sm:inline">Full</span>
                  <span className="hidden lg:inline"> Timeline</span>
                </button>
              </div>
            )}

            {/* View Mode Toggle: Side by Side vs Split Slider */}
            <div className="border-border-color bg-background flex shrink-0 items-center rounded-md border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("side-by-side")}
                className={clsx(
                  "flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs whitespace-nowrap transition-all",
                  viewMode === "side-by-side"
                    ? "bg-foreground text-background"
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
                  "flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs whitespace-nowrap transition-all",
                  viewMode === "split"
                    ? "bg-foreground text-background"
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
              className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Area — Single persistent <video> pair for instant, zero-glitch view switching */}
        <div className="bg-background/40 relative flex h-[50vh] max-h-[60vh] min-h-[280px] w-full items-center justify-center overflow-hidden p-2 select-none sm:h-[54vh] sm:min-h-[380px] sm:p-3">
          <div
            ref={splitContainerRef}
            onPointerDown={
              viewMode === "split" ? handleSplitPointerDown : undefined
            }
            onPointerMove={
              viewMode === "split" ? handleSplitPointerMove : undefined
            }
            onPointerUp={
              viewMode === "split" ? handleSplitPointerUp : undefined
            }
            onPointerCancel={
              viewMode === "split" ? handleSplitPointerUp : undefined
            }
            className={clsx(
              "relative h-full w-full select-none",
              viewMode === "side-by-side"
                ? "grid grid-cols-1 gap-3 md:grid-cols-2"
                : "border-border-color flex cursor-ew-resize touch-none items-center justify-center overflow-hidden rounded border bg-black",
            )}
          >
            {/* Original Video Wrapper (Left in Side-by-Side, Top Clipped Layer in Split Slider) */}
            <div
              style={
                viewMode === "split"
                  ? { clipPath: `inset(0 ${100 - splitPos}% 0 0)` }
                  : undefined
              }
              className={clsx(
                "flex flex-col items-center justify-center overflow-hidden",
                viewMode === "side-by-side"
                  ? "border-border-color relative h-full rounded border bg-black"
                  : "pointer-events-none absolute inset-0 z-20 h-full w-full",
              )}
            >
              <video
                ref={origVideoRef}
                src={item.originalUrl}
                muted={isMuted}
                playsInline
                onLoadedMetadata={handleOrigLoadedMetadata}
                onTimeUpdate={handleOrigTimeUpdate}
                onEnded={handleOrigEnded}
                className="h-full max-h-full w-full object-contain"
              />
              {viewMode === "side-by-side" && (
                <>
                  <span className="bg-foreground/75 absolute top-2 left-2 rounded border border-white/20 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
                    Original &bull; {formatBytes(item.originalSize)}
                  </span>
                  <span className="bg-foreground/75 absolute bottom-2 left-2 rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/90 backdrop-blur-xs">
                    {item.originalDimensions.width} &times;{" "}
                    {item.originalDimensions.height} &bull;{" "}
                    {formatDuration(origCurrentTime)} /{" "}
                    {formatDuration(origDuration)}
                  </span>
                </>
              )}
            </div>

            {/* Optimized Video Wrapper (Right in Side-by-Side, Base Layer in Split Slider) */}
            <div
              className={clsx(
                "flex flex-col items-center justify-center overflow-hidden",
                viewMode === "side-by-side"
                  ? "border-border-color relative h-full rounded border bg-black"
                  : "pointer-events-none absolute inset-0 z-10 h-full w-full",
              )}
            >
              <video
                ref={compVideoRef}
                src={item.compressedUrl}
                muted={isMuted}
                playsInline
                onLoadedMetadata={handleCompLoadedMetadata}
                onTimeUpdate={handleCompTimeUpdate}
                onEnded={handleCompEnded}
                className="h-full max-h-full w-full object-contain"
              />
              {viewMode === "side-by-side" && (
                <>
                  <span className="bg-foreground/75 absolute top-2 right-2 rounded border border-white/20 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
                    Optimized &bull;{" "}
                    {item.compressedSize
                      ? formatBytes(item.compressedSize)
                      : ""}
                  </span>
                  <span className="bg-foreground/75 absolute right-2 bottom-2 rounded border border-white/15 px-1.5 py-0.5 font-mono text-[9px] text-white/90 backdrop-blur-xs">
                    {item.compressedDimensions?.width} &times;{" "}
                    {item.compressedDimensions?.height} &bull;{" "}
                    {formatDuration(compCurrentTime)} /{" "}
                    {formatDuration(compDuration)}
                  </span>

                  {!isCutSync && !origCutStatus.isInside && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center">
                      <span className="bg-foreground/90 rounded border border-white/20 px-2.5 py-1 font-mono text-xs text-white">
                        Outside cut range ({formatDuration(origCurrentTime)})
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Split Slider Overlays */}
            {viewMode === "split" && (
              <>
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-30 flex w-0.5 items-center justify-center bg-white shadow-md"
                  style={{ left: `${splitPos}%` }}
                >
                  <div className="bg-foreground text-background flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white text-[10px] shadow-md">
                    <ArrowRightLeft className="h-3 w-3" />
                  </div>
                </div>

                <div className="pointer-events-none absolute top-2 left-2 z-30">
                  <span className="bg-foreground/75 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white backdrop-blur-xs sm:px-2 sm:text-[10px]">
                    Original ({formatBytes(item.originalSize)})
                    <span className="hidden sm:inline">
                      {" "}
                      &bull; {formatDuration(origCurrentTime)}
                    </span>
                  </span>
                </div>
                <div className="pointer-events-none absolute top-2 right-2 z-30">
                  <span className="bg-foreground/75 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white backdrop-blur-xs sm:px-2 sm:text-[10px]">
                    Optimized (
                    {item.compressedSize
                      ? formatBytes(item.compressedSize)
                      : ""}
                    )
                    <span className="hidden sm:inline">
                      {" "}
                      &bull; {formatDuration(compCurrentTime)}
                    </span>
                  </span>
                </div>

                <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2">
                  <span className="bg-foreground/75 rounded border border-white/15 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-xs">
                    {Math.round(splitPos)}% / {100 - Math.round(splitPos)}%
                  </span>
                </div>

                {!isCutSync && !origCutStatus.isInside && (
                  <div className="pointer-events-none absolute top-12 left-1/2 z-30 -translate-x-1/2">
                    <span className="bg-foreground/90 rounded border border-white/20 px-2.5 py-1 font-mono text-xs text-white shadow-md">
                      Outside cut range ({formatDuration(origCurrentTime)})
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Master Playback Controls Bar */}
        <div className="border-border-color flex flex-col gap-2 border-t border-dashed bg-white p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="bg-foreground text-background hover:bg-utils-scent-orange flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all active:scale-95"
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
              className="text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 shrink-0 cursor-pointer items-center gap-0.5 rounded px-1.5 font-mono text-[11px] transition-colors"
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
            <div className="relative order-first flex h-6 w-full items-center sm:order-none sm:w-auto sm:flex-1">
              {/* Highlight kept regions on track in full-timeline mode */}
              {!isCutSync && isTrimmedOrCut && (
                <div className="bg-utils-scent-gray-01/60 pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-lg">
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

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0 sm:gap-2">
              {/* Loop Toggle */}
              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={clsx(
                  "flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-all",
                  isLooping
                    ? "bg-foreground text-background border-foreground"
                    : "border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 bg-white",
                )}
                title="Loop preview playback continuously"
              >
                <Repeat size={12} />
                <span className="hidden sm:inline">Loop</span>
              </button>

              {/* Mute Toggle */}
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className={clsx(
                  "border-border-color hover:bg-utils-scent-gray-01/30 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-all",
                  isMuted
                    ? "text-code-rust"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              {/* Direct Download Button */}
              <button
                type="button"
                onClick={onDownload}
                className="bg-background border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all sm:px-3"
                title="Download optimized video"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
