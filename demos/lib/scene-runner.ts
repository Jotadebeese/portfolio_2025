import type { Browser, BrowserContext, CDPSession } from "playwright";
import type { OutputLayout } from "./compositor-html.js";
import { isolateToolCard } from "./dom-isolator.js";
import { StageRecorder, type RecordedScene } from "./stage-capture.js";

export type SceneVariant = "spotlight" | "trailer";

export interface CaptureToolOptions {
  browser: Browser;
  baseUrl: string;
  toolId: "secret-generator" | "image-optimizer" | "video-optimizer";
  pillLabel: string;
  layout: OutputLayout;
  variant?: SceneVariant;
}

/**
 * Opens an isolated tool card inside a clean studio viewport with fonts loaded,
 * runs the scripted flow with StageRecorder, and returns a compositor-ready RecordedScene.
 */
export async function captureToolScene(
  opts: CaptureToolOptions,
  script: (rec: StageRecorder, variant: SceneVariant) => Promise<void>
): Promise<RecordedScene> {
  const { browser, baseUrl, toolId, pillLabel, layout } = opts;
  const variant = opts.variant ?? "spotlight";

  let context: BrowserContext | null = null;
  let cdp: CDPSession | null = null;

  try {
    context = await browser.newContext({
      viewport: { width: layout.captureWidth, height: layout.captureHeight },
      deviceScaleFactor: 2,
      colorScheme: "light",
    });

    const page = await context.newPage();
    cdp = await context.newCDPSession(page);

    const url = `${baseUrl}/projects/forthweb?tools=${encodeURIComponent(toolId)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("load").catch(() => {});

    // Wait for tool card mount and web fonts before isolating
    const cardLocator = page.locator(`article#${toolId}`);
    await cardLocator.waitFor({ state: "visible", timeout: 25000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(260);

    await isolateToolCard(page, toolId, {
      padPx: layout.captureWidth >= 900 ? 18 : 16,
      bgHex: "#f3f1ed",
    });

    const rec = new StageRecorder(
      page,
      cdp,
      layout.captureWidth,
      layout.captureHeight,
      2
    );

    await script(rec, variant);
    return rec.finalize(`${toolId}-${variant}`, pillLabel);
  } finally {
    await cdp?.detach().catch(() => {});
    await context?.close().catch(() => {});
  }
}
