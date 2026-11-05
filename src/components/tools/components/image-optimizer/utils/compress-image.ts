import { OptimizerSettings, OutputFormat, ResizePreset } from "../types";
import { checkWebPEncodingSupport } from "./device";

export interface CompressionResult {
  blob: Blob;
  url: string;
  dimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number };
  size: number;
  format: OutputFormat;
  hasAlpha: boolean;
}

function calculateTargetDimensions(
  origW: number,
  origH: number,
  preset: ResizePreset,
  customMaxDimension?: number,
): { width: number; height: number } {
  if (preset === "original") {
    return { width: origW, height: origH };
  }

  if (preset === "50%") {
    return {
      width: Math.max(1, Math.round(origW * 0.5)),
      height: Math.max(1, Math.round(origH * 0.5)),
    };
  }

  let maxDimension = parseInt(preset, 10);
  if (preset === "custom" && customMaxDimension && customMaxDimension > 0) {
    maxDimension = customMaxDimension;
  }

  if (
    !isNaN(maxDimension) &&
    maxDimension > 0 &&
    (origW > maxDimension || origH > maxDimension)
  ) {
    if (origW >= origH) {
      const width = maxDimension;
      const height = Math.max(1, Math.round((origH * maxDimension) / origW));
      return { width, height };
    } else {
      const height = maxDimension;
      const width = Math.max(1, Math.round((origW * maxDimension) / origH));
      return { width, height };
    }
  }

  return { width: origW, height: origH };
}

/**
 * Optimizes Canvas RGBA pixel data for PNG's DEFLATE + scanline predictor:
 * 1. Clears hidden RGB noise on fully transparent pixels (alpha === 0).
 * 2. When quality < 100, applies adaptive color-level quantization and horizontal
 *    scanline run-smoothing so PNG's Sub/Paeth filters produce long zero-delta runs.
 */
function quantizeCanvasForPng(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  quality: number,
): boolean {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let hasAlpha = false;

  if (quality >= 100) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 250) hasAlpha = true;
      if (a === 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return hasAlpha;
  }

  const deficit = Math.max(0, Math.min(1, (100 - quality) / 90));
  const step = Math.max(2, Math.round(2 + Math.pow(deficit, 1.35) * 62));
  const alphaStep = Math.max(2, Math.round(step * 0.5));
  const snapThreshold = Math.max(1, Math.floor(step * 0.6));
  const rowStride = width * 4;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowStride;
    let prevR = -999;
    let prevG = -999;
    let prevB = -999;
    let prevA = -999;

    for (let x = 0; x < rowStride; x += 4) {
      const idx = rowStart + x;
      const a = data[idx + 3];
      if (a < 250) hasAlpha = true;

      if (a === 0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        prevR = 0;
        prevG = 0;
        prevB = 0;
        prevA = 0;
        continue;
      }

      let r = Math.min(255, Math.round(data[idx] / step) * step);
      let g = Math.min(255, Math.round(data[idx + 1] / step) * step);
      let b = Math.min(255, Math.round(data[idx + 2] / step) * step);
      let qa =
        a === 255
          ? 255
          : Math.min(255, Math.round(a / alphaStep) * alphaStep);

      if (
        Math.abs(r - prevR) <= snapThreshold &&
        Math.abs(g - prevG) <= snapThreshold &&
        Math.abs(b - prevB) <= snapThreshold &&
        Math.abs(qa - prevA) <= snapThreshold
      ) {
        r = prevR;
        g = prevG;
        b = prevB;
        qa = prevA;
      } else {
        prevR = r;
        prevG = g;
        prevB = b;
        prevA = qa;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = qa;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return hasAlpha;
}

function detectCanvasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const totalPixels = width * height;
    const pixelStep = Math.max(1, Math.floor(totalPixels / 16384)) * 4;
    for (let i = 3; i < data.length; i += pixelStep) {
      if (data[i] < 250) return true;
    }
  } catch {}
  return false;
}

export async function compressImage(
  file: File,
  settings: OptimizerSettings,
  onProgress?: (progress: number) => void,
): Promise<CompressionResult> {
  return new Promise(async (resolve, reject) => {
    onProgress?.(15);
    try {
      let source: CanvasImageSource;
      let origW: number;
      let origH: number;
      let cleanup: (() => void) | null = null;

      if (typeof createImageBitmap === "function") {
        try {
          const bitmap = await createImageBitmap(file, {
            imageOrientation: "from-image",
          });
          source = bitmap;
          origW = bitmap.width;
          origH = bitmap.height;
          cleanup = () => bitmap.close();
        } catch (bitmapErr) {
          console.warn(
            "createImageBitmap failed, falling back to Image()",
            bitmapErr,
          );
          const objectUrl = URL.createObjectURL(file);
          const img = await new Promise<HTMLImageElement>((res, rej) => {
            const el = new Image();
            el.onload = () => res(el);
            el.onerror = () =>
              rej(new Error(`Failed to load image: ${file.name}`));
            el.src = objectUrl;
          });
          source = img;
          origW = img.naturalWidth || img.width;
          origH = img.naturalHeight || img.height;
          cleanup = () => URL.revokeObjectURL(objectUrl);
        }
      } else {
        const objectUrl = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image();
          el.onload = () => res(el);
          el.onerror = () =>
            rej(new Error(`Failed to load image: ${file.name}`));
          el.src = objectUrl;
        });
        source = img;
        origW = img.naturalWidth || img.width;
        origH = img.naturalHeight || img.height;
        cleanup = () => URL.revokeObjectURL(objectUrl);
      }

      onProgress?.(45);

      const { width: targetW, height: targetH } = calculateTargetDimensions(
        origW,
        origH,
        settings.resizePreset,
        settings.customMaxDimension,
      );

      // Determine effective format: if user requests WebP but browser lacks native WebP canvas encoding
      // (iOS Safari / Chrome iOS WebKit), fallback to JPEG so lossy quality compression works.
      let effectiveFormat: OutputFormat = settings.format;
      if (effectiveFormat === "image/webp" && !checkWebPEncodingSupport()) {
        effectiveFormat = "image/jpeg";
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext("2d", {
        willReadFrequently:
          effectiveFormat === "image/png" || file.type !== "image/jpeg",
      });
      if (!ctx) {
        throw new Error("Unable to obtain canvas 2D rendering context.");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, targetW, targetH);

      onProgress?.(70);
      ctx.drawImage(source, 0, 0, targetW, targetH);
      cleanup?.();

      let hasAlpha = false;
      if (effectiveFormat === "image/png") {
        hasAlpha = quantizeCanvasForPng(
          ctx,
          targetW,
          targetH,
          settings.quality,
        );
      } else if (file.type !== "image/jpeg") {
        hasAlpha = detectCanvasTransparency(ctx, targetW, targetH);
      }

      if (effectiveFormat === "image/jpeg") {
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.globalCompositeOperation = "source-over";
      }

      const qualityParam = Math.max(0.1, Math.min(1.0, settings.quality / 100));

      onProgress?.(85);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob encoding returned null"));
            return;
          }

          // Safety net: if WebP was requested but the browser silently exported PNG (HTML5 spec silent fallback),
          // re-encode to JPEG so the user never gets hit by a 15MB uncompressed PNG masquerading as WebP.
          if (effectiveFormat === "image/webp" && blob.type === "image/png") {
            canvas.toBlob(
              (jpegBlob) => {
                if (!jpegBlob) {
                  reject(new Error("Canvas JPEG fallback encoding returned null"));
                  return;
                }
                const fallbackUrl = URL.createObjectURL(jpegBlob);
                onProgress?.(100);
                resolve({
                  blob: jpegBlob,
                  url: fallbackUrl,
                  dimensions: { width: targetW, height: targetH },
                  originalDimensions: { width: origW, height: origH },
                  size: jpegBlob.size,
                  format: "image/jpeg",
                  hasAlpha,
                });
              },
              "image/jpeg",
              qualityParam,
            );
            return;
          }

          const optimizedUrl = URL.createObjectURL(blob);
          onProgress?.(100);

          resolve({
            blob,
            url: optimizedUrl,
            dimensions: { width: targetW, height: targetH },
            originalDimensions: { width: origW, height: origH },
            size: blob.size,
            format: effectiveFormat,
            hasAlpha,
          });
        },
        effectiveFormat,
        qualityParam,
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number; url: string }> {
  const objectUrl = URL.createObjectURL(file);

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      return { width, height, url: objectUrl };
    } catch (e) {
      console.warn(
        "createImageBitmap failed in getImageDimensions, falling back to Image",
        e,
      );
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        url: objectUrl,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to read dimensions for ${file.name}`));
    };
    img.src = objectUrl;
  });
}
