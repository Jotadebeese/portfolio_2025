export type ToolId =
  | "secret-generator"
  | "jwt-inspector"
  | "image-optimizer"
  | "video-optimizer";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  shortDesc: string;
  apiBadge: string;
}

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    id: "secret-generator",
    name: "Cryptographic Keys & UUID v7",
    shortDesc:
      "Generate UUIDs (v7 and v4), API keys, and passwords locally in your browser.",
    apiBadge: "Web Crypto API",
  },
  {
    id: "jwt-inspector",
    name: "Zero-Knowledge JWT Inspector",
    shortDesc:
      "Paste a JWT to inspect its claims and check when it expires, all offline.",
    apiBadge: "atob / JSON",
  },
  {
    id: "image-optimizer",
    name: "Web Image Optimizer",
    shortDesc:
      "Compress and resize images to WebP, JPEG, or PNG directly in your browser.",
    apiBadge: "HTML5 Canvas",
  },
  {
    id: "video-optimizer",
    name: "Web Video Compressor",
    shortDesc:
      "Compress and trim videos to MP4 or WebM using your browser's GPU, no uploads needed.",
    apiBadge: "WebCodecs GPU",
  },
];
