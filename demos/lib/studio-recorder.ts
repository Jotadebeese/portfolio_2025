import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from "playwright";
import { DemoCursor } from "./cursor-overlay.js";
import { ensureStudioAssets, FORMAT_SPECS, type VideoFormat } from "./studio-frame.js";

export interface CameraKeyframe {
  /** Time in seconds from start of recording when transition begins */
  time: number;
  /** Target horizontal center in normalized viewport coordinates [0..1] */
  cx: number;
  /** Target vertical center in normalized viewport coordinates [0..1] */
  cy: number;
  /** Zoom multiplier (>= 1.0) */
  scale: number;
  /** Smoothstep transition duration in seconds */
  transitionSec: number;
}

interface CapturedFrame {
  filePath: string;
  timestampSec: number;
}

export class CameraDirector {
  private keyframes: CameraKeyframe[] = [
    { time: 0, cx: 0.5, cy: 0.5, scale: 1.0, transitionSec: 0 },
  ];

  constructor(
    private readonly page: Page,
    private readonly getElapsedSec: () => number,
    private readonly viewportWidth: number,
    private readonly viewportHeight: number
  ) {}

  getKeyframes(): CameraKeyframe[] {
    return [...this.keyframes];
  }

  private pushKeyframe(cx: number, cy: number, scale: number, transitionSec: number): void {
    const now = Math.max(0, this.getElapsedSec());
    const last = this.keyframes[this.keyframes.length - 1];
    const earliest = last ? last.time + last.transitionSec + 0.05 : 0;
    const clampedScale = Math.max(1.0, Math.min(2.6, scale));
    const clampedCx = Math.max(0.05, Math.min(0.95, cx));
    const clampedCy = Math.max(0.05, Math.min(0.95, cy));

    this.keyframes.push({
      time: Math.max(now, earliest),
      cx: clampedCx,
      cy: clampedCy,
      scale: clampedScale,
      transitionSec: Math.max(0.2, transitionSec),
    });
  }

  focusPoint(
    nx: number,
    ny: number,
    opts: { scale?: number; transitionSec?: number } = {}
  ): void {
    this.pushKeyframe(nx, ny, opts.scale ?? 1.5, opts.transitionSec ?? 0.65);
  }

  async focusElement(
    locator: ReturnType<Page["locator"]>,
    opts: {
      scale?: number;
      transitionSec?: number;
      offsetX?: number;
      offsetY?: number;
    } = {}
  ): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    const box = await locator.boundingBox();
    if (!box) return;
    const cx = (box.x + box.width / 2 + (opts.offsetX ?? 0)) / this.viewportWidth;
    const cy = (box.y + box.height / 2 + (opts.offsetY ?? 0)) / this.viewportHeight;
    this.pushKeyframe(cx, cy, opts.scale ?? 1.5, opts.transitionSec ?? 0.65);
  }

  /**
   * Smart workbench camera: on widescreen (16:9) layouts, centers horizontally on the
   * 9-col workbench column so desktop sidebar space is cropped out cleanly while keeping both
   * card edges unclipped; on compact (4:5) layouts, uses gentler zoom centered cleanly on frame.
   */
  async focusWorkbench(
    anchorLocator: ReturnType<Page["locator"]>,
    opts: {
      desktopScale?: number;
      compactScale?: number;
      transitionSec?: number;
      offsetY?: number;
    } = {}
  ): Promise<void> {
    await anchorLocator.waitFor({ state: "visible", timeout: 15000 });
    const anchorBox = await anchorLocator.boundingBox();
    if (!anchorBox) return;

    const isWide = this.viewportWidth >= 1000;
    const scale = isWide ? (opts.desktopScale ?? 1.42) : Math.min(opts.compactScale ?? 1.1, 1.1);
    const cy = (anchorBox.y + anchorBox.height / 2 + (opts.offsetY ?? 0)) / this.viewportHeight;

    let cx = (anchorBox.x + anchorBox.width / 2) / this.viewportWidth;
    if (isWide) {
      // Find enclosing column/card width cleanly (>= 480px) so left labels & right buttons both stay inside zoomed frame
      const cardCenterRatio = await anchorLocator.evaluate((el) => {
        let cur: HTMLElement | null = el as HTMLElement;
        let best = el.getBoundingClientRect();
        while (cur && cur !== document.body) {
          const r = cur.getBoundingClientRect();
          if (r.width >= 480 && r.width <= window.innerWidth * 0.72) {
            best = r;
            break;
          }
          cur = cur.parentElement;
        }
        return (best.left + best.width / 2) / window.innerWidth;
      });
      cx = cardCenterRatio;
    } else {
      // 4:5 full-width cards span ~92% of viewport — keep horizontal center aligned to avoid edge clipping
      cx = 0.5;
    }

    this.pushKeyframe(cx, cy, scale, opts.transitionSec ?? 0.65);
  }

  /**
   * Modal stage framing: zooms softly on widescreen (16:9) full-viewport modals
   * while keeping narrow (4:5) full-width modals at 1.0x so modal headers/actions never clip.
   */
  async focusModal(
    locator: ReturnType<Page["locator"]>,
    opts: { desktopScale?: number; transitionSec?: number } = {}
  ): Promise<void> {
    if (this.viewportWidth < 1000) {
      this.reset({ transitionSec: opts.transitionSec ?? 0.55 });
      return;
    }
    await this.focusElement(locator, {
      scale: opts.desktopScale ?? 1.24,
      transitionSec: opts.transitionSec ?? 0.65,
    });
  }

  reset(opts: { transitionSec?: number } = {}): void {
    this.pushKeyframe(0.5, 0.5, 1.0, opts.transitionSec ?? 0.65);
  }
}

export interface SessionConfig {
  url: string;
  format: VideoFormat;
  toolBadge: string;
  outputMp4: string;
  /** Optional secondary WebM encode (ideal for website Bento cards) */
  outputWebm?: string;
  /** Initial cursor coordinates in CSS pixels */
  initialCursor?: { x: number; y: number };
  /** Disable zoompan expression even if camera keyframes exist */
  disableCameraZoom?: boolean;
}

export interface DemoSession {
  page: Page;
  cursor: DemoCursor;
  camera: CameraDirector;
  elapsedSec: () => number;
}

/**
 * Generates piecewise quintic smootherstep FFmpeg expressions from sequential keyframes.
 */
function buildCameraExpressions(
  keyframes: CameraKeyframe[],
  outW: number,
  outH: number
): { zExpr: string; xExpr: string; yExpr: string } {
  if (keyframes.length <= 1) {
    return {
      zExpr: keyframes[0]?.scale.toFixed(4) ?? "1",
      xExpr: "0",
      yExpr: "0",
    };
  }

  const base = keyframes[0];
  let zTerms = base.scale.toFixed(4);
  let cxTerms = base.cx.toFixed(4);
  let cyTerms = base.cy.toFixed(4);

  for (let i = 1; i < keyframes.length; i++) {
    const prev = keyframes[i - 1];
    const curr = keyframes[i];
    const dz = curr.scale - prev.scale;
    const dcx = curr.cx - prev.cx;
    const dcy = curr.cy - prev.cy;
    if (Math.abs(dz) < 1e-4 && Math.abs(dcx) < 1e-4 && Math.abs(dcy) < 1e-4) {
      continue;
    }

    const t0 = curr.time.toFixed(3);
    const dur = curr.transitionSec.toFixed(3);
    // Quintic smootherstep: u^3 * (10 + u * (-15 + 6*u)) where u = clip((it - t0)/dur, 0, 1)
    const u = `clip((it-${t0})/${dur},0,1)`;
    const smooth = `(pow(${u},3)*(10+${u}*(-15+6*${u})))`;

    if (Math.abs(dz) >= 1e-4) {
      zTerms += `${dz >= 0 ? "+" : ""}${dz.toFixed(4)}*${smooth}`;
    }
    if (Math.abs(dcx) >= 1e-4) {
      cxTerms += `${dcx >= 0 ? "+" : ""}${dcx.toFixed(4)}*${smooth}`;
    }
    if (Math.abs(dcy) >= 1e-4) {
      cyTerms += `${dcy >= 0 ? "+" : ""}${dcy.toFixed(4)}*${smooth}`;
    }
  }

  // Note: `iw`/`ih` are the 2x Retina source dimensions; `zoom` is the current frame's `z` value.
  // Keeping `x` and `y` inside [0, iw - iw/zoom] guarantees zero edge spill during pan+zoom.
  const xExpr = `clip((${cxTerms})*iw-(iw/zoom)/2,0,iw-iw/zoom)`;
  const yExpr = `clip((${cyTerms})*ih-(ih/zoom)/2,0,ih-ih/zoom)`;

  void outW;
  void outH;
  return { zExpr: zTerms, xExpr, yExpr };
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}:\n${stderr.slice(-2400)}`));
      }
    });
  });
}

export async function runRecordedDemo(
  config: SessionConfig,
  flow: (session: DemoSession) => Promise<void>
): Promise<{ durationSec: number; frameCount: number; outputMp4: string; outputWebm?: string }> {
  const spec = FORMAT_SPECS[config.format];
  const tempRoot = path.join(
    os.tmpdir(),
    `forthweb-demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const framesDir = path.join(tempRoot, "frames");
  const assetsCacheDir = path.join(tempRoot, "studio-plates");
  await mkdir(framesDir, { recursive: true });
  await mkdir(path.dirname(config.outputMp4), { recursive: true });
  if (config.outputWebm) {
    await mkdir(path.dirname(config.outputWebm), { recursive: true });
  }

  const browser: Browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: [
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  let context: BrowserContext | null = null;
  let cdp: CDPSession | null = null;

  try {
    const studioAssets = await ensureStudioAssets(browser, spec, config.toolBadge, assetsCacheDir);

    context = await browser.newContext({
      viewport: { width: spec.viewportWidth, height: spec.viewportHeight },
      deviceScaleFactor: 2,
      colorScheme: "light",
    });

    const page = await context.newPage();
    cdp = await context.newCDPSession(page);

    // Load page cleanly without waitUntil:'networkidle' (dev mode telemetry stays open).
    await page.goto(config.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("load").catch(() => {});
    // Wait for web fonts & React hydration stabilization before starting clock
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 450));

    const initX = config.initialCursor?.x ?? Math.round(spec.viewportWidth * 0.52);
    const initY = config.initialCursor?.y ?? Math.round(spec.viewportHeight * 0.42);
    const cursor = new DemoCursor(page, initX, initY);
    await cursor.mount();

    // Screencast state
    const frames: CapturedFrame[] = [];
    const pendingWrites: Promise<void>[] = [];
    let firstMetaTs: number | null = null;
    let recordingStartWallMs = performance.now();
    let resolveFirstFrame: (() => void) | null = null;
    const firstFramePromise = new Promise<void>((resolve) => {
      resolveFirstFrame = resolve;
    });

    cdp.on("Page.screencastFrame", (event) => {
      void cdp!.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});

      const metaTs = event.metadata?.timestamp ?? Date.now() / 1000;
      if (firstMetaTs === null) {
        firstMetaTs = metaTs;
        recordingStartWallMs = performance.now();
        resolveFirstFrame?.();
        resolveFirstFrame = null;
      }

      const relSec = Math.max(0, metaTs - firstMetaTs);
      const index = frames.length;
      const filePath = path.join(framesDir, `frame_${String(index).padStart(6, "0")}.jpg`);
      frames.push({ filePath, timestampSec: relSec });

      const buf = Buffer.from(event.data, "base64");
      pendingWrites.push(writeFile(filePath, buf));
    });

    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 95,
      maxWidth: spec.viewportWidth * 2,
      maxHeight: spec.viewportHeight * 2,
      everyNthFrame: 1,
    });

    // Nudge 1px so compositor immediately commits frame 0
    await cursor.moveToPoint(initX + 1, initY + 1, { durationMs: 32, arc: 0 });
    await Promise.race([firstFramePromise, new Promise((r) => setTimeout(r, 1200))]);

    const getElapsedSec = () => (performance.now() - recordingStartWallMs) / 1000;
    const camera = new CameraDirector(page, getElapsedSec, spec.viewportWidth, spec.viewportHeight);

    // Execute user flow choreography
    await flow({
      page,
      cursor,
      camera,
      elapsedSec: getElapsedSec,
    });

    // Hold ending frame gently so camera resets / ripples finish cleanly
    await new Promise((r) => setTimeout(r, 450));
    // Trigger one final micro-commit to anchor tail timestamp
    const cur = cursor.getPosition();
    await cursor.moveToPoint(cur.x + 0.5, cur.y, { durationMs: 30, arc: 0 });
    await new Promise((r) => setTimeout(r, 120));

    const totalElapsedSec = Math.max(getElapsedSec(), frames[frames.length - 1]?.timestampSec ?? 0);

    await cdp.send("Page.stopScreencast").catch(() => {});
    await Promise.all(pendingWrites);

    if (frames.length === 0) {
      throw new Error("Screencast captured 0 frames — verify Chrome CDP screencast health.");
    }

    // Build ffconcat manifest converting variable screencast frames into exact timeline
    const ffconcatLines: string[] = ["ffconcat version 1.0"];
    for (let i = 0; i < frames.length; i++) {
      const curr = frames[i];
      const nextTs = i + 1 < frames.length ? frames[i + 1].timestampSec : totalElapsedSec;
      const dt = Math.max(0.008, nextTs - curr.timestampSec);
      const escaped = curr.filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
      ffconcatLines.push(`file '${escaped}'`);
      ffconcatLines.push(`duration ${dt.toFixed(5)}`);
    }
    // Repeat final frame path without duration per FFmpeg concat demuxer spec
    const lastEscaped = frames[frames.length - 1].filePath
      .replace(/\\/g, "/")
      .replace(/'/g, "'\\''");
    ffconcatLines.push(`file '${lastEscaped}'`);

    const ffconcatPath = path.join(tempRoot, "frames.ffconcat");
    await writeFile(ffconcatPath, ffconcatLines.join("\n"), "utf8");

    const keyframes = config.disableCameraZoom
      ? [{ time: 0, cx: 0.5, cy: 0.5, scale: 1.0, transitionSec: 0 }]
      : camera.getKeyframes();

    const targetW = spec.studio ? spec.studio.winWidth : spec.outWidth;
    const targetH = spec.studio ? spec.studio.winHeight : spec.outHeight;
    const { zExpr, xExpr, yExpr } = buildCameraExpressions(keyframes, targetW, targetH);

    // Filter complex script avoids Windows shell quoting limits
    let filterComplex = "";
    const ffmpegInputs: string[] = ["-y", "-safe", "0", "-f", "concat", "-i", ffconcatPath];

    if (studioAssets && spec.studio) {
      ffmpegInputs.push(
        "-loop",
        "1",
        "-framerate",
        "60",
        "-i",
        studioAssets.backdropPath,
        "-loop",
        "1",
        "-framerate",
        "60",
        "-i",
        studioAssets.maskPath,
        "-loop",
        "1",
        "-framerate",
        "60",
        "-i",
        studioAssets.chromeOverlayPath
      );

      filterComplex = [
        `[0:v]fps=60,setpts=PTS-STARTPTS,zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=1:fps=60:s=${targetW}x${targetH},format=rgba[v_vp]`,
        `[2:v]format=gray[v_mask]`,
        `[v_vp][v_mask]alphamerge=shortest=1[v_masked]`,
        `[1:v]format=rgba[v_bg]`,
        `[v_bg][v_masked]overlay=${spec.studio.winX}:${spec.studio.winY + spec.studio.titlebarHeight}:shortest=1[v_stage]`,
        `[3:v]format=rgba[v_chrome]`,
        `[v_stage][v_chrome]overlay=0:0:shortest=1,format=yuv420p[vout]`,
      ].join(";\n");
    } else {
      filterComplex = `[0:v]fps=60,setpts=PTS-STARTPTS,zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=1:fps=60:s=${targetW}x${targetH},format=yuv420p[vout]`;
    }

    const filterScriptPath = path.join(tempRoot, "filter.txt");
    await writeFile(filterScriptPath, filterComplex, "utf8");

    const finalDurationStr = totalElapsedSec.toFixed(3);

    await runFfmpeg([
      ...ffmpegInputs,
      "-filter_complex_script",
      filterScriptPath,
      "-map",
      "[vout]",
      "-t",
      finalDurationStr,
      "-r",
      "60",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      config.outputMp4,
    ]);

    if (config.outputWebm) {
      await runFfmpeg([
        ...ffmpegInputs,
        "-filter_complex_script",
        filterScriptPath,
        "-map",
        "[vout]",
        "-t",
        finalDurationStr,
        "-r",
        "60",
        "-c:v",
        "libvpx-vp9",
        "-crf",
        "30",
        "-b:v",
        "0",
        "-row-mt",
        "1",
        "-deadline",
        "good",
        "-cpu-used",
        "2",
        "-an",
        config.outputWebm,
      ]);
    }

    return {
      durationSec: Number(totalElapsedSec.toFixed(2)),
      frameCount: frames.length,
      outputMp4: config.outputMp4,
      outputWebm: config.outputWebm,
    };
  } finally {
    await cdp?.detach().catch(() => {});
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}
