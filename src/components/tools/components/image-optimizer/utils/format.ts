import { OutputFormat } from "../types";

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function calculateSavings(original: number, optimized: number) {
  const bytesSaved = original - optimized;
  const percentSaved =
    original > 0 ? Math.round((bytesSaved / original) * 100) : 0;
  return {
    bytesSaved,
    percentSaved,
    isReduced: bytesSaved > 0,
  };
}

export function getDefaultOutputBaseName(originalName: string): string {
  const lastDot = originalName.lastIndexOf(".");
  return lastDot !== -1 ? originalName.slice(0, lastDot) : originalName;
}

export function getFilenameWithExtension(
  originalName: string,
  targetMime: OutputFormat,
  customName?: string,
): string {
  const extMap: Record<OutputFormat, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const ext = extMap[targetMime] || "webp";
  const trimmedCustom = customName?.trim();
  if (trimmedCustom) {
    const cleaned = trimmedCustom.replace(/\.(webp|jpe?g|png|avif|gif)$/i, "");
    return `${cleaned || getDefaultOutputBaseName(originalName)}.${ext}`;
  }

  return `${getDefaultOutputBaseName(originalName)}.${ext}`;
}

export function getFormatLabel(mimeType: string): string {
  switch (mimeType) {
    case "image/webp":
      return "WebP";
    case "image/jpeg":
      return "JPEG";
    case "image/png":
      return "PNG";
    case "image/avif":
      return "AVIF";
    case "image/svg+xml":
      return "SVG";
    default:
      return mimeType.replace("image/", "").toUpperCase();
  }
}
