import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "playwright";

export type VideoFormat = "16x9" | "4x5" | "bento";

export interface FormatSpec {
  format: VideoFormat;
  /** Viewport CSS dimensions given to Playwright */
  viewportWidth: number;
  viewportHeight: number;
  /** Output video pixel dimensions */
  outWidth: number;
  outHeight: number;
  /** Studio outer window placement (null for borderless Bento) */
  studio: null | {
    winX: number;
    winY: number;
    winWidth: number;
    winHeight: number;
    titlebarHeight: number;
    borderRadius: number;
  };
}

export const FORMAT_SPECS: Record<VideoFormat, FormatSpec> = {
  "16x9": {
    format: "16x9",
    viewportWidth: 1280,
    viewportHeight: 720,
    outWidth: 1920,
    outHeight: 1080,
    studio: {
      winX: 96,
      winY: 36,
      winWidth: 1728,
      winHeight: 972,
      titlebarHeight: 36,
      borderRadius: 14,
    },
  },
  "4x5": {
    format: "4x5",
    // 740px collapses portfolio_2025 md: grid sidebar (>=768px) while preserving sm: toolbar labels (>=640px)
    viewportWidth: 740,
    viewportHeight: 920,
    outWidth: 1080,
    outHeight: 1350,
    studio: {
      winX: 59,
      winY: 59,
      winWidth: 962,
      winHeight: 1196,
      titlebarHeight: 36,
      borderRadius: 14,
    },
  },
  bento: {
    format: "bento",
    viewportWidth: 1200,
    viewportHeight: 750,
    outWidth: 1200,
    outHeight: 750,
    studio: null,
  },
};

export interface StudioAssets {
  backdropPath: string;
  maskPath: string;
  chromeOverlayPath: string;
}

/**
 * Generates high-craft jotadebeese.com studio PNG plates using Playwright HTML->PNG:
 * 1) `backdrop.png`: Full-bleed #181411 obsidian studio canvas + hairline dashed blueprint grid + soft drop shadow.
 * 2) `mask.png`: Luma mask for the viewport slot with sharp top corners (meeting titlebar) and rounded bottom corners.
 * 3) `chrome-overlay.png`: Transparent plate holding the 36px browser titlebar + crisp 1px outer frame border.
 */
export async function ensureStudioAssets(
  browser: Browser,
  spec: FormatSpec,
  toolBadge: string,
  cacheDir: string
): Promise<StudioAssets | null> {
  if (!spec.studio) return null;

  const { winX, winY, winWidth, winHeight, titlebarHeight, borderRadius } = spec.studio;
  const totalWinHeight = winHeight + titlebarHeight;
  const slug = `${spec.format}-${toolBadge.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const dir = path.join(cacheDir, slug);
  await mkdir(dir, { recursive: true });

  const backdropPath = path.join(dir, "backdrop.png");
  const maskPath = path.join(dir, "mask.png");
  const chromeOverlayPath = path.join(dir, "chrome-overlay.png");

  const ctx = await browser.newContext({
    viewport: { width: spec.outWidth, height: spec.outHeight },
    deviceScaleFactor: 1,
  });

  try {
    const page = await ctx.newPage();

    // 1. Backdrop plate
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${spec.outWidth}px;
              height: ${spec.outHeight}px;
              overflow: hidden;
              position: relative;
              background-color: #181411;
              background-image:
                radial-gradient(64% 48% at 86% 12%, rgba(255, 153, 0, 0.10) 0%, rgba(255, 153, 0, 0) 70%),
                radial-gradient(56% 44% at 14% 88%, rgba(230, 217, 209, 0.05) 0%, rgba(230, 217, 209, 0) 72%);
            }
            .grid {
              position: absolute;
              inset: 0;
              background-image:
                linear-gradient(to right, rgba(206, 206, 206, 0.045) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(206, 206, 206, 0.045) 1px, transparent 1px);
              background-size: 64px 64px;
              mask-image: radial-gradient(ellipse 88% 82% at 50% 50%, #000 35%, transparent 100%);
            }
            .shadow-caster {
              position: absolute;
              left: ${winX}px;
              top: ${winY}px;
              width: ${winWidth}px;
              height: ${totalWinHeight}px;
              border-radius: ${borderRadius}px;
              background: #14110f;
              box-shadow:
                0 42px 90px -16px rgba(0, 0, 0, 0.78),
                0 14px 34px -8px rgba(0, 0, 0, 0.52);
            }
          </style>
        </head>
        <body>
          <div class="grid"></div>
          <div class="shadow-caster"></div>
        </body>
      </html>`);
    await page.screenshot({ path: backdropPath });

    // 2. Viewport bottom-rounded luma mask (matching exact winWidth x winHeight)
    await page.setViewportSize({ width: winWidth, height: winHeight });
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body {
              width: ${winWidth}px;
              height: ${winHeight}px;
              background: #000000;
              overflow: hidden;
            }
            .mask {
              width: ${winWidth}px;
              height: ${winHeight}px;
              background: #ffffff;
              border-top-left-radius: 0px;
              border-top-right-radius: 0px;
              border-bottom-left-radius: ${borderRadius}px;
              border-bottom-right-radius: ${borderRadius}px;
            }
          </style>
        </head>
        <body><div class="mask"></div></body>
      </html>`);
    await page.screenshot({ path: maskPath });

    // 3. Browser titlebar + hairline frame border overlay (transparent background)
    await page.setViewportSize({ width: spec.outWidth, height: spec.outHeight });
    const showBadgeOnBar = spec.outWidth >= 1000;
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              width: ${spec.outWidth}px;
              height: ${spec.outHeight}px;
              background: transparent;
              overflow: hidden;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .frame {
              position: absolute;
              left: ${winX}px;
              top: ${winY}px;
              width: ${winWidth}px;
              height: ${totalWinHeight}px;
              border-radius: ${borderRadius}px;
              border: 1px solid rgba(206, 206, 206, 0.18);
              overflow: hidden;
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
            }
            .titlebar {
              width: 100%;
              height: ${titlebarHeight}px;
              background: #1f1b18;
              border-bottom: 1px solid rgba(206, 206, 206, 0.14);
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 14px;
            }
            .dots {
              display: flex;
              align-items: center;
              gap: 7px;
              min-width: 68px;
            }
            .dot {
              width: 9px;
              height: 9px;
              border-radius: 9999px;
              background: rgba(206, 206, 206, 0.22);
            }
            .dot.accent {
              background: rgba(255, 153, 0, 0.85);
            }
            .url {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 11.5px;
              letter-spacing: 0.01em;
              color: rgba(238, 238, 238, 0.78);
              background: rgba(24, 20, 17, 0.72);
              border: 1px solid rgba(206, 206, 206, 0.12);
              padding: 3px 12px;
              border-radius: 9999px;
            }
            .url-dot {
              width: 6px;
              height: 6px;
              border-radius: 9999px;
              background: #ff9900;
            }
            .badge {
              min-width: 68px;
              text-align: right;
              font-size: 10px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: rgba(206, 206, 206, 0.56);
            }
            .badge strong {
              color: #ff9900;
              font-weight: 600;
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
              <div class="badge">
                ${showBadgeOnBar ? `<strong>FORTHWEB</strong> · ${escapeHtml(toolBadge)}` : ""}
              </div>
            </div>
          </div>
        </body>
      </html>`);
    await page.screenshot({ path: chromeOverlayPath, omitBackground: true });
  } finally {
    await ctx.close();
  }

  return { backdropPath, maskPath, chromeOverlayPath };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
