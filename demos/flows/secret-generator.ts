import type { DemoSession } from "../lib/studio-recorder.js";

export async function runSecretGeneratorFlow({ page, cursor, camera }: DemoSession): Promise<void> {
  const regenerateAll = page.getByRole("button", { name: "Regenerate All" });
  await regenerateAll.waitFor({ state: "visible", timeout: 20000 });

  const copyUuidBtn = page.getByRole("button", { name: /Copy UUID v7/i });
  const copyApiKeyBtn = page.getByRole("button", { name: /Copy API Secret Key/i });
  const lengthSlider = page.locator('input[type="range"][min="12"][max="48"]');
  const symbolsToggle = page.getByRole("checkbox");
  const regeneratePwdBtn = page.locator('button[title="Regenerate password"]');
  const copyPwdBtn = regeneratePwdBtn.locator("xpath=following-sibling::button[1]");

  // Frame workbench neatly in viewport
  await cursor.scrollTo(regenerateAll, 450);
  await cursor.wait(450);

  // 1. Wide overview click on Regenerate All
  await cursor.click(regenerateAll, { durationMs: 520, settleMs: 360 });
  await cursor.click(regenerateAll, { durationMs: 220, settleMs: 380 });

  // 2. Smooth zoom onto key rows & copy UUID v7 + API Key
  await camera.focusWorkbench(copyApiKeyBtn, {
    desktopScale: 1.42,
    compactScale: 1.15,
    transitionSec: 0.65,
    offsetY: -10,
  });
  await cursor.click(copyApiKeyBtn, { durationMs: 460, settleMs: 350 });
  await cursor.click(copyUuidBtn, { durationMs: 440, settleMs: 420 });

  // 3. Pan/scroll gently to Password Generator, adjust length & symbols, copy password
  await cursor.scrollTo(lengthSlider, 550);
  await camera.focusWorkbench(lengthSlider, {
    desktopScale: 1.42,
    compactScale: 1.18,
    transitionSec: 0.65,
    offsetY: 15,
  });

  // Initial value is 20 in [12..48] => fraction ~0.222
  await cursor.sweepHorizontal(lengthSlider, 0.225, [0.76], {
    legDurationMs: 780,
    pauseAtStopMs: 240,
  });

  await cursor.click(symbolsToggle, { durationMs: 420, settleMs: 340 });
  await cursor.click(symbolsToggle, { durationMs: 260, settleMs: 320 });
  await cursor.click(copyPwdBtn, { durationMs: 420, settleMs: 450 });

  // 4. Smoothly pull back to full view
  camera.reset({ transitionSec: 0.65 });
  await cursor.wait(700);
}
