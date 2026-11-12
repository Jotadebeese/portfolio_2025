import type { Locator, Page } from "playwright";

export interface Point {
  x: number;
  y: number;
}

export interface MoveOptions {
  /** Animation duration in milliseconds. Defaults to distance-scaled (280..620ms). */
  durationMs?: number;
  /** Offset from element center in CSS pixels. */
  offsetX?: number;
  offsetY?: number;
  /** Subtle organic arc factor. Set to 0 for dead-straight slider drags. */
  arc?: number;
  /** Pause after reaching target in milliseconds. */
  pauseAfterMs?: number;
}

export interface ClickOptions extends MoveOptions {
  /** Hold time between pointerdown and pointerup so ripple & button press register cleanly. */
  holdMs?: number;
  /** Settle time after release. */
  settleMs?: number;
}

declare global {
  interface Window {
    __demoCursor?: {
      ensure: () => void;
      setPos: (x: number, y: number) => void;
      setPressed: (pressed: boolean) => void;
      spawnRipple: (x: number, y: number) => void;
      setVisible: (visible: boolean) => void;
    };
  }
}

/**
 * Raw browser script string injected on demand via page.evaluate(string)
 * so esbuild/tsx helper wrappers (like __name) are never serialized into Chrome.
 * Attaches lazily after hydration so Next.js React never sees unexpected nodes.
 */
export const CURSOR_BOOTSTRAP_SCRIPT = `(() => {
  if (window.__demoCursor) {
    window.__demoCursor.ensure();
    return;
  }

  let root = null;
  let pointerEl = null;
  let lastX = -120;
  let lastY = -120;
  let isPressed = false;
  let isVisible = true;
  let styleEl = null;

  function applyTransform() {
    if (!pointerEl) return;
    const scale = isPressed ? 0.84 : 1;
    pointerEl.style.opacity = isVisible ? "1" : "0";
    pointerEl.style.transform = "translate3d(" + lastX.toFixed(2) + "px, " + lastY.toFixed(2) + "px, 0) scale(" + scale + ")";
  }

  function ensure() {
    if (!document.documentElement) return;
    if (!styleEl || !styleEl.isConnected) {
      styleEl = document.createElement("style");
      styleEl.id = "__forthweb_demo_cursor_style";
      styleEl.textContent = \`
        @keyframes __forthweb_ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.18);
            opacity: 0.92;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
        #__forthweb_cursor_root {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2147483647;
          overflow: hidden;
        }
        nextjs-portal,
        [data-nextjs-toast],
        #nextjs__container_errors_label {
          display: none !important;
        }
        #__forthweb_cursor_arrow {
          position: fixed;
          top: 0;
          left: 0;
          width: 28px;
          height: 28px;
          margin-left: -4px;
          margin-top: -3px;
          transform-origin: 4px 3px;
          transition: transform 90ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.42));
          will-change: transform;
        }
        .__forthweb_cursor_ripple {
          position: fixed;
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          border: 2.25px solid #ff9900;
          background: rgba(255, 153, 0, 0.14);
          pointer-events: none;
          animation: __forthweb_ripple 440ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
      \`;
      (document.head || document.documentElement).appendChild(styleEl);
    }

    if (!root || !root.isConnected) {
      root = document.createElement("div");
      root.id = "__forthweb_cursor_root";

      pointerEl = document.createElement("div");
      pointerEl.id = "__forthweb_cursor_arrow";
      pointerEl.innerHTML = \`
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4.5 3.2L22.6 14.3L14.2 16.4L10.3 24.2L4.5 3.2Z"
            fill="#181411"
            stroke="#eeeeee"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <circle cx="4.5" cy="3.2" r="1.1" fill="#ff9900" opacity="0.85" />
        </svg>
      \`;
      root.appendChild(pointerEl);
      document.documentElement.appendChild(root);
      applyTransform();
    }
  }

  function setPos(x, y) {
    ensure();
    lastX = x;
    lastY = y;
    applyTransform();
  }

  function setPressed(pressed) {
    ensure();
    isPressed = pressed;
    applyTransform();
  }

  function setVisible(visible) {
    ensure();
    isVisible = visible;
    applyTransform();
  }

  function spawnRipple(x, y) {
    ensure();
    if (!root) return;
    const ring = document.createElement("div");
    ring.className = "__forthweb_cursor_ripple";
    ring.style.left = x.toFixed(2) + "px";
    ring.style.top = y.toFixed(2) + "px";
    root.appendChild(ring);
    window.setTimeout(() => {
      ring.remove();
    }, 480);
  }

  window.addEventListener("pointermove", (e) => {
    setPos(e.clientX, e.clientY);
  }, { capture: true, passive: true });

  window.addEventListener("pointerdown", (e) => {
    setPos(e.clientX, e.clientY);
    setPressed(true);
    spawnRipple(e.clientX, e.clientY);
  }, { capture: true, passive: true });

  window.addEventListener("pointerup", () => {
    setPressed(false);
  }, { capture: true, passive: true });

  window.__demoCursor = {
    ensure,
    setPos,
    setPressed,
    spawnRipple,
    setVisible,
  };
})();`;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DemoCursor {
  private x: number;
  private y: number;

  constructor(
    private readonly page: Page,
    initialX = 120,
    initialY = 120
  ) {
    this.x = initialX;
    this.y = initialY;
  }

  async mount(): Promise<void> {
    await this.page.evaluate(CURSOR_BOOTSTRAP_SCRIPT);
    await this.page.evaluate(
      ([x, y]) => {
        window.__demoCursor?.ensure();
        window.__demoCursor?.setPos(x, y);
      },
      [this.x, this.y] as [number, number]
    );
    await this.page.mouse.move(this.x, this.y);
  }

  async hide(): Promise<void> {
    await this.page.evaluate(() => window.__demoCursor?.setVisible(false));
  }

  async show(): Promise<void> {
    await this.page.evaluate(() => window.__demoCursor?.setVisible(true));
  }

  getPosition(): Point {
    return { x: this.x, y: this.y };
  }

  /** Returns viewport-relative box + center after waiting for attachment/visibility. */
  async getCenter(locator: Locator, offsetX = 0, offsetY = 0): Promise<Point> {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error("Could not compute boundingBox for locator");
    }
    return {
      x: box.x + box.width / 2 + offsetX,
      y: box.y + box.height / 2 + offsetY,
    };
  }

  async moveToPoint(targetX: number, targetY: number, opts: MoveOptions = {}): Promise<void> {
    await this.page.evaluate(CURSOR_BOOTSTRAP_SCRIPT);

    const startX = this.x;
    const startY = this.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) {
      this.x = targetX;
      this.y = targetY;
      await this.page.mouse.move(targetX, targetY);
      if (opts.pauseAfterMs) await sleep(opts.pauseAfterMs);
      return;
    }

    const durationMs =
      opts.durationMs ?? Math.round(Math.min(640, Math.max(240, 170 + dist * 0.62)));
    const steps = Math.max(12, Math.round(durationMs / 16));
    const stepDelay = durationMs / steps;

    // Gentle quadratic curve perpendicular to travel direction unless suppressed (arc=0).
    const arcFactor = opts.arc ?? 0.055;
    const perpOffset = dist > 40 && arcFactor > 0 ? Math.min(24, dist * arcFactor) : 0;
    const sign = dx >= 0 ? -1 : 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const ctrlX = (startX + targetX) / 2 + nx * perpOffset * sign;
    const ctrlY = (startY + targetY) / 2 + ny * perpOffset * sign;

    for (let i = 1; i <= steps; i++) {
      const t = easeInOutCubic(i / steps);
      const omt = 1 - t;
      const px = omt * omt * startX + 2 * omt * t * ctrlX + t * t * targetX;
      const py = omt * omt * startY + 2 * omt * t * ctrlY + t * t * targetY;

      this.x = px;
      this.y = py;
      await this.page.mouse.move(px, py);
      await this.page.evaluate(([cx, cy]) => window.__demoCursor?.setPos(cx, cy), [px, py]);
      if (i < steps) {
        await sleep(stepDelay);
      }
    }

    if (opts.pauseAfterMs) {
      await sleep(opts.pauseAfterMs);
    }
  }

  async moveTo(locator: Locator, opts: MoveOptions = {}): Promise<Point> {
    const pt = await this.getCenter(locator, opts.offsetX ?? 0, opts.offsetY ?? 0);
    await this.moveToPoint(pt.x, pt.y, opts);
    return pt;
  }

  async click(locator: Locator, opts: ClickOptions = {}): Promise<Point> {
    const pt = await this.moveTo(locator, opts);
    await sleep(65);
    await this.page.mouse.down();
    await this.page.evaluate(
      ([cx, cy]) => {
        window.__demoCursor?.setPressed(true);
        window.__demoCursor?.spawnRipple(cx, cy);
      },
      [pt.x, pt.y]
    );
    await sleep(opts.holdMs ?? 110);
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__demoCursor?.setPressed(false));
    await sleep(opts.settleMs ?? 260);
    return pt;
  }

  async clickPoint(x: number, y: number, opts: ClickOptions = {}): Promise<void> {
    await this.moveToPoint(x, y, opts);
    await sleep(60);
    await this.page.mouse.down();
    await this.page.evaluate(
      ([cx, cy]) => {
        window.__demoCursor?.setPressed(true);
        window.__demoCursor?.spawnRipple(cx, cy);
      },
      [x, y]
    );
    await sleep(opts.holdMs ?? 110);
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__demoCursor?.setPressed(false));
    await sleep(opts.settleMs ?? 240);
  }

  /**
   * Drags smoothly from `from` to `to` while holding left mouse button.
   * Useful for split comparison sliders, video trim handles, and native range tracks.
   */
  async drag(
    from: Point,
    to: Point,
    opts: { durationMs?: number; holdBeforeMoveMs?: number; settleMs?: number } = {}
  ): Promise<void> {
    await this.moveToPoint(from.x, from.y, { durationMs: 340 });
    await sleep(opts.holdBeforeMoveMs ?? 70);
    await this.page.mouse.down();
    await this.page.evaluate(
      ([cx, cy]) => {
        window.__demoCursor?.setPressed(true);
        window.__demoCursor?.spawnRipple(cx, cy);
      },
      [from.x, from.y]
    );
    await sleep(60);
    await this.moveToPoint(to.x, to.y, {
      durationMs: opts.durationMs ?? 650,
      arc: 0,
    });
    await sleep(70);
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__demoCursor?.setPressed(false));
    await sleep(opts.settleMs ?? 220);
  }

  /**
   * Grabs a horizontal control (e.g. Compare split handle or range slider) at `startFraction`
   * and sweeps continuously through `stopsFraction` (values in 0..1 across bounding box width).
   */
  async sweepHorizontal(
    locator: Locator,
    startFraction: number,
    stopsFraction: number[],
    opts: { legDurationMs?: number; pauseAtStopMs?: number } = {}
  ): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    const box = await locator.boundingBox();
    if (!box) throw new Error("Missing boundingBox for sweepHorizontal");

    const cy = box.y + box.height / 2;
    const toX = (frac: number) => box.x + Math.max(0.03, Math.min(0.97, frac)) * box.width;

    const startX = toX(startFraction);
    await this.moveToPoint(startX, cy, { durationMs: 380 });
    await sleep(70);
    await this.page.mouse.down();
    await this.page.evaluate(
      ([cx, y]) => {
        window.__demoCursor?.setPressed(true);
        window.__demoCursor?.spawnRipple(cx, y);
      },
      [startX, cy]
    );

    for (const frac of stopsFraction) {
      await this.moveToPoint(toX(frac), cy, {
        durationMs: opts.legDurationMs ?? 650,
        arc: 0,
      });
      if (opts.pauseAtStopMs) {
        await sleep(opts.pauseAtStopMs);
      }
    }

    await sleep(70);
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__demoCursor?.setPressed(false));
    await sleep(220);
  }

  /**
   * Smoothly scrolls window to bring `targetY` (absolute scrollY) or locator near viewport center.
   */
  async scrollTo(target: Locator | number, durationMs = 600): Promise<void> {
    let destY = typeof target === "number" ? target : 0;
    if (typeof target !== "number") {
      await target.waitFor({ state: "visible", timeout: 15000 });
      destY = await target.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return Math.max(0, window.scrollY + rect.top - window.innerHeight * 0.22);
      });
    }

    await this.page.evaluate(`(() => new Promise((resolve) => {
      const toY = ${Number(destY)};
      const dur = ${Number(durationMs)};
      const fromY = window.scrollY;
      const delta = toY - fromY;
      if (Math.abs(delta) < 2) {
        resolve();
        return;
      }
      const start = performance.now();
      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        window.scrollTo({ top: fromY + delta * eased, behavior: "instant" });
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    }))()`);
    await sleep(160);
  }

  async wait(ms: number): Promise<void> {
    await sleep(ms);
  }
}
