import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import { renderStudioPlates, type OutputLayout } from "./compositor-html.js";
import type { CameraCue, CursorPoint, RecordedScene } from "./stage-capture.js";

export interface CompositionSpec {
  layout: OutputLayout;
  eyebrow: string;
  headline: string;
  subline: string;
  barTitle: string;
  scenes: RecordedScene[];
  outputMp4: string;
  outputWebm?: string;
}

interface SerializedScene {
  id: string;
  label: string;
  durationSec: number;
  viewportWidth: number;
  viewportHeight: number;
  deviceScaleFactor: number;
  uiFrames: Array<{ time: number; url: string }>;
  cursorPoints: CursorPoint[];
  cameraCues: CameraCue[];
  pillUrl?: string;
  pillW?: number;
  pillH?: number;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}:\n${stderr.slice(-2400)}`));
    });
  });
}

/**
 * Composites 1 or more captured scenes into a true 60.000fps subpixel video via Chromium
 * Canvas 2D + WebCodecs `avc1.640033` Annex-B @ 24 Mbps, then remuxes/optimizes with FFmpeg BT.709.
 */
export async function composeVideo(
  browser: Browser,
  spec: CompositionSpec
): Promise<{ durationSec: number; frameCount: number; outputMp4: string; outputWebm?: string }> {
  const { layout, scenes, outputMp4, outputWebm } = spec;
  if (scenes.length === 0) {
    throw new Error("composeVideo requires at least one RecordedScene");
  }

  const tempDir = path.join(
    os.tmpdir(),
    `forthweb-comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  await mkdir(tempDir, { recursive: true });
  await mkdir(path.dirname(outputMp4), { recursive: true });
  if (outputWebm) {
    await mkdir(path.dirname(outputWebm), { recursive: true });
  }

  const assetMap = new Map<string, Buffer>();
  let assetCounter = 0;
  const registerPng = (buf: Buffer): string => {
    const key = `/asset/${assetCounter++}.png`;
    assetMap.set(key, buf);
    return key;
  };

  let server: ReturnType<typeof createServer> | null = null;
  let compCtx: Awaited<ReturnType<Browser["newContext"]>> | null = null;

  try {
    const plates = await renderStudioPlates(
      browser,
      {
        layout,
        eyebrow: spec.eyebrow,
        headline: spec.headline,
        subline: spec.subline,
        barTitle: spec.barTitle,
        pills: scenes.map((s) => ({ id: s.id, text: s.label })),
      },
      tempDir
    );

    const backdropUrl = plates.backdropPng ? registerPng(plates.backdropPng) : undefined;
    const chromeUrl = plates.chromePng ? registerPng(plates.chromePng) : undefined;
    const introUrl = plates.introPng ? registerPng(plates.introPng) : undefined;
    const outroUrl = plates.outroPng ? registerPng(plates.outroPng) : undefined;

    const serializedScenes: SerializedScene[] = scenes.map((s) => {
      const pill = plates.pillPngs.get(s.id);
      return {
        id: s.id,
        label: s.label,
        durationSec: s.durationSec,
        viewportWidth: s.viewportWidth,
        viewportHeight: s.viewportHeight,
        deviceScaleFactor: s.deviceScaleFactor,
        uiFrames: s.uiFrames.map((f) => ({ time: f.time, url: registerPng(f.png) })),
        cursorPoints: s.cursorPoints,
        cameraCues: s.cameraCues,
        pillUrl: pill ? registerPng(pill.png) : undefined,
        pillW: pill?.width,
        pillH: pill?.height,
      };
    });

    const isBento = layout.win === null;
    // Straight into tool action — zero slow intro or outro slates
    const introDur = 0;
    const outroDur = 0;
    const overlapDur = isBento ? 0 : 0.34;

    const sceneSchedule: Array<{ start: number; end: number; scene: SerializedScene }> = [];
    let cursorT = introDur;
    for (let i = 0; i < serializedScenes.length; i++) {
      const s = serializedScenes[i];
      const start = i === 0 ? cursorT : cursorT - overlapDur;
      const end = start + s.durationSec;
      sceneSchedule.push({ start, end, scene: s });
      cursorT = end;
    }
    const stageEnd = sceneSchedule[sceneSchedule.length - 1].end;
    const totalDurationSec = stageEnd;
    const totalFrames = Math.max(30, Math.round(totalDurationSec * 60));

    let receivedH264: Buffer | null = null;
    const payloadJson = JSON.stringify({
      outWidth: layout.outWidth,
      outHeight: layout.outHeight,
      win: layout.win,
      backdropUrl,
      chromeUrl,
      introUrl,
      outroUrl,
      introDur,
      outroDur,
      stageEnd,
      totalDurationSec,
      totalFrames,
      sceneSchedule,
    });

    server = createServer((req, res) => {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(buildCompositorHtml(layout.outWidth, layout.outHeight));
        return;
      }
      if (req.method === "GET" && req.url === "/job.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(payloadJson);
        return;
      }
      if (req.method === "GET" && req.url && assetMap.has(req.url)) {
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(assetMap.get(req.url));
        return;
      }
      if (req.method === "POST" && req.url === "/h264") {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          receivedH264 = Buffer.concat(chunks);
          res.writeHead(200);
          res.end("ok");
        });
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });

    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    compCtx = await browser.newContext({
      viewport: { width: layout.outWidth, height: layout.outHeight },
      deviceScaleFactor: 1,
    });
    const page = await compCtx.newPage();
    page.on("pageerror", (err) => {
      console.error("[Compositor PageError]", err);
    });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate("window.__runCompositor()");

    if (!receivedH264 || (receivedH264 as Buffer).length === 0) {
      throw new Error("Compositor produced empty H.264 stream");
    }

    const masterH264Path = path.join(tempDir, "master.h264");
    await writeFile(masterH264Path, receivedH264);

    // Transcode 24 Mbps WebCodecs master -> tuned BT.709 H.264 MP4 for social & portfolio
    await runFfmpeg([
      "-y",
      "-r",
      "60",
      "-f",
      "h264",
      "-i",
      masterH264Path,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "17",
      "-profile:v",
      "high",
      "-level:v",
      "4.2",
      "-pix_fmt",
      "yuv420p",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-movflags",
      "+faststart",
      "-an",
      outputMp4,
    ]);

    if (outputWebm) {
      await runFfmpeg([
        "-y",
        "-i",
        outputMp4,
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
        outputWebm,
      ]);
    }

    return {
      durationSec: Number(totalDurationSec.toFixed(2)),
      frameCount: totalFrames,
      outputMp4,
      outputWebm,
    };
  } finally {
    await compCtx?.close().catch(() => {});
    server?.close();
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function buildCompositorHtml(width: number, height: number): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#181411;">
<canvas id="stage" width="${width}" height="${height}"></canvas>
<script>
(() => {
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function smootherstep(u) {
    u = clamp(u, 0, 1);
    return u * u * u * (10 + u * (-15 + 6 * u));
  }

  async function loadBitmap(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return createImageBitmap(blob);
  }

  function evalCamera(cues, t) {
    let cx = cues[0]?.cx ?? 0.5;
    let cy = cues[0]?.cy ?? 0.5;
    let scale = cues[0]?.scale ?? 1.0;
    for (let i = 1; i < cues.length; i++) {
      const p = cues[i - 1];
      const c = cues[i];
      const s = smootherstep((t - c.time) / Math.max(0.05, c.transitionSec));
      cx += (c.cx - p.cx) * s;
      cy += (c.cy - p.cy) * s;
      scale += (c.scale - p.scale) * s;
    }
    return { cx, cy, scale: Math.max(1.0, scale) };
  }

  function evalCursor(points, t) {
    if (!points || points.length === 0) return { x: -100, y: -100, pressed: false };
    if (t <= points[0].time) return { x: points[0].x, y: points[0].y, pressed: points[0].kind === "down" };

    // Track press state & active pointer segment
    let pressed = false;
    let idx = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].time <= t) {
        if (points[i].kind === "down") pressed = true;
        else if (points[i].kind === "up") pressed = false;
      }
      if (points[i].time > t) {
        idx = Math.max(0, i - 1);
        break;
      }
    }

    const a = points[idx];
    const b = points[Math.min(points.length - 1, idx + 1)];
    if (!b || b === a || b.time <= a.time) {
      return { x: a.x, y: a.y, pressed };
    }

    const rawU = clamp((t - a.time) / (b.time - a.time), 0, 1);
    if (b.lockedDrag) {
      return {
        x: a.x + (b.x - a.x) * rawU,
        y: a.y + (b.y - a.y) * rawU,
        pressed,
      };
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const u = smootherstep(rawU);
    let px = a.x + dx * u;
    let py = a.y + dy * u;

    // Gentle organic flight arc on longer jumps (peaks mid-flight, zero at endpoints)
    if (dist > 36) {
      const bow = Math.min(22, dist * 0.055) * Math.sin(Math.PI * rawU);
      const sign = dx >= 0 ? -1 : 1;
      px += (-dy / dist) * bow * sign;
      py += (dx / dist) * bow * sign;
    }

    return { x: px, y: py, pressed };
  }

  function findUIFrame(frames, t) {
    let lo = 0, hi = frames.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].time <= t) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return frames[ans].bitmap;
  }

  function drawPointerVector(ctx, x, y, scale, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(18.5, 11.4);
    ctx.lineTo(10.0, 13.5);
    ctx.lineTo(6.1, 21.5);
    ctx.closePath();

    ctx.fillStyle = "#181411";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = "#eeeeee";
    ctx.stroke();

    ctx.restore();
  }

  function renderSceneContent(ctx, job, sched, tGlobal, vpRect) {
    const localT = clamp(tGlobal - sched.start, 0, sched.scene.durationSec);
    const s = sched.scene;
    const bmp = findUIFrame(s.uiFrames, localT);
    const cam = evalCamera(s.cameraCues, localT);

    const srcW = bmp.width / cam.scale;
    const srcH = bmp.height / cam.scale;
    const srcX = clamp(cam.cx * bmp.width - srcW / 2, 0, Math.max(0, bmp.width - srcW));
    const srcY = clamp(cam.cy * bmp.height - srcH / 2, 0, Math.max(0, bmp.height - srcH));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, srcX, srcY, srcW, srcH, vpRect.x, vpRect.y, vpRect.w, vpRect.h);

    // Click ripples (#ff9900 expanding rings) — derive scale from actual screenshot pixel dimensions
    const scaleX = bmp.width / s.viewportWidth;
    const scaleY = bmp.height / s.viewportHeight;
    for (const pt of s.cursorPoints) {
      if (pt.kind !== "down") continue;
      const age = localT - pt.time;
      if (age < 0 || age > 0.45) continue;
      const ox = vpRect.x + (((pt.x * scaleX) - srcX) / srcW) * vpRect.w;
      const oy = vpRect.y + (((pt.y * scaleY) - srcY) / srcH) * vpRect.h;
      const p = age / 0.45;
      const eased = 1 - Math.pow(1 - p, 3);
      const radius = 5 + eased * 30;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 153, 0, " + ((1 - p) * 0.92).toFixed(3) + ")";
      ctx.lineWidth = 2.5;
      ctx.fillStyle = "rgba(255, 153, 0, " + ((1 - p) * 0.18).toFixed(3) + ")";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Subpixel pointer + velocity motion blur
    const curNow = evalCursor(s.cursorPoints, localT);
    const curPrev = evalCursor(s.cursorPoints, Math.max(0, localT - 1 / 60));
    const cxNow = vpRect.x + (((curNow.x * scaleX) - srcX) / srcW) * vpRect.w;
    const cyNow = vpRect.y + (((curNow.y * scaleY) - srcY) / srcH) * vpRect.h;
    const cxPrev = vpRect.x + (((curPrev.x * scaleX) - srcX) / srcW) * vpRect.w;
    const cyPrev = vpRect.y + (((curPrev.y * scaleY) - srcY) / srcH) * vpRect.h;

    const vx = cxNow - cxPrev;
    const vy = cyNow - cyPrev;
    const speed = Math.hypot(vx, vy);
    const arrowScale = (curNow.pressed ? 0.84 : 1.0) * 1.18;

    if (speed > 3.5) {
      const echoes = 4;
      for (let e = echoes; e >= 1; e--) {
        const frac = e / (echoes + 1);
        drawPointerVector(
          ctx,
          cxNow - vx * frac * 1.35,
          cyNow - vy * frac * 1.35,
          arrowScale,
          0.16 * (1 - frac * 0.65)
        );
      }
    }
    drawPointerVector(ctx, cxNow, cyNow, arrowScale, 1.0);
  }

  window.__runCompositor = async () => {
    const job = await (await fetch("/job.json")).json();

    // Decode all plates & UI snapshots up front
    const [backdropBmp, chromeBmp, introBmp, outroBmp] = await Promise.all([
      job.backdropUrl ? loadBitmap(job.backdropUrl) : null,
      job.chromeUrl ? loadBitmap(job.chromeUrl) : null,
      job.introUrl ? loadBitmap(job.introUrl) : null,
      job.outroUrl ? loadBitmap(job.outroUrl) : null,
    ]);

    for (const sched of job.sceneSchedule) {
      const bitmaps = await Promise.all(sched.scene.uiFrames.map((f) => loadBitmap(f.url)));
      sched.scene.uiFrames.forEach((f, i) => { f.bitmap = bitmaps[i]; });
      if (sched.scene.pillUrl) {
        sched.scene.pillBitmap = await loadBitmap(sched.scene.pillUrl);
      }
    }

    const canvas = document.getElementById("stage");
    const ctx = canvas.getContext("2d", { alpha: false });
    const vpRect = job.win
      ? { x: job.win.x, y: job.win.y + job.win.titlebarH, w: job.win.w, h: job.win.h }
      : { x: 0, y: 0, w: job.outWidth, h: job.outHeight };

    const chunks = [];
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        chunks.push(buf);
      },
      error: (err) => { throw err; }
    });

    encoder.configure({
      codec: "avc1.640033",
      width: job.outWidth,
      height: job.outHeight,
      bitrate: 24_000_000,
      framerate: 60,
      avc: { format: "annexb" }
    });

    for (let f = 0; f < job.totalFrames; f++) {
      const t = f / 60;
      ctx.fillStyle = "#eeeeee";
      ctx.fillRect(0, 0, job.outWidth, job.outHeight);

      ctx.save();
      if (backdropBmp) {
        ctx.drawImage(backdropBmp, 0, 0, job.outWidth, job.outHeight);
      }

      // Clip viewport to crisp rounded bottom window rect
      ctx.save();
      ctx.beginPath();
      if (job.win) {
        const r = job.win.radius;
        const x = vpRect.x, y = vpRect.y, w = vpRect.w, h = vpRect.h;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.closePath();
      } else {
        ctx.rect(0, 0, job.outWidth, job.outHeight);
      }
      ctx.clip();

      // Render active scene(s), cross-fading smoothly on scene handoffs
      for (let si = 0; si < job.sceneSchedule.length; si++) {
        const sched = job.sceneSchedule[si];
        if (t < sched.start || t > sched.end) continue;
        const fadeIn = si > 0 ? smootherstep((t - sched.start) / 0.34) : 1;
        ctx.save();
        ctx.globalAlpha = clamp(fadeIn, 0, 1);
        renderSceneContent(ctx, job, sched, t, vpRect);
        ctx.restore();
      }
      ctx.restore();

      if (chromeBmp) {
        ctx.drawImage(chromeBmp, 0, 0, job.outWidth, job.outHeight);
      }
      ctx.restore();

      if (encoder.encodeQueueSize > 8) {
        await new Promise((resolve) => encoder.addEventListener("dequeue", resolve, { once: true }));
      }
      const vf = new VideoFrame(canvas, {
        timestamp: Math.round((f * 1_000_000) / 60),
        duration: Math.round(1_000_000 / 60),
      });
      encoder.encode(vf, { keyFrame: f % 60 === 0 });
      vf.close();
    }

    await encoder.flush();
    encoder.close();

    const totalLen = chunks.reduce((s, c) => s + c.byteLength, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    await fetch("/h264", { method: "POST", body: merged });
  };
})();
</script>
</body>
</html>`;
}
