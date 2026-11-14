import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { runBentoLoopScene } from "../flows/bento-loop.js";
import { runImageFullScene } from "../flows/image-full.js";
import { runImageOptimizerScene } from "../flows/image-optimizer.js";
import { runSecretGeneratorScene } from "../flows/secret-generator.js";
import { runVideoFullScene } from "../flows/video-full.js";
import { runVideoOptimizerScene } from "../flows/video-optimizer.js";
import { composeVideo } from "../lib/compositor.js";
import { OUTPUT_LAYOUTS, type OutputFormat } from "../lib/compositor-html.js";
import { captureToolScene, type SceneVariant } from "../lib/scene-runner.js";
import type { RecordedScene } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMOS_ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(DEMOS_ROOT, "output");

type TargetName =
  | "launch"
  | "bento"
  | "secret-generator"
  | "image-optimizer"
  | "video-optimizer"
  | "image-full"
  | "video-full";

interface RenderJobConfig {
  name: TargetName;
  formats: OutputFormat[];
  eyebrow: string;
  headline: string;
  subline: string;
  barTitle: string;
  buildScenes: (
    browser: Browser,
    baseUrl: string,
    layout: (typeof OUTPUT_LAYOUTS)[OutputFormat]
  ) => Promise<RecordedScene[]>;
}

const TOOL_SCRIPT_MAP = {
  "secret-generator": {
    pillSpotlight: "CRYPTOGRAPHIC KEYS & UUID V7 · WEB CRYPTO API",
    pillTrailer: "01 / 03 · CRYPTOGRAPHIC KEYS & UUID V7",
    run: runSecretGeneratorScene,
  },
  "image-optimizer": {
    pillSpotlight: "WEB IMAGE OPTIMIZER · HTML5 CANVAS WEBP",
    pillTrailer: "02 / 03 · IMAGE OPTIMIZER · -95% LOCALLY",
    run: runImageOptimizerScene,
  },
  "video-optimizer": {
    pillSpotlight: "WEBCODECS VIDEO STUDIO · ZERO UPLOADS",
    pillTrailer: "03 / 03 · GPU WEBCODECS VIDEO STUDIO",
    run: runVideoOptimizerScene,
  },
} as const;

async function captureSingle(
  browser: Browser,
  baseUrl: string,
  toolId: keyof typeof TOOL_SCRIPT_MAP,
  layout: (typeof OUTPUT_LAYOUTS)[OutputFormat],
  variant: SceneVariant
): Promise<RecordedScene> {
  const entry = TOOL_SCRIPT_MAP[toolId];
  const pill = variant === "trailer" ? entry.pillTrailer : entry.pillSpotlight;
  return captureToolScene(
    { browser, baseUrl, toolId, pillLabel: pill, layout, variant },
    (rec, v) => entry.run(rec, v)
  );
}

const ALL_JOBS: RenderJobConfig[] = [
  {
    name: "launch",
    formats: ["16x9", "4x5"],
    eyebrow: "FORTHWEB · BROWSER-NATIVE SUITE",
    headline: "3 privacy-first developer utilities.",
    subline: "Web Crypto · HTML5 Canvas · GPU WebCodecs. Zero server uploads.",
    barTitle: "ALL-IN-ONE LAUNCH",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureSingle(browser, baseUrl, "secret-generator", layout, "trailer"),
      await captureSingle(browser, baseUrl, "image-optimizer", layout, "trailer"),
      await captureSingle(browser, baseUrl, "video-optimizer", layout, "trailer"),
    ],
  },
  {
    name: "secret-generator",
    formats: ["16x9", "4x5"],
    eyebrow: "FORTHWEB · WEB CRYPTO API",
    headline: "Cryptographic keys & UUID v7.",
    subline: "Generated locally via crypto.getRandomValues(). Zero network calls.",
    barTitle: "KEYS & UUID V7",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureSingle(browser, baseUrl, "secret-generator", layout, "spotlight"),
    ],
  },
  {
    name: "image-optimizer",
    formats: ["16x9", "4x5"],
    eyebrow: "FORTHWEB · HTML5 CANVAS",
    headline: "Cut 95% image weight locally.",
    subline: "Batch WebP/JPEG compression with pixel-level split inspection.",
    barTitle: "IMAGE OPTIMIZER",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureSingle(browser, baseUrl, "image-optimizer", layout, "spotlight"),
    ],
  },
  {
    name: "video-optimizer",
    formats: ["16x9", "4x5"],
    eyebrow: "FORTHWEB · WEBCODECS API",
    headline: "Trim & compress video in browser.",
    subline: "Hardware-accelerated MP4 & WebM encoding. Nothing leaves your device.",
    barTitle: "VIDEO STUDIO",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureSingle(browser, baseUrl, "video-optimizer", layout, "spotlight"),
    ],
  },
  {
    name: "image-full",
    formats: ["16x9", "4x5"],
    eyebrow: "FORTHWEB · HTML5 CANVAS",
    headline: "",
    subline: "",
    barTitle: "IMAGE OPTIMIZER",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureToolScene(
        {
          browser,
          baseUrl,
          toolId: "image-optimizer",
          pillLabel: "IMAGE OPTIMIZER",
          layout,
          variant: "spotlight",
        },
        (rec, v) => runImageFullScene(rec, v)
      ),
    ],
  },
  {
    name: "video-full",
    formats: ["16x9", "4x5"],
    eyebrow: "FORTHWEB · WEBCODECS API",
    headline: "",
    subline: "",
    barTitle: "VIDEO STUDIO",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureToolScene(
        {
          browser,
          baseUrl,
          toolId: "video-optimizer",
          pillLabel: "VIDEO STUDIO",
          layout,
          variant: "spotlight",
        },
        (rec, v) => runVideoFullScene(rec, v)
      ),
    ],
  },
  {
    name: "bento",
    formats: ["bento"],
    eyebrow: "FORTHWEB",
    headline: "",
    subline: "",
    barTitle: "",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureToolScene(
        {
          browser,
          baseUrl,
          toolId: "image-optimizer",
          pillLabel: "BENTO",
          layout,
          variant: "spotlight",
        },
        (rec) => runBentoLoopScene(rec)
      ),
    ],
  },
];

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function assertServerReachable(baseUrl: string): Promise<void> {
  const target = `${baseUrl}/projects/forthweb`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(target, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${target}`);
    }
  } catch (err) {
    throw new Error(
      `Forthweb page is not reachable at ${target}. Start the dev server (yarn dev) or pass DEMO_BASE_URL. Details: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const baseUrl = (process.env.DEMO_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const onlyArg = parseArg("--only") as TargetName | undefined;
  const formatArg = parseArg("--format") as OutputFormat | "all" | undefined;

  await assertServerReachable(baseUrl);

  const selectedJobs = ALL_JOBS.filter((j) => (!onlyArg ? true : j.name === onlyArg));
  if (selectedJobs.length === 0) {
    throw new Error(
      `Unknown --only target "${onlyArg}". Valid values: ${ALL_JOBS.map((j) => j.name).join(", ")}`
    );
  }

  console.log(`\n[Forthweb Studio v2] Base URL: ${baseUrl}`);
  console.log(`[Forthweb Studio v2] Output: ${OUTPUT_ROOT}\n`);

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: [
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  const results: Array<{
    job: string;
    format: OutputFormat;
    durationSec: number;
    frames: number;
    mp4: string;
  }> = [];

  try {
    for (const job of selectedJobs) {
      const formats = job.formats.filter((f) =>
        !formatArg || formatArg === "all" ? true : f === formatArg
      );

      for (const format of formats) {
        const layout = OUTPUT_LAYOUTS[format];
        const isBento = format === "bento";
        const outDir = path.join(OUTPUT_ROOT, isBento ? "bento" : "social");
        const baseName = isBento ? "forthweb-bento" : `forthweb-${job.name}-${format}`;
        const outputMp4 = path.join(outDir, `${baseName}.mp4`);
        const outputWebm = isBento ? path.join(outDir, `${baseName}.webm`) : undefined;

        console.log(`-> Capturing + compositing [${job.name}] (${format}) ...`);
        const scenes = await job.buildScenes(browser, baseUrl, layout);
        const res = await composeVideo(browser, {
          layout,
          eyebrow: job.eyebrow,
          headline: job.headline,
          subline: job.subline,
          barTitle: job.barTitle,
          scenes,
          outputMp4,
          outputWebm,
        });

        results.push({
          job: job.name,
          format,
          durationSec: res.durationSec,
          frames: res.frameCount,
          mp4: res.outputMp4,
        });

        console.log(
          `   done: ${res.durationSec}s @ 60fps (${res.frameCount} frames) -> ${path.relative(
            DEMOS_ROOT,
            res.outputMp4
          )}${res.outputWebm ? ` + ${path.basename(res.outputWebm)}` : ""}`
        );
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("\n=== Forthweb Studio v2 Summary ===");
  for (const r of results) {
    console.log(
      `- ${r.job} [${r.format}]: ${r.durationSec}s (${r.frames} frames) -> ${path.relative(
        DEMOS_ROOT,
        r.mp4
      )}`
    );
  }
}

main().catch((err) => {
  console.error("\n[Forthweb Studio v2] FAILED:", err);
  process.exit(1);
});
