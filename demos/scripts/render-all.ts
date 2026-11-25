import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { runImageFullScene } from "../flows/image-full.js";
import { runSecretGeneratorScene } from "../flows/secret-generator.js";
import { runVideoFullScene } from "../flows/video-full.js";
import { composeVideo } from "../lib/compositor.js";
import { OUTPUT_LAYOUTS, type OutputFormat } from "../lib/compositor-html.js";
import { captureToolScene } from "../lib/scene-runner.js";
import type { RecordedScene } from "../lib/stage-capture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMOS_ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(DEMOS_ROOT, "output");

type TargetName = "image-optimizer" | "video-optimizer" | "secret-generator";

interface RenderJobConfig {
  name: TargetName;
  formats: OutputFormat[];
  barTitle: string;
  buildScenes: (
    browser: Browser,
    baseUrl: string,
    layout: (typeof OUTPUT_LAYOUTS)[OutputFormat]
  ) => Promise<RecordedScene[]>;
}

const ALL_JOBS: RenderJobConfig[] = [
  {
    name: "image-optimizer",
    formats: ["16x9"],
    barTitle: "forthweb.jotadebeese.com/image-optimizer",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureToolScene(
        {
          browser,
          baseUrl,
          toolId: "image-optimizer",
          pillLabel: "",
          layout,
          variant: "spotlight",
        },
        (rec, v) => runImageFullScene(rec, v)
      ),
    ],
  },
  {
    name: "video-optimizer",
    formats: ["16x9"],
    barTitle: "forthweb.jotadebeese.com/video-optimizer",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureToolScene(
        {
          browser,
          baseUrl,
          toolId: "video-optimizer",
          pillLabel: "",
          layout,
          variant: "spotlight",
        },
        (rec, v) => runVideoFullScene(rec, v)
      ),
    ],
  },
  {
    name: "secret-generator",
    formats: ["16x9"],
    barTitle: "forthweb.jotadebeese.com/secret-generator",
    buildScenes: async (browser, baseUrl, layout) => [
      await captureToolScene(
        {
          browser,
          baseUrl,
          toolId: "secret-generator",
          pillLabel: "",
          layout,
          variant: "spotlight",
        },
        (rec, v) => runSecretGeneratorScene(rec, v)
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

function normalizeForthwebBaseUrl(raw: string): string {
  const parsed = new URL(raw);
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    parsed.hostname = "forthweb.localhost";
  }
  return parsed.toString().replace(/\/+$/, "");
}

async function assertServerReachable(baseUrl: string): Promise<void> {
  const parsed = new URL(baseUrl);
  const target = `${baseUrl}/`;

  if (parsed.protocol === "http:" && parsed.hostname.endsWith(".localhost")) {
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: Number(parsed.port) || 80,
          path: "/",
          method: "GET",
          headers: { host: parsed.host },
          timeout: 8000,
        },
        (res) => {
          res.resume();
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 400) {
            resolve();
          } else {
            reject(new Error(`HTTP ${status} from ${target}`));
          }
        }
      );
      req.on("timeout", () => {
        req.destroy(new Error(`Timed out connecting to ${target}`));
      });
      req.on("error", reject);
      req.end();
    }).catch((err) => {
      throw new Error(
        `Forthweb page is not reachable at ${target}. Start the dev server (yarn dev) or pass DEMO_BASE_URL. Details: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });
    return;
  }

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
  const baseUrl = normalizeForthwebBaseUrl(
    process.env.DEMO_BASE_URL || "http://forthweb.localhost:3000"
  );
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
      "--host-resolver-rules=MAP *.localhost 127.0.0.1",
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
        const outputMp4 = path.join(OUTPUT_ROOT, `forthweb-${job.name}.mp4`);

        console.log(`-> Capturing + compositing [${job.name}] (${format}) ...`);
        const scenes = await job.buildScenes(browser, baseUrl, layout);
        const res = await composeVideo(browser, {
          layout,
          eyebrow: "",
          headline: "",
          subline: "",
          barTitle: job.barTitle,
          scenes,
          outputMp4,
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
          )}`
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
