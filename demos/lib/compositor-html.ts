import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "playwright";

export type OutputFormat = "16x9" | "4x5" | "bento";

export interface OutputLayout {
  format: OutputFormat;
  outWidth: number;
  outHeight: number;
  captureWidth: number;
  captureHeight: number;
  win: null | {
    x: number;
    y: number;
    w: number;
    h: number;
    titlebarH: number;
    radius: number;
  };
}

export const OUTPUT_LAYOUTS: Record<OutputFormat, OutputLayout> = {
  "16x9": {
    format: "16x9",
    outWidth: 1920,
    outHeight: 1080,
    // 1040 / 650 = 1.600 matches win 1520 / 950; total window 988px vertically centered at y=46
    captureWidth: 1040,
    captureHeight: 650,
    win: {
      x: 200,
      y: 46,
      w: 1520,
      h: 950,
      titlebarH: 38,
      radius: 14,
    },
  },
  "4x5": {
    format: "4x5",
    outWidth: 1080,
    outHeight: 1350,
    // 720 / 840 = 0.8571 matches win 972 / 1134; total window 1172px vertically centered at y=89
    captureWidth: 720,
    captureHeight: 840,
    win: {
      x: 54,
      y: 89,
      w: 972,
      h: 1134,
      titlebarH: 38,
      radius: 14,
    },
  },
  bento: {
    format: "bento",
    outWidth: 1200,
    outHeight: 750,
    captureWidth: 1040,
    captureHeight: 650,
    win: null,
  },
};

export interface StudioPlates {
  backdropPng?: Buffer;
  chromePng?: Buffer;
  introPng?: Buffer;
  outroPng?: Buffer;
  pillPngs: Map<string, { png: Buffer; width: number; height: number }>;
}

const GOOGLE_FONTS_TAG = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Roboto:wght@200;300;400;500&display=swap" rel="stylesheet">`;

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export interface StudioPlateOptions {
  layout: OutputLayout;
  eyebrow: string;
  headline: string;
  subline: string;
  barTitle: string;
  pills: Array<{ id: string; text: string }>;
}

export async function renderStudioPlates(
  browser: Browser,
  opts: StudioPlateOptions,
  tempDir?: string
): Promise<StudioPlates> {
  if (tempDir) {
    await mkdir(path.join(tempDir, "plates"), { recursive: true });
  }

  const plates: StudioPlates = {
    pillPngs: new Map(),
  };

  if (!opts.layout.win) {
    return plates;
  }

  const { outWidth, outHeight, win } = opts.layout;
  const totalWinH = win.titlebarH + win.h;

  const ctx = await browser.newContext({
    viewport: { width: outWidth, height: outHeight },
    deviceScaleFactor: 1,
  });

  try {
    const page = await ctx.newPage();

    // 1. Light-mode architectural studio backdrop matching jotadebeese.com (#eeeeee canvas, #cecece grid, #ff9900 accent)
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${outWidth}px;
              height: ${outHeight}px;
              overflow: hidden;
              position: relative;
              background-color: #eeeeee;
              background-image:
                radial-gradient(64% 52% at 50% 42%, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 74%),
                radial-gradient(48% 40% at 86% 8%, rgba(255, 153, 0, 0.08) 0%, rgba(255, 153, 0, 0) 70%),
                radial-gradient(48% 40% at 12% 94%, rgba(230, 217, 209, 0.55) 0%, rgba(230, 217, 209, 0) 72%);
            }
            .grid {
              position: absolute;
              inset: 0;
              background-image:
                linear-gradient(to right, rgba(24, 20, 17, 0.045) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(24, 20, 17, 0.045) 1px, transparent 1px);
              background-size: 64px 64px;
              mask-image: radial-gradient(ellipse 92% 88% at 50% 50%, #000 35%, transparent 100%);
            }
            .shadow {
              position: absolute;
              left: ${win.x}px;
              top: ${win.y}px;
              width: ${win.w}px;
              height: ${totalWinH}px;
              border-radius: ${win.radius}px;
              background: #f3f1ed;
              box-shadow:
                0 34px 86px -18px rgba(24, 20, 17, 0.16),
                0 14px 32px -10px rgba(24, 20, 17, 0.09),
                0 0 0 1px rgba(24, 20, 17, 0.08);
            }
          </style>
        </head>
        <body>
          <div class="grid"></div>
          <div class="shadow"></div>
        </body>
      </html>`);
    plates.backdropPng = await page.screenshot({ type: "png" });

    // 2. Crisp Light Browser Chrome overlay (alembic #f7f5f2 titlebar + subtle #cecece hairline frame)
    await page.setContent(`<!doctype html>
      <html>
        <head>
          ${GOOGLE_FONTS_TAG}
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              width: ${outWidth}px;
              height: ${outHeight}px;
              background: transparent;
              overflow: hidden;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .frame {
              position: absolute;
              left: ${win.x}px;
              top: ${win.y}px;
              width: ${win.w}px;
              height: ${totalWinH}px;
              border-radius: ${win.radius}px;
              border: 1px solid rgba(24, 20, 17, 0.12);
              overflow: hidden;
            }
            .titlebar {
              width: 100%;
              height: ${win.titlebarH}px;
              background: #f7f5f2;
              border-bottom: 1px solid #e2ddd5;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 16px;
            }
            .dots { display: flex; align-items: center; gap: 7px; min-width: 78px; }
            .dot { width: 9px; height: 9px; border-radius: 9999px; background: #d6d0c7; }
            .dot.accent { background: #ff9900; }
            .url {
              display: inline-flex;
              align-items: center;
              gap: 7px;
              font-size: 11.5px;
              font-weight: 500;
              color: #181411;
              background: #eeeeee;
              border: 1px solid #d8d3ca;
              padding: 4px 14px;
              border-radius: 9999px;
            }
            .url-dot { width: 6px; height: 6px; border-radius: 9999px; background: #ff9900; }
            .right {
              min-width: 78px;
              text-align: right;
              font-size: 10px;
              font-weight: 500;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #786f67;
            }
          </style>
        </head>
        <body>
          <div class="frame">
            <div class="titlebar">
              <div class="dots">
                <span class="dot accent"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <div class="url">
                <span class="url-dot"></span>
                <span>jotadebeese.com/projects/forthweb</span>
              </div>
              <div class="right"></div>
            </div>
          </div>
        </body>
      </html>`);
    await page.evaluate(() => document.fonts.ready);
    plates.chromePng = await page.screenshot({ type: "png", omitBackground: true });
  } finally {
    await ctx.close();
  }

  return plates;
}
