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
      "CSPRNG UUID v7, v4, 256-bit API keys, and passwords generated locally via Web Crypto API.",
    apiBadge: "Web Crypto API",
  },
  {
    id: "jwt-inspector",
    name: "Zero-Knowledge JWT Inspector",
    shortDesc:
      "Offline token claim decoder and expiration countdown with zero network calls.",
    apiBadge: "atob / JSON",
  },
  {
    id: "image-optimizer",
    name: "Web Image Optimizer",
    shortDesc:
      "Instant client-side WebP, JPEG, and PNG compression via HTML5 Canvas — files never leave your device.",
    apiBadge: "HTML5 Canvas",
  },
  {
    id: "video-optimizer",
    name: "Web Video Compressor",
    shortDesc:
      "Hardware-accelerated MP4 & WebM encoding via browser GPU WebCodecs — 100% local, zero server uploads.",
    apiBadge: "WebCodecs GPU",
  },
];
