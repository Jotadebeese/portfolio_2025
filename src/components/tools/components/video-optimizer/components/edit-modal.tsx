"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

  // Generate Loom-style dynamic ruler marks (major timestamps + delicate minor tick marks)
  const rulerMarks = useMemo<{ time: number; isMajor: boolean }[]>(() => {
    const marks: { time: number; isMajor: boolean }[] = [];
    let majorStep = 5;
    let minorDiv = 5;
    if (duration <= 10) {
      majorStep = 2;
      minorDiv = 4;
    } else if (duration <= 30) {
      majorStep = 5;
      minorDiv = 5;
    } else if (duration <= 90) {
      majorStep = 15;
      minorDiv = 3;
    } else if (duration <= 300) {
      majorStep = 30;
      minorDiv = 3;
    } else {
      majorStep = 60;
      minorDiv = 4;
    }

    const minorStep = majorStep / minorDiv;
    const totalSteps = Math.floor(duration / minorStep);

    for (let i = 0; i <= totalSteps; i++) {
      const t = i * minorStep;
      if (t > duration) break;
      const isMajor =
        Math.abs(t % majorStep) < 0.001 ||
        Math.abs((t % majorStep) - majorStep) < 0.001;
      marks.push({ time: t, isMajor });
    }
    if (!marks.some((m) => Math.abs(m.time - duration) < 0.05)) {
      marks.push({ time: duration, isMajor: true });
    }
    return marks;
  }, [duration]);

  const orientation = getVideoOrientation(
    item.originalDimensions.width,
    item.originalDimensions.height,
  );

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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
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
          ctx.fillStyle = "#d1d5db"; // Soft Loom muted gray
        } else if (isMuted) {
          ctx.fillStyle = "#8a8177"; // Slate gray when audio is stripped
        } else {
          ctx.fillStyle = "#ff9900"; // Signature brand warm orange
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

      // 1. Draw entire waveform in soft Loom muted gray (#d1d5db)
      drawWaveformEnvelope();
      ctx.fillStyle = "#d1d5db";
      ctx.fill();

      // 2. Draw vibrant waveform over kept sections using clipping masks
      const keptSections = sections.filter((s) => !s.isDeleted && s.end > s.start);
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
            ctx.fillStyle = "#ff9900"; // Signature brand warm orange
          }
          ctx.fill();
          ctx.restore();
        }
      }
    }
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
    onApply(item, computedTrim, isMuted, finalSectionsToApply);
    onClose();
  };

  const handleApplyAndCompress = () => {
    if (onCompressNow) {
      onCompressNow(item, computedTrim, isMuted, finalSectionsToApply);
    } else {
      onApply(item, computedTrim, isMuted, finalSectionsToApply);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs select-none sm:p-5"
    >
      <div className="border-border-color flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-md bg-white shadow-2xl overscroll-contain">
        {/* Header Bar */}
        <div className="border-border-color bg-white flex flex-wrap items-center justify-between gap-2 border-b border-dashed p-3 text-foreground">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-[#ff9900]/10 border border-[#ff9900]/30 text-utils-scent-orange flex h-7 w-7 shrink-0 items-center justify-center rounded">
              <Scissors size={14} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="edit-studio-title"
                  className="text-foreground text-sm font-semibold truncate max-w-xs sm:max-w-md"
                >
                  Edit Studio &bull; {item.name}
                </h3>
                <span className="border-border-color/60 bg-utils-scent-gray-01/30 text-foreground/70 rounded-xs border px-1.5 py-0.5 text-[9px] font-mono">
                  {orientation.label} ({orientation.ratio})
                </span>
              </div>
              <p className="text-foreground/50 text-[11px] font-mono">
                Source: {formatDuration(duration)} ({duration.toFixed(1)}s) &bull; {formatBytes(item.originalSize)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1 rounded border px-2.5 py-1 text-xs transition-all"
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
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/95 p-3 min-h-[220px] max-h-[42vh] border-b border-border-color">
          <video
            ref={videoRef}
            src={item.originalUrl}
            playsInline
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onClick={togglePlay}
            className="max-h-[38vh] w-auto max-w-full cursor-pointer rounded object-contain shadow-lg"
          />

          {/* Big Play Overlay */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="bg-black/60 hover:bg-[#ff9900] text-white border border-white/20 absolute flex h-12 w-12 cursor-pointer items-center justify-center rounded-full backdrop-blur-xs transition-all active:scale-95 shadow-lg"
              aria-label="Play video"
            >
              <Play size={20} className="ml-0.5" />
            </button>
          )}

          {/* Top Left: Timecode Overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded border border-white/15 backdrop-blur-xs font-mono text-xs text-white">
            <span className="text-[#ff9900] font-semibold">
              {formatDuration(currentTime)}
            </span>
            <span className="text-white/40">/</span>
            <span className="text-white/80">{formatDuration(duration)}</span>
          </div>

          {/* Top Right: Audio Status Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded border border-white/15 backdrop-blur-xs font-mono text-xs">
            {isMuted ? (
              <span className="text-rose-400 flex items-center gap-1">
                <VolumeX size={13} /> Muted
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <Volume2 size={13} /> Audio On
              </span>
            )}
          </div>
        </div>

        {/* Loom-Style Video Player Control Bar (Directly Under Video) */}
        <div className="border-border-color bg-white flex flex-wrap items-center justify-between border-b px-4 py-2 text-xs text-foreground">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="bg-foreground text-background hover:bg-utils-scent-orange hover:text-white flex h-7 w-7 items-center justify-center rounded transition-all cursor-pointer shadow-xs"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => jumpTime(-5)}
              className="text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/50 flex h-7 items-center gap-0.5 rounded px-1.5 font-mono text-[11px] transition-all cursor-pointer"
              title="Jump back 5s"
            >
              <RotateCcw size={12} />
              <span>5s</span>
            </button>

            <button
              type="button"
              onClick={() => jumpTime(5)}
              className="text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/50 flex h-7 items-center gap-0.5 rounded px-1.5 font-mono text-[11px] transition-all cursor-pointer"
              title="Jump forward 5s"
            >
              <RotateCw size={12} />
              <span>5s</span>
            </button>

            <span className="font-mono text-xs font-medium text-foreground ml-1">
              {formatDuration(currentTime)}{" "}
              <span className="text-foreground/40 font-normal">/ {formatDuration(duration)}</span>
            </span>
          </div>

          {/* Right Controls: Playback Speed, Mute & Loop Toggle */}
          <div className="flex items-center gap-2">
            {/* Playback speed toggle */}
            <div
              className="flex items-center border border-border-color rounded overflow-hidden text-[11px] font-mono bg-white"
              title="Preview playback speed (for scrubbing/review only — does not affect exported video)"
            >
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSetPlaybackRate(rate)}
                  className={clsx(
                    "px-1.5 py-0.5 transition-colors cursor-pointer",
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
                "border flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer",
                isMuted
                  ? "border-rose-400 bg-rose-50 text-rose-700 font-medium"
                  : "border-border-color text-foreground/70 hover:text-foreground bg-white",
              )}
              title={isMuted ? "Audio is stripped/muted" : "Audio track is preserved"}
            >
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{isMuted ? "Muted" : "Audio"}</span>
            </button>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setLoopPlayback(!loopPlayback)}
              className={clsx(
                "border flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer",
                loopPlayback
                  ? "border-utils-scent-orange bg-utils-scent-orange/15 text-utils-scent-orange font-semibold shadow-2xs"
                  : "border-border-color text-foreground/70 hover:text-foreground bg-white",
              )}
              title="Loop preview playback (cycles continuously without stopping)"
            >
              <Repeat size={12} />
              <span>Loop: {loopPlayback ? "On" : "Off"}</span>
            </button>

            {/* Waveform Style Toggle: Bars vs Smooth */}
            <div className="flex items-center border border-border-color rounded overflow-hidden text-[11px] font-mono bg-white">
              <button
                type="button"
                onClick={() => setWaveformStyle("bars")}
                className={clsx(
                  "px-2 py-0.5 transition-colors cursor-pointer",
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
                  "px-2 py-0.5 transition-colors cursor-pointer",
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

        {/* Loom-Style Action Toolbar Above Timeline */}
        <div className="border-border-color bg-utils-scent-gray-01/20 flex flex-wrap items-center justify-between border-b px-4 py-2 text-xs text-foreground">
          <div className="flex items-center gap-2">
            {/* Split at Playhead Button (Exact Loom style with live timestamp) */}
            <button
              type="button"
              onClick={handleSplitAtPlayhead}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Split clip at current playhead position (Shortcut: S)"
            >
              <Scissors size={13} className="text-utils-scent-orange" />
              <span>Split at {formatDuration(currentTime)} [S]</span>
            </button>

            {/* Delete / Cut Selection */}
            {selectedSection && !selectedSection.isDeleted && (
              <button
                type="button"
                disabled={keptSections.length <= 1}
                onClick={() => handleToggleDeleteSection(selectedSection.id)}
                className={clsx(
                  "border border-rose-200 bg-rose-50 text-rose-700 font-medium px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors",
                  keptSections.length <= 1
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-rose-100 cursor-pointer",
                )}
                title={
                  keptSections.length <= 1
                    ? "Split the clip first [S] to delete a section — at least one section must remain"
                    : "Cut / delete selected section (Shortcut: Delete/Backspace)"
                }
              >
                <Trash2 size={12} />
                <span>Delete selection</span>
              </button>
            )}

            {/* Restore Cut Selection */}
            {selectedSection && selectedSection.isDeleted && (
              <button
                type="button"
                onClick={() => handleToggleDeleteSection(selectedSection.id)}
                className="border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1.5 rounded-md text-xs cursor-pointer flex items-center gap-1 transition-colors"
                title="Restore this cut section back into the video"
              >
                <Undo2 size={12} />
                <span>Restore selection</span>
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
                className="border border-border-color bg-white hover:bg-neutral-50 text-foreground/80 px-2.5 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-colors"
                title="Merge selected section with its neighbor"
              >
                Merge
              </button>
            )}

            {/* Selected Segment Info */}
            {selectedSection && (
              <span className="font-mono text-xs text-foreground/60 hidden md:inline ml-1">
                Selected: <strong className="text-foreground">{(selectedSection.end - selectedSection.start).toFixed(1)}s</strong> ({formatDuration(selectedSection.start)} &rarr; {formatDuration(selectedSection.end)})
              </span>
            )}
          </div>

          {/* Kept vs Cut Stats on the Right */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-foreground/70">
              Kept: <strong className="text-utils-scent-orange">{totalKeptDuration.toFixed(1)}s</strong>
            </span>
            {totalCutDuration > 0.05 && (
              <span className="text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px]">
                Cut -{totalCutDuration.toFixed(1)}s (-{Math.round((totalCutDuration / duration) * 100)}%)
              </span>
            )}
          </div>
        </div>

        {/* Master Timeline & Loom-Style Waveform Scrubber */}
        <div className="p-4 bg-white flex flex-col gap-2">
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
            className="relative w-full cursor-pointer select-none rounded-xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden"
          >
            {/* Top Time Ruler with Loom-style tick marks */}
            <div className="relative h-6 w-full border-b border-neutral-200/70 bg-neutral-50/50 pointer-events-none select-none">
              {rulerMarks.map((mark, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                  style={{
                    left: `${(mark.time / duration) * 100}%`,
                    transform:
                      i === 0
                        ? "none"
                        : i === rulerMarks.length - 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                  }}
                >
                  {mark.isMajor ? (
                    <>
                      <span className="text-[10px] font-mono text-neutral-400 font-medium pt-0.5 leading-none">
                        {formatDuration(mark.time)}
                      </span>
                      <div className="w-[1px] h-2 bg-neutral-300 mt-auto" />
                    </>
                  ) : (
                    <div className="w-[1px] h-1.5 bg-neutral-200 mt-auto mb-0.5" />
                  )}
                </div>
              ))}
            </div>

            {/* Waveform & Capsule Stage */}
            <div className="relative h-16 w-full pointer-events-none">
              {/* HTML5 Canvas Audio Waveform Silhouette */}
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                {isLoadingWaveform ? (
                  <span className="text-[10px] font-mono text-foreground/40 animate-pulse">
                    Extracting audio waveform...
                  </span>
                ) : waveformPeaks ? (
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full pointer-events-none"
                  />
                ) : (
                  <span className="text-[10px] font-mono text-foreground/40">
                    No audio track detected in source file
                  </span>
                )}
              </div>

              {/* Loom-Style Capsules & Handles */}
              {sections.map((sec, idx) => {
                const leftPct = (sec.start / duration) * 100;
                const widthPct = ((sec.end - sec.start) / duration) * 100;
                const isSelected = sec.id === selectedSectionId;

                if (sec.isDeleted) {
                  // Cut gap between capsules: soft background, faded gray waveform shows through cleanly without distracting badge
                  return (
                    <div
                      key={sec.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSectionId(sec.id);
                      }}
                      className={clsx(
                        "absolute top-1 bottom-1 rounded-lg cursor-pointer transition-all z-10 pointer-events-auto",
                        isSelected
                          ? "bg-rose-500/10 ring-2 ring-rose-300"
                          : "bg-neutral-100/50 hover:bg-neutral-200/50",
                      )}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      title={`Cut section: ${(sec.end - sec.start).toFixed(1)}s (Click to select/restore)`}
                    />
                  );
                }

                // Kept capsule: rounded pill matching Loom screenshot!
                return (
                  <div
                    key={sec.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSectionId(sec.id);
                    }}
                    className={clsx(
                      "absolute top-1 bottom-1 rounded-2xl z-20 cursor-pointer pointer-events-auto",
                      !draggingBoundary && "transition-all",
                      isSelected
                        ? "border-2 border-utils-scent-orange bg-utils-scent-orange/5 shadow-xs"
                        : "border-2 border-utils-scent-orange/60 hover:border-utils-scent-orange bg-transparent",
                    )}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    {/* Pill Drag Handle - LEFT (matches Loom handle pill with white slot) */}
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
                          "group absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-3.5 rounded-l-md rounded-r-xs bg-utils-scent-orange cursor-ew-resize pointer-events-auto flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform",
                          sec.end >= duration - 0.1 ? "z-40" : "z-30",
                        )}
                        title="Drag to trim start"
                      >
                        <div className="w-[1.5px] h-3 bg-white rounded-full pointer-events-none" />
                      </div>
                    )}

                    {/* Pill Drag Handle - RIGHT (matches Loom handle pill with white slot) */}
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
                          "group absolute -right-2 top-1/2 -translate-y-1/2 h-8 w-3.5 rounded-r-md rounded-l-xs bg-utils-scent-orange cursor-ew-resize pointer-events-auto flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform",
                          sec.start <= 0.1 ? "z-40" : "z-30",
                        )}
                        title="Drag to trim end"
                      >
                        <div className="w-[1.5px] h-3 bg-white rounded-full pointer-events-none" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hover Ghost Needle (Loom style) */}
            {hoverTime !== null && !isDraggingPlayhead && (
              <div
                className="absolute top-0 bottom-0 -ml-2 w-4 pointer-events-none z-30 flex flex-col items-center"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-utils-scent-orange/50" />
                <div className="w-px flex-1 border-l border-dashed border-utils-scent-orange/40" />
              </div>
            )}

            {/* Active Playhead Needle */}
            <div
              className="absolute top-0 bottom-0 -ml-2 w-4 pointer-events-none z-40 flex flex-col items-center"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              {/* Triangle flag on top of ruler */}
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-utils-scent-orange drop-shadow-xs" />
              {/* Vertical needle line through the whole track */}
              <div className="w-[1.5px] flex-1 bg-utils-scent-orange shadow-xs" />
            </div>
          </div>

          <p className="text-[10px] text-foreground/50 font-mono text-center">
            Tap anywhere on the timeline to jump playhead &bull; Drag handles to trim &bull; Press <kbd className="px-1 py-0.5 bg-utils-scent-gray-01/40 border border-border-color rounded">S</kbd> to split &bull; Press <kbd className="px-1 py-0.5 bg-utils-scent-gray-01/40 border border-border-color rounded">Del</kbd> to cut
          </p>
        </div>

        {/* Footer Bar with "Save & Compress Now" Action */}
        <div className="border-border-color bg-white flex flex-wrap items-center justify-between gap-3 border-t border-dashed px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles size={14} className="text-utils-scent-orange" />
            <span className="text-foreground/70 hidden sm:inline">
              Projected Output:
            </span>
            <span className="font-mono font-medium text-foreground">
              ~{formatBytes(estimatedBytes)}
            </span>
            {estimatedSavings && estimatedSavings.percentSaved > 0 && (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-mono text-[11px]">
                Est. -{estimatedSavings.percentSaved}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 cursor-pointer rounded-md border bg-white px-3 py-1.5 text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="border border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium transition-all"
              title="Save trim and cut edits to queue item"
            >
              <Check size={13} />
              <span>Apply Edits</span>
            </button>
            <button
              type="button"
              onClick={handleApplyAndCompress}
              className="bg-utils-scent-orange hover:bg-utils-scent-orange/90 text-white flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all active:scale-95"
              title="Save edits and immediately start compressing this video"
            >
              <Zap size={13} className="fill-current" />
              <span>Save &amp; Compress Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
