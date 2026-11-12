import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoSession } from "../lib/studio-recorder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVER_PNG = path.resolve(__dirname, "../fixtures/images/cover-art.png");
const PHOTO_JPG = path.resolve(__dirname, "../fixtures/images/product-photo.jpg");

/**
 * Crisp ~12s borderless loop specifically crafted for the homepage ProjectCard Bento slot.
 * Zero padding, zero chrome bars — showcases instant WebP compression + before/after slider.
 */
export async function runBentoLoopFlow({ page, cursor, camera }: DemoSession): Promise<void> {
  const fileInput = page.locator('input[type="file"][accept*="image/png"]').first();
  await fileInput.waitFor({ state: "attached", timeout: 20000 });

  const workbenchHeader = page.locator("main").first();
  await workbenchHeader.waitFor({ state: "visible", timeout: 15000 });

  // Scroll right to toolbar/dropzone so loop opens cleanly inside the tool
  const dropzone = page.getByText(/Drop your images here/i).first();
  await cursor.scrollTo(dropzone, 250);
  await cursor.wait(220);

  await cursor.moveTo(dropzone, { durationMs: 360, pauseAfterMs: 120 });
  await fileInput.setInputFiles([COVER_PNG, PHOTO_JPG]);

  const firstCompareBtn = page.locator('button[aria-label^="Compare "]').first();
  await firstCompareBtn.waitFor({ state: "visible", timeout: 20000 });
  await cursor.wait(400);

  const qualitySlider = page.getByLabel("Quality percentage");
  await camera.focusWorkbench(qualitySlider, {
    desktopScale: 1.38,
    compactScale: 1.2,
    transitionSec: 0.6,
    offsetY: 35,
  });
  await cursor.sweepHorizontal(qualitySlider, 0.778, [0.58], {
    legDurationMs: 620,
    pauseAtStopMs: 260,
  });

  await camera.focusWorkbench(firstCompareBtn, {
    desktopScale: 1.4,
    compactScale: 1.2,
    transitionSec: 0.55,
  });
  await cursor.click(firstCompareBtn, { durationMs: 420, settleMs: 360 });

  const splitStage = page.locator("div.cursor-ew-resize").first();
  await splitStage.waitFor({ state: "visible", timeout: 15000 });
  await camera.focusElement(splitStage, {
    scale: 1.24,
    transitionSec: 0.55,
  });

  await cursor.sweepHorizontal(splitStage, 0.5, [0.16, 0.84, 0.45], {
    legDurationMs: 640,
    pauseAtStopMs: 120,
  });

  const darkBackdropBtn = page.getByLabel("dark backdrop");
  if (await darkBackdropBtn.isVisible().catch(() => false)) {
    camera.reset({ transitionSec: 0.5 });
    await cursor.click(darkBackdropBtn, { durationMs: 400, settleMs: 380 });
  } else {
    camera.reset({ transitionSec: 0.5 });
  }

  const closeBtn = page.getByRole("button", { name: "Close" }).first();
  await cursor.click(closeBtn, { durationMs: 380, settleMs: 320 });
  await cursor.wait(350);
}
