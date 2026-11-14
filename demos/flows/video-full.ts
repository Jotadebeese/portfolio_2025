import path from "node:path";
import type { SceneVariant } from "../lib/scene-runner.js";
import type { StageRecorder } from "../lib/stage-capture.js";

const DEFAULT_SHOWCASE_MP4 = path.resolve(
  process.cwd(),
  "fixtures/videos/gtavi-showcase-60s.mp4"
);
const VIDEO_INPUT_MP4 = path.resolve(
  process.env.DEMO_VIDEO_PATH || DEFAULT_SHOWCASE_MP4
);

/**
 * Full-feature walkthrough for Forthweb Video Optimizer using a 60s (01:00, 4K, 361 MB)
 * multi-scene GTA VI clip with stereo audio:
 * Drop 4K 01:00 MP4 -> toggle Codec/Audio Keep/720p/Tuning ->
 * Edit Studio (full 01:00 stereo waveform, Smooth/Bars toggle, spacious multi-section trim + 3 kept highlights & cut gaps) ->
 * Fast ~12x timelapse live WebCodecs encode ->
 * CompareModal (Side by Side + Full Timeline showing 3 kept bands + live synced playback -> Matched Frames -> Split Slider sweep).
 */
export async function runVideoFullScene(
  rec: StageRecorder,
  _variant: SceneVariant
): Promise<void> {
  const page = rec.page;
  const fileInput = page.locator('input[type="file"][accept*="video/mp4"]').first();
  const dropzonePrompt = page.getByText(/Drop your videos here/i).first();
  const editClipBtn = page.locator('button[aria-label="Edit clip"]').first();

  await fileInput.waitFor({ state: "attached", timeout: 20000 });
  await rec.captureUIFrame(0);
  await rec.moveTo(dropzonePrompt, { durationSec: 0.28 });

  // 1. Add 60s 4K (3840x2160, ~361 MB) video and wait for duration + thumbnail readiness
  await fileInput.setInputFiles([VIDEO_INPUT_MP4]);
  await page.getByText("01:00").first().waitFor({ state: "visible", timeout: 45000 });
  await editClipBtn.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(250);
  await rec.captureUIFrame(rec.elapsed());
  await rec.hold(0.32);

  // 2. Toggle Format, Audio (Keep), Resolution (720p), and Tuning modes
  const isWide = rec.viewportWidth >= 900;
  const card = page.locator("article#video-optimizer");
  const webmBtn = card.getByRole("button", { name: /WebM/i }).first();
  const mp4Btn = card.getByRole("button", { name: /MP4/i }).first();
  const audioBtn = card.locator('button[title*="Audio track"]').first();
  const res720Btn = card.getByRole("button", { name: "720p", exact: true }).first();
  const fitSizeBtn = card.getByRole("button", { name: "Fit to Size (MB)", exact: true }).first();
  const qualityModeBtn = card.getByRole("button", { name: "Quality (%)", exact: true }).first();

  rec.focusPoint(0.5, 0.36, {
    scale: isWide ? 1.1 : 1.02,
    transitionSec: 0.38,
  });

  await rec.click(webmBtn, { moveSec: 0.24, settleSec: 0.22 });
  await rec.click(mp4Btn, { moveSec: 0.22, settleSec: 0.22 });
  if (await audioBtn.isVisible().catch(() => false)) {
    await rec.click(audioBtn, { moveSec: 0.22, settleSec: 0.24 });
  }
  await rec.click(res720Btn, { moveSec: 0.24, settleSec: 0.24 });
  await rec.click(fitSizeBtn, { moveSec: 0.26, settleSec: 0.32 });
  await rec.click(qualityModeBtn, { moveSec: 0.22, settleSec: 0.2 });

  // 3. Edit Studio: full 01:00 waveform + wide, unmistakable multi-section cuts across scenes
  rec.resetCamera(0.32);
  await rec.click(editClipBtn, { moveSec: 0.32, settleSec: 0.32 });

  const startTrimHandle = page.locator('[title="Drag to trim start"]').first();
  const smoothWaveBtn = page.locator('button[title*="smooth fluid waveform"]').first();
  const barsWaveBtn = page.locator('button[title*="detailed vertical audio bars"]').first();
  const splitClipBtn = page.locator('button[title*="Split clip at current playhead"]').first();
  const deleteSecBtn = page.locator('button[title*="Cut / delete selected section"]').first();
  const saveCompressBtn = page.locator('button:has-text("Save & Compress")').first();

  await startTrimHandle.waitFor({ state: "visible", timeout: 20000 });
  // Let Mediabunny finish drawing the 60s stereo waveform bars cleanly
  await page.waitForTimeout(2000);
  await rec.captureUIFrame(rec.elapsed());

  // Toggle Smooth vs Bars waveform silhouette on live audio track
  if (await smoothWaveBtn.isVisible().catch(() => false)) {
    await rec.click(smoothWaveBtn, { moveSec: 0.24, settleSec: 0.32 });
  }
  if (await barsWaveBtn.isVisible().catch(() => false)) {
    await rec.click(barsWaveBtn, { moveSec: 0.22, settleSec: 0.26 });
  }

  const timelineContainer = startTrimHandle.locator(
    "xpath=ancestor::div[contains(@class,'cursor-pointer')][1]"
  );

  await rec.focusElement(timelineContainer, {
    scale: isWide ? 1.12 : 1.0,
    transitionSec: 0.38,
  });

  // Step 3a: Trim start handle to 00:05 (8% across 01:00 timeline)
  const timelineBox = await timelineContainer.boundingBox();
  const startBox = await startTrimHandle.boundingBox();
  if (timelineBox && startBox) {
    const sx = startBox.x + startBox.width / 2;
    const sy = startBox.y + startBox.height / 2;
    await rec.dragSegment(
      { x: sx, y: sy },
      { x: timelineBox.x + timelineBox.width * 0.08, y: sy },
      { durationSec: 0.45, moveSec: 0.22, releaseSettleSec: 0.2 }
    );
  }

  // Step 3b: Carve 3 wide highlight sections + 4 deleted cut gaps across the full 01:00 bar:
  // Kept 1: 00:05 -> 00:13 (0.08..0.22) | Cut gap 1: 00:13 -> 00:21 (0.22..0.35)
  // Kept 2: 00:21 -> 00:30 (0.35..0.50) | Cut gap 2: 00:30 -> 00:39 (0.50..0.65)
  // Kept 3: 00:39 -> 00:47 (0.65..0.78) | Tail cut:  00:47 -> 01:00 (0.78..1.00)
  if (timelineBox) {
    const clickTimeline = async (frac: number) => {
      const tx = timelineBox.x + timelineBox.width * frac;
      const ty = timelineBox.y + timelineBox.height * 0.55;
      await rec.clickPoint(tx, ty, { moveSec: 0.22, settleSec: 0.14 });
    };

    // Split end of Clip 1 (00:13) and start of Clip 2 (00:21) -> delete gap (00:13->00:21)
    await clickTimeline(0.22);
    await rec.click(splitClipBtn, { moveSec: 0.2, settleSec: 0.16 });
    await clickTimeline(0.35);
    await rec.click(splitClipBtn, { moveSec: 0.2, settleSec: 0.16 });
    await clickTimeline(0.285);
    if (await deleteSecBtn.isEnabled().catch(() => false)) {
      await rec.click(deleteSecBtn, { moveSec: 0.2, settleSec: 0.24 });
    }

    // Split end of Clip 2 (00:30) and start of Clip 3 (00:39) -> delete gap (00:30->00:39)
    await clickTimeline(0.50);
    await rec.click(splitClipBtn, { moveSec: 0.2, settleSec: 0.16 });
    await clickTimeline(0.65);
    await rec.click(splitClipBtn, { moveSec: 0.2, settleSec: 0.16 });
    await clickTimeline(0.575);
    if (await deleteSecBtn.isEnabled().catch(() => false)) {
      await rec.click(deleteSecBtn, { moveSec: 0.2, settleSec: 0.24 });
    }

    // Split end of Clip 3 (00:47) -> delete tail (00:47->01:00)
    await clickTimeline(0.78);
    await rec.click(splitClipBtn, { moveSec: 0.2, settleSec: 0.16 });
    await clickTimeline(0.89);
    if (await deleteSecBtn.isEnabled().catch(() => false)) {
      await rec.click(deleteSecBtn, { moveSec: 0.2, settleSec: 0.36 });
    }
  }

  await rec.hold(0.42);

  // 4. Live browser WebCodecs compression — ~12x speed timelapse (ratio 0.08)
  rec.resetCamera(0.35);
  await rec.click(saveCompressBtn, { moveSec: 0.28, settleSec: 0.16 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

  const compareVideoBtn = page.locator('button[aria-label="Compare video"]').first();
  await rec.captureWhileWaiting(compareVideoBtn, {
    maxWaitMs: 180000,
    playbackCompressRatio: 0.08,
  });
  await rec.hold(0.32);

  // 5. CompareModal: Side by Side + Full Timeline (3 highlighted kept bands + live playback) -> Matched Frames + Split Slider
  await rec.click(compareVideoBtn, { moveSec: 0.3, settleSec: 0.38 });

  const sideBySideBtn = page.locator('button[title="Side by side view"]').first();
  const fullTimelineBtn = page
    .locator('button[title*="full source video timeline"]')
    .first();
  const matchedFramesBtn = page
    .locator('button[title*="Lock playback frame-by-frame"]')
    .first();
  const splitViewBtn = page.locator('button[title="Split slider view"]').first();
  const playCompareBtn = page.locator('button[title*="Play (Space)"]').first();
  const pauseCompareBtn = page.locator('button[title*="Pause (Space)"]').first();

  if (await sideBySideBtn.isVisible().catch(() => false)) {
    await rec.click(sideBySideBtn, { moveSec: 0.24, settleSec: 0.42 });
  }

  // Toggle Full Timeline showing all 3 orange kept bands against the full 01:00 bar + brief live playback
  if (await fullTimelineBtn.isVisible().catch(() => false)) {
    await rec.click(fullTimelineBtn, { moveSec: 0.26, settleSec: 0.55 });
  }
  if (await playCompareBtn.isVisible().catch(() => false)) {
    await rec.click(playCompareBtn, { moveSec: 0.24, settleSec: 1.35 });
    if (await pauseCompareBtn.isVisible().catch(() => false)) {
      await rec.click(pauseCompareBtn, { moveSec: 0.22, settleSec: 0.22 });
    }
  }

  // Return to Matched Frames + Split Slider for crisp quality comparison sweep
  if (await matchedFramesBtn.isVisible().catch(() => false)) {
    await rec.click(matchedFramesBtn, { moveSec: 0.26, settleSec: 0.32 });
  }

  await splitViewBtn.waitFor({ state: "visible", timeout: 15000 });
  await rec.click(splitViewBtn, { moveSec: 0.26, settleSec: 0.26 });

  const compareSplit = page.locator("div.cursor-ew-resize").first();
  await compareSplit.waitFor({ state: "visible", timeout: 15000 });
  await rec.sweepHorizontal(compareSplit, 0.5, [0.18, 0.82, 0.45], {
    legSec: 0.44,
    pauseAtStopSec: 0.14,
  });

  await rec.hold(0.35);
}
