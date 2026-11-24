export type ToolId =
  | "secret-generator"
  | "jwt-inspector"
  | "image-optimizer"
  | "video-optimizer";

export type ToolStatus = "live" | "coming-soon";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  shortName: string;
  shortDesc: string;
  apiBadge: string;
  status: ToolStatus;
}

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    id: "secret-generator",
    name: "Cryptographic Keys & UUID v7",
    shortName: "Secret Keys",
    shortDesc:
      "Generate UUIDs (v7 and v4), API keys, and passwords locally in your browser.",
    apiBadge: "Web Crypto API",
    status: "live",
  },
  {
    id: "jwt-inspector",
    name: "Zero-Knowledge JWT Inspector",
    shortName: "JWT Inspector",
    shortDesc:
      "Paste a JWT to inspect its claims and check when it expires, all offline.",
    apiBadge: "atob / JSON",
    status: "coming-soon",
  },
  {
    id: "image-optimizer",
    name: "Web Image Optimizer",
    shortName: "Image Optimizer",
    shortDesc:
      "Compress and resize images to WebP, JPEG, or PNG directly in your browser.",
    apiBadge: "HTML5 Canvas",
    status: "live",
  },
  {
    id: "video-optimizer",
    name: "Web Video Compressor",
    shortName: "Video Compressor",
    shortDesc:
      "Compress and trim videos to MP4 or WebM using your browser's GPU, no uploads needed.",
    apiBadge: "WebCodecs GPU",
    status: "live",
  },
];

export const LIVE_TOOLS: ToolDefinition[] = AVAILABLE_TOOLS.filter(
  (t) => t.status === "live",
);

export const LIVE_TOOL_IDS: ToolId[] = LIVE_TOOLS.map((t) => t.id);

export function getLiveToolById(id: string): ToolDefinition | undefined {
  return LIVE_TOOLS.find((t) => t.id === id);
}
