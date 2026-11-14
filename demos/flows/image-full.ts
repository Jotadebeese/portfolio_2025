import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneVariant } from "../lib/scene-runner.js";
import type { StageRecorder } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GTAVI_MARINA_PNG = path.resolve(__dirname, "../fixtures/images/gtavi-marina.png");
const GTAVI_HEIST_PNG = path.resolve(__dirname, "../fixtures/images/gtavi-heist.png");

/**
 * Full-feature X & Reddit walkthrough for Forthweb Image Optimizer:
 * Batch upload -> WebP/JPEG format toggle -> Resize preset (1280px) -> Quality slider ->
 * CompareModal (Split Slider drag + Checker/Dark/Light backdrops + Side by Side) -> Select All ZIP cue.
 */
export async function runImageFullScene(
  rec: StageRecorder,
  _variant: SceneVariant
): Promise<void> {
  const page = rec.page;
  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  const dropzoneText = page.getByText(/Drop your images here/i).first();
  const firstCompareBtn = page.locator('button[aria-label^="Compare "]').first();
  const qualitySlider = page.getByLabel("Quality percentage").first();

  await fileInput.waitFor({ state: "attached", timeout: 20000 });
  await rec.captureUIFrame(0);
  await rec.moveTo(dropzoneText, { durationSec: 0.3 });

  // 1. Batch drop official GTA VI in-game 4K screenshots (PNG)
  await fileInput.setInputFiles([GTAVI_MARINA_PNG, GTAVI_HEIST_PNG]);
  await firstCompareBtn.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(200);
  await rec.captureUIFrame(rec.elapsed());
  await rec.hold(0.3);

  // 2. Output Format (JPEG -> WebP) + Resize Preset (1280px) + Quality slider
  const isWide = rec.viewportWidth >= 900;
  const card = page.locator("article#image-optimizer");
  const jpegBtn = card.getByRole("button", { name: "JPEG", exact: true });
  const webpBtn = card.getByRole("button", { name: "WebP", exact: true });
  const size1280Btn = card.getByRole("button", { name: "1280px", exact: true });

  rec.focusPoint(0.45, 0.34, {
    scale: isWide ? 1.12 : 1.03,
    transitionSec: 0.45,
  });

  await rec.click(jpegBtn, { moveSec: 0.34, settleSec: 0.35 });
  await rec.click(webpBtn, { moveSec: 0.26, settleSec: 0.3 });
  await rec.click(size1280Btn, { moveSec: 0.34, settleSec: 0.35 });

  await rec.sweepHorizontal(qualitySlider, 0.778, [0.56], {
    legSec: 0.56,
    pauseAtStopSec: 0.22,
  });

  // 3. Visual Inspection Modal: Split Slider -> Dark / Light backdrops -> Side by Side
  rec.resetCamera(0.4);
  await page.waitForTimeout(250);
  await rec.click(firstCompareBtn, { moveSec: 0.38, settleSec: 0.35 });

  const splitStage = page.locator("div.cursor-ew-resize").first();
  await splitStage.waitFor({ state: "visible", timeout: 15000 });
  rec.focusPoint(0.5, 0.5, {
    scale: isWide ? 1.06 : 1.0,
    transitionSec: 0.4,
  });
  await rec.sweepHorizontal(splitStage, 0.5, [0.16, 0.84, 0.44], {
    legSec: 0.52,
    pauseAtStopSec: 0.12,
  });

  rec.resetCamera(0.35);
  const darkBtn = page.getByLabel("dark backdrop");
  const lightBtn = page.getByLabel("light backdrop");
  const sideBySideBtn = page.locator('button[title="Side by side comparison"]').first();
  const closeModalBtn = page.locator('button[aria-label="Close comparison modal"]').first();

  if (await darkBtn.isVisible().catch(() => false)) {
    await rec.click(darkBtn, { moveSec: 0.32, settleSec: 0.42 });
  }
  if (await lightBtn.isVisible().catch(() => false)) {
    await rec.click(lightBtn, { moveSec: 0.28, settleSec: 0.42 });
  }
  if (await sideBySideBtn.isVisible().catch(() => false)) {
    await rec.click(sideBySideBtn, { moveSec: 0.32, settleSec: 0.52 });
  }

  await rec.click(closeModalBtn, { moveSec: 0.34, settleSec: 0.28 });

  // 4. Select All queue cue -> reveals batch ZIP Download button
  const selectAllBtn = page.locator('button[title="Select all"]').first();
  if (await selectAllBtn.isVisible().catch(() => false)) {
    await rec.click(selectAllBtn, { moveSec: 0.34, settleSec: 0.38 });
  } else {
    await rec.hold(0.35);
  }
}
