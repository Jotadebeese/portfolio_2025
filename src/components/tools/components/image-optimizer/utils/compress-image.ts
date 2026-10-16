import { OptimizerSettings, OutputFormat, ResizePreset } from "../types";
import { checkWebPEncodingSupport } from "./device";

export interface CompressionResult {
  blob: Blob;
  url: string;
  dimensions: { width: number; height: number };
  originalDimensions: { width: number; height: number };
  size: number;
  format: OutputFormat;
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

      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        throw new Error("Unable to obtain canvas 2D rendering context.");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (effectiveFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
      } else {
        ctx.clearRect(0, 0, targetW, targetH);
      }

      onProgress?.(70);
      ctx.drawImage(source, 0, 0, targetW, targetH);
      cleanup?.();

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
