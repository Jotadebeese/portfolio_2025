import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StageRecorder } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVER_PNG = path.resolve(__dirname, "../fixtures/images/cover-art.png");
const PHOTO_JPG = path.resolve(__dirname, "../fixtures/images/product-photo.jpg");

/**
 * Tight borderless loop for the homepage ProjectCard Bento slot (1200x750):
 * starts cleanly in-action on Image Optimizer, shows -95% crunch + interactive Split Compare.
 */
export async function runBentoLoopScene(rec: StageRecorder): Promise<void> {
  const page = rec.page;
  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  const firstCompareBtn = page.locator('button[aria-label^="Compare "]').first();
  const qualitySlider = page.getByLabel("Quality percentage").first();

  await fileInput.waitFor({ state: "attached", timeout: 20000 });
  await rec.captureUIFrame(0);
  await rec.hold(0.25);

  await fileInput.setInputFiles([COVER_PNG, PHOTO_JPG]);
  await firstCompareBtn.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(180);
  await rec.captureUIFrame(rec.elapsed());
  await rec.hold(0.35);

  await rec.focusElement(qualitySlider, {
    scale: 1.24,
    transitionSec: 0.5,
    offsetX: -60,
    offsetY: 30,
  });
  await rec.sweepHorizontal(qualitySlider, 0.778, [0.56], {
    legSec: 0.58,
    pauseAtStopSec: 0.18,
  });

  await rec.click(firstCompareBtn, { moveSec: 0.36, settleSec: 0.32 });
  const splitStage = page.locator("div.cursor-ew-resize").first();
  await splitStage.waitFor({ state: "visible", timeout: 15000 });

  rec.focusPoint(0.5, 0.5, { scale: 1.12, transitionSec: 0.45 });
  await rec.sweepHorizontal(splitStage, 0.5, [0.16, 0.84, 0.46], {
    legSec: 0.54,
    pauseAtStopSec: 0.1,
  });

  const darkBackdropBtn = page.getByLabel("dark backdrop");
  if (await darkBackdropBtn.isVisible().catch(() => false)) {
    rec.resetCamera(0.4);
    await rec.click(darkBackdropBtn, { moveSec: 0.34, settleSec: 0.34 });
  } else {
    rec.resetCamera(0.4);
  }

  const closeBtn = page.getByRole("button", { name: "Close" }).first();
  await rec.click(closeBtn, { moveSec: 0.34, settleSec: 0.32 });
  await rec.hold(0.35);
}
