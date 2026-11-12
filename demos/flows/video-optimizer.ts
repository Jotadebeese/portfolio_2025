import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoSession } from "../lib/studio-recorder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_MP4 = path.resolve(__dirname, "../fixtures/videos/studio-clip.mp4");

export async function runVideoOptimizerFlow({ page, cursor, camera }: DemoSession): Promise<void> {
  const fileInput = page.locator('input[type="file"][accept*="video/mp4"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 20000 });

  const dropzonePrompt = page.getByText(/Drop your videos here/i).first();
  await cursor.scrollTo(dropzonePrompt, 400);
  await cursor.moveTo(dropzonePrompt, { durationMs: 420, pauseAfterMs: 180 });
  await fileInput.setInputFiles([STUDIO_MP4]);

  // Wait for video metadata + thumbnail + Edit button
  const editClipBtn = page.locator('button[aria-label="Edit clip"]').first();
  await editClipBtn.waitFor({ state: "visible", timeout: 25000 });
  await cursor.wait(450);

  // 1. Zoom towards row & open Studio Trim/Waveform Modal
  await cursor.scrollTo(editClipBtn, 420);
  await camera.focusWorkbench(editClipBtn, {
    desktopScale: 1.44,
    compactScale: 1.18,
    transitionSec: 0.6,
  });
  await cursor.click(editClipBtn, { durationMs: 460, settleMs: 450 });

  // 2. Inside EditModal: wait for timeline & waveform canvas
  const startTrimHandle = page.locator('[title="Drag to trim start"]').first();
  const endTrimHandle = page.locator('[title="Drag to trim end"]').first();
  const saveCompressBtn = page.locator('button:has-text("Save & Compress")').first();
  await startTrimHandle.waitFor({ state: "visible", timeout: 15000 });
  await cursor.wait(650);

  // Zoom onto waveform timeline & trim handles on wide viewports; keep full width on 4:5 modals
  const timelineContainer = startTrimHandle.locator("xpath=ancestor::div[contains(@class,'cursor-pointer')][1]");
  await camera.focusModal(timelineContainer, {
    desktopScale: 1.32,
    transitionSec: 0.65,
  });

  // Drag trim start handle right by ~16% of timeline width
  const timelineBox = await timelineContainer.boundingBox();
  const startBox = await startTrimHandle.boundingBox();
  const endBox = await endTrimHandle.boundingBox();

  if (timelineBox && startBox) {
    const sx = startBox.x + startBox.width / 2;
    const sy = startBox.y + startBox.height / 2;
    await cursor.drag(
      { x: sx, y: sy },
      { x: sx + timelineBox.width * 0.16, y: sy },
      { durationMs: 650, settleMs: 220 }
    );
  }

  // Drag trim end handle left by ~20% of timeline width
  if (timelineBox && endBox) {
    const ex = endBox.x + endBox.width / 2;
    const ey = endBox.y + endBox.height / 2;
    await cursor.drag(
      { x: ex, y: ey },
      { x: ex - timelineBox.width * 0.2, y: ey },
      { durationMs: 650, settleMs: 280 }
    );
  }

  // Pull back cleanly to click "Save & Compress Now"
  camera.reset({ transitionSec: 0.55 });
  await cursor.click(saveCompressBtn, { durationMs: 480, settleMs: 350 });

  // 3. Watch live hardware WebCodecs compression finish -> Compare button appears
  const compareVideoBtn = page.locator('button[aria-label="Compare video"]').first();
  await cursor.scrollTo(editClipBtn, 380);
  await camera.focusWorkbench(editClipBtn, {
    desktopScale: 1.42,
    compactScale: 1.16,
    transitionSec: 0.65,
  });

  await compareVideoBtn.waitFor({ state: "visible", timeout: 45000 });
  await cursor.wait(550);

  // 4. Open Video CompareModal -> switch to Split Slider view & sweep -> close
  await cursor.click(compareVideoBtn, { durationMs: 440, settleMs: 450 });
  camera.reset({ transitionSec: 0.55 });

  const splitViewBtn = page.locator('button[title="Split slider view"]').first();
  await splitViewBtn.waitFor({ state: "visible", timeout: 15000 });
  await cursor.click(splitViewBtn, { durationMs: 440, settleMs: 360 });

  const compareSplit = page.locator("div.cursor-ew-resize").first();
  await compareSplit.waitFor({ state: "visible", timeout: 15000 });

  await cursor.sweepHorizontal(compareSplit, 0.5, [0.22, 0.78, 0.45], {
    legDurationMs: 620,
    pauseAtStopMs: 140,
  });

  const closeModalBtn = page.locator('button[aria-label="Close modal"]').first();
  await cursor.click(closeModalBtn, { durationMs: 420, settleMs: 320 });
  await cursor.wait(500);
}
