import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  Mp4OutputFormat,
  WebMOutputFormat,
  BufferTarget,
  Quality,
  canEncodeVideo,
  VideoSample,
  AudioSample,
} from "mediabunny";
import {
  VideoOptimizerSettings,
  VideoResizePreset,
  VideoOutputFormat,
} from "../types";
import {
  calculateBitrateForTargetSize,
  getAdaptedPresetForTargetSize,
  getEffectiveVideoDuration,
  getKeptRanges,
} from "./format";

export interface VideoCompressionResult {
  blob: Blob;
  url: string;
  dimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number };
  size: number;
  format: VideoOutputFormat;
  duration: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  thumbnailUrl: string;
  hasAudio: boolean;
}

/**
 * Ensures a dimension is an even integer (required by H.264/VP9 codecs)
 */
function makeEven(val: number): number {
  const rounded = Math.round(val);
  return Math.max(2, rounded % 2 === 0 ? rounded : rounded - 1);
}

/**
 * Calculates target dimensions with Smart Aspect Ratio Swap for portrait videos
 * (exact parity with ConvertVideos.ps1)
 */
export function calculateTargetVideoDimensions(
  origW: number,
  origH: number,
  preset: VideoResizePreset,
  customMaxDimension?: number,
): { width: number; height: number } {
  if (preset === "original") {
    return { width: makeEven(origW), height: makeEven(origH) };
  }

  const isPortrait = origH > origW;
  let maxW = 1920;
  let maxH = 1080;

  switch (preset) {
    case "1080p":
      maxW = 1920;
      maxH = 1080;
      break;
    case "720p":
      maxW = 1280;
      maxH = 720;
      break;
    case "480p":
      maxW = 854;
      maxH = 480;
      break;
    case "360p":
      maxW = 640;
      maxH = 360;
      break;
    case "custom":
      if (customMaxDimension && customMaxDimension > 0) {
        maxW = customMaxDimension;
        maxH = customMaxDimension;
      }
      break;
  }

  // Smart swap for portrait video
  if (isPortrait && maxW > maxH) {
    const temp = maxW;
    maxW = maxH;
    maxH = temp;
  }

  // Scale down while preserving aspect ratio
  const scale = Math.min(1, maxW / origW, maxH / origH);
  const targetW = makeEven(origW * scale);
  const targetH = makeEven(origH * scale);

  return { width: targetW, height: targetH };
}

/**
 * Extracts a frame from a video file as a poster thumbnail
 */
async function extractVideoThumbnail(
  file: File,
  targetTime = 0.5,
): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = objectUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const seekTime = Math.min(
        targetTime,
        video.duration > 0 ? video.duration / 2 : 0,
      );
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(480, video.videoWidth || 480);
        const aspect =
          video.videoHeight && video.videoWidth
            ? video.videoHeight / video.videoWidth
            : 9 / 16;
        canvas.height = Math.round(canvas.width * aspect);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/webp", 0.7);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn("Canvas thumbnail generation failed", err);
      }
      cleanup();
      resolve("");
    };

    video.onerror = () => {
      cleanup();
      resolve("");
    };
  });
}

/**
 * Probes video duration, dimensions, tracks, and thumbnail
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  const source = new BlobSource(file);
  const input = new Input({
    source,
    formats: ALL_FORMATS,
  });

  try {
    const [duration, videoTrack, audioTrack] = await Promise.all([
      input.computeDuration().catch(() => 0),
      input.getPrimaryVideoTrack().catch(() => null),
      input.getPrimaryAudioTrack().catch(() => null),
    ]);

    let width = 1920;
    let height = 1080;

    if (videoTrack) {
      width = (await videoTrack.getDisplayWidth().catch(() => 1920)) || 1920;
      height = (await videoTrack.getDisplayHeight().catch(() => 1080)) || 1080;
    }

    const hasAudio = !!audioTrack;
    const thumbnailUrl = await extractVideoThumbnail(file, 0.5);

    return {
      width,
      height,
      duration: duration || 0,
      thumbnailUrl,
      hasAudio,
    };
  } finally {
    // Dispose input to release file handle
    try {
      input.dispose();
    } catch {}
  }
}

/**
 * Checks if the user's browser supports WebCodecs hardware encoding
 */
export async function checkVideoEncodingSupport(
  codec: "avc" | "vp9" = "avc",
): Promise<boolean> {
  try {
    return await canEncodeVideo(codec);
  } catch {
    return false;
  }
}

/**
 * Hardware-accelerated Video Compression via WebCodecs + Mediabunny
 */
export async function compressVideo(
  file: File,
  settings: VideoOptimizerSettings,
  onProgress?: (progress: number) => void,
): Promise<VideoCompressionResult> {
  onProgress?.(5);

  const source = new BlobSource(file);
  const input = new Input({
    source,
    formats: ALL_FORMATS,
  });

  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error("No video track found in input file.");
  }

  const origW = await videoTrack.getDisplayWidth();
  const origH = await videoTrack.getDisplayHeight();
  const duration = await input.computeDuration();

  // Determine kept ranges from multi-cut sections or legacy trim
  const keptRanges = getKeptRanges(duration, settings.trim, settings.sections);

  // Video has active edits if multiple ranges exist or single range doesn't cover full duration
  const hasActiveTrimOrCut =
    keptRanges.length > 1 ||
    (keptRanges.length === 1 &&
      (keptRanges[0].start > 0.05 || keptRanges[0].end < duration - 0.05));

  const trimStart = hasActiveTrimOrCut ? keptRanges[0].start : 0;
  const trimEnd = hasActiveTrimOrCut
    ? keptRanges[keptRanges.length - 1].end
    : duration;

  const effectiveDuration = getEffectiveVideoDuration(
    duration,
    settings.trim,
    settings.sections,
  );

  // Determine effective resolution preset (protects against physical codec floors in target-size mode)
  const effectivePreset =
    settings.mode === "target-size"
      ? getAdaptedPresetForTargetSize(
          settings.targetSizeMB ?? 8,
          effectiveDuration,
          Boolean(settings.stripAudio),
          settings.resizePreset,
          settings.format,
        )
      : settings.resizePreset;

  const targetDims = calculateTargetVideoDimensions(
    origW,
    origH,
    effectivePreset,
    settings.customMaxDimension,
  );

  onProgress?.(15);

  const isMp4 = settings.format === "video/mp4";
  const outputFormat = isMp4
    ? new Mp4OutputFormat({ fastStart: "in-memory" })
    : new WebMOutputFormat();

  const targetBuffer = new BufferTarget();
  const output = new Output({
    format: outputFormat,
    target: targetBuffer,
  });

  let videoQuality: Quality;
  let audioConfig: {
    discard?: boolean;
    quality?: Quality;
    forceTranscode?: boolean;
  } | undefined = settings.stripAudio ? { discard: true } : undefined;

  // When cuts or trims are applied, force audio to transcode so that audio samples
  // can be filtered and retimestamped in exact lockstep with video (preventing packet-copy desync)
  if (!settings.stripAudio && hasActiveTrimOrCut) {
    audioConfig = {
      ...audioConfig,
      forceTranscode: true,
    };
  }

  if (settings.mode === "quality") {
    videoQuality = new Quality({
      quality: (settings.qualityPercent || 80) / 100,
    });
  } else if (settings.mode === "target-size") {
    const targetMB = settings.targetSizeMB ?? 8;
    const targetBitrate = calculateBitrateForTargetSize(
      targetMB,
      effectiveDuration,
      Boolean(settings.stripAudio),
      settings.format,
    );

    // Audio budget optimization for tight targets (<= 2 MB):
    // Use 64 kbps audio to preserve 200+ KB for video, ensuring transparent sound without file bloating
    if (!settings.stripAudio && targetMB <= 2) {
      audioConfig = {
        ...audioConfig,
        quality: new Quality({ bitrate: 64_000 }),
      };
    }

    videoQuality = new Quality({
      bitrate: targetBitrate,
      bitrateMode: "variable",
    });
  } else {
    videoQuality = new Quality({
      bitrate: Math.round(settings.bitrateMbps * 1_000_000),
      bitrateMode: "variable",
    });
  }

  /**
   * Sample processor for frame/audio cutting and timestamp normalization.
   *
   * NOTE: When `trim.start` is passed to Mediabunny's `Conversion.init()`, Mediabunny
   * fast-seeks to `trim.start` and shifts decoded samples by `-trimStart`.
   * Therefore, inside this process callback:
   *   sample.timestamp === originalSourceTime - trimStart
   *   true originalSourceTime === sample.timestamp + trimStart
   */
  const createSampleProcessor = <T extends VideoSample | AudioSample>() => {
    return (sample: T): T | null => {
      const origTime = sample.timestamp + trimStart;

      // Find which kept range this sample falls into
      const currentRange = keptRanges.find(
        (r) => origTime >= r.start - 0.005 && origTime < r.end + 0.005,
      );
      if (!currentRange) {
        return null; // frame/audio in cut region or out of bounds is dropped!
      }

      // Calculate cumulative duration of all preceding kept ranges
      let cumulative = 0;
      for (const r of keptRanges) {
        if (r === currentRange) break;
        cumulative += r.end - r.start;
      }

      // Clamp origTime within currentRange bounds so timestamps remain monotonically sound
      const boundedTime = Math.max(
        currentRange.start,
        Math.min(currentRange.end, origTime),
      );
      sample.setTimestamp(cumulative + (boundedTime - currentRange.start));
      return sample;
    };
  };

  const conversion = await Conversion.init({
    input,
    output,
    video: {
      width: targetDims.width,
      height: targetDims.height,
      fit: "contain",
      codec: isMp4 ? "avc" : "vp9",
      quality: videoQuality,
      forceTranscode: true,
      process: hasActiveTrimOrCut
        ? createSampleProcessor<VideoSample>()
        : undefined,
    },
    audio:
      audioConfig && !audioConfig.discard
        ? {
            ...audioConfig,
            process: hasActiveTrimOrCut
              ? createSampleProcessor<AudioSample>()
              : undefined,
          }
        : audioConfig,
    trim: hasActiveTrimOrCut
      ? {
          start: trimStart,
          end: trimEnd,
        }
      : undefined,
  });

  conversion.onProgress = (pct) => {
    // Map conversion progress from 15% to 95%
    const mapped = Math.round(15 + pct * 80);
    onProgress?.(Math.min(95, mapped));
  };

  await conversion.execute();

  onProgress?.(98);

  const buffer = targetBuffer.buffer;
  if (!buffer) {
    throw new Error("Failed to produce output video buffer.");
  }

  const blob = new Blob([buffer], { type: settings.format });
  const url = URL.createObjectURL(blob);

  onProgress?.(100);

  return {
    blob,
    url,
    dimensions: targetDims,
    originalDimensions: { width: origW, height: origH },
    size: blob.size,
    format: settings.format,
    duration: effectiveDuration,
  };
}
