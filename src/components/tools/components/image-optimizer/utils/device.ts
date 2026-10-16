export type DeviceTier = "mobile" | "low-spec" | "desktop";

export interface DeviceLimits {
  tier: DeviceTier;
  maxFiles: number;
  maxFileSizeMb: number;
  label: string;
}

/**
 * Dynamically detects device hardware capabilities (cores, RAM, mobile/touch)
 * and returns safe operational limits for batch size and file size.
 */
export function getDeviceLimits(): DeviceLimits {
  if (typeof window === "undefined") {
    return {
      tier: "desktop",
      maxFiles: 50,
      maxFileSizeMb: 50,
      label: "Desktop",
    };
  }

  // 1. Mobile Detection (iOS Safari & Android strict memory budget)
  const isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (window.matchMedia &&
      window.matchMedia("(max-width: 768px)").matches &&
      "ontouchstart" in window);

  if (isMobile) {
    return {
      tier: "mobile",
      maxFiles: 20,
      maxFileSizeMb: 25,
      label: "Mobile",
    };
  }

  // 2. Hardware telemetry for desktop
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number })
    .deviceMemory;

  // Older / budget computer detection:
  // - Dual-core CPU (cores <= 2): e.g. Intel Celeron, Core 2 Duo, budget dual-core laptops
  // - Or low RAM reported (<= 4 GB)
  const isLowSpec = cores <= 2 || (typeof memory === "number" && memory <= 4);

  if (isLowSpec) {
    return {
      tier: "low-spec",
      maxFiles: 25,
      maxFileSizeMb: 30,
      label: "Standard / Older PC",
    };
  }

  // 3. Modern Multi-Core Desktop (4+ cores, 8GB+ RAM, Apple Silicon, modern x86)
  return {
    tier: "desktop",
    maxFiles: 50,
    maxFileSizeMb: 50,
    label: "High-spec Desktop",
  };
}

/**
 * Detects whether the current browser canvas genuinely supports WebP encoding.
 * All iOS browsers (Safari, Chrome iOS, Firefox iOS via WebKit) do not support
 * WebP encoding on canvas and silently fall back to uncompressed PNG, causing
 * 5x to 10x file size bloat.
 */
export function checkWebPEncodingSupport(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL("image/webp");
    return dataUrl.startsWith("data:image/webp");
  } catch {
    return false;
  }
}
