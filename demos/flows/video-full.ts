import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneVariant } from "../lib/scene-runner.js";
import type { StageRecorder } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_MP4 = path.resolve(__dirname, "../fixtures/videos/studio-clip.mp4");

/**
 * Full-feature X & Reddit walkthrough for Forthweb Video Optimizer:
 * Drop clip -> Codec/Resolution/Tuning mode controls (WebM->MP4, 720p, Fit to Size->Quality, Mute) ->
 * Edit Studio (Smooth/Bars waveform toggle, Split x2 + Delete mid-section cut, Trim drag) ->
 * Hardware WebCodecs encode 0->100% -> CompareModal (Side by Side -> Split Slider).
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

  // 1. Add video to queue
  await fileInput.setInputFiles([STUDIO_MP4]);
  await editClipBtn.waitFor({ state: "visible", timeout: 25000 });
  await page.waitForTimeout(200);
  await rec.captureUIFrame(rec.elapsed());
  await rec.hold(0.25);

  // 2. Showcase Format, Resolution, Tuning Mode, and Mute controls
  const isWide = rec.viewportWidth >= 900;
  const card = page.locator("article#video-optimizer");
  const webmBtn = card.getByRole("button", { name: /WebM/i }).first();
  const mp4Btn = card.getByRole("button", { name: /MP4/i }).first();
  const res720Btn = card.getByRole("button", { name: "720p", exact: true }).first();
  const fitSizeBtn = card.getByRole("button", { name: "Fit to Size (MB)", exact: true }).first();
  const qualityModeBtn = card.getByRole("button", { name: "Quality (%)", exact: true }).first();

  rec.focusPoint(0.5, 0.36, {
    scale: isWide ? 1.1 : 1.02,
    transitionSec: 0.42,
  });

  await rec.click(webmBtn, { moveSec: 0.3, settleSec: 0.28 });
  await rec.click(mp4Btn, { moveSec: 0.25, settleSec: 0.24 });
  await rec.click(res720Btn, { moveSec: 0.3, settleSec: 0.28 });
  await rec.click(fitSizeBtn, { moveSec: 0.34, settleSec: 0.42 });
  await rec.click(qualityModeBtn, { moveSec: 0.28, settleSec: 0.24 });

  // 3. Open Edit Studio (Waveform + Multi-Cut Split + Delete)
  rec.resetCamera(0.35);
  await rec.click(editClipBtn, { moveSec: 0.38, settleSec: 0.38 });

  const startTrimHandle = page.locator('[title="Drag to trim start"]').first();
  const smoothWaveBtn = page.locator('button[title*="smooth fluid waveform"]').first();
  const barsWaveBtn = page.locator('button[title*="detailed vertical audio bars"]').first();
  const splitClipBtn = page.locator('button[title*="Split clip at current playhead"]').first();
  const deleteSecBtn = page.locator('button[title*="Cut / delete selected section"]').first();
  const saveCompressBtn = page.locator('button:has-text("Save & Compress")').first();

  await startTrimHandle.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(380);
  await rec.captureUIFrame(rec.elapsed());

  // Toggle Smooth vs Bars waveform silhouette
  if (await smoothWaveBtn.isVisible().catch(() => false)) {
    await rec.click(smoothWaveBtn, { moveSec: 0.3, settleSec: 0.34 });
  }
  if (await barsWaveBtn.isVisible().catch(() => false)) {
    await rec.click(barsWaveBtn, { moveSec: 0.24, settleSec: 0.28 });
  }

  const timelineContainer = startTrimHandle.locator(
    "xpath=ancestor::div[contains(@class,'cursor-pointer')][1]"
  );

  // Subtle focus on waveform & multi-cut controls
  await rec.focusElement(timelineContainer, {
    scale: isWide ? 1.14 : 1.0,
    transitionSec: 0.45,
  });

  // Step 3a: Drag outer start handle to trim intro while full section is active
  const timelineBox = await timelineContainer.boundingBox();
  const startBox = await startTrimHandle.boundingBox();
  if (timelineBox && startBox) {
    const sx = startBox.x + startBox.width / 2;
    const sy = startBox.y + startBox.height / 2;
    await rec.dragSegment(
      { x: sx, y: sy },
      { x: sx + timelineBox.width * 0.12, y: sy },
      { durationSec: 0.42, moveSec: 0.26, releaseSettleSec: 0.16 }
    );
  }

  // Step 3b: Split clip at ~42% and ~70%, then delete the middle cut section
  if (timelineBox) {
    const clickTimeline = async (frac: number) => {
      const tx = timelineBox.x + timelineBox.width * frac;
      const ty = timelineBox.y + timelineBox.height * 0.55;
      await rec.clickPoint(tx, ty, { moveSec: 0.26, settleSec: 0.14 });
    };

    await clickTimeline(0.42);
    await rec.click(splitClipBtn, { moveSec: 0.28, settleSec: 0.24 });

    await clickTimeline(0.7);
    await rec.click(splitClipBtn, { moveSec: 0.28, settleSec: 0.24 });

    await clickTimeline(0.56);
    if (await deleteSecBtn.isEnabled().catch(() => false)) {
      await rec.click(deleteSecBtn, { moveSec: 0.28, settleSec: 0.4 });
    }
  }

  // 4. Encode live in browser with WebCodecs
  rec.resetCamera(0.4);
  await rec.click(saveCompressBtn, { moveSec: 0.36, settleSec: 0.2 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

  const compareVideoBtn = page.locator('button[aria-label="Compare video"]').first();
  await rec.captureWhileWaiting(compareVideoBtn, {
    maxWaitMs: 45000,
    playbackCompressRatio: 0.72,
  });
  await rec.hold(0.3);

  // 5. CompareModal: Side by Side -> Split Slider sweep
  await rec.click(compareVideoBtn, { moveSec: 0.36, settleSec: 0.38 });

  const sideBySideBtn = page.locator('button[title="Side by side view"]').first();
  const splitViewBtn = page.locator('button[title="Split slider view"]').first();

  if (await sideBySideBtn.isVisible().catch(() => false)) {
    await rec.click(sideBySideBtn, { moveSec: 0.3, settleSec: 0.5 });
  }
  await splitViewBtn.waitFor({ state: "visible", timeout: 15000 });
  await rec.click(splitViewBtn, { moveSec: 0.3, settleSec: 0.28 });

  const compareSplit = page.locator("div.cursor-ew-resize").first();
  await compareSplit.waitFor({ state: "visible", timeout: 15000 });
  await rec.sweepHorizontal(compareSplit, 0.5, [0.18, 0.82, 0.45], {
    legSec: 0.5,
    pauseAtStopSec: 0.14,
  });

  await rec.hold(0.32);
}
