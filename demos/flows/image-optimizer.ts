import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneVariant } from "../lib/scene-runner.js";
import type { StageRecorder } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVER_PNG = path.resolve(__dirname, "../fixtures/images/cover-art.png");
const PHOTO_JPG = path.resolve(__dirname, "../fixtures/images/product-photo.jpg");

export async function runImageOptimizerScene(
  rec: StageRecorder,
  variant: SceneVariant
): Promise<void> {
  const page = rec.page;
  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  const dropzoneText = page.getByText(/Drop your images here/i).first();
  const firstCompareBtn = page.locator('button[aria-label^="Compare "]').first();
  const qualitySlider = page.getByLabel("Quality percentage").first();

  await fileInput.waitFor({ state: "attached", timeout: 20000 });

  if (variant === "trailer") {
    // Open directly with optimized queue visible so every second delivers payoff
    await fileInput.setInputFiles([COVER_PNG, PHOTO_JPG]);
    await firstCompareBtn.waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(180);
    await rec.captureUIFrame(0);
    await rec.hold(0.28);
  } else {
    await rec.captureUIFrame(0);
    await rec.moveTo(dropzoneText, { durationSec: 0.34 });
    await fileInput.setInputFiles([COVER_PNG, PHOTO_JPG]);
    await firstCompareBtn.waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(180);
    await rec.captureUIFrame(rec.elapsed());
    await rec.hold(0.35);
  }

  // Quality slider tweak -> deeper -95% compression
  const isWide = rec.viewportWidth >= 900;
  await rec.focusElement(qualitySlider, {
    scale: isWide ? 1.18 : 1.05,
    transitionSec: 0.5,
    offsetX: isWide ? -70 : 0,
    offsetY: 20,
  });

  await rec.sweepHorizontal(qualitySlider, 0.778, [0.56], {
    legSec: 0.58,
    pauseAtStopSec: 0.16,
  });

  // Open visual split comparison modal
  await rec.click(firstCompareBtn, { moveSec: 0.38, settleSec: 0.34 });

  const splitStage = page.locator("div.cursor-ew-resize").first();
  await splitStage.waitFor({ state: "visible", timeout: 15000 });
  rec.focusPoint(0.5, 0.5, {
    scale: isWide ? 1.08 : 1.0,
    transitionSec: 0.45,
  });
  await rec.hold(0.2);

  await rec.sweepHorizontal(splitStage, 0.5, [0.15, 0.85, 0.44], {
    legSec: variant === "trailer" ? 0.46 : 0.56,
    pauseAtStopSec: 0.1,
  });

  if (variant === "spotlight") {
    const darkBackdropBtn = page.getByLabel("dark backdrop");
    if (await darkBackdropBtn.isVisible().catch(() => false)) {
      rec.resetCamera(0.4);
      await rec.click(darkBackdropBtn, { moveSec: 0.36, settleSec: 0.38 });
    }
    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    await rec.click(closeBtn, { moveSec: 0.34, settleSec: 0.3 });
    await rec.hold(0.3);
  } else {
    await rec.hold(0.25);
  }
}
