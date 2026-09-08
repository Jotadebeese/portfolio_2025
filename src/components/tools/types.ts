export type ToolId = "secret-generator" | "jwt-inspector" | "image-optimizer";

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
    shortDesc: "RFC 9562 UUID v7, v4, 256-bit API keys, & secure passwords.",
    apiBadge: "Web Crypto API",
  },
  {
    id: "jwt-inspector",
    name: "Zero-Knowledge JWT Inspector",
    shortDesc: "Offline token claim decoder and expiration countdown.",
    apiBadge: "atob / JSON",
  },
  {
    id: "image-optimizer",
    name: "Web Image Optimizer",
    shortDesc: "Local image compression and format conversion to WebP.",
    apiBadge: "HTML5 Canvas",
  },
];
