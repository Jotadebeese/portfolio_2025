import {
  CompressionMode,
  VideoOptimizerSettings,
  VideoOutputFormat,
  VideoResizePreset,
  VideoSection,
} from "../types";

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(mins)}:${pad(secs)}`;
}

export function calculateSavings(original: number, compressed: number) {
  const bytesSaved = original - compressed;
  const percentSaved =
    original > 0 ? Math.round((bytesSaved / original) * 100) : 0;
  return {
    bytesSaved,
    percentSaved,
    isReduced: bytesSaved > 0,
  };
}

/**
 * Calculates the nominal WebCodecs bitrate (bps) required to ensure the compressed
 * output file strictly respects the specified target size (MB) as an absolute ceiling,
 * while utilizing maximum bit budget to push output file size as close as possible
 * to the cap (e.g. 7.7-7.9 MB for 8 MB cap).
 *
 * Employs hardware VBR compensation (1.14x for MP4) to prevent Windows hardware encoders
 * from starving bit allocation into ugly blocky artifacts.
 */
export function calculateBitrateForTargetSize(
  targetSizeMB: number,
  durationSeconds: number,
  stripAudio: boolean,
  format: VideoOutputFormat = "video/mp4",
): number {
  if (durationSeconds <= 0) return 2_000_000;

  const targetBytes = targetSizeMB * 1024 * 1024;
  // Safety ceiling:
  // For tight caps (<= 1.5 MB), allocate a 9% margin (~90KB) so fixed container overhead
  // (moov atom, WebM cluster cues) and audio cannot push the final output over 1.0 MB.
  // For standard caps (> 1.5 MB), a 2.5%-3.0% margin pushes file size right against the ceiling.
  const safetyFactor =
    targetSizeMB <= 1.5
      ? format === "video/webm" ? 0.91 : 0.92
      : format === "video/webm" ? 0.975 : 0.97;
  const safeTargetBytes = Math.round(targetBytes * safetyFactor);

  // Muxing container overhead (~35KB for MP4 faststart atom / WebM cluster indices)
  const containerOverhead = 35_000;
  const netBytes = Math.max(10_000, safeTargetBytes - containerOverhead);
  const totalBits = netBytes * 8;

  // Audio track budget:
  // For tight targets (<= 2 MB), audio is encoded at 64 kbps to save 200+ KB for video.
  // For standard targets (> 2 MB), audio is allocated 128 kbps.
  const audioBps = stripAudio ? 0 : targetSizeMB <= 2 ? 64_000 : 128_000;
  const audioBits = audioBps * durationSeconds;

  // Available bits strictly for video track
  const availableVideoBits = Math.max(
    80_000 * durationSeconds,
    totalBits - audioBits,
  );

  const baseVideoBps = Math.round(availableVideoBits / durationSeconds);

  // Hardware VBR Compensation:
  // In WebCodecs `bitrateMode: 'variable'`, hardware H.264 (MP4) encoders (NVENC/QuickSync)
  // internally starve bitrate by ~15-20% on typical scenes, causing blocky distortion.
  // WebM (VP9) software controller is much more linear (~95% utilization).
  // For tight caps (<= 1.5 MB), keep WebM compensation at 1.00x so it never overshoots.
  const vbrCompensation =
    format === "video/webm"
      ? targetSizeMB <= 1.5 ? 1.00 : 1.02
      : targetSizeMB <= 1.5 ? 1.08 : 1.14;
  const targetVideoBps = Math.round(baseVideoBps * vbrCompensation);

  // Clamp within practical hardware bounds (80 kbps to 25 Mbps)
  return Math.min(25_000_000, Math.max(80_000, targetVideoBps));
}

/**
 * Determines if a target-size constraint requires downscaling to prevent the codec
 * from overflowing the requested MB limit due to physical quantization floors (QP 63).
 */
export function getAdaptedPresetForTargetSize(
  targetSizeMB: number,
  durationSeconds: number,
  stripAudio: boolean,
  currentPreset: VideoResizePreset,
  format: VideoOutputFormat = "video/mp4",
): VideoResizePreset {
  if (durationSeconds <= 0) return currentPreset;
  const bps = calculateBitrateForTargetSize(
    targetSizeMB,
    durationSeconds,
    stripAudio,
    format,
  );

  // At < 140 kbps (e.g. 1 MB on 45s+ clip), even 480p hits the floor. Auto-cap to 360p.
  if (bps < 140_000 && currentPreset !== "360p") {
    return "360p";
  }
  // At < 320 kbps (e.g. 1 MB on 25s clip), 720p (921k px) overflows due to QP 63 floor.
  // Auto-cap to 480p (854x480 = 410k px), preserving far more detail and sharpness than 360p!
  if (
    bps < 320_000 &&
    (currentPreset === "1080p" || currentPreset === "original" || currentPreset === "720p")
  ) {
    return "480p";
  }
  // At < 550 kbps, 1080p (2M pixels/frame) hits the codec entropy floor.
  // Auto-cap to 720p.
  if (
    bps < 550_000 &&
    (currentPreset === "1080p" || currentPreset === "original")
  ) {
    return "720p";
  }
  return currentPreset;
}

/**
 * Normalizes trim boundaries. If trim covers full duration (start ~0 and end ~duration),
 * returns undefined so it is not treated as a trimmed video.
 */
export function normalizeTrim(
  duration: number,
  trim?: { start: number; end: number },
): { start: number; end: number } | undefined {
  if (!trim) return undefined;
  const isStartTrimmed = trim.start > 0.05;
  const isEndTrimmed = duration > 0 ? trim.end < duration - 0.05 : false;
  if (!isStartTrimmed && !isEndTrimmed) return undefined;
  return {
    start: Number(Math.max(0, trim.start).toFixed(2)),
    end: Number(Math.min(duration > 0 ? duration : trim.end, trim.end).toFixed(2)),
  };
}

/**
 * Checks whether a video actually has active cuts or trim boundaries applied.
 */
export function hasEffectiveTrim(
  duration: number,
  trim?: { start: number; end: number },
  sections?: VideoSection[],
): boolean {
  if (sections && sections.some((s) => s.isDeleted)) return true;
  return normalizeTrim(duration, trim) !== undefined;
}

/**
 * Extracts the list of kept continuous time ranges [start, end] for a video.
 */
export function getKeptRanges(
  duration: number,
  trim?: { start: number; end: number },
  sections?: VideoSection[],
): { start: number; end: number }[] {
  if (sections && sections.length > 0 && sections.some((s) => s.isDeleted)) {
    const kept = sections
      .filter((s) => !s.isDeleted && s.end > s.start)
      .map((s) => ({ start: s.start, end: s.end }));
    if (kept.length > 0) return kept;
  }
  const normalized = normalizeTrim(duration, trim);
  if (normalized && normalized.end > normalized.start) {
    return [{ start: normalized.start, end: normalized.end }];
  }
  return [{ start: 0, end: Math.max(0.1, duration) }];
}

/**
 * Maps a playback timestamp in the compressed/edited video back to the exact source timestamp in the original video.
 */
export function mapCompTimeToOrigTime(
  compTime: number,
  keptRanges: { start: number; end: number }[],
): number {
  if (keptRanges.length === 0) return compTime;
  let accumulated = 0;
  for (const range of keptRanges) {
    const rangeDuration = range.end - range.start;
    if (compTime <= accumulated + rangeDuration) {
      const offset = Math.max(0, compTime - accumulated);
      return range.start + offset;
    }
    accumulated += rangeDuration;
  }
  return keptRanges[keptRanges.length - 1].end;
}

/**
 * Maps a playback timestamp in the original video to the corresponding timestamp in the compressed/edited video.
 */
export function mapOrigTimeToCompTime(
  origTime: number,
  keptRanges: { start: number; end: number }[],
): { compTime: number; isInside: boolean } {
  if (keptRanges.length === 0) return { compTime: origTime, isInside: true };

  let accumulated = 0;
  for (const range of keptRanges) {
    const rangeDuration = range.end - range.start;
    if (origTime >= range.start && origTime <= range.end) {
      return {
        compTime: accumulated + (origTime - range.start),
        isInside: true,
      };
    }
    if (origTime < range.start) {
      // Before this kept range, outside cut
      return {
        compTime: accumulated,
        isInside: false,
      };
    }
    accumulated += rangeDuration;
  }

  // After all kept ranges
  return {
    compTime: accumulated,
    isInside: false,
  };
}

/**
 * Calculates effective playback/output duration accounting for multiple cut sections or standard trim.
 */
export function getEffectiveVideoDuration(
  durationSeconds: number,
  trim?: { start: number; end: number },
  sections?: VideoSection[],
): number {
  if (durationSeconds <= 0) return 0;
  if (sections && sections.length > 0 && sections.some((s) => s.isDeleted)) {
    const kept = sections
      .filter((s) => !s.isDeleted && s.end > s.start)
      .reduce((acc, s) => acc + (s.end - s.start), 0);
    return Math.max(0, Math.min(durationSeconds, kept));
  }
  const normalized = normalizeTrim(durationSeconds, trim);
  if (normalized && normalized.end > normalized.start) {
    return Math.max(0, Math.min(durationSeconds, normalized.end - normalized.start));
  }
  return durationSeconds;
}

/**
 * Deterministically estimates output video file size prior to running compression.
 * In Bitrate mode: Size (bytes) = (Bitrate * Duration) / 8 + container overhead,
 * calibrated for WebCodecs VBR rate control and resolution-specific entropy limits.
 * In Target Size mode: Accurately projects target file size ceiling with safety cushion.
 * In Quality mode: Computes target bitrate based on resolution, codec, and quality factor.
 * Capped against originalSize when provided so re-encoding cannot estimate larger than source.
 */
export function estimateVideoSize(
  durationSeconds: number,
  settings: Partial<VideoOptimizerSettings>,
  trim?: { start: number; end: number },
  width: number = 1920,
  height: number = 1080,
  originalSize?: number,
  sections?: VideoSection[],
): number {
  if (durationSeconds <= 0) return 0;
  const effectiveDuration = getEffectiveVideoDuration(
    durationSeconds,
    trim || settings.trim,
    sections || settings.sections,
  );

  // 1. Calculate target dimensions based on preset
  let targetW = width > 0 ? width : 1920;
  let targetH = height > 0 ? height : 1080;
  if (settings.resizePreset && settings.resizePreset !== "original") {
    const maxDim =
      settings.resizePreset === "1080p"
        ? 1920
        : settings.resizePreset === "720p"
          ? 1280
          : settings.resizePreset === "480p"
            ? 854
            : settings.resizePreset === "360p"
              ? 640
              : settings.customMaxDimension || 1280;

    const currentMax = Math.max(targetW, targetH);
    if (currentMax > maxDim) {
      const scale = maxDim / currentMax;
      targetW = Math.round((targetW * scale) / 2) * 2;
      targetH = Math.round((targetH * scale) / 2) * 2;
    }
  }

  const pixels = targetW * targetH;
  const referencePixels = 1920 * 1080;

  let videoBps: number;
  if (settings.mode === "quality") {
    const q = (settings.qualityPercent ?? 80) / 100;
    const factor = 0.3 * Math.exp(2.5538 * q);
    const referenceBitrate = 2_800_000;
    const scaleFactor = Math.pow(pixels / referencePixels, 0.92);
    const codecEfficiency = settings.format === "video/webm" ? 0.75 : 1.0;
    videoBps = Math.round(
      referenceBitrate * scaleFactor * factor * codecEfficiency,
    );
  } else if (settings.mode === "target-size") {
    videoBps = calculateBitrateForTargetSize(
      settings.targetSizeMB ?? 8,
      effectiveDuration,
      Boolean(settings.stripAudio),
      settings.format || "video/mp4",
    );
  } else {
    // Bitrate mode: WebCodecs variable bitrate with the specified bitrate as peak ceiling.
    const nominalBps = (settings.bitrateMbps ?? 2.5) * 1_000_000;
    // Entropy ceiling: A smaller resolution (e.g. 720p or 360p) cannot absorb infinite bitrate.
    // Max practical bpp is ~0.16 bits per pixel at 30 fps.
    const maxResolutionBps = Math.round(pixels * 30 * 0.16);

    // MP4 (H.264) hardware encoders (NVENC/QuickSync) aggressively starve bitrate in VBR (~72% nominal).
    // WebM (VP9 libvpx) software rate controller spends closer to the full target budget (~92% nominal),
    // producing higher visual fidelity with less distortion, but a correspondingly larger file size.
    const utilization = settings.format === "video/webm" ? 0.92 : 0.72;
    videoBps = Math.min(Math.round(nominalBps * utilization), maxResolutionBps);
  }

  // Optional audio track (64 kbps for tight targets <= 2 MB, 128 kbps otherwise)
  const audioBps = settings.stripAudio
    ? 0
    : settings.mode === "target-size" && (settings.targetSizeMB ?? 8) <= 2
      ? 64_000
      : 128_000;
  const totalBps = videoBps + audioBps;

  // bytes = bits / 8 + container overhead (~30KB for moov atom and index)
  let estimatedBytes = Math.round((totalBps * effectiveDuration) / 8) + 30_000;

  // For target-size mode, accurately project the ceiling without exceeding target
  if (settings.mode === "target-size") {
    const targetMB = settings.targetSizeMB ?? 8;
    const targetCapBytes = targetMB * 1024 * 1024;
    const safetyMargin =
      targetMB <= 1.5
        ? settings.format === "video/webm" ? 0.91 : 0.92
        : settings.format === "video/webm" ? 0.98 : 0.975;
    estimatedBytes = Math.min(
      estimatedBytes,
      Math.round(targetCapBytes * safetyMargin),
    );
  }

  // Cap with original size:
  // Re-encoding already-compressed footage will not exceed the source file size
  // (adjusted for trimmed duration).
  if (originalSize && originalSize > 0) {
    const durationRatio =
      durationSeconds > 0 ? effectiveDuration / durationSeconds : 1;
    const maxPossibleSize = Math.round(originalSize * durationRatio * 0.95);
    if (maxPossibleSize > 30_000) {
      estimatedBytes = Math.min(estimatedBytes, maxPossibleSize);
    }
  }

  return estimatedBytes;
}

/**
 * Checks whether the current optimizer settings or trim differ from the settings
 * used when the video was last compressed.
 */
export function hasSettingsChanged(
  currentSettings: VideoOptimizerSettings,
  lastSettings?: VideoOptimizerSettings,
  itemTrim?: { start: number; end: number },
  itemStripAudio?: boolean,
  itemSections?: VideoSection[],
  duration?: number,
): boolean {
  if (!lastSettings) return false;

  if (currentSettings.format !== lastSettings.format) return true;
  if (currentSettings.mode !== lastSettings.mode) return true;

  if (currentSettings.mode === "quality") {
    if (currentSettings.qualityPercent !== lastSettings.qualityPercent) return true;
  } else if (currentSettings.mode === "target-size") {
    if (
      Math.abs(
        (currentSettings.targetSizeMB ?? 8) - (lastSettings.targetSizeMB ?? 8),
      ) > 0.05
    ) {
      return true;
    }
  } else {
    if (
      Math.abs(currentSettings.bitrateMbps - lastSettings.bitrateMbps) > 0.05
    ) {
      return true;
    }
  }

  if (currentSettings.resizePreset !== lastSettings.resizePreset) return true;
  if (
    currentSettings.resizePreset === "custom" &&
    currentSettings.customMaxDimension !== lastSettings.customMaxDimension
  ) {
    return true;
  }

  const effectiveStripAudio =
    itemStripAudio !== undefined ? itemStripAudio : currentSettings.stripAudio;
  if (effectiveStripAudio !== lastSettings.stripAudio) return true;

  // Compare normalized trim (only triggers if there is an actual crop)
  const d = duration && duration > 0 ? duration : 0;
  const normCurTrim = normalizeTrim(d, itemTrim || currentSettings.trim);
  const normLastTrim = normalizeTrim(d, lastSettings.trim);

  if (Boolean(normCurTrim) !== Boolean(normLastTrim)) return true;
  if (normCurTrim && normLastTrim) {
    if (
      Math.abs(normCurTrim.start - normLastTrim.start) > 0.05 ||
      Math.abs(normCurTrim.end - normLastTrim.end) > 0.05
    ) {
      return true;
    }
  }

  // Compare active cuts
  const curSections = itemSections || currentSettings.sections;
  const lastSections = lastSettings.sections;
  const curHasCuts = curSections?.some((s) => s.isDeleted) ?? false;
  const lastHasCuts = lastSections?.some((s) => s.isDeleted) ?? false;

  if (curHasCuts !== lastHasCuts) return true;
  if (curHasCuts && lastHasCuts && curSections && lastSections) {
    const curCuts = curSections.filter((s) => s.isDeleted);
    const lastCuts = lastSections.filter((s) => s.isDeleted);
    if (curCuts.length !== lastCuts.length) return true;
    for (let i = 0; i < curCuts.length; i++) {
      if (
        Math.abs(curCuts[i].start - lastCuts[i].start) > 0.05 ||
        Math.abs(curCuts[i].end - lastCuts[i].end) > 0.05
      ) {
        return true;
      }
    }
  }

  return false;
}

export type VideoOrientationType =
  | "portrait"
  | "landscape"
  | "square"
  | "ultrawide";

export interface VideoOrientationInfo {
  type: VideoOrientationType;
  label: string;
  ratio: string;
}

/**
 * Accurately analyzes dimensions and returns orientation type, human label, and ratio
 */
export function getVideoOrientation(
  width: number,
  height: number,
): VideoOrientationInfo {
  if (!width || !height) {
    return { type: "landscape", label: "Landscape", ratio: "16:9" };
  }

  const aspect = width / height;

  if (aspect >= 2.0) {
    return { type: "ultrawide", label: "Ultrawide", ratio: "21:9" };
  } else if (aspect > 1.15) {
    const isStandard43 = Math.abs(aspect - 4 / 3) < 0.1;
    return {
      type: "landscape",
      label: "Landscape",
      ratio: isStandard43 ? "4:3" : "16:9",
    };
  } else if (aspect < 0.85) {
    const isStandard34 = Math.abs(aspect - 3 / 4) < 0.1;
    return {
      type: "portrait",
      label: "Portrait",
      ratio: isStandard34 ? "3:4" : "9:16",
    };
  } else {
    return { type: "square", label: "Square", ratio: "1:1" };
  }
}

export function getVideoFilenameWithExtension(
  originalName: string,
  targetFormat: VideoOutputFormat,
): string {
  const lastDot = originalName.lastIndexOf(".");
  const baseName =
    lastDot !== -1 ? originalName.slice(0, lastDot) : originalName;

  const ext = targetFormat === "video/webm" ? "webm" : "mp4";
  return `${baseName}_compressed.${ext}`;
}

export function getFormatLabel(format: VideoOutputFormat): string {
  return format === "video/webm" ? "WebM (VP9)" : "MP4 (H.264)";
}
