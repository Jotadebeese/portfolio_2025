"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Scissors,
  Check,
  Sparkles,
  Repeat,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { VideoFileItem, VideoOptimizerSettings, VideoSection } from "../types";
import {
  formatBytes,
  formatDuration,
  calculateSavings,
  estimateVideoSize,
  getVideoOrientation,
  getEffectiveVideoDuration,
  normalizeTrim,
  hasEffectiveTrim,
} from "../utils/format";
import { extractAudioWaveform } from "../utils/audio-waveform";

type Props = {
  item: VideoFileItem;
  settings: VideoOptimizerSettings;
  onClose: () => void;
  onApply: (
    item: VideoFileItem,
    newTrim?: { start: number; end: number },
    newStripAudio?: boolean,
    newSections?: VideoSection[],
  ) => void;
  onCompressNow?: (
    item: VideoFileItem,
    newTrim?: { start: number; end: number },
    newStripAudio?: boolean,
    newSections?: VideoSection[],
  ) => void;
};

export default function EditModal({
  item,
  settings,
  onClose,
  onApply,
  onCompressNow,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const duration = item.duration > 0 ? item.duration : 1;
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [loopPlayback, setLoopPlayback] = useState<boolean>(false);
  const [waveformStyle, setWaveformStyle] = useState<"bars" | "smooth">("bars");

  // Initialize sections from item.sections, fallback to item.trim, or single 0..duration section
  const [sections, setSections] = useState<VideoSection[]>(() => {
    if (item.sections && item.sections.length > 0) {
      return item.sections;
    }
    const normTrim = normalizeTrim(duration, item.trim);
    if (normTrim) {
      const list: VideoSection[] = [];
      if (normTrim.start > 0.05) {
        list.push({
          id: "sec-pre-cut",
          start: 0,
          end: normTrim.start,
          isDeleted: true,
        });
      }
      list.push({
        id: "sec-main",
        start: normTrim.start,
        end: normTrim.end,
        isDeleted: false,
      });
      if (normTrim.end < duration - 0.05) {
        list.push({
          id: "sec-post-cut",
          start: normTrim.end,
          end: duration,
          isDeleted: true,
        });
      }
      return list;
    }
    return [{ id: "sec-0", start: 0, end: duration, isDeleted: false }];
  });

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => sections.find((s) => !s.isDeleted)?.id || sections[0]?.id || null,
  );

  // Audio state
  const initialStripAudio =
    item.stripAudio !== undefined ? item.stripAudio : settings.stripAudio;
  const [isMuted, setIsMuted] = useState<boolean>(initialStripAudio);

  // Waveform state
  const [waveformPeaks, setWaveformPeaks] = useState<number[] | null>(null);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState<boolean>(true);

  // Dragging and hover state
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [draggingBoundary, setDraggingBoundary] = useState<{
    sectionId: string;
    boundary: "start" | "end";
  } | null>(null);

  // Generate dynamic ruler marks (major timestamps + minor tick marks) without label collisions
  const rulerMarks = useMemo<{ time: number; isMajor: boolean }[]>(() => {
    const STEP_CONFIGS = [
      { majorStep: 1, minorDiv: 4 },
      { majorStep: 2, minorDiv: 4 },
      { majorStep: 5, minorDiv: 5 },
      { majorStep: 10, minorDiv: 5 },
      { majorStep: 15, minorDiv: 3 },
      { majorStep: 30, minorDiv: 3 },
      { majorStep: 60, minorDiv: 4 },
      { majorStep: 120, minorDiv: 4 },
      { majorStep: 300, minorDiv: 5 },
      { majorStep: 600, minorDiv: 5 },
      { majorStep: 900, minorDiv: 3 },
      { majorStep: 1800, minorDiv: 3 },
      { majorStep: 3600, minorDiv: 4 },
    ];
    const chosen =
      STEP_CONFIGS.find((cfg) => duration / cfg.majorStep <= 5.5) ||
      STEP_CONFIGS[STEP_CONFIGS.length - 1];

    const { majorStep, minorDiv } = chosen;
    const minorStep = majorStep / minorDiv;
    const totalSteps = Math.floor(duration / minorStep);
    const minEndGap = duration * 0.14;
    const marks: { time: number; isMajor: boolean }[] = [];

    for (let i = 0; i <= totalSteps; i++) {
      const t = i * minorStep;
      if (t > duration) break;
      const isAtEnd = Math.abs(t - duration) < 0.05;
      const isMultipleOfMajor =
        Math.abs(t % majorStep) < 0.001 ||
        Math.abs((t % majorStep) - majorStep) < 0.001;
      const tooCloseToEnd = !isAtEnd && t > 0 && duration - t < minEndGap;

      marks.push({
        time: isAtEnd ? duration : t,
        isMajor: isAtEnd || (isMultipleOfMajor && !tooCloseToEnd),
      });
    }

    if (!marks.some((m) => Math.abs(m.time - duration) < 0.05)) {
      marks.push({ time: duration, isMajor: true });
    }
    return marks;
  }, [duration]);

  const formatStatDuration = (secs: number) =>
    secs >= 60 ? formatDuration(secs) : `${secs.toFixed(1)}s`;

  const orientation = getVideoOrientation(
    item.originalDimensions.width,
    item.originalDimensions.height,
  );

  // Lock background page scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Extract audio waveform peaks
  useEffect(() => {
    if (!item.hasAudio) {
      setWaveformPeaks(null);
      setIsLoadingWaveform(false);
      return;
    }

    let cancelled = false;
    setIsLoadingWaveform(true);

    extractAudioWaveform(item.file, 160).then((peaks) => {
      if (!cancelled) {
        setWaveformPeaks(peaks);
        setIsLoadingWaveform(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item.file, item.hasAudio]);

  // Handle video playback rate changes
  const handleSetPlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Video timeupdate with real-time cut skipping
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const t = video.currentTime;
    setCurrentTime(t);

    if (isPlaying) {
      // Check if current playhead enters a cut / deleted section
      const inDeleted = sections.find(
        (s) => s.isDeleted && t >= s.start && t < s.end,
      );
      if (inDeleted) {
        // Find next kept section
        const nextKept = sections.find(
          (s) => !s.isDeleted && s.start >= inDeleted.end,
        );
        if (nextKept) {
          video.currentTime = nextKept.start;
          setCurrentTime(nextKept.start);
        } else if (loopPlayback) {
          const firstKept = sections.find((s) => !s.isDeleted);
          if (firstKept) {
            video.currentTime = firstKept.start;
            setCurrentTime(firstKept.start);
            video.play().catch(() => {});
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
        } else {
          video.pause();
          setIsPlaying(false);
        }
      } else {
        // Check if passed end of all kept sections
        const keptSections = sections.filter((s) => !s.isDeleted);
        if (keptSections.length > 0) {
          const lastKept = keptSections[keptSections.length - 1];
          if (t >= lastKept.end - 0.08) {
            if (loopPlayback) {
              const firstKept = keptSections[0];
              video.currentTime = firstKept.start;
              setCurrentTime(firstKept.start);
              video.play().catch(() => {});
              setIsPlaying(true);
            } else {
              video.pause();
              setIsPlaying(false);
            }
          }
        }
      }
    }
  }, [sections, isPlaying, loopPlayback]);

  // Video ended handler with automatic loop support
  const handleEnded = useCallback(() => {
    if (loopPlayback) {
      const keptSections = sections.filter((s) => !s.isDeleted);
      const firstKept = keptSections[0];
      if (firstKept && videoRef.current) {
        videoRef.current.currentTime = firstKept.start;
        setCurrentTime(firstKept.start);
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
    }
  }, [loopPlayback, sections]);

  // Render audio waveform onto canvas (supports detailed Bars or smooth Loom silhouette)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformPeaks || waveformPeaks.length === 0) return;

    const drawWaveform = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (waveformStyle === "bars") {
        const barCount = waveformPeaks.length;
        const barWidth = Math.max(1.8, (w / barCount) * 0.65);
        const gap = (w - barCount * barWidth) / (barCount - 1);

        for (let i = 0; i < barCount; i++) {
          const peak = waveformPeaks[i];
          const barHeight = Math.max(3, peak * (h - 14));
          const x = i * (barWidth + gap);
          const y = (h - barHeight) / 2;

          const barTime = (i / barCount) * duration;
          const isCut = sections.some(
            (s) => s.isDeleted && barTime >= s.start && barTime < s.end,
          );

          if (isCut) {
            ctx.fillStyle = "#cecece"; // Signature neutral border gray
          } else if (isMuted) {
            ctx.fillStyle = "#8a8177"; // Muted slate gray when audio is stripped
          } else {
            ctx.fillStyle = "#181411"; // Signature foreground charcoal
          }

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 1);
          ctx.fill();
        }
      } else {
        // Smooth continuous fluid silhouette envelope
        const N = waveformPeaks.length;
        const yCenter = h / 2;
        const maxAmp = h / 2 - 4; // leave 4px padding top and bottom

        // Build smoothed point envelope
        const points: { x: number; topY: number; botY: number }[] = [];
        for (let i = 0; i < N; i++) {
          const pPrev = waveformPeaks[Math.max(0, i - 1)];
          const pCurr = waveformPeaks[i];
          const pNext = waveformPeaks[Math.min(N - 1, i + 1)];
          const smoothed = (pPrev + pCurr * 2 + pNext) / 4;
          const amp = Math.max(3, smoothed * maxAmp);
          const x = (i / (N - 1)) * w;
          points.push({
            x,
            topY: yCenter - amp,
            botY: yCenter + amp,
          });
        }

        const drawWaveformEnvelope = () => {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].topY);

          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.topY + p1.topY) / 2;
            ctx.quadraticCurveTo(p0.x, p0.topY, midX, midY);
          }
          const last = points[points.length - 1];
          ctx.lineTo(last.x, last.topY);

          ctx.lineTo(last.x, last.botY);
          for (let i = points.length - 1; i > 0; i--) {
            const p0 = points[i];
            const p1 = points[i - 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.botY + p1.botY) / 2;
            ctx.quadraticCurveTo(p0.x, p0.botY, midX, midY);
          }
          ctx.lineTo(points[0].x, points[0].botY);
          ctx.closePath();
        };

        // 1. Draw entire waveform in signature neutral gray (#cecece)
        drawWaveformEnvelope();
        ctx.fillStyle = "#cecece";
        ctx.fill();

        // 2. Draw vibrant waveform over kept sections using clipping masks
        const keptSections = sections.filter(
          (s) => !s.isDeleted && s.end > s.start,
        );
        for (const sec of keptSections) {
          const startX = (sec.start / duration) * w;
          const endX = (sec.end / duration) * w;
          const secW = endX - startX;

          if (secW > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(startX, 0, secW, h);
            ctx.clip();

            drawWaveformEnvelope();
            if (isMuted) {
              ctx.fillStyle = "#8a8177";
            } else {
              ctx.fillStyle = "#181411"; // Signature foreground charcoal
            }
            ctx.fill();
            ctx.restore();
          }
        }
      }
    };

    drawWaveform();

    const resizeObserver = new ResizeObserver(() => {
      drawWaveform();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [waveformPeaks, sections, isMuted, duration, waveformStyle]);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      const currentInDeleted = sections.find(
        (s) => s.isDeleted && currentTime >= s.start && currentTime < s.end,
      );
      if (currentInDeleted || currentTime >= duration - 0.05) {
        const firstKept = sections.find((s) => !s.isDeleted);
        if (firstKept) {
          video.currentTime = firstKept.start;
          setCurrentTime(firstKept.start);
        }
      }
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [isPlaying, currentTime, duration, sections]);

  // Jump by relative seconds
  const jumpTime = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(duration, video.currentTime + delta));
    video.currentTime = target;
    setCurrentTime(target);
  };

  // Convert client coordinate into seconds
  const getTimeFromX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    return Math.max(0, Math.min(duration, ratio * duration));
  };

  // Track pointer down: single tap seeks needle, drag scrubs playhead!
  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (draggingBoundary) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const newT = Number(getTimeFromX(e.clientX).toFixed(2));
    const video = videoRef.current;
    if (video) video.currentTime = newT;
    setCurrentTime(newT);
    setIsDraggingPlayhead(true);

    // Auto-select section containing tapped timestamp
    const targetSec = sections.find((s) => newT >= s.start && newT <= s.end);
    if (targetSec) {
      setSelectedSectionId(targetSec.id);
    }
  };

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (isDraggingPlayhead) {
      const newT = Number(getTimeFromX(e.clientX).toFixed(2));
      const video = videoRef.current;
      if (video) video.currentTime = newT;
      setCurrentTime(newT);

      const targetSec = sections.find((s) => newT >= s.start && newT <= s.end);
      if (targetSec && targetSec.id !== selectedSectionId) {
        setSelectedSectionId(targetSec.id);
      }
    } else if (draggingBoundary) {
      const newT = Number(getTimeFromX(e.clientX).toFixed(2));
      const idx = sections.findIndex((s) => s.id === draggingBoundary.sectionId);
      if (idx === -1) return;
      const sec = sections[idx];
      const minSectionDuration = Math.max(
        0.5,
        Math.min(duration * 0.25, Number((duration * 0.03).toFixed(2))),
      );

      // If handles are close together at a timeline wall, auto-switch boundary to match drag direction
      let activeBoundary = draggingBoundary.boundary;
      if (
        activeBoundary === "end" &&
        sec.end >= duration - 0.05 &&
        newT < sec.start
      ) {
        activeBoundary = "start";
        setDraggingBoundary({ sectionId: sec.id, boundary: "start" });
      } else if (
        activeBoundary === "start" &&
        sec.start <= 0.05 &&
        newT > sec.end
      ) {
        activeBoundary = "end";
        setDraggingBoundary({ sectionId: sec.id, boundary: "end" });
      }

      if (activeBoundary === "start") {
        const isLeadingCut = idx === 1 && Boolean(sections[0]?.isDeleted);
        const minBound =
          idx === 0 || isLeadingCut ? 0 : sections[idx - 1].start + 0.15;
        const maxBound = Math.max(minBound, sec.end - minSectionDuration);
        const rawClamped = Math.max(minBound, Math.min(newT, maxBound));
        const clamped =
          (idx === 0 || isLeadingCut) && rawClamped <= 0.05 ? 0 : rawClamped;

        setSections((prev) => {
          const curIdx = prev.findIndex(
            (s) => s.id === draggingBoundary.sectionId,
          );
          if (curIdx === -1) return prev;
          const updated = [...prev];

          if (curIdx === 1 && updated[0]?.isDeleted && clamped === 0) {
            updated.shift();
            updated[0] = { ...updated[0], start: 0 };
            return updated;
          }

          if (curIdx === 0 && clamped > 0) {
            updated[0] = { ...updated[0], start: clamped };
            updated.unshift({
              id: "sec-pre-cut",
              start: 0,
              end: clamped,
              isDeleted: true,
            });
            return updated;
          }

          if (curIdx > 0) {
            updated[curIdx - 1] = { ...updated[curIdx - 1], end: clamped };
          }
          updated[curIdx] = { ...updated[curIdx], start: clamped };
          return updated;
        });

        if (videoRef.current) videoRef.current.currentTime = clamped;
        setCurrentTime(clamped);
      } else if (activeBoundary === "end") {
        const isTrailingCut =
          idx === sections.length - 2 &&
          Boolean(sections[sections.length - 1]?.isDeleted);
        const maxBound =
          idx === sections.length - 1 || isTrailingCut
            ? duration
            : sections[idx + 1].end - 0.15;
        const minBound = Math.min(maxBound, sec.start + minSectionDuration);
        const rawClamped = Math.max(minBound, Math.min(newT, maxBound));
        const clamped =
          (idx === sections.length - 1 || isTrailingCut) &&
          rawClamped >= duration - 0.05
            ? duration
            : rawClamped;

        setSections((prev) => {
          const curIdx = prev.findIndex(
            (s) => s.id === draggingBoundary.sectionId,
          );
          if (curIdx === -1) return prev;
          const updated = [...prev];

          if (
            curIdx === updated.length - 2 &&
            updated[updated.length - 1]?.isDeleted &&
            clamped === duration
          ) {
            updated.pop();
            updated[curIdx] = { ...updated[curIdx], end: duration };
            return updated;
          }

          if (curIdx === updated.length - 1 && clamped < duration) {
            updated[curIdx] = { ...updated[curIdx], end: clamped };
            updated.push({
              id: "sec-post-cut",
              start: clamped,
              end: duration,
              isDeleted: true,
            });
            return updated;
          }

          if (curIdx < updated.length - 1) {
            updated[curIdx + 1] = { ...updated[curIdx + 1], start: clamped };
          }
          updated[curIdx] = { ...updated[curIdx], end: clamped };
          return updated;
        });

        if (videoRef.current) videoRef.current.currentTime = clamped;
        setCurrentTime(clamped);
      }
    }
  };

  const handleTrackPointerUp = (e: React.PointerEvent) => {
    if (isDraggingPlayhead || draggingBoundary) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (isDraggingPlayhead) {
      setIsDraggingPlayhead(false);
    }
    if (draggingBoundary) {
      setDraggingBoundary(null);
    }
  };

  // Split action: split section containing currentTime
  const handleSplitAtPlayhead = () => {
    const t = Number(currentTime.toFixed(2));
    if (t <= 0.1 || t >= duration - 0.1) return;

    const targetIndex = sections.findIndex(
      (s) => t > s.start + 0.15 && t < s.end - 0.15,
    );
    if (targetIndex === -1) return;

    const targetSec = sections[targetIndex];
    const newSecA: VideoSection = {
      id: `sec-${Date.now()}-a`,
      start: targetSec.start,
      end: t,
      isDeleted: targetSec.isDeleted,
    };
    const newSecB: VideoSection = {
      id: `sec-${Date.now()}-b`,
      start: t,
      end: targetSec.end,
      isDeleted: targetSec.isDeleted,
    };

    const nextSections = [
      ...sections.slice(0, targetIndex),
      newSecA,
      newSecB,
      ...sections.slice(targetIndex + 1),
    ];

    setSections(nextSections);
    setSelectedSectionId(newSecB.id);
  };

  // Toggle delete / kept on a section
  const handleToggleDeleteSection = (sectionId: string) => {
    setSections((prev) => {
      const target = prev.find((s) => s.id === sectionId);
      if (!target) return prev;

      // Prevent deleting the last remaining kept section
      if (!target.isDeleted) {
        const currentKeptCount = prev.filter(
          (s) => !s.isDeleted && s.end > s.start,
        ).length;
        if (currentKeptCount <= 1) {
          return prev;
        }
      }

      return prev.map((s) =>
        s.id === sectionId ? { ...s, isDeleted: !s.isDeleted } : s,
      );
    });
  };

  // Merge section with adjacent
  const handleMergeSection = (index: number) => {
    if (index < 0 || index >= sections.length - 1) return;
    const current = sections[index];
    const next = sections[index + 1];

    // If only 2 sections exist, merging them restores a single kept section;
    // otherwise preserve the selected section's kept state (defaulting to kept if either is kept).
    const willBeSingleSection = sections.length === 2;
    const keptCountAfterMerge =
      sections.filter(
        (s, i) => i !== index && i !== index + 1 && !s.isDeleted,
      ).length;

    const selectedIsDeleted =
      selectedSectionId === next.id ? next.isDeleted : current.isDeleted;
    const mergedIsDeleted =
      willBeSingleSection || keptCountAfterMerge === 0
        ? false
        : Boolean(selectedIsDeleted);

    const merged: VideoSection = {
      id: `sec-${Date.now()}`,
      start: current.start,
      end: next.end,
      isDeleted: mergedIsDeleted,
    };

    const nextSections = [
      ...sections.slice(0, index),
      merged,
      ...sections.slice(index + 2),
    ];
    setSections(nextSections);
    setSelectedSectionId(merged.id);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedSectionId) {
          e.preventDefault();
          handleToggleDeleteSection(selectedSectionId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, togglePlay, selectedSectionId, currentTime]);

  // Reset all edits back to un-trimmed full source video
  const handleReset = () => {
    setSections([{ id: "sec-0", start: 0, end: duration, isDeleted: false }]);
    setSelectedSectionId("sec-0");
    setIsMuted(settings.stripAudio);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  // Clean calculations
  const keptSections = sections.filter((s) => !s.isDeleted && s.end > s.start);
  const totalKeptDuration = keptSections.reduce(
    (acc, s) => acc + (s.end - s.start),
    0,
  );
  const totalCutDuration = Math.max(0, duration - totalKeptDuration);
  const hasActiveCuts = sections.some((s) => s.isDeleted);
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;

  // Single trim calculation (normalized: returns undefined if covers 0..duration)
  const isSingleKeptInterval =
    keptSections.length === 1 && !hasActiveCuts;
  const computedTrim = isSingleKeptInterval
    ? normalizeTrim(duration, {
        start: keptSections[0].start,
        end: keptSections[0].end,
      })
    : undefined;

  const finalSectionsToApply = hasActiveCuts ? sections : undefined;
  const finalStripAudioToApply =
    isMuted === settings.stripAudio ? undefined : isMuted;

  // Estimated size calculation
  const simulatedSettings: Partial<VideoOptimizerSettings> = {
    ...settings,
    trim: computedTrim,
    sections: finalSectionsToApply,
    stripAudio: isMuted,
  };

  const estimatedBytes = estimateVideoSize(
    duration,
    simulatedSettings,
    computedTrim,
    item.originalDimensions.width,
    item.originalDimensions.height,
    item.originalSize,
    finalSectionsToApply,
  );
  const estimatedSavings = calculateSavings(item.originalSize, estimatedBytes);

  const handleApply = () => {
    onApply(item, computedTrim, finalStripAudioToApply, finalSectionsToApply);
    onClose();
  };

  const handleApplyAndCompress = () => {
    if (onCompressNow) {
      onCompressNow(
        item,
        computedTrim,
        finalStripAudioToApply,
        finalSectionsToApply,
      );
    } else {
      onApply(item, computedTrim, finalStripAudioToApply, finalSectionsToApply);
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 backdrop-blur-xs select-none sm:p-5"
    >
      <div className="border-border-color flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border bg-white shadow-2xl overscroll-contain">
        {/* Header Bar */}
        <div className="border-border-color text-foreground flex items-center justify-between gap-2 border-b border-dashed bg-white px-3 py-2.5 sm:p-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <div className="border-border-color bg-utils-scent-gray-01/30 text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded border">
              <Scissors size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  id="edit-studio-title"
                  className="text-foreground truncate text-xs font-semibold sm:text-sm"
                >
                  <span className="hidden sm:inline">Edit Studio &bull; </span>
                  {item.customName || item.name}
                </h3>
                <span className="border-border-color bg-utils-scent-gray-01/30 text-foreground/70 hidden shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] sm:inline-block">
                  {orientation.label} ({orientation.ratio})
                </span>
              </div>
              <p className="text-foreground/50 truncate font-mono text-[10px] sm:text-[11px]">
                Source: {formatDuration(duration)} ({duration.toFixed(1)}s)
                &bull; {formatBytes(item.originalSize)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs transition-all sm:px-2.5"
              title="Reset all splits and cuts back to original video"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 w-7 cursor-pointer items-center justify-center rounded border transition-all"
              title="Close without applying (Esc)"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Video Stage (Cinema Canvas) */}
        <div className="border-border-color relative flex max-h-[34vh] min-h-[180px] flex-1 items-center justify-center overflow-hidden border-b bg-black/95 p-2.5 sm:max-h-[42vh] sm:min-h-[220px] sm:p-3">
          <video
            ref={videoRef}
            src={item.originalUrl}
            playsInline
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onClick={togglePlay}
            className="max-h-[30vh] w-auto max-w-full cursor-pointer rounded object-contain shadow-lg sm:max-h-[38vh]"
          />

          {/* Big Play Overlay */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="bg-foreground/80 hover:bg-foreground absolute flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 text-white shadow-lg backdrop-blur-xs transition-all active:scale-95 sm:h-12 sm:w-12"
              aria-label="Play video"
            >
              <Play size={20} className="ml-0.5" />
            </button>
          )}

          {/* Top Left: Timecode Overlay */}
          <div className="bg-foreground/75 absolute top-2 left-2 flex items-center gap-1 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs sm:top-3 sm:left-3 sm:gap-1.5 sm:px-2 sm:text-xs">
            <span className="font-semibold text-white">
              {formatDuration(currentTime)}
            </span>
            <span className="text-white/40">/</span>
            <span className="text-white/75">{formatDuration(duration)}</span>
          </div>

          {/* Top Right: Audio Status Overlay */}
          <div className="bg-foreground/75 absolute top-2 right-2 flex items-center gap-1 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs sm:top-3 sm:right-3 sm:gap-1.5 sm:px-2 sm:text-xs">
            {isMuted ? (
              <span className="flex items-center gap-1 text-white/70">
                <VolumeX size={12} /> Muted
              </span>
            ) : (
              <span className="flex items-center gap-1 text-white">
                <Volume2 size={12} /> Audio On
              </span>
            )}
          </div>
        </div>

        {/* Video Player Control Bar (Directly Under Video) */}
        <div className="border-border-color text-foreground flex flex-wrap items-center justify-between gap-1.5 border-b bg-white px-2.5 py-1.5 text-xs sm:px-4 sm:py-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="bg-foreground text-background hover:bg-foreground/90 flex h-7 w-7 cursor-pointer items-center justify-center rounded shadow-xs transition-all"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause size={13} />
              ) : (
                <Play size={13} className="ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => jumpTime(-5)}
              className="text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/40 hidden h-7 cursor-pointer items-center gap-0.5 rounded px-1.5 font-mono text-[11px] transition-all sm:flex"
              title="Jump back 5s"
            >
              <RotateCcw size={12} />
              <span>5s</span>
            </button>

            <button
              type="button"
              onClick={() => jumpTime(5)}
              className="text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/40 hidden h-7 cursor-pointer items-center gap-0.5 rounded px-1.5 font-mono text-[11px] transition-all sm:flex"
              title="Jump forward 5s"
            >
              <RotateCw size={12} />
              <span>5s</span>
            </button>

            <span className="text-foreground ml-1 hidden font-mono text-xs font-medium sm:inline">
              {formatDuration(currentTime)}{" "}
              <span className="text-foreground/40 font-normal">
                / {formatDuration(duration)}
              </span>
            </span>
          </div>

          {/* Right Controls: Playback Speed, Mute & Loop Toggle */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Playback speed toggle */}
            <div
              className="border-border-color flex items-center overflow-hidden rounded border bg-white font-mono text-[10px] sm:text-[11px]"
              title="Preview playback speed (for scrubbing/review only — does not affect exported video)"
            >
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSetPlaybackRate(rate)}
                  className={clsx(
                    "cursor-pointer px-1 py-0.5 transition-colors sm:px-1.5",
                    rate === 1.25 && "hidden sm:inline-block",
                    playbackRate === rate
                      ? "bg-foreground text-background font-semibold"
                      : "text-foreground/70 hover:bg-utils-scent-gray-01/40",
                  )}
                  title={`Preview at ${rate}x speed (scrubbing only)`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Mute Audio Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={clsx(
                "flex cursor-pointer items-center gap-1 rounded border px-1.5 py-1 font-mono text-[11px] transition-colors sm:px-2 sm:py-0.5",
                isMuted
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "border-border-color text-foreground/70 hover:text-foreground bg-white",
              )}
              title={
                isMuted
                  ? "Audio is stripped/muted"
                  : "Audio track is preserved"
              }
            >
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span className="hidden sm:inline">
                {isMuted ? "Muted" : "Audio"}
              </span>
            </button>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setLoopPlayback(!loopPlayback)}
              className={clsx(
                "flex cursor-pointer items-center gap-1 rounded border px-1.5 py-1 font-mono text-[11px] transition-colors sm:px-2 sm:py-0.5",
                loopPlayback
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "border-border-color text-foreground/70 hover:text-foreground bg-white",
              )}
              title="Loop preview playback (cycles continuously without stopping)"
            >
              <Repeat size={12} />
              <span className="hidden sm:inline">Loop</span>
            </button>

            {/* Waveform Style Toggle: Bars vs Smooth */}
            <div className="border-border-color flex items-center overflow-hidden rounded border bg-white font-mono text-[10px] sm:text-[11px]">
              <button
                type="button"
                onClick={() => setWaveformStyle("bars")}
                className={clsx(
                  "cursor-pointer px-1.5 py-0.5 transition-colors sm:px-2",
                  waveformStyle === "bars"
                    ? "bg-foreground text-background font-semibold"
                    : "text-foreground/60 hover:text-foreground",
                )}
                title="Render detailed vertical audio bars (crisp speech & pause transients)"
              >
                Bars
              </button>
              <button
                type="button"
                onClick={() => setWaveformStyle("smooth")}
                className={clsx(
                  "cursor-pointer px-1.5 py-0.5 transition-colors sm:px-2",
                  waveformStyle === "smooth"
                    ? "bg-foreground text-background font-semibold"
                    : "text-foreground/60 hover:text-foreground",
                )}
                title="Render smooth fluid waveform silhouette (Loom curve)"
              >
                Smooth
              </button>
            </div>
          </div>
        </div>

        {/* Action Toolbar Above Timeline */}
        <div className="border-border-color bg-utils-scent-gray-01/15 text-foreground flex flex-wrap items-center justify-between gap-1.5 border-b px-2.5 py-1.5 text-xs sm:px-4 sm:py-2">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {/* Split at Playhead Button */}
            <button
              type="button"
              onClick={handleSplitAtPlayhead}
              className="bg-foreground text-background hover:bg-foreground/90 flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[11px] font-medium shadow-xs transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
              title="Split clip at current playhead position (Shortcut: S)"
            >
              <Scissors size={12} />
              <span>
                Split
                <span className="hidden sm:inline">
                  {" "}
                  at {formatDuration(currentTime)} [S]
                </span>
              </span>
            </button>

            {/* Delete / Cut Selection */}
            {selectedSection && !selectedSection.isDeleted && (
              <button
                type="button"
                disabled={keptSections.length <= 1}
                onClick={() => handleToggleDeleteSection(selectedSection.id)}
                className={clsx(
                  "border-border-color text-foreground/80 flex items-center gap-1 rounded border bg-white px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:py-1.5 sm:text-xs",
                  keptSections.length <= 1
                    ? "cursor-not-allowed opacity-40"
                    : "hover:text-foreground hover:bg-utils-scent-gray-01/30 cursor-pointer",
                )}
                title={
                  keptSections.length <= 1
                    ? "Split the clip first [S] to delete a section — at least one section must remain"
                    : "Cut / delete selected section (Shortcut: Delete/Backspace)"
                }
              >
                <Trash2 size={12} />
                <span>
                  Delete<span className="hidden sm:inline"> selection</span>
                </span>
              </button>
            )}

            {/* Restore Cut Selection */}
            {selectedSection && selectedSection.isDeleted && (
              <button
                type="button"
                onClick={() => handleToggleDeleteSection(selectedSection.id)}
                className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1 rounded border bg-white px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:py-1.5 sm:text-xs"
                title="Restore this cut section back into the video"
              >
                <Undo2 size={12} />
                <span>
                  Restore<span className="hidden sm:inline"> selection</span>
                </span>
              </button>
            )}

            {/* Merge with neighbor if multiple sections */}
            {sections.length > 1 && selectedSection && (
              <button
                type="button"
                onClick={() => {
                  const idx = sections.findIndex(
                    (s) => s.id === selectedSection.id,
                  );
                  if (idx < sections.length - 1) {
                    handleMergeSection(idx);
                  } else if (idx > 0) {
                    handleMergeSection(idx - 1);
                  }
                }}
                className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/80 cursor-pointer rounded border bg-white px-1.5 py-1 font-mono text-[11px] transition-colors sm:px-2.5 sm:py-1.5 sm:text-xs"
                title="Merge selected section with its neighbor"
              >
                Merge
              </button>
            )}

            {/* Selected Segment Info */}
            {selectedSection && (
              <span className="text-foreground/60 ml-1 hidden font-mono text-xs md:inline">
                Selected:{" "}
                <strong className="text-foreground">
                  {formatStatDuration(
                    selectedSection.end - selectedSection.start,
                  )}
                </strong>{" "}
                ({formatDuration(selectedSection.start)} &rarr;{" "}
                {formatDuration(selectedSection.end)})
              </span>
            )}
          </div>

          {/* Kept vs Cut Stats on the Right */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] sm:gap-3 sm:text-xs">
            <span className="text-foreground/70">
              <span
                className={clsx(totalCutDuration > 0.05 && "hidden sm:inline")}
              >
                Kept:{" "}
              </span>
              <strong className="text-foreground">
                {formatStatDuration(totalKeptDuration)}
              </strong>
            </span>
            {totalCutDuration > 0.05 && (
              <span className="border-border-color bg-utils-scent-gray-01/40 text-foreground/70 rounded border px-1.5 py-0.5 text-[10px] sm:text-[11px]">
                Cut -{formatStatDuration(totalCutDuration)}
                <span className="hidden sm:inline">
                  {" "}
                  (-{Math.round((totalCutDuration / duration) * 100)}%)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Master Timeline & Waveform Scrubber */}
        <div className="flex flex-col gap-1.5 bg-white p-2.5 sm:gap-2 sm:p-4">
          {/* Master Interactive Track (Ruler + Waveform in ONE cohesive clickable container) */}
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={(e) => {
              handleTrackPointerMove(e);
              if (!isDraggingPlayhead && !draggingBoundary) {
                setHoverTime(getTimeFromX(e.clientX));
              }
            }}
            onPointerLeave={() => setHoverTime(null)}
            onPointerUp={handleTrackPointerUp}
            onPointerCancel={handleTrackPointerUp}
            className="border-border-color relative w-full cursor-pointer overflow-hidden rounded-lg border bg-white select-none"
          >
            {/* Top Time Ruler with tick marks */}
            <div className="border-border-color/60 bg-utils-scent-gray-01/15 pointer-events-none relative h-6 w-full border-b select-none">
              {rulerMarks.map((mark, i) => {
                const isFirst = i === 0;
                const isLast = i === rulerMarks.length - 1;
                return (
                  <div
                    key={i}
                    className="pointer-events-none absolute top-0 bottom-0 flex flex-col items-center"
                    style={{
                      left: `${(mark.time / duration) * 100}%`,
                      transform: isFirst
                        ? "none"
                        : isLast
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    }}
                  >
                    {mark.isMajor ? (
                      <>
                        <span
                          className={clsx(
                            "text-foreground/55 pt-1 font-mono text-[10px] leading-none",
                            isFirst && "pl-1.5",
                            isLast && "pr-1.5",
                          )}
                        >
                          {formatDuration(mark.time)}
                        </span>
                        <div className="bg-border-color mt-auto h-1.5 w-[1px]" />
                      </>
                    ) : (
                      <div className="bg-border-color/60 mt-auto mb-0.5 h-1 w-[1px]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Waveform & Capsule Stage */}
            <div className="pointer-events-none relative h-14 w-full sm:h-16">
              {/* HTML5 Canvas Audio Waveform Silhouette */}
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                {isLoadingWaveform ? (
                  <span className="text-foreground/40 animate-pulse font-mono text-[10px]">
                    Extracting audio waveform...
                  </span>
                ) : waveformPeaks ? (
                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none h-full w-full"
                  />
                ) : (
                  <span className="text-foreground/40 font-mono text-[10px]">
                    No audio track detected in source file
                  </span>
                )}
              </div>

              {/* Section Capsules & Handles */}
              {sections.map((sec) => {
                const leftPct = (sec.start / duration) * 100;
                const widthPct = ((sec.end - sec.start) / duration) * 100;
                const isSelected = sec.id === selectedSectionId;

                if (sec.isDeleted) {
                  return (
                    <div
                      key={sec.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSectionId(sec.id);
                      }}
                      className={clsx(
                        "pointer-events-auto absolute top-1 bottom-1 z-10 cursor-pointer rounded-md border border-dashed transition-all",
                        isSelected
                          ? "border-foreground/60 bg-utils-scent-gray-01/50"
                          : "border-border-color/70 bg-utils-scent-gray-01/25 hover:bg-utils-scent-gray-01/40",
                      )}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      title={`Cut section: ${formatStatDuration(sec.end - sec.start)} (Click to select/restore)`}
                    />
                  );
                }

                return (
                  <div
                    key={sec.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSectionId(sec.id);
                    }}
                    className={clsx(
                      "pointer-events-auto absolute top-1 bottom-1 z-20 cursor-pointer rounded-md border",
                      !draggingBoundary && "transition-all",
                      isSelected
                        ? "border-foreground bg-foreground/[0.02]"
                        : "border-border-color hover:border-foreground/50 bg-transparent",
                    )}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    {/* Pill Drag Handle - LEFT */}
                    {isSelected && (
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            trackRef.current?.setPointerCapture(e.pointerId);
                          } catch {}
                          setDraggingBoundary({
                            sectionId: sec.id,
                            boundary: "start",
                          });
                        }}
                        className={clsx(
                          "group bg-foreground pointer-events-auto absolute top-1/2 flex h-7 w-3 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-sm shadow-xs transition-transform hover:scale-105 active:scale-95",
                          sec.start <= 0.05 ? "left-0.5" : "-left-1.5",
                          sec.end >= duration - 0.1 ? "z-40" : "z-30",
                        )}
                        title="Drag to trim start"
                      >
                        <div className="pointer-events-none h-2.5 w-[1px] rounded-full bg-white" />
                      </div>
                    )}

                    {/* Pill Drag Handle - RIGHT */}
                    {isSelected && (
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            trackRef.current?.setPointerCapture(e.pointerId);
                          } catch {}
                          setDraggingBoundary({
                            sectionId: sec.id,
                            boundary: "end",
                          });
                        }}
                        className={clsx(
                          "group bg-foreground pointer-events-auto absolute top-1/2 flex h-7 w-3 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-sm shadow-xs transition-transform hover:scale-105 active:scale-95",
                          sec.end >= duration - 0.05
                            ? "right-0.5"
                            : "-right-1.5",
                          sec.start <= 0.1 ? "z-40" : "z-30",
                        )}
                        title="Drag to trim end"
                      >
                        <div className="pointer-events-none h-2.5 w-[1px] rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hover Ghost Needle */}
            {hoverTime !== null && !isDraggingPlayhead && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 -ml-2 flex w-4 flex-col items-center"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              >
                <div className="border-t-foreground/40 h-0 w-0 border-t-[5px] border-r-[4px] border-l-[4px] border-r-transparent border-l-transparent" />
                <div className="border-foreground/30 w-px flex-1 border-l border-dashed" />
              </div>
            )}

            {/* Active Playhead Needle (Signature Orange Accent) */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-40 -ml-2 flex w-4 flex-col items-center"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="border-t-utils-scent-orange h-0 w-0 border-t-[6px] border-r-[4px] border-l-[4px] border-r-transparent border-l-transparent" />
              <div className="bg-utils-scent-orange w-[1px] flex-1" />
            </div>
          </div>

          <p className="text-foreground/50 text-center font-mono text-[10px]">
            Tap timeline to jump &bull; Drag handles to trim
            <span className="hidden sm:inline">
              {" "}
              &bull; Press{" "}
              <kbd className="bg-utils-scent-gray-01/40 border-border-color rounded border px-1 py-0.5">
                S
              </kbd>{" "}
              to split &bull; Press{" "}
              <kbd className="bg-utils-scent-gray-01/40 border-border-color rounded border px-1 py-0.5">
                Del
              </kbd>{" "}
              to cut
            </span>
          </p>
        </div>

        {/* Footer Bar with "Save & Compress Now" Action */}
        <div className="border-border-color flex flex-wrap items-center justify-between gap-2 border-t border-dashed bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1.5 text-xs sm:gap-2">
            <Sparkles size={13} className="text-foreground/60 shrink-0" />
            <span className="text-foreground/70 hidden sm:inline">
              Projected Output:
            </span>
            <span className="text-foreground font-mono font-medium">
              ~{formatBytes(estimatedBytes)}
            </span>
            {estimatedSavings && estimatedSavings.percentSaved > 0 && (
              <span className="text-code-green bg-utils-scent-gray-01/40 border-border-color rounded border px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px]">
                Est. -{estimatedSavings.percentSaved}%
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 cursor-pointer rounded border bg-white px-2.5 py-1.5 text-[11px] font-medium transition-all sm:px-3 sm:text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1 rounded border bg-white px-2.5 py-1.5 text-[11px] font-medium transition-all sm:px-3 sm:text-xs"
              title="Save trim and cut edits to queue item"
            >
              <Check size={13} />
              <span>
                Apply<span className="hidden sm:inline"> Edits</span>
              </span>
            </button>
            <button
              type="button"
              onClick={handleApplyAndCompress}
              className="bg-foreground text-background hover:bg-foreground/90 flex cursor-pointer items-center gap-1 rounded px-2.5 py-1.5 text-[11px] font-medium shadow-xs transition-all active:scale-95 sm:gap-1.5 sm:px-3.5 sm:text-xs"
              title="Save edits and immediately start compressing this video"
            >
              <Zap size={13} className="fill-current" />
              <span>
                Save &amp; Compress<span className="hidden sm:inline"> Now</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
