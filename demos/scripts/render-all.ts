import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBentoLoopFlow } from "../flows/bento-loop.js";
import { runImageOptimizerFlow } from "../flows/image-optimizer.js";
import { runSecretGeneratorFlow } from "../flows/secret-generator.js";
import { runVideoOptimizerFlow } from "../flows/video-optimizer.js";
import type { VideoFormat } from "../lib/studio-frame.js";
import { runRecordedDemo, type DemoSession } from "../lib/studio-recorder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMOS_ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(DEMOS_ROOT, "output");

type DemoName = "bento" | "image-optimizer" | "video-optimizer" | "secret-generator";
type SocialFormat = "16x9" | "4x5";

interface JobSpec {
  name: DemoName;
  toolQuery: string;
  toolBadge: string;
  formats: VideoFormat[];
  flow: (session: DemoSession) => Promise<void>;
}

const ALL_JOBS: JobSpec[] = [
  {
    name: "secret-generator",
    toolQuery: "secret-generator",
    toolBadge: "CRYPTOGRAPHIC KEYS & UUID V7",
    formats: ["16x9", "4x5"],
    flow: runSecretGeneratorFlow,
  },
  {
    name: "image-optimizer",
    toolQuery: "image-optimizer",
    toolBadge: "IN-BROWSER IMAGE OPTIMIZER",
    formats: ["16x9", "4x5"],
    flow: runImageOptimizerFlow,
  },
  {
    name: "video-optimizer",
    toolQuery: "video-optimizer",
    toolBadge: "WEBCODECS VIDEO STUDIO",
    formats: ["16x9", "4x5"],
    flow: runVideoOptimizerFlow,
  },
  {
    name: "bento",
    toolQuery: "image-optimizer",
    toolBadge: "BENTO",
    formats: ["bento"],
    flow: runBentoLoopFlow,
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
  const onlyArg = parseArg("--only") as DemoName | undefined;
  const formatArg = parseArg("--format") as SocialFormat | "bento" | "all" | undefined;

  await assertServerReachable(baseUrl);

  const selectedJobs = ALL_JOBS.filter((j) => (!onlyArg ? true : j.name === onlyArg));
  if (selectedJobs.length === 0) {
    throw new Error(
      `Unknown --only target "${onlyArg}". Valid values: ${ALL_JOBS.map((j) => j.name).join(", ")}`
    );
  }

  console.log(`\n[Forthweb Demos] Target base URL: ${baseUrl}`);
  console.log(`[Forthweb Demos] Output directory: ${OUTPUT_ROOT}\n`);

  const results: Array<{
    job: string;
    format: VideoFormat;
    durationSec: number;
    frames: number;
    mp4: string;
    webm?: string;
  }> = [];

  for (const job of selectedJobs) {
    const formats = job.formats.filter((fmt) => {
      if (!formatArg || formatArg === "all") return true;
      return fmt === formatArg;
    });

    for (const format of formats) {
      const url = `${baseUrl}/projects/forthweb?tools=${encodeURIComponent(job.toolQuery)}`;
      const isBento = format === "bento";
      const outDir = path.join(OUTPUT_ROOT, isBento ? "bento" : "social");
      const baseFilename = isBento ? "forthweb-bento" : `forthweb-${job.name}-${format}`;
      const outputMp4 = path.join(outDir, `${baseFilename}.mp4`);
      const outputWebm = isBento ? path.join(outDir, `${baseFilename}.webm`) : undefined;

      console.log(`-> Rendering [${job.name}] (${format}) ...`);
      const res = await runRecordedDemo(
        {
          url,
          format,
          toolBadge: job.toolBadge,
          outputMp4,
          outputWebm,
        },
        job.flow
      );

      results.push({
        job: job.name,
        format,
        durationSec: res.durationSec,
        frames: res.frameCount,
        mp4: res.outputMp4,
        webm: res.outputWebm,
      });

      console.log(
        `   done: ${res.durationSec}s (${res.frameCount} captured frames) -> ${path.relative(
          DEMOS_ROOT,
          res.outputMp4
        )}${res.outputWebm ? ` + ${path.basename(res.outputWebm)}` : ""}`
      );
    }
  }

  console.log("\n=== Render Summary ===");
  for (const r of results) {
    console.log(
      `- ${r.job} [${r.format}]: ${r.durationSec}s | ${r.frames} frames | ${path.relative(
        DEMOS_ROOT,
        r.mp4
      )}`
    );
  }
}

main().catch((err) => {
  console.error("\n[Forthweb Demos] FAILED:", err);
  process.exit(1);
});
