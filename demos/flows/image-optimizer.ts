import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoSession } from "../lib/studio-recorder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVER_PNG = path.resolve(__dirname, "../fixtures/images/cover-art.png");
const PHOTO_JPG = path.resolve(__dirname, "../fixtures/images/product-photo.jpg");

export async function runImageOptimizerFlow({ page, cursor, camera }: DemoSession): Promise<void> {
  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 20000 });

  const dropzoneText = page.getByText(/Drop your images here/i).first();
  await cursor.scrollTo(dropzoneText, 400);

  // Move pointer onto dropzone then supply local PNG + JPG assets
  await cursor.moveTo(dropzoneText, { durationMs: 420, pauseAfterMs: 180 });
  await fileInput.setInputFiles([COVER_PNG, PHOTO_JPG]);

  // Wait for first image to finish WebP optimization and expose Compare button
  const firstCompareBtn = page.locator('button[aria-label^="Compare "]').first();
  await firstCompareBtn.waitFor({ state: "visible", timeout: 20000 });
  await cursor.wait(500);

  // 1. Zoom onto Toolbar & sweep quality slider (default 80 in [10..100] -> ~0.778)
  const qualitySlider = page.getByLabel("Quality percentage");
  await cursor.scrollTo(qualitySlider, 450);
  await camera.focusWorkbench(qualitySlider, {
    desktopScale: 1.42,
    compactScale: 1.18,
    transitionSec: 0.65,
    offsetY: 25,
  });

  await cursor.sweepHorizontal(qualitySlider, 0.778, [0.56], {
    legDurationMs: 750,
    pauseAtStopMs: 380,
  });

  // 2. Focus on optimized row + savings percentage, then click Compare
  await camera.focusWorkbench(firstCompareBtn, {
    desktopScale: 1.44,
    compactScale: 1.18,
    transitionSec: 0.6,
  });
  await cursor.click(firstCompareBtn, { durationMs: 460, settleMs: 420 });

  // 3. Inside CompareModal: zoom cleanly onto split image comparison stage on wide screens
  const splitStage = page.locator("div.cursor-ew-resize").first();
  await splitStage.waitFor({ state: "visible", timeout: 15000 });
  await camera.focusModal(splitStage, {
    desktopScale: 1.24,
    transitionSec: 0.65,
  });
  await cursor.wait(320);

  // Sweep interactive before/after divider left -> right -> crisp center-left
  await cursor.sweepHorizontal(splitStage, 0.5, [0.15, 0.85, 0.42], {
    legDurationMs: 680,
    pauseAtStopMs: 180,
  });

  // Switch canvas backdrop to dark #181411 to highlight transparent / crisp edges
  const darkBackdropBtn = page.getByLabel("dark backdrop");
  if (await darkBackdropBtn.isVisible().catch(() => false)) {
    camera.reset({ transitionSec: 0.5 });
    await cursor.click(darkBackdropBtn, { durationMs: 460, settleMs: 480 });
  } else {
    camera.reset({ transitionSec: 0.5 });
  }

  // Close modal cleanly
  const closeBtn = page.getByRole("button", { name: "Close" }).first();
  await cursor.click(closeBtn, { durationMs: 440, settleMs: 360 });
  await cursor.wait(500);
}
