"use client";

import clsx from "clsx";
import { Download, Trash2, Columns2, Film, Info, Scissors } from "lucide-react";
import {
  VideoFileItem,
  VideoOptimizerSettings,
  VideoOutputFormat,
} from "../types";
import {
  formatBytes,
  calculateSavings,
  getVideoFilenameWithExtension,
  getFormatLabel,
  formatDuration,
  getEffectiveVideoDuration,
  hasEffectiveTrim,
  getVideoOrientation,
  getAdaptedPresetForTargetSize,
  estimateVideoSize,
} from "../utils/format";
import { calculateTargetVideoDimensions } from "../utils/compress-video";

type Props = {
  item: VideoFileItem | null;
  settings: VideoOptimizerSettings;
  onDownload: () => void;
  onDelete: () => void;
  onOpenCompare: () => void;
  onOpenEdit: () => void;
};

function getOriginalFormatLabel(name: string, file?: File): string {
  if (file?.type) {
    if (file.type === "video/mp4") return "MP4";
    if (file.type === "video/quicktime") return "MOV";
    if (file.type === "video/webm") return "WebM";
    if (file.type === "video/x-m4v") return "M4V";
  }
  const ext = name.split(".").pop()?.toUpperCase();
  return ext || "MP4";
}

export default function DetailsSidebar({
  item,
  settings,
  onDownload,
  onDelete,
  onOpenCompare,
  onOpenEdit,
}: Props) {
  if (!item) {
    return (
      <div className="border-border-color bg-background/30 text-foreground/70 flex h-full min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed p-6 text-center text-xs">
        <Info className="text-foreground/70 mb-2 h-6 w-6 stroke-1" />
        <span className="text-foreground">No video selected</span>
        <span>
          Click any row in the queue to view details and live preview.
        </span>
      </div>
    );
  }

  const effectiveDuration = getEffectiveVideoDuration(
    item.duration,
    item.trim,
    item.sections,
  );

  const isTrimmed = hasEffectiveTrim(item.duration, item.trim, item.sections);

  const orientation = getVideoOrientation(
    item.originalDimensions.width,
    item.originalDimensions.height,
  );

  const isStrippedAudio =
    item.stripAudio !== undefined ? item.stripAudio : settings.stripAudio;

  const effectivePreset =
    settings.mode === "target-size"
      ? getAdaptedPresetForTargetSize(
          settings.targetSizeMB ?? 8,
          effectiveDuration,
          Boolean(isStrippedAudio),
          settings.resizePreset,
          settings.format,
        )
      : settings.resizePreset;

  const targetDims = calculateTargetVideoDimensions(
    item.originalDimensions.width,
    item.originalDimensions.height,
    effectivePreset,
    settings.customMaxDimension,
  );

  const effectiveItemSettings = {
    ...settings,
    stripAudio: isStrippedAudio,
    sections: item.sections,
  };

  const estimatedBytes = estimateVideoSize(
    item.duration,
    effectiveItemSettings,
    item.trim,
    item.originalDimensions.width,
    item.originalDimensions.height,
    item.originalSize,
    item.sections,
  );

  const realSavings =
    item.compressedSize !== undefined
      ? calculateSavings(item.originalSize, item.compressedSize)
      : null;

  const estimatedSavings = calculateSavings(item.originalSize, estimatedBytes);

  const targetName = getVideoFilenameWithExtension(
    item.name,
    item.compressedFormat || settings.format,
  );

  const origFormatLabel = getOriginalFormatLabel(item.name, item.file);
  const targetFormatLabel = getFormatLabel(
    (item.compressedFormat || settings.format) as VideoOutputFormat,
  );

  return (
    <div className="flex flex-col gap-2.5 bg-white pt-2 text-xs">
      <div className="bg-background/40 relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded">
        {item.compressedUrl ? (
          <video
            key={item.compressedUrl}
            src={item.compressedUrl}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : item.originalUrl ? (
          <video
            key={item.originalUrl}
            src={item.originalUrl}
            poster={item.thumbnailUrl}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <Film className="text-foreground/30 h-8 w-8" />
        )}

        <div className="pointer-events-none absolute top-1.5 left-1.5 flex items-center gap-1">
          {orientation && (
            <span className="bg-foreground/70 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white/90 backdrop-blur-xs">
              {orientation.label} ({orientation.ratio})
            </span>
          )}
          {item.compressedUrl ? (
            <span className="bg-foreground/70 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white/90 backdrop-blur-xs">
              Compressed
            </span>
          ) : (
            <span className="bg-foreground/70 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white/90 backdrop-blur-xs">
              Original
            </span>
          )}
        </div>

        {item.duration > 0 && (
          <span className="bg-foreground/70 pointer-events-none absolute top-1.5 right-1.5 rounded border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white/90 backdrop-blur-xs">
            {formatDuration(effectiveDuration)}
          </span>
        )}
      </div>

      <div className="border-border-color flex items-start justify-between gap-2 border-b border-dashed pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <Film
              strokeWidth={1.5}
              className="text-foreground/70 h-3.5 w-3.5 shrink-0"
            />
            <h4 title={targetName} className="truncate">
              {targetName}
            </h4>
          </div>
          <span className="text-foreground/70 block truncate text-[10px]">
            Original: {item.name}
          </span>
        </div>

        {realSavings && realSavings.isReduced && (
          <span className="text-code-green bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
            -{realSavings.percentSaved}%
          </span>
        )}
        {realSavings &&
          !realSavings.isReduced &&
          item.compressedSize !== undefined &&
          item.compressedSize > item.originalSize && (
            <span className="text-foreground/70 bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
              +
              {Math.round(
                ((item.compressedSize - item.originalSize) /
                  item.originalSize) *
                  100,
              )}
              %
            </span>
          )}
        {!realSavings && estimatedSavings && (
          <span className="text-foreground/70 bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
            ~{estimatedSavings.percentSaved}% (Est.)
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-foreground text-[11px] tracking-wider uppercase">
          Properties
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <span className="text-foreground">Type:</span>
          <span className="text-foreground truncate text-right font-mono">
            {origFormatLabel} → {targetFormatLabel}
          </span>

          <span className="text-foreground">Original Size:</span>
          <span className="text-foreground text-right font-mono">
            {formatBytes(item.originalSize)}
          </span>

          <span className="text-foreground">Optimized Size:</span>
          <span className="text-foreground text-right font-mono">
            {item.compressedSize !== undefined
              ? formatBytes(item.compressedSize)
              : item.status === "processing"
                ? `Optimizing (${item.progress}%)`
                : `~${formatBytes(estimatedBytes)} (Est.)`}
          </span>

          {realSavings ? (
            <>
              <span className="text-foreground">
                {realSavings.bytesSaved >= 0 ? "Space Saved:" : "Size Change:"}
              </span>
              <span
                className={clsx(
                  "text-right font-mono",
                  realSavings.bytesSaved > 0
                    ? "text-code-green"
                    : realSavings.bytesSaved < 0
                      ? "text-foreground/70"
                      : "text-foreground/50",
                )}
              >
                {realSavings.bytesSaved > 0
                  ? `${formatBytes(realSavings.bytesSaved)} (-${realSavings.percentSaved}%)`
                  : realSavings.bytesSaved < 0
                    ? `+${formatBytes(Math.abs(realSavings.bytesSaved))} (+${Math.round(
                        ((item.compressedSize! - item.originalSize) /
                          item.originalSize) *
                          100,
                      )}%)`
                    : "0 B (0%)"}
              </span>
            </>
          ) : estimatedSavings ? (
            <>
              <span className="text-foreground">Estimated Savings:</span>
              <span className="text-foreground text-right font-mono">
                ~{formatBytes(estimatedSavings.bytesSaved)} (-
                {estimatedSavings.percentSaved}%)
              </span>
            </>
          ) : null}

          <span className="text-foreground">Dimensions:</span>
          <span className="text-foreground truncate text-right font-mono">
            {item.originalDimensions.width > 0
              ? `${item.originalDimensions.width}×${item.originalDimensions.height}`
              : "—"}
            {item.compressedDimensions &&
              (item.compressedDimensions.width !==
                item.originalDimensions.width ||
                item.compressedDimensions.height !==
                  item.originalDimensions.height) && (
                <span className="text-foreground/70 ml-1">
                  → {item.compressedDimensions.width}×
                  {item.compressedDimensions.height}
                </span>
              )}
            {!item.compressedDimensions && targetDims && (
              <span className="text-foreground/70 ml-1">
                → {targetDims.width}×{targetDims.height}
              </span>
            )}
          </span>

          <span className="text-foreground">Duration:</span>
          <span className="text-foreground truncate text-right font-mono">
            {item.duration > 0 ? formatDuration(item.duration) : "—"}
            {isTrimmed && (
              <span className="text-foreground/70 ml-1">
                → {formatDuration(effectiveDuration)}
              </span>
            )}
          </span>

          <span className="text-foreground">Audio Track:</span>
          <span className="text-foreground truncate text-right font-mono">
            {item.hasAudio
              ? isStrippedAudio
                ? "Strip (Muted)"
                : "Preserve Audio"
              : "Muted (No Audio)"}
          </span>

          <span className="text-foreground">Status:</span>
          <span className="text-right">
            {item.status === "done" && <span>Ready</span>}
            {item.status === "processing" && (
              <span>Optimizing ({item.progress}%)</span>
            )}
            {item.status === "error" && (
              <span className="text-code-rust">Error</span>
            )}
            {item.status === "idle" && (
              <span className="text-foreground/70">Queued</span>
            )}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onOpenEdit}
          className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>Edit Studio</span>
        </button>

        <div className="border-border-color flex gap-2 border-t border-dashed pt-3">
          <button
            type="button"
            onClick={onOpenCompare}
            disabled={item.status !== "done"}
            className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Compare</span>
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={item.status !== "done"}
            className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-utils-scent-gray-01/30 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-all"
            title="Delete from list"
            aria-label="Delete video"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
