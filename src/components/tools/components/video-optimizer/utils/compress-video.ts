import {
  Input,
  Output,
  Conversion,
  ConversionCanceledError,
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
  resolveTargetFps,
  stepDownResolutionPreset,
} from "./format";

export interface VideoCompressionResult {
  blob: Blob;
  url: string;
  dimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number };
  size: number;
  format: VideoOutputFormat;
  duration: number;
  fps?: number;
  exceededTargetCap?: boolean;
}

export interface VideoMetadata {
  width: number;
  height: number;
  fps?: number;
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
    let fps: number | undefined;

    if (videoTrack) {
      const [dw, dh, fpsMetrics] = await Promise.all([
        videoTrack.getDisplayWidth().catch(() => 1920),
        videoTrack.getDisplayHeight().catch(() => 1080),
        videoTrack.computeFrameRateMetrics().catch(() => null),
      ]);
      width = dw || 1920;
      height = dh || 1080;
      const rawFps =
        fpsMetrics?.bestGuessFrameRate || fpsMetrics?.averageFrameRate;
      if (rawFps && rawFps > 0 && Number.isFinite(rawFps)) {
        fps = Math.round(rawFps * 100) / 100;
      }
    }

    const hasAudio = !!audioTrack;
    const thumbnailUrl = await extractVideoThumbnail(file, 0.5);

    return {
      width,
      height,
      fps,
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
  signal?: AbortSignal,
): Promise<VideoCompressionResult> {
  if (signal?.aborted) {
    throw new ConversionCanceledError();
  }

  onProgress?.(5);

  const source = new BlobSource(file);
  const input = new Input({
    source,
    formats: ALL_FORMATS,
  });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error("No video track found in input file.");
    }

    const [origW, origH, duration, fpsMetrics] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      input.computeDuration(),
      videoTrack.computeFrameRateMetrics().catch(() => null),
    ]);

    const rawSourceFps =
      fpsMetrics?.bestGuessFrameRate || fpsMetrics?.averageFrameRate;
    const sourceFps =
      rawSourceFps && rawSourceFps > 0 && Number.isFinite(rawSourceFps)
        ? Math.round(rawSourceFps * 100) / 100
        : undefined;

    if (signal?.aborted) {
      throw new ConversionCanceledError();
    }

    const exportSpeed =
      settings.exportSpeed && settings.exportSpeed > 0
        ? settings.exportSpeed
        : 1;
    const hasSpeedChange = Math.abs(exportSpeed - 1) > 0.01;

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
      exportSpeed,
    );

    const resolvedTargetFps = resolveTargetFps(settings.targetFps, sourceFps);
    const desiredOutputFps =
      resolvedTargetFps ?? (sourceFps ? Math.min(60, sourceFps) : undefined);
    const neededInputFps = desiredOutputFps
      ? desiredOutputFps / exportSpeed
      : undefined;
    const mediabunnyFrameRate =
      (resolvedTargetFps !== undefined || exportSpeed > 1) &&
      neededInputFps &&
      (!sourceFps || neededInputFps < sourceFps - 0.5)
        ? Math.max(1, neededInputFps)
        : undefined;

    const outputFps = resolvedTargetFps
      ? resolvedTargetFps
      : sourceFps
        ? exportSpeed < 1
          ? Math.round(sourceFps * exportSpeed * 100) / 100
          : Math.min(60, sourceFps)
        : undefined;

    // Determine effective resolution preset (protects against physical codec floors in target-size mode)
    let currentPreset: VideoResizePreset =
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
      currentPreset,
      settings.customMaxDimension,
    );

    onProgress?.(15);

    const isMp4 = settings.format === "video/mp4";

    let audioConfig:
      | {
          discard?: boolean;
          quality?: Quality;
          forceTranscode?: boolean;
        }
      | undefined = settings.stripAudio ? { discard: true } : undefined;

    // When cuts, trims, or speed changes are applied, force audio to transcode so that audio samples
    // can be filtered, resampled, and retimestamped in lockstep with video (preventing packet-copy desync)
    if (!settings.stripAudio && (hasActiveTrimOrCut || hasSpeedChange)) {
      audioConfig = {
        ...audioConfig,
        forceTranscode: true,
      };
    }

    let targetBitrate = 0;
    let videoQuality: Quality;

    if (settings.mode === "quality") {
      videoQuality = new Quality({
        quality: (settings.qualityPercent || 80) / 100,
      });
    } else if (settings.mode === "target-size") {
      const targetMB = settings.targetSizeMB ?? 8;
      targetBitrate = calculateBitrateForTargetSize(
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
        bitrateMode: "constant",
      });
    } else {
      videoQuality = new Quality({
        bitrate: Math.round(settings.bitrateMbps * 1_000_000),
        bitrateMode: "variable",
      });
    }

    /**
     * Maps decoded source sample time (shifted by -trimStart) to final output time,
     * applying cut-range filtering and exportSpeed time scaling.
     */
    const mapSampleOutputTime = (sampleTimestamp: number): number | null => {
      const origTime = sampleTimestamp + trimStart;
      let timelineTime = origTime;

      if (hasActiveTrimOrCut) {
        const currentRange = keptRanges.find(
          (r) => origTime >= r.start - 0.005 && origTime < r.end + 0.005,
        );
        if (!currentRange) {
          return null;
        }

        let cumulative = 0;
        for (const r of keptRanges) {
          if (r === currentRange) break;
          cumulative += r.end - r.start;
        }

        const boundedTime = Math.max(
          currentRange.start,
          Math.min(currentRange.end, origTime),
        );
        timelineTime = cumulative + (boundedTime - currentRange.start);
      }

      return Math.max(0, timelineTime / exportSpeed);
    };

    const needsSampleProcess = hasActiveTrimOrCut || hasSpeedChange;

    const encodeSinglePass = async (
      passInput: Input,
      passDims: { width: number; height: number },
      passVideoQuality: Quality,
      progressStart: number,
      progressEnd: number,
    ): Promise<Blob> => {
      const outputFormat = isMp4
        ? new Mp4OutputFormat({ fastStart: "in-memory" })
        : new WebMOutputFormat();
      const targetBuffer = new BufferTarget();
      const output = new Output({
        format: outputFormat,
        target: targetBuffer,
      });

      const processVideoSample = (sample: VideoSample): VideoSample | null => {
        const outTime = mapSampleOutputTime(sample.timestamp);
        if (outTime === null) return null;

        sample.setTimestamp(outTime);
        if (hasSpeedChange && sample.duration > 0) {
          sample.setDuration(sample.duration / exportSpeed);
        }
        return sample;
      };

      // Tracks fractional PCM samples across chunks so sped-up/slowed audio stays drift-free
      let audioFrameRemainder = 0;

      const processAudioSample = (
        sample: AudioSample,
      ): AudioSample | AudioSample[] | null => {
        const outTime = mapSampleOutputTime(sample.timestamp);
        if (outTime === null) return null;

        if (!hasSpeedChange) {
          sample.setTimestamp(outTime);
          return sample;
        }

        const srcBuffer = sample.toAudioBuffer();
        const srcLength = srcBuffer.length;
        const numChannels = srcBuffer.numberOfChannels;
        const sampleRate = srcBuffer.sampleRate;

        audioFrameRemainder += srcLength / exportSpeed;
        const outLength = Math.max(1, Math.round(audioFrameRemainder));
        audioFrameRemainder -= outLength;

        const outBuffer = new AudioBuffer({
          numberOfChannels: numChannels,
          length: outLength,
          sampleRate,
        });

        // Linear PCM interpolation scales chunk duration by 1 / exportSpeed cleanly
        for (let ch = 0; ch < numChannels; ch++) {
          const srcData = srcBuffer.getChannelData(ch);
          const dstData = outBuffer.getChannelData(ch);
          for (let i = 0; i < outLength; i++) {
            const srcPos = Math.min(srcLength - 1, i * exportSpeed);
            const idx0 = Math.floor(srcPos);
            const idx1 = Math.min(srcLength - 1, idx0 + 1);
            const frac = srcPos - idx0;
            dstData[i] = srcData[idx0] * (1 - frac) + srcData[idx1] * frac;
          }
        }

        return AudioSample.fromAudioBuffer(outBuffer, outTime);
      };

      const conversion = await Conversion.init({
        input: passInput,
        output,
        video: {
          width: passDims.width,
          height: passDims.height,
          fit: "contain",
          codec: isMp4 ? "avc" : "vp9",
          quality: passVideoQuality,
          frameRate: mediabunnyFrameRate,
          forceTranscode: true,
          process: needsSampleProcess ? processVideoSample : undefined,
        },
        audio:
          audioConfig && !audioConfig.discard
            ? {
                ...audioConfig,
                process: needsSampleProcess ? processAudioSample : undefined,
              }
            : audioConfig,
        trim: hasActiveTrimOrCut
          ? {
              start: trimStart,
              end: trimEnd,
            }
          : undefined,
      });

      if (signal?.aborted) {
        await conversion.cancel().catch(() => {});
        throw new ConversionCanceledError();
      }

      const handleAbort = () => {
        conversion.cancel().catch(() => {});
      };
      signal?.addEventListener("abort", handleAbort, { once: true });

      conversion.onProgress = (pct) => {
        if (signal?.aborted) return;
        const span = Math.max(1, progressEnd - progressStart);
        const mapped = Math.round(progressStart + pct * span);
        onProgress?.(Math.min(progressEnd, mapped));
      };

      try {
        await conversion.execute();
      } finally {
        signal?.removeEventListener("abort", handleAbort);
      }

      if (signal?.aborted) {
        throw new ConversionCanceledError();
      }

      const buffer = targetBuffer.buffer;
      if (!buffer) {
        throw new Error("Failed to produce output video buffer.");
      }

      return new Blob([buffer], { type: settings.format });
    };

    const runWithBitrateModeFallback = async (
      passInput: Input,
      passDims: { width: number; height: number },
      bps: number,
      progressStart: number,
      progressEnd: number,
    ): Promise<Blob> => {
      try {
        return await encodeSinglePass(
          passInput,
          passDims,
          new Quality({ bitrate: bps, bitrateMode: "constant" }),
          progressStart,
          progressEnd,
        );
      } catch (err) {
        if (
          signal?.aborted ||
          (err instanceof Error && err.name === "ConversionCanceledError")
        ) {
          throw err;
        }
        // Some hardware encoders reject CBR; cleanly fall back to VBR on a fresh input
        const fallbackInput = new Input({
          source: new BlobSource(file),
          formats: ALL_FORMATS,
        });
        try {
          return await encodeSinglePass(
            fallbackInput,
            passDims,
            new Quality({ bitrate: bps, bitrateMode: "variable" }),
            progressStart,
            progressEnd,
          );
        } finally {
          try {
            fallbackInput.dispose();
          } catch {}
        }
      }
    };

    let bestBlob: Blob;
    let bestDims = targetDims;
    let exceededTargetCap = false;

    if (settings.mode === "target-size") {
      const targetCapBytes = (settings.targetSizeMB ?? 8) * 1024 * 1024;
      let currentBitrate = targetBitrate;
      let currentDims = targetDims;

      bestBlob = await runWithBitrateModeFallback(
        input,
        currentDims,
        currentBitrate,
        15,
        75,
      );

      // Closed-loop correction: if hardware VBR/CBR still overshot the MB cap
      // (e.g. high-entropy noise hitting QP floors), re-encode with scaled bitrate
      // and stepped-down resolution until it fits (max 2 correction passes).
      // Skip retries when pass 1 was already floored at minimum bitrate and 360p.
      const maxRetries = 2;
      const isAlreadyAtFloor =
        currentBitrate <= 60_000 && currentPreset === "360p";

      if (!isAlreadyAtFloor) {
        for (
          let retry = 0;
          retry < maxRetries && bestBlob.size > targetCapBytes;
          retry++
        ) {
          if (signal?.aborted) {
            throw new ConversionCanceledError();
          }

          const overshootRatio = bestBlob.size / targetCapBytes;
          // Scale down proportionally with an extra 14% safety margin
          const nextBitrate = Math.max(
            50_000,
            Math.round((currentBitrate * 0.86) / overshootRatio),
          );

          // Step down resolution when overshoot is significant so the codec
          // doesn't hit minimum-QP ceilings on 1080p high-entropy frames
          const stepped =
            overshootRatio > 1.12 || retry > 0
              ? stepDownResolutionPreset(currentPreset)
              : null;

          if (nextBitrate >= currentBitrate * 0.95 && !stepped) {
            break;
          }

          currentBitrate = nextBitrate;
          if (stepped) {
            currentPreset = stepped;
            currentDims = calculateTargetVideoDimensions(
              origW,
              origH,
              currentPreset,
              settings.customMaxDimension,
            );
          }

          const retryInput = new Input({
            source: new BlobSource(file),
            formats: ALL_FORMATS,
          });
          const pStart = retry === 0 ? 75 : 86;
          const pEnd = retry === 0 ? 86 : 96;

          try {
            const retryBlob = await runWithBitrateModeFallback(
              retryInput,
              currentDims,
              currentBitrate,
              pStart,
              pEnd,
            );
            if (retryBlob.size < bestBlob.size) {
              bestBlob = retryBlob;
              bestDims = currentDims;
            }
          } finally {
            try {
              retryInput.dispose();
            } catch {}
          }
        }
      }

      exceededTargetCap = bestBlob.size > targetCapBytes;
    } else {
      bestBlob = await encodeSinglePass(input, targetDims, videoQuality, 15, 95);
    }

    onProgress?.(98);

    const url = URL.createObjectURL(bestBlob);

    onProgress?.(100);

    return {
      blob: bestBlob,
      url,
      dimensions: bestDims,
      originalDimensions: { width: origW, height: origH },
      size: bestBlob.size,
      format: settings.format,
      duration: effectiveDuration,
      fps: outputFps,
      exceededTargetCap,
    };
  } finally {
    try {
      input.dispose();
    } catch {}
  }
}
