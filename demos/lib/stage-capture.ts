import type { CDPSession, Locator, Page } from "playwright";

export interface CursorPoint {
  time: number;
  x: number;
  y: number;
  kind: "move" | "down" | "up";
  /** True during locked UI drags where UI pixels move frame-by-frame with pointer */
  lockedDrag?: boolean;
}

export interface UIKeyframe {
  time: number;
  png: Buffer;
}

export interface CameraCue {
  time: number;
  /** Normalized viewport center [0..1] */
  cx: number;
  cy: number;
  scale: number;
  transitionSec: number;
}

export interface RecordedScene {
  id: string;
  label: string;
  durationSec: number;
  viewportWidth: number;
  viewportHeight: number;
  deviceScaleFactor: number;
  uiFrames: UIKeyframe[];
  cursorPoints: CursorPoint[];
  cameraCues: CameraCue[];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Stage A deterministic recorder:
 * Captures lossless PNG UI snapshots ONLY when pixels change and records exact
 * virtual-timeline cursor control points + camera cues so Stage B can render
 * buttery subpixel 60.000fps Canvas2D motion with directional cursor motion blur.
 */
export class StageRecorder {
  private virtualTime = 0;
  private cursorX: number;
  private cursorY: number;
  private uiFrames: UIKeyframe[] = [];
  private cursorPoints: CursorPoint[] = [];
  private cameraCues: CameraCue[] = [
    { time: 0, cx: 0.5, cy: 0.5, scale: 1.0, transitionSec: 0 },
  ];

  constructor(
    public readonly page: Page,
    private readonly cdp: CDPSession,
    public readonly viewportWidth: number,
    public readonly viewportHeight: number,
    public readonly deviceScaleFactor = 2,
    initialX?: number,
    initialY?: number
  ) {
    this.cursorX = initialX ?? viewportWidth * 0.52;
    this.cursorY = initialY ?? viewportHeight * 0.25;
    this.cursorPoints.push({
      time: 0,
      x: this.cursorX,
      y: this.cursorY,
      kind: "move",
    });
  }

  elapsed(): number {
    return this.virtualTime;
  }

  private async nextRaf(): Promise<void> {
    await this.page.evaluate(
      "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
    );
  }

  async captureUIFrame(atTime = this.virtualTime): Promise<void> {
    await this.nextRaf();
    const { data } = await this.cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    const png = Buffer.from(data, "base64");
    const last = this.uiFrames[this.uiFrames.length - 1];
    if (last && Math.abs(last.time - atTime) < 1e-4) {
      last.png = png;
    } else {
      this.uiFrames.push({ time: atTime, png });
    }
  }

  async hold(sec: number): Promise<void> {
    if (this.uiFrames.length === 0) {
      await this.captureUIFrame(this.virtualTime);
    }
    this.virtualTime += Math.max(0, sec);
  }

  async moveToPoint(
    targetX: number,
    targetY: number,
    opts: { durationSec?: number; hoverCapture?: boolean } = {}
  ): Promise<void> {
    const dist = Math.hypot(targetX - this.cursorX, targetY - this.cursorY);
    const dur =
      opts.durationSec ?? Math.min(0.62, Math.max(0.24, 0.18 + dist * 0.00055));

    if (this.uiFrames.length === 0) {
      await this.captureUIFrame(this.virtualTime);
    }

    this.cursorPoints.push({
      time: this.virtualTime,
      x: this.cursorX,
      y: this.cursorY,
      kind: "move",
    });

    this.virtualTime += dur;
    this.cursorX = targetX;
    this.cursorY = targetY;
    await this.page.mouse.move(targetX, targetY);

    this.cursorPoints.push({
      time: this.virtualTime,
      x: targetX,
      y: targetY,
      kind: "move",
    });

    if (opts.hoverCapture) {
      await this.captureUIFrame(this.virtualTime);
    }
  }

  async getCenter(locator: Locator, offsetX = 0, offsetY = 0): Promise<{ x: number; y: number }> {
    await locator.waitFor({ state: "visible", timeout: 20000 });
    const initialBox = await locator.boundingBox();
    const margin = 48;
    const needsScroll =
      !initialBox ||
      initialBox.y < margin ||
      initialBox.y + initialBox.height > this.viewportHeight - margin;
    if (needsScroll) {
      const prevY = await this.page.evaluate(() => window.scrollY);
      await locator
        .evaluate((el) => {
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        })
        .catch(() => locator.scrollIntoViewIfNeeded());
      const nextY = await this.page.evaluate(() => window.scrollY);
      if (Math.abs(nextY - prevY) > 1) {
        await this.captureUIFrame(this.virtualTime);
      }
    }
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error("Could not measure boundingBox for locator");
    }
    return {
      x: box.x + box.width / 2 + offsetX,
      y: box.y + box.height / 2 + offsetY,
    };
  }

  async moveTo(
    locator: Locator,
    opts: { durationSec?: number; offsetX?: number; offsetY?: number; hoverCapture?: boolean } = {}
  ): Promise<{ x: number; y: number }> {
    const pt = await this.getCenter(locator, opts.offsetX ?? 0, opts.offsetY ?? 0);
    await this.moveToPoint(pt.x, pt.y, opts);
    return pt;
  }

  async clickPoint(
    x: number,
    y: number,
    opts: {
      moveSec?: number;
      holdSec?: number;
      settleSec?: number;
      preClickPauseSec?: number;
    } = {}
  ): Promise<{ x: number; y: number }> {
    await this.moveToPoint(x, y, { durationSec: opts.moveSec });

    if (opts.preClickPauseSec ?? 0.06) {
      this.virtualTime += opts.preClickPauseSec ?? 0.06;
    }

    this.cursorPoints.push({
      time: this.virtualTime,
      x,
      y,
      kind: "down",
    });

    await this.page.mouse.down();
    await this.page.waitForTimeout(80);
    this.virtualTime += opts.holdSec ?? 0.09;

    await this.page.mouse.up();
    this.cursorPoints.push({
      time: this.virtualTime,
      x,
      y,
      kind: "up",
    });

    await this.page.waitForTimeout(160);
    await this.captureUIFrame(this.virtualTime + 0.04);
    this.virtualTime += opts.settleSec ?? 0.28;
    return { x, y };
  }

  async click(
    locator: Locator,
    opts: {
      moveSec?: number;
      holdSec?: number;
      settleSec?: number;
      offsetX?: number;
      offsetY?: number;
      preClickPauseSec?: number;
    } = {}
  ): Promise<{ x: number; y: number }> {
    const pt = await this.getCenter(locator, opts.offsetX ?? 0, opts.offsetY ?? 0);
    return this.clickPoint(pt.x, pt.y, opts);
  }

  /**
   * Executes a pointer drag step-by-step in exact 1/60s increments so live UI handles/sliders
   * stay locked pixel-for-pixel with the Stage B subpixel cursor.
   */
  async dragSegment(
    from: { x: number; y: number },
    to: { x: number; y: number },
    opts: { durationSec?: number; moveSec?: number; releaseSettleSec?: number } = {}
  ): Promise<void> {
    await this.moveToPoint(from.x, from.y, { durationSec: opts.moveSec ?? 0.34 });
    this.virtualTime += 0.05;

    this.cursorPoints.push({
      time: this.virtualTime,
      x: from.x,
      y: from.y,
      kind: "down",
      lockedDrag: true,
    });

    await this.page.mouse.down();
    await this.captureUIFrame(this.virtualTime);

    const durationSec = opts.durationSec ?? 0.65;
    const totalFrames = Math.max(8, Math.round(durationSec * 60));
    const dt = 1 / 60;

    for (let f = 1; f <= totalFrames; f++) {
      const p = easeInOutCubic(f / totalFrames);
      const nx = from.x + (to.x - from.x) * p;
      const ny = from.y + (to.y - from.y) * p;

      this.virtualTime += dt;
      this.cursorX = nx;
      this.cursorY = ny;

      await this.page.mouse.move(nx, ny);
      this.cursorPoints.push({
        time: this.virtualTime,
        x: nx,
        y: ny,
        kind: "move",
        lockedDrag: true,
      });
      await this.captureUIFrame(this.virtualTime);
    }

    await this.page.mouse.up();
    this.cursorPoints.push({
      time: this.virtualTime,
      x: to.x,
      y: to.y,
      kind: "up",
      lockedDrag: true,
    });

    await this.page.waitForTimeout(90);
    await this.captureUIFrame(this.virtualTime + 0.04);
    this.virtualTime += opts.releaseSettleSec ?? 0.24;
  }

  async sweepHorizontal(
    locator: Locator,
    startFraction: number,
    stopsFraction: number[],
    opts: { legSec?: number; pauseAtStopSec?: number } = {}
  ): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 20000 });
    const box = await locator.boundingBox();
    if (!box) throw new Error("Missing boundingBox for sweepHorizontal");

    const cy = box.y + box.height / 2;
    const toX = (frac: number) => box.x + Math.max(0.03, Math.min(0.97, frac)) * box.width;

    const startX = toX(startFraction);
    await this.moveToPoint(startX, cy, { durationSec: 0.34 });
    this.virtualTime += 0.05;

    this.cursorPoints.push({
      time: this.virtualTime,
      x: startX,
      y: cy,
      kind: "down",
      lockedDrag: true,
    });
    await this.page.mouse.down();
    await this.captureUIFrame(this.virtualTime);

    const legSec = opts.legSec ?? 0.58;
    const dt = 1 / 60;
    let prevX = startX;

    for (const frac of stopsFraction) {
      const targetX = toX(frac);
      const frames = Math.max(8, Math.round(legSec * 60));
      for (let f = 1; f <= frames; f++) {
        const p = easeInOutCubic(f / frames);
        const nx = prevX + (targetX - prevX) * p;
        this.virtualTime += dt;
        this.cursorX = nx;
        this.cursorY = cy;
        await this.page.mouse.move(nx, cy);
        this.cursorPoints.push({
          time: this.virtualTime,
          x: nx,
          y: cy,
          kind: "move",
          lockedDrag: true,
        });
        await this.captureUIFrame(this.virtualTime);
      }
      prevX = targetX;
      if (opts.pauseAtStopSec) {
        this.virtualTime += opts.pauseAtStopSec;
      }
    }

    await this.page.mouse.up();
    this.cursorPoints.push({
      time: this.virtualTime,
      x: prevX,
      y: cy,
      kind: "up",
      lockedDrag: true,
    });
    await this.page.waitForTimeout(90);
    await this.captureUIFrame(this.virtualTime + 0.04);
    this.virtualTime += 0.2;
  }

  /**
   * Polls lossless PNGs at ~24fps while waiting for an asynchronous browser task
   * (such as WebCodecs encoding progress 0%..100%) until `untilVisible` settles.
   */
  async captureWhileWaiting(
    untilVisible: Locator,
    opts: { maxWaitMs?: number; playbackCompressRatio?: number } = {}
  ): Promise<void> {
    const maxWaitMs = opts.maxWaitMs ?? 45000;
    const deadline = Date.now() + maxWaitMs;
    const startWall = performance.now();
    const startVirtual = this.virtualTime;
    // Speed up long compression waits slightly if >2s so demos feel snappy while keeping smooth 0->100% fill
    const ratio = opts.playbackCompressRatio ?? 0.85;

    while (Date.now() < deadline) {
      const done = await untilVisible.isVisible().catch(() => false);
      const elapsedSec = ((performance.now() - startWall) / 1000) * ratio;
      this.virtualTime = startVirtual + elapsedSec;
      await this.captureUIFrame(this.virtualTime);
      if (done) break;
      await this.page.waitForTimeout(25);
    }

    // One final settled frame
    await this.page.waitForTimeout(160);
    this.virtualTime += 0.16;
    await this.captureUIFrame(this.virtualTime);
  }

  focusPoint(
    nx: number,
    ny: number,
    opts: { scale?: number; transitionSec?: number } = {}
  ): void {
    const last = this.cameraCues[this.cameraCues.length - 1];
    const earliest = last ? last.time + last.transitionSec + 0.04 : 0;
    this.cameraCues.push({
      time: Math.max(this.virtualTime, earliest),
      cx: Math.max(0.05, Math.min(0.95, nx)),
      cy: Math.max(0.05, Math.min(0.95, ny)),
      scale: Math.max(1.0, Math.min(2.4, opts.scale ?? 1.45)),
      transitionSec: Math.max(0.25, opts.transitionSec ?? 0.6),
    });
  }

  async focusElement(
    locator: Locator,
    opts: { scale?: number; transitionSec?: number; offsetX?: number; offsetY?: number } = {}
  ): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 20000 });
    const box = await locator.boundingBox();
    if (!box) return;
    const cx = (box.x + box.width / 2 + (opts.offsetX ?? 0)) / this.viewportWidth;
    const cy = (box.y + box.height / 2 + (opts.offsetY ?? 0)) / this.viewportHeight;
    this.focusPoint(cx, cy, opts);
  }

  resetCamera(transitionSec = 0.55): void {
    this.focusPoint(0.5, 0.5, { scale: 1.0, transitionSec });
  }

  finalize(id: string, label: string): RecordedScene {
    return {
      id,
      label,
      durationSec: Math.max(0.5, this.virtualTime),
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      deviceScaleFactor: this.deviceScaleFactor,
      uiFrames: this.uiFrames,
      cursorPoints: this.cursorPoints,
      cameraCues: this.cameraCues,
    };
  }
}
