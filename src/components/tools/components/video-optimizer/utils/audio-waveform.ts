import {
  Input,
  ALL_FORMATS,
  BlobSource,
  AudioSampleSink,
} from "mediabunny";

/**
 * Fallback waveform peak extractor using Mediabunny's streaming AudioSampleSink.
 * Reads only sparse audio packets at target timestamps directly from the File Blob,
 * supporting 100MB+ MP4/MOV files without loading the entire container into RAM.
 */
async function extractWaveformViaMediabunny(
  file: File,
  samplesCount: number,
): Promise<number[] | null> {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  try {
    const [duration, audioTrack] = await Promise.all([
      input.computeDuration().catch(() => 0),
      input.getPrimaryAudioTrack().catch(() => null),
    ]);

    if (!audioTrack || duration <= 0) return null;

    const sink = new AudioSampleSink(audioTrack);
    const timestamps = Array.from(
      { length: samplesCount },
      (_, i) => ((i + 0.5) / samplesCount) * duration,
    );

    const peaks: number[] = [];
    for await (const sample of sink.samplesAtTimestamps(timestamps)) {
      if (!sample) {
        peaks.push(0);
        continue;
      }
      try {
        const frameCount = sample.numberOfFrames;
        if (frameCount > 0) {
          const buf = new Float32Array(frameCount);
          sample.copyTo(buf, { planeIndex: 0, format: "f32-planar" });
          let max = 0;
          const step = Math.max(1, Math.floor(frameCount / 64));
          for (let j = 0; j < frameCount; j += step) {
            const val = Math.abs(buf[j] || 0);
            if (val > max) max = val;
          }
          peaks.push(max);
        } else {
          peaks.push(0);
        }
      } finally {
        sample.close();
      }
    }

    if (peaks.length === 0) return null;
    const maxPeak = Math.max(...peaks, 0.01);
    return peaks.map((p) => Math.max(0.06, p / maxPeak));
  } catch {
    return null;
  } finally {
    try {
      input.dispose();
    } catch {}
  }
}

/**
 * Browser-native audio waveform peak extractor using Web Audio API AudioContext
 * with automatic streaming fallback via Mediabunny for large (>100MB) files.
 */
export async function extractAudioWaveform(
  file: File,
  samplesCount = 120,
): Promise<number[] | null> {
  // For files <= 100MB, decode full intact container buffer via Web Audio API
  if (file.size <= 100 * 1024 * 1024) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          const totalSamples = channelData.length;

          if (totalSamples > 0) {
            const blockSize = Math.max(
              1,
              Math.floor(totalSamples / samplesCount),
            );
            const peaks: number[] = [];

            for (let i = 0; i < samplesCount; i++) {
              const start = i * blockSize;
              const end = Math.min(start + blockSize, totalSamples);
              let max = 0;
              for (let j = start; j < end; j += 4) {
                const val = Math.abs(channelData[j] || 0);
                if (val > max) max = val;
              }
              peaks.push(max);
            }

            await audioCtx.close().catch(() => {});
            const maxPeak = Math.max(...peaks, 0.01);
            return peaks.map((p) => Math.max(0.06, p / maxPeak));
          }
        } finally {
          await audioCtx.close().catch(() => {});
        }
      }
    } catch {
      // Fall through to streaming Mediabunny extractor
    }
  }

  return extractWaveformViaMediabunny(file, samplesCount);
}
