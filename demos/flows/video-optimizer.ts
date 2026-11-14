import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneVariant } from "../lib/scene-runner.js";
import type { StageRecorder } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_MP4 = path.resolve(__dirname, "../fixtures/videos/studio-clip.mp4");

export async function runVideoOptimizerScene(
  rec: StageRecorder,
  variant: SceneVariant
): Promise<void> {
  const page = rec.page;
  const fileInput = page.locator('input[type="file"][accept*="video/mp4"]').first();
  const dropzonePrompt = page.getByText(/Drop your videos here/i).first();
  const editClipBtn = page.locator('button[aria-label="Edit clip"]').first();

  await fileInput.waitFor({ state: "attached", timeout: 20000 });

  if (variant === "spotlight") {
    await rec.captureUIFrame(0);
    await rec.moveTo(dropzonePrompt, { durationSec: 0.32 });
  }

  await fileInput.setInputFiles([STUDIO_MP4]);
  await editClipBtn.waitFor({ state: "visible", timeout: 25000 });
  await page.waitForTimeout(200);

  if (variant === "trailer") {
    // Open Trim Studio immediately after clip mounts
    await rec.captureUIFrame(0);
    await rec.hold(0.2);
  } else {
    await rec.captureUIFrame(rec.elapsed());
    await rec.hold(0.3);
  }

  const isWide = rec.viewportWidth >= 900;
  await rec.focusElement(editClipBtn, {
    scale: isWide ? 1.16 : 1.04,
    transitionSec: 0.48,
    offsetX: isWide ? -100 : 0,
  });
  await rec.click(editClipBtn, { moveSec: 0.36, settleSec: 0.35 });

  // Inside Trim/Waveform Studio modal
  const startTrimHandle = page.locator('[title="Drag to trim start"]').first();
  const endTrimHandle = page.locator('[title="Drag to trim end"]').first();
  const saveCompressBtn = page.locator('button:has-text("Save & Compress")').first();
  await startTrimHandle.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(350);
  await rec.captureUIFrame(rec.elapsed());

  const timelineContainer = startTrimHandle.locator(
    "xpath=ancestor::div[contains(@class,'cursor-pointer')][1]"
  );

  // Zoom softly onto waveform track on desktop; keep full modal unclipped on 4x5
  await rec.focusElement(timelineContainer, {
    scale: isWide ? 1.15 : 1.0,
    transitionSec: 0.48,
  });

  const timelineBox = await timelineContainer.boundingBox();
  const startBox = await startTrimHandle.boundingBox();
  const endBox = await endTrimHandle.boundingBox();

  if (timelineBox && startBox) {
    const sx = startBox.x + startBox.width / 2;
    const sy = startBox.y + startBox.height / 2;
    await rec.dragSegment(
      { x: sx, y: sy },
      { x: sx + timelineBox.width * 0.16, y: sy },
      { durationSec: 0.48, moveSec: 0.28, releaseSettleSec: 0.14 }
    );
  }

  if (timelineBox && endBox && variant === "spotlight") {
    const ex = endBox.x + endBox.width / 2;
    const ey = endBox.y + endBox.height / 2;
    await rec.dragSegment(
      { x: ex, y: ey },
      { x: ex - timelineBox.width * 0.2, y: ey },
      { durationSec: 0.48, moveSec: 0.28, releaseSettleSec: 0.16 }
    );
  }

  rec.resetCamera(0.45);
  await rec.click(saveCompressBtn, { moveSec: 0.38, settleSec: 0.2 });

  // Reset scroll to top so toolbar + encoding queue stay cleanly unclipped inside frame
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

  // Live hardware WebCodecs encoding progress -> finished savings badge
  const compareVideoBtn = page.locator('button[aria-label="Compare video"]').first();
  await rec.captureWhileWaiting(compareVideoBtn, {
    maxWaitMs: 45000,
    playbackCompressRatio: variant === "trailer" ? 0.55 : 0.75,
  });
  await rec.hold(0.28);

  // Open Video CompareModal & switch to Split Slider view
  rec.resetCamera(0.35);
  await rec.click(compareVideoBtn, { moveSec: 0.36, settleSec: 0.34 });
  const splitViewBtn = page.locator('button[title="Split slider view"]').first();
  await splitViewBtn.waitFor({ state: "visible", timeout: 15000 });
  await rec.click(splitViewBtn, { moveSec: 0.34, settleSec: 0.26 });

  const compareSplit = page.locator("div.cursor-ew-resize").first();
  await compareSplit.waitFor({ state: "visible", timeout: 15000 });
  await rec.sweepHorizontal(
    compareSplit,
    0.5,
    variant === "trailer" ? [0.22, 0.76] : [0.2, 0.8, 0.45],
    { legSec: 0.48, pauseAtStopSec: 0.1 }
  );

  if (variant === "spotlight") {
    const closeModalBtn = page.locator('button[aria-label="Close modal"]').first();
    await rec.click(closeModalBtn, { moveSec: 0.34, settleSec: 0.28 });
    await rec.hold(0.35);
  } else {
    await rec.moveToPoint(rec.viewportWidth * 0.5, rec.viewportHeight * 0.48, {
      durationSec: 0.32,
    });
    await rec.hold(0.25);
  }
}
