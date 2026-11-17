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
  Camera,
} from "lucide-react";
import clsx from "clsx";
import {
  VideoFileItem,
  VideoFpsOption,
  VideoOptimizerSettings,
  VideoSection,
} from "../types";
import {
  formatBytes,
  formatDuration,
  formatFps,
  calculateSavings,
  estimateVideoSize,
  getVideoOrientation,
  normalizeTrim,
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
    newExportSpeed?: number,
    newTargetFps?: VideoFpsOption,
  ) => void;
  onCompressNow?: (
    item: VideoFileItem,
    newTrim?: { start: number; end: number },
    newStripAudio?: boolean,
    newSections?: VideoSection[],
    newExportSpeed?: number,
    newTargetFps?: VideoFpsOption,
  ) => void;
};

const MODAL_FPS_OPTIONS: { label: string; value: VideoFpsOption }[] = [
  { label: "Orig", value: "original" },
  { label: "60", value: 60 },
  { label: "30", value: 30 },
  { label: "24", value: 24 },
  { label: "15", value: 15 },
];

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

  // Audio & output speed state
  const initialStripAudio =
    item.stripAudio !== undefined ? item.stripAudio : settings.stripAudio;
  const [isMuted, setIsMuted] = useState<boolean>(initialStripAudio);

  const globalExportSpeed = settings.exportSpeed ?? 1;
  const initialExportSpeed =
    item.exportSpeed !== undefined ? item.exportSpeed : globalExportSpeed;
  const [exportSpeed, setExportSpeed] = useState<number>(initialExportSpeed);

  const globalTargetFps: VideoFpsOption = settings.targetFps ?? "original";
  const initialTargetFps: VideoFpsOption =
    item.targetFps !== undefined ? item.targetFps : globalTargetFps;
  const [targetFps, setTargetFps] = useState<VideoFpsOption>(initialTargetFps);

  const [stillSaved, setStillSaved] = useState<boolean>(false);

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

      const splitBoundaryXs =
        sections.length > 1
          ? sections.slice(1).map((s) => (s.start / duration) * w)
          : [];

      if (waveformStyle === "bars") {
        const barCount = waveformPeaks.length;
        const barWidth = Math.min(2, Math.max(1.4, (w / barCount) * 0.44));
        const gap = barCount > 1 ? (w - barCount * barWidth) / (barCount - 1) : 0;

        for (let i = 0; i < barCount; i++) {
          const peak = waveformPeaks[i];
          const barHeight = Math.max(3, peak * (h - 14));
          const x = i * (barWidth + gap);
          const barCenterX = x + barWidth / 2;

          if (splitBoundaryXs.some((bx) => Math.abs(barCenterX - bx) < 2.2)) {
            continue;
          }

          const y = (h - barHeight) / 2;

          const barTime = (i / barCount) * duration;
          const isCut = sections.some(
            (s) => s.isDeleted && barTime >= s.start && barTime < s.end,
          );

          if (isCut) {
            ctx.fillStyle = "#dedede"; // Dimmed light gray for cut regions
          } else if (isMuted) {
            ctx.fillStyle = "#a39b93"; // Softened warm gray when audio is stripped
          } else {
            ctx.fillStyle = "#4b453f"; // Balanced warm charcoal so trim handles & playhead stay crisp
          }

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
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

        // 1. Draw entire waveform in dimmed light gray (#dedede)
        drawWaveformEnvelope();
        ctx.fillStyle = "#dedede";
        ctx.fill();

        // 2. Draw kept waveform over kept sections using clipping masks
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
              ctx.fillStyle = "#a39b93";
            } else {
              ctx.fillStyle = "#4b453f"; // Balanced warm charcoal
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

      // If kept-section handles are close together at a timeline wall, auto-switch boundary to match drag direction
      let activeBoundary = draggingBoundary.boundary;
      if (!sec.isDeleted) {
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
      }

      if (sec.isDeleted) {
        if (activeBoundary === "start" && idx > 0) {
          const prevSec = sections[idx - 1];
          const prevMinDur = prevSec.isDeleted ? 0.15 : minSectionDuration;
          const minBound = prevSec.start + prevMinDur;
          const isTrailingEdge = idx === sections.length - 1;
          const maxBound = isTrailingEdge
            ? duration
            : Math.max(minBound, sec.end - 0.15);
          const rawClamped = Math.max(minBound, Math.min(newT, maxBound));
          const clamped =
            isTrailingEdge && rawClamped >= duration - 0.05
              ? duration
              : rawClamped;

          if (isTrailingEdge && clamped === duration) {
            const keptNeighbor = sections[idx - 1];
            setSections((prev) => {
              if (prev.length < 2) return prev;
              const updated = [...prev];
              updated.pop();
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                end: duration,
              };
              return updated;
            });
            if (keptNeighbor) setSelectedSectionId(keptNeighbor.id);
            setDraggingBoundary(null);
          } else {
            setSections((prev) => {
              const curIdx = prev.findIndex(
                (s) => s.id === draggingBoundary.sectionId,
              );
              if (curIdx <= 0) return prev;
              const updated = [...prev];
              updated[curIdx - 1] = { ...updated[curIdx - 1], end: clamped };
              updated[curIdx] = { ...updated[curIdx], start: clamped };
              return updated;
            });
          }

          if (videoRef.current) videoRef.current.currentTime = clamped;
          setCurrentTime(clamped);
        } else if (activeBoundary === "end" && idx < sections.length - 1) {
          const nextSec = sections[idx + 1];
          const nextMinDur = nextSec.isDeleted ? 0.15 : minSectionDuration;
          const maxBound = nextSec.end - nextMinDur;
          const isLeadingEdge = idx === 0;
          const minBound = isLeadingEdge
            ? 0
            : Math.min(maxBound, sec.start + 0.15);
          const rawClamped = Math.max(minBound, Math.min(newT, maxBound));
          const clamped =
            isLeadingEdge && rawClamped <= 0.05 ? 0 : rawClamped;

          if (isLeadingEdge && clamped === 0) {
            const keptNeighbor = sections[1];
            setSections((prev) => {
              if (prev.length < 2) return prev;
              const updated = [...prev];
              updated.shift();
              updated[0] = { ...updated[0], start: 0 };
              return updated;
            });
            if (keptNeighbor) setSelectedSectionId(keptNeighbor.id);
            setDraggingBoundary(null);
          } else {
            setSections((prev) => {
              const curIdx = prev.findIndex(
                (s) => s.id === draggingBoundary.sectionId,
              );
              if (curIdx === -1 || curIdx >= prev.length - 1) return prev;
              const updated = [...prev];
              updated[curIdx + 1] = { ...updated[curIdx + 1], start: clamped };
              updated[curIdx] = { ...updated[curIdx], end: clamped };
              return updated;
            });
          }

          if (videoRef.current) videoRef.current.currentTime = clamped;
          setCurrentTime(clamped);
        }
        return;
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
    setExportSpeed(globalExportSpeed);
    setTargetFps(globalTargetFps);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  // Capture current paused/active frame as a full-resolution WebP poster still
  const handleCaptureStill = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const width = video.videoWidth || item.originalDimensions.width || 1920;
    const height = video.videoHeight || item.originalDimensions.height || 1080;
    if (!width || !height) return;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const rawName = (item.customName || item.name).replace(
      /\.(mp4|webm|mov|m4v|mkv)$/i,
      "",
    );
    const stamp = Math.max(0, Math.round(currentTime * 10) / 10)
      .toString()
      .replace(".", "p");
    const filename = `${rawName}_poster_${stamp}s.webp`;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStillSaved(true);
        setTimeout(() => setStillSaved(false), 1800);
      },
      "image/webp",
      0.92,
    );
  };

  // Clean calculations
  const keptSections = sections.filter((s) => !s.isDeleted && s.end > s.start);
  const totalKeptDuration = keptSections.reduce(
    (acc, s) => acc + (s.end - s.start),
    0,
  );
  const finalOutputDuration = totalKeptDuration / Math.max(0.25, exportSpeed);
  const totalCutDuration = Math.max(0, duration - totalKeptDuration);
  const hasActiveCuts = sections.some((s) => s.isDeleted);
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;
  const playheadRounded = Number(currentTime.toFixed(2));
  const canSplitAtPlayhead =
    playheadRounded > 0.1 &&
    playheadRounded < duration - 0.1 &&
    sections.some(
      (s) => playheadRounded > s.start + 0.15 && playheadRounded < s.end - 0.15,
    );

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
  const finalExportSpeedToApply =
    Math.abs(exportSpeed - globalExportSpeed) < 0.01 ? undefined : exportSpeed;
  const finalTargetFpsToApply =
    targetFps === globalTargetFps ? undefined : targetFps;

  // Estimated size calculation
  const simulatedSettings: Partial<VideoOptimizerSettings> = {
    ...settings,
    trim: computedTrim,
    sections: finalSectionsToApply,
    stripAudio: isMuted,
    exportSpeed,
    targetFps,
  };

  const estimatedBytes = estimateVideoSize(
    duration,
    simulatedSettings,
    computedTrim,
    item.originalDimensions.width,
    item.originalDimensions.height,
    item.originalSize,
    finalSectionsToApply,
    item.originalFps,
  );
  const estimatedSavings = calculateSavings(item.originalSize, estimatedBytes);

  const handleApply = () => {
    onApply(
      item,
      computedTrim,
      finalStripAudioToApply,
      finalSectionsToApply,
      finalExportSpeedToApply,
      finalTargetFpsToApply,
    );
    onClose();
  };

  const handleApplyAndCompress = () => {
    if (onCompressNow) {
      onCompressNow(
        item,
        computedTrim,
        finalStripAudioToApply,
        finalSectionsToApply,
        finalExportSpeedToApply,
        finalTargetFpsToApply,
      );
    } else {
      onApply(
        item,
        computedTrim,
        finalStripAudioToApply,
        finalSectionsToApply,
        finalExportSpeedToApply,
        finalTargetFpsToApply,
      );
      onClose();
    }
  };

  const renderTrimHandle = (
    sectionId: string,
    boundary: "start" | "end",
    positionClass: string,
    title: string,
  ) => (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          trackRef.current?.setPointerCapture(e.pointerId);
        } catch {}
        setDraggingBoundary({ sectionId, boundary });
      }}
      className={clsx(
        "group bg-foreground pointer-events-auto absolute top-1/2 flex h-7 w-3 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-sm shadow-xs transition-transform hover:scale-105 active:scale-95",
        positionClass,
      )}
      title={title}
    >
      <div className="pointer-events-none h-2.5 w-[1px] rounded-full bg-white" />
    </div>
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 backdrop-blur-xs select-none sm:p-5"
    >
      <div className="border-border-color flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden overscroll-contain rounded-md border bg-white shadow-xl">
        {/* Header Bar */}
        <div className="border-border-color text-foreground flex items-center justify-between gap-2 border-b border-dashed bg-white px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <div className="border-border-color bg-background text-foreground/80 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border">
              <Scissors size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div
                  id="edit-studio-title"
                  className="text-foreground truncate text-xs font-medium sm:text-sm"
                >
                  <span className="text-foreground/60 hidden sm:inline">
                    Edit Studio &bull;{" "}
                  </span>
                  {item.customName || item.name}
                </div>
                <span className="border-border-color bg-background text-foreground/70 hidden h-5 shrink-0 items-center rounded border px-1.5 font-mono text-[10px] leading-none sm:inline-flex">
                  {orientation.label} ({orientation.ratio})
                </span>
              </div>
              <p className="text-foreground/55 truncate font-mono text-[10px] sm:text-[11px]">
                Source: {formatDuration(duration)} ({duration.toFixed(1)}s)
                {item.originalFps ? ` • ${formatFps(item.originalFps)}fps` : ""}
                {" "}&bull; {formatBytes(item.originalSize)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 cursor-pointer items-center gap-1 rounded-md border bg-white px-2.5 text-xs leading-none transition-all"
              title="Reset all splits and cuts back to original video"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border bg-white transition-all"
              title="Close without applying (Esc)"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className="border-border-color bg-background/40 relative flex max-h-[32vh] min-h-[170px] flex-1 items-center justify-center overflow-hidden border-b border-dashed px-3 py-2.5 sm:max-h-[38vh] sm:min-h-[210px] sm:px-4 sm:py-3">
          <div className="border-border-color relative flex max-h-full w-full items-center justify-center overflow-hidden rounded-md border bg-black shadow-xs">
            <video
              ref={videoRef}
              src={item.originalUrl}
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onClick={togglePlay}
              className="max-h-[28vh] w-auto max-w-full cursor-pointer object-contain sm:max-h-[34vh]"
            />

            {/* Big Play Overlay */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="bg-foreground/80 hover:bg-foreground absolute flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 text-white shadow-md backdrop-blur-xs transition-all active:scale-95 sm:h-12 sm:w-12"
                aria-label="Play video"
              >
                <Play size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Video Player Transport Bar */}
        <div className="border-border-color text-foreground flex flex-wrap items-center justify-between gap-2 border-b border-dashed bg-white px-3 py-2 text-xs sm:px-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="bg-foreground text-background hover:bg-utils-scent-orange flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-all active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause size={13} className="fill-current" />
              ) : (
                <Play size={13} className="fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={() => jumpTime(-5)}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 hidden h-7 cursor-pointer items-center gap-1 rounded-md border bg-white px-2 font-mono text-xs leading-none transition-all sm:flex"
              title="Jump back 5s"
            >
              <RotateCcw size={12} />
              <span>5s</span>
            </button>

            <button
              type="button"
              onClick={() => jumpTime(5)}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 hidden h-7 cursor-pointer items-center gap-1 rounded-md border bg-white px-2 font-mono text-xs leading-none transition-all sm:flex"
              title="Jump forward 5s"
            >
              <RotateCw size={12} />
              <span>5s</span>
            </button>

            <span className="text-foreground ml-0.5 font-mono text-xs leading-none">
              {formatDuration(currentTime)}{" "}
              <span className="text-foreground/45">
                / {formatDuration(duration)}
              </span>
            </span>
          </div>

          {/* Right Controls: Preview Speed, Loop, Waveform & Save Still */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Preview playback speed toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-foreground/70 hidden text-xs sm:inline">
                Preview:
              </span>
              <div
                className="border-border-color flex h-7 items-center rounded-md border bg-white p-0.5 font-mono"
                title="Preview playback speed (for scrubbing/review only — does not affect exported video)"
              >
                {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleSetPlaybackRate(rate)}
                    className={clsx(
                      "h-full cursor-pointer items-center rounded px-2 text-xs leading-none transition-all",
                      rate === 1.25 ? "hidden sm:flex" : "flex",
                      playbackRate === rate
                        ? "bg-foreground text-background"
                        : "text-foreground/70 hover:text-foreground",
                    )}
                    title={`Preview at ${rate}x speed (scrubbing only)`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setLoopPlayback(!loopPlayback)}
              className={clsx(
                "flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2.5 text-xs leading-none transition-all",
                loopPlayback
                  ? "border-foreground bg-foreground text-background"
                  : "border-border-color text-foreground/70 hover:text-foreground hover:bg-utils-scent-gray-01/30 bg-white",
              )}
              title="Loop preview playback (cycles continuously without stopping)"
            >
              <Repeat size={12} />
              <span className="hidden sm:inline">Loop</span>
            </button>

            {/* Waveform Style Toggle: Bars vs Smooth (only shown when source has audio) */}
            {item.hasAudio && (
              <div className="border-border-color flex h-7 items-center rounded-md border bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setWaveformStyle("bars")}
                  className={clsx(
                    "flex h-full cursor-pointer items-center rounded px-2 text-xs leading-none transition-all",
                    waveformStyle === "bars"
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                  title="Render detailed vertical audio bars (crisp speech & pause transients)"
                >
                  Bars
                </button>
                <button
                  type="button"
                  onClick={() => setWaveformStyle("smooth")}
                  className={clsx(
                    "flex h-full cursor-pointer items-center rounded px-2 text-xs leading-none transition-all",
                    waveformStyle === "smooth"
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                  title="Render smooth fluid waveform silhouette (Loom curve)"
                >
                  Smooth
                </button>
              </div>
            )}

            {/* Capture Current Frame Still (WebP Poster) */}
            <button
              type="button"
              onClick={handleCaptureStill}
              className={clsx(
                "flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2.5 text-xs leading-none transition-all",
                stillSaved
                  ? "border-code-green bg-code-green/10 text-code-green"
                  : "border-border-color text-foreground/80 hover:text-foreground hover:bg-utils-scent-gray-01/30 bg-white",
              )}
              title="Download current video frame as a full-res WebP still image (ideal for video posters)"
            >
              {stillSaved ? <Check size={12} /> : <Camera size={12} />}
              <span className="hidden sm:inline">
                {stillSaved ? "Saved!" : "Still"}
              </span>
            </button>
          </div>
        </div>

        {/* Unified Timeline & Export Overrides Workspace */}
        <div className="bg-background/50 flex flex-col gap-2.5 px-3 py-2.5 text-xs sm:px-4 sm:py-3">
          {/* Trim & Cut Row */}
          <div className="text-foreground flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Split at Playhead Button */}
              <button
                type="button"
                disabled={!canSplitAtPlayhead}
                onClick={handleSplitAtPlayhead}
                className={clsx(
                  "border-border-color flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs leading-none transition-all",
                  canSplitAtPlayhead
                    ? "text-foreground hover:bg-utils-scent-gray-01/30 cursor-pointer"
                    : "text-foreground/45 cursor-not-allowed opacity-50",
                )}
                title={
                  canSplitAtPlayhead
                    ? "Split clip at current playhead position (Shortcut: S)"
                    : "Move playhead inside a clip (> 0.15s from edges) to split [S]"
                }
              >
                <Scissors size={12} />
                <span>
                  Split
                  <span className="hidden sm:inline">
                    {" "}
                    at{" "}
                    <span className="font-mono">
                      {formatDuration(currentTime)} [S]
                    </span>
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
                    "border-border-color text-foreground/80 flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs leading-none transition-all",
                    keptSections.length <= 1
                      ? "cursor-not-allowed opacity-45"
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
                  className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs leading-none transition-all"
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
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/80 flex h-7 cursor-pointer items-center rounded-md border bg-white px-2.5 text-xs leading-none transition-all"
                  title="Merge selected section with its neighbor"
                >
                  Merge
                </button>
              )}

              {/* Selected Segment Info */}
              {selectedSection && (
                <span className="text-foreground/60 ml-1 hidden text-xs md:inline">
                  Selected:{" "}
                  <span className="text-foreground font-mono">
                    {formatStatDuration(
                      selectedSection.end - selectedSection.start,
                    )}
                  </span>{" "}
                  <span className="font-mono">
                    ({formatDuration(selectedSection.start)} &rarr;{" "}
                    {formatDuration(selectedSection.end)})
                  </span>
                </span>
              )}
            </div>

            {/* Right Side: Kept & Cut Stats */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-foreground/70">
                Kept:{" "}
                <span className="text-foreground font-mono">
                  {formatStatDuration(totalKeptDuration)}
                </span>
              </span>
              {totalCutDuration > 0.05 && (
                <span className="border-border-color text-foreground/70 flex h-7 items-center gap-1 rounded-md border bg-white px-2 font-mono text-xs leading-none">
                  <span>Cut -{formatStatDuration(totalCutDuration)}</span>
                  <span className="hidden sm:inline">
                    (-{Math.round((totalCutDuration / duration) * 100)}%)
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Master Interactive Track (Ruler + Waveform in ONE cohesive container) */}
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
            className="border-border-color relative w-full cursor-pointer overflow-hidden rounded-md border bg-white select-none"
          >
            {/* Top Time Ruler with tick marks */}
            <div className="border-border-color/70 bg-background/40 pointer-events-none relative h-6 w-full border-b select-none">
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
                  <span className="text-foreground/45 animate-pulse font-mono text-[11px]">
                    Extracting audio waveform...
                  </span>
                ) : waveformPeaks ? (
                  <canvas
                    ref={canvasRef}
                    className="pointer-events-none h-full w-full"
                  />
                ) : (
                  <span className="text-foreground/45 font-mono text-[11px]">
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
                        "pointer-events-auto absolute inset-y-0 flex cursor-pointer items-center justify-center transition-colors",
                        isSelected ? "z-30" : "z-10",
                        isSelected
                          ? "bg-utils-scent-gray-01/50"
                          : "bg-utils-scent-gray-01/30 hover:bg-utils-scent-gray-01/40",
                      )}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundImage:
                          "repeating-linear-gradient(-45deg, rgba(24, 20, 17, 0.04) 0px, rgba(24, 20, 17, 0.04) 1px, transparent 1px, transparent 6px)",
                      }}
                      title={`Cut section: ${formatStatDuration(sec.end - sec.start)} (Click to select/restore)`}
                    >
                      {widthPct >= 6 && (
                        <span
                          className={clsx(
                            "pointer-events-none relative z-20 flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none backdrop-blur-[1px]",
                            isSelected
                              ? "border-foreground/50 bg-white text-foreground shadow-xs"
                              : "border-border-color bg-white/85 text-foreground/60",
                          )}
                        >
                          <Scissors size={9} />
                          {widthPct >= 11 && <span>Cut</span>}
                        </span>
                      )}

                      {isSelected &&
                        sec.start > 0.05 &&
                        renderTrimHandle(
                          sec.id,
                          "start",
                          "-left-1.5 z-30",
                          "Drag to adjust cut start",
                        )}

                      {isSelected &&
                        sec.end < duration - 0.05 &&
                        renderTrimHandle(
                          sec.id,
                          "end",
                          "-right-1.5 z-30",
                          "Drag to adjust cut end",
                        )}
                    </div>
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
                      "pointer-events-auto absolute inset-y-0 cursor-pointer",
                      isSelected ? "z-30" : "z-20",
                      !draggingBoundary && "transition-colors",
                      isSelected && sections.length > 1
                        ? "bg-foreground/[0.045]"
                        : "bg-transparent",
                      !isSelected &&
                        sections.length > 1 &&
                        "hover:bg-foreground/[0.025]",
                    )}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    {isSelected &&
                      renderTrimHandle(
                        sec.id,
                        "start",
                        clsx(
                          sec.start <= 0.05 ? "left-0" : "-left-1.5",
                          sec.end >= duration - 0.1 ? "z-40" : "z-30",
                        ),
                        "Drag to trim start",
                      )}

                    {isSelected &&
                      renderTrimHandle(
                        sec.id,
                        "end",
                        clsx(
                          sec.end >= duration - 0.05 ? "right-0" : "-right-1.5",
                          sec.start <= 0.1 ? "z-40" : "z-30",
                        ),
                        "Drag to trim end",
                      )}
                  </div>
                );
              })}

              {/* Unified Section Split & Cut Seams */}
              {sections.slice(1).map((sec, i) => {
                const prevSec = sections[i];
                const isDashedSeam =
                  sec.isDeleted || Boolean(prevSec?.isDeleted);
                const seamLeftPct = (sec.start / duration) * 100;

                return (
                  <div
                    key={`${sec.id}-seam`}
                    className="pointer-events-none absolute inset-y-0 z-20 flex w-[7px] -translate-x-1/2 flex-col items-center justify-between"
                    style={{ left: `${seamLeftPct}%` }}
                    aria-hidden="true"
                  >
                    {!isDashedSeam && (
                      <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-white" />
                    )}
                    <svg
                      width="7"
                      height="4"
                      viewBox="0 0 7 4"
                      className="text-foreground/65 relative z-10 shrink-0 fill-current"
                    >
                      <polygon points="0,0 7,0 3.5,4" />
                    </svg>
                    {isDashedSeam ? (
                      <div className="border-foreground/45 relative z-10 w-px flex-1 border-l border-dashed" />
                    ) : (
                      <div className="bg-foreground/50 relative z-10 w-px flex-1" />
                    )}
                    <svg
                      width="7"
                      height="4"
                      viewBox="0 0 7 4"
                      className="text-foreground/65 relative z-10 shrink-0 fill-current"
                    >
                      <polygon points="3.5,0 7,4 0,4" />
                    </svg>
                  </div>
                );
              })}
            </div>

            {/* Hover Ghost Needle */}
            {hoverTime !== null && !isDraggingPlayhead && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 flex w-[9px] -translate-x-1/2 flex-col items-center"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              >
                <svg
                  width="9"
                  height="5"
                  viewBox="0 0 9 5"
                  className="text-foreground/45 shrink-0 fill-current"
                >
                  <polygon points="0,0 9,0 4.5,5" />
                </svg>
                <div className="border-foreground/30 w-px flex-1 border-l border-dashed" />
              </div>
            )}

            {/* Active Playhead Needle (Signature Orange Accent) */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-40 flex w-[9px] -translate-x-1/2 flex-col items-center"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <svg
                width="9"
                height="6"
                viewBox="0 0 9 6"
                className="text-utils-scent-orange shrink-0 fill-current"
              >
                <polygon points="0,0 9,0 4.5,6" />
              </svg>
              <div className="bg-utils-scent-orange w-px flex-1" />
            </div>
          </div>

          <p className="text-foreground/50 text-center text-[11px]">
            Tap timeline to jump &bull; Drag handles to trim
            <span className="hidden sm:inline">
              {" "}
              &bull; Press{" "}
              <kbd className="border-border-color rounded border bg-white px-1 py-0.5 font-mono text-[10px]">
                S
              </kbd>{" "}
              to split &bull; Press{" "}
              <kbd className="border-border-color rounded border bg-white px-1 py-0.5 font-mono text-[10px]">
                Del
              </kbd>{" "}
              to cut
            </span>
          </p>

          {/* Per-Clip Export Overrides (Matches main Toolbar controls) */}
          <div className="border-border-color flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-dashed pt-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Per-Video FPS Cap */}
              <div className="flex items-center gap-2">
                <span className="text-foreground shrink-0">Export FPS:</span>
                <div
                  className="border-border-color flex h-7 items-center rounded-md border bg-white p-0.5"
                  title="Output frame rate for this video"
                >
                  {MODAL_FPS_OPTIONS.filter(
                    (opt) =>
                      opt.value === "original" ||
                      !item.originalFps ||
                      item.originalFps <= 0 ||
                      opt.value < item.originalFps - 0.5,
                  ).map((opt) => {
                    const isActive = targetFps === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setTargetFps(opt.value)}
                        className={clsx(
                          "flex h-full cursor-pointer items-center gap-1 rounded px-2 text-xs leading-none transition-all",
                          opt.value !== "original" && "font-mono",
                          isActive
                            ? "bg-foreground text-background"
                            : "text-foreground/70 hover:text-foreground",
                        )}
                        title={
                          opt.value === "original"
                            ? "Keep original frame rate"
                            : `Export this video at ${opt.value}fps`
                        }
                      >
                        <span>{opt.label}</span>
                        {opt.value === "original" && item.originalFps && (
                          <span className="font-mono text-xs opacity-75">
                            ({formatFps(item.originalFps)})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Export Output Speed */}
              <div className="flex items-center gap-2">
                <span className="text-foreground shrink-0">Export Speed:</span>
                <div
                  className="border-border-color flex h-7 items-center rounded-md border bg-white p-0.5 font-mono"
                  title="Output speed multiplier baked into the exported video"
                >
                  {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setExportSpeed(spd)}
                      className={clsx(
                        "flex h-full cursor-pointer items-center rounded px-2 text-xs leading-none transition-all",
                        Math.abs(exportSpeed - spd) < 0.01
                          ? "bg-foreground text-background"
                          : "text-foreground/70 hover:text-foreground",
                      )}
                      title={`Export video at ${spd}x speed`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Audio Toggle (Matches Toolbar Keep / Mute) */}
            <div className="flex items-center gap-2">
              <span className="text-foreground shrink-0">Audio:</span>
              {item.hasAudio ? (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={clsx(
                    "border-border-color hover:bg-utils-scent-gray-01/30 flex h-7 cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs leading-none transition-all",
                    isMuted ? "text-code-rust" : "text-foreground",
                  )}
                  title={
                    isMuted
                      ? "Audio track will be stripped on export"
                      : "Audio track will be preserved on export"
                  }
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  <span>{isMuted ? "Mute" : "Keep"}</span>
                </button>
              ) : (
                <span className="border-border-color text-foreground/55 flex h-7 items-center rounded-md border bg-white px-2.5 text-xs leading-none">
                  No audio
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar with "Save & Compress Now" Action */}
        <div className="border-border-color flex flex-wrap items-center justify-between gap-2 border-t border-dashed bg-white px-3 py-2.5 sm:gap-3 sm:px-4">
          <div className="flex items-center gap-1.5 text-xs sm:gap-2">
            <Sparkles size={13} className="text-foreground/60 shrink-0" />
            <span className="text-foreground/70 hidden sm:inline">
              Projected Output:
            </span>
            <span className="text-foreground font-mono">
              {formatStatDuration(finalOutputDuration)} &bull; ~
              {formatBytes(estimatedBytes)}
            </span>
            {estimatedSavings && estimatedSavings.percentSaved > 0 && (
              <span className="text-code-green bg-utils-scent-gray-01/40 border-border-color inline-flex h-7 items-center rounded-md border px-2 font-mono text-xs leading-none">
                Est. -{estimatedSavings.percentSaved}%
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 cursor-pointer items-center rounded-md border bg-white px-3 text-xs leading-none transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex h-7 cursor-pointer items-center gap-1.5 rounded-md border bg-white px-3 text-xs leading-none transition-all"
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
              className="bg-foreground text-background hover:bg-foreground/90 flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium leading-none transition-all active:scale-95 sm:px-3.5"
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
