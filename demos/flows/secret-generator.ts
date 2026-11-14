import type { SceneVariant } from "../lib/scene-runner.js";
import type { StageRecorder } from "../lib/stage-capture.js";

export async function runSecretGeneratorScene(
  rec: StageRecorder,
  variant: SceneVariant
): Promise<void> {
  const page = rec.page;
  const regenerateAll = page.getByRole("button", { name: "Regenerate All" });
  const copyUuidBtn = page.getByRole("button", { name: /Copy UUID v7/i });
  const copyApiKeyBtn = page.getByRole("button", { name: /Copy API Secret Key/i });
  const lengthSlider = page.locator('input[type="range"][min="12"][max="48"]');
  const regeneratePwdBtn = page.locator('button[title="Regenerate password"]');
  const copyPwdBtn = regeneratePwdBtn.locator("xpath=following-sibling::button[1]");

  await regenerateAll.waitFor({ state: "visible", timeout: 20000 });
  await rec.captureUIFrame(0);
  await rec.hold(variant === "trailer" ? 0.2 : 0.35);

  // Instant cryptographic regeneration scramble
  await rec.click(regenerateAll, { moveSec: 0.36, settleSec: 0.25 });

  // Focus gently onto UUID v7 + 256-bit API Secret Key rows keeping card borders & copy icons unclipped
  const isWide = rec.viewportWidth >= 900;
  rec.focusPoint(0.5, 0.44, {
    scale: isWide ? 1.12 : 1.04,
    transitionSec: 0.5,
  });

  await rec.click(copyApiKeyBtn, { moveSec: 0.38, settleSec: 0.2 });
  await rec.click(copyUuidBtn, { moveSec: 0.32, settleSec: 0.28 });

  if (variant === "spotlight") {
    // Showcase interactive password entropy slider & copy
    await rec.focusElement(lengthSlider, {
      scale: isWide ? 1.38 : 1.12,
      transitionSec: 0.5,
      offsetX: isWide ? -80 : 0,
      offsetY: 10,
    });
    await rec.sweepHorizontal(lengthSlider, 0.225, [0.76], {
      legSec: 0.65,
      pauseAtStopSec: 0.14,
    });
    await rec.click(copyPwdBtn, { moveSec: 0.32, settleSec: 0.25 });
    rec.resetCamera(0.5);
    await rec.hold(0.45);
  } else {
    rec.resetCamera(0.45);
    await rec.hold(0.3);
  }
}
