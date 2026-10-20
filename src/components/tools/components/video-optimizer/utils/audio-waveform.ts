/**
 * Browser-native audio waveform peak extractor using Web Audio API AudioContext.
 * Decodes audio from MP4/WebM/MOV files in background and downsamples to N peak bars.
 */
export async function extractAudioWaveform(
  file: File,
  samplesCount = 120,
): Promise<number[] | null> {
  try {
    const arrayBuffer = await file.slice(0, Math.min(file.size, 50 * 1024 * 1024)).arrayBuffer();
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    const audioCtx = new AudioContextClass();
    let audioBuffer: AudioBuffer;

    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch {
      await audioCtx.close().catch(() => {});
      return null;
    }

    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    if (totalSamples === 0) {
      await audioCtx.close().catch(() => {});
      return null;
    }

    const blockSize = Math.max(1, Math.floor(totalSamples / samplesCount));
    const peaks: number[] = [];

    for (let i = 0; i < samplesCount; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      let max = 0;
      // Step by 4 for ultra-fast peak scanning
      for (let j = start; j < end; j += 4) {
        const val = Math.abs(channelData[j] || 0);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    await audioCtx.close().catch(() => {});

    const maxPeak = Math.max(...peaks, 0.01);
    // Normalize to 0.06 - 1.0 so even quiet sections have a subtle baseline bar
    return peaks.map((p) => Math.max(0.06, p / maxPeak));
  } catch {
    return null;
  }
}
