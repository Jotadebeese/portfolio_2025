"use client";

import {
  Download,
  Trash2,
  Columns2,
  Film,
  AlertCircle,
  Loader2,
  Check,
  VolumeX,
  Scissors,
  Play,
} from "lucide-react";
import clsx from "clsx";
import { VideoFileItem, VideoOptimizerSettings } from "../types";
import {
  formatBytes,
  formatDuration,
  calculateSavings,
  estimateVideoSize,
  getVideoOrientation,
  hasSettingsChanged,
  getEffectiveVideoDuration,
  hasEffectiveTrim,
} from "../utils/format";
import { calculateTargetVideoDimensions } from "../utils/compress-video";

type Props = {
  item: VideoFileItem;
  settings: VideoOptimizerSettings;
  isSelected: boolean;
  isActive: boolean;
  isProcessing?: boolean;
  onToggleSelect: () => void;
  onActivate: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onOpenCompare?: () => void;
  onOpenEdit?: () => void;
  onCompressSingle?: () => void;
};

export default function FileRow({
  item,
  settings,
  isSelected,
  isActive,
  isProcessing = false,
  onToggleSelect,
  onActivate,
  onDownload,
  onDelete,
  onOpenCompare,
  onOpenEdit,
  onCompressSingle,
}: Props) {
  const savings =
    item.compressedSize !== undefined
      ? calculateSavings(item.originalSize, item.compressedSize)
      : null;

  const orientation = getVideoOrientation(
    item.originalDimensions.width,
    item.originalDimensions.height,
  );

  const effectiveStripAudio =
    item.stripAudio !== undefined ? item.stripAudio : settings.stripAudio;

  const isTrimmed = hasEffectiveTrim(item.duration, item.trim, item.sections);

  const estimatedBytes =
    item.duration > 0
      ? estimateVideoSize(
          item.duration,
          { ...settings, stripAudio: effectiveStripAudio },
          item.trim,
          item.originalDimensions.width,
          item.originalDimensions.height,
          item.originalSize,
          item.sections,
        )
      : 0;

  const estimatedSavings =
    estimatedBytes > 0
      ? calculateSavings(item.originalSize, estimatedBytes)
      : null;

  const itemSettingsChanged = hasSettingsChanged(
    settings,
    item.lastCompressedSettings,
    item.trim,
    item.stripAudio,
    item.sections,
    item.duration,
  );

  const targetDims =
    item.originalDimensions.width > 0
      ? calculateTargetVideoDimensions(
          item.originalDimensions.width,
          item.originalDimensions.height,
          settings.resizePreset,
          settings.customMaxDimension,
        )
      : null;

  return (
    <div
      onClick={onActivate}
      className={clsx(
        "group border-utils-scent-gray-01/40 flex cursor-pointer items-center justify-between gap-3 border-b p-2 transition-all select-none",
        isActive
          ? "bg-utils-scent-gray-01/40"
          : "hover:bg-utils-scent-gray-01/15 bg-white",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            if (!isProcessing) onToggleSelect();
          }}
          className={clsx(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-all",
            isProcessing
              ? "opacity-40 cursor-not-allowed border-border-color bg-utils-scent-gray-01/20"
              : isSelected
                ? "cursor-pointer border-utils-scent-orange bg-utils-scent-orange/60 text-white"
                : "cursor-pointer border-border-color hover:border-utils-scent-orange bg-white",
          )}
          title={isProcessing ? "Disabled during compression" : isSelected ? "Deselect video" : "Select video"}
          aria-label={isSelected ? "Deselect video" : "Select video"}
        >
          <Check
            size={12}
            strokeWidth={4}
            className={clsx(
              "transition-all duration-100",
              isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
          />
        </button>

        {/* Poster Thumbnail (true aspect ratio, un-stretched) */}
        <div className="border-border-color bg-black/90 relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded p-0.5">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Film className="text-white/40 h-4 w-4" />
          )}

          {item.duration > 0 && (
            <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-white leading-none">
              {formatDuration(
                getEffectiveVideoDuration(
                  item.duration,
                  item.trim,
                  item.sections,
                ),
              )}
            </span>
          )}
        </div>

        {/* Video Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-foreground truncate text-[11px] font-medium"
              title={item.name}
            >
              {item.name}
            </span>

            {/* Clear Orientation & Aspect Ratio Badges */}
            {item.originalDimensions.width > 0 && (
              <span
                className={clsx(
                  "rounded-xs border px-1 py-0.2 text-[9px] font-mono",
                  orientation.type === "portrait"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : orientation.type === "square"
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : orientation.type === "ultrawide"
                        ? "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                        : "border-border-color/60 bg-utils-scent-gray-01/30 text-foreground/70",
                )}
              >
                {orientation.label} ({orientation.ratio})
              </span>
            )}

            {/* Multi-Cut or Trimmed Badge */}
            {isTrimmed && (
              <span className="border-[#ff9900]/40 bg-[#ff9900]/10 text-utils-scent-orange rounded-xs border px-1 py-0.2 text-[9px] font-mono flex items-center gap-0.5">
                <Scissors size={9} />
                <span>
                  {item.sections && item.sections.some((s) => s.isDeleted)
                    ? `${item.sections.filter((s) => s.isDeleted).length} cut${item.sections.filter((s) => s.isDeleted).length > 1 ? "s" : ""}`
                    : item.trim
                      ? `${formatDuration(item.trim.start)}-${formatDuration(item.trim.end)}`
                      : "Trimmed"}
                </span>
              </span>
            )}

            {/* Per-Clip Audio Override Badge */}
            {item.stripAudio !== undefined && (
              item.stripAudio ? (
                <span className="border-border-color/60 bg-utils-scent-gray-01/30 text-foreground/60 rounded-xs border px-1 py-0.2 text-[9px] font-mono flex items-center gap-0.5">
                  <VolumeX size={9} />
                  <span>Muted</span>
                </span>
              ) : (
                <span className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 rounded-xs border px-1 py-0.2 text-[9px] font-mono">
                  Audio
                </span>
              )
            )}
          </div>

          <div className="text-foreground/70 flex flex-wrap items-center gap-1.5 text-[10px]">
            {/* Dimensions: Native -> Target */}
            {item.originalDimensions.width > 0 && (
              <span>
                {item.originalDimensions.width}&times;
                {item.originalDimensions.height}
                {targetDims &&
                  (targetDims.width !== item.originalDimensions.width ||
                    targetDims.height !== item.originalDimensions.height) && (
                    <span className="text-foreground/50">
                      {" "}
                      &rarr; {targetDims.width}&times;{targetDims.height}
                    </span>
                  )}
              </span>
            )}

            <span className="text-foreground/30">&bull;</span>

            {/* File Size Progression */}
            <span>{formatBytes(item.originalSize)}</span>

            {item.status === "done" && item.compressedSize !== undefined ? (
              <>
                <span className="text-foreground/30">&rarr;</span>
                <span className="text-foreground font-mono font-medium">
                  {formatBytes(item.compressedSize)}
                </span>
                {savings && (
                  <span
                    className={clsx(
                      "font-mono text-[9px] px-1 py-0.2 rounded-xs",
                      savings.isReduced
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600",
                    )}
                  >
                    {savings.isReduced
                      ? `-${savings.percentSaved}%`
                      : `+${Math.abs(savings.percentSaved)}%`}
                  </span>
                )}
                {itemSettingsChanged && (
                  <span
                    className="border-utils-scent-orange/50 text-utils-scent-orange bg-utils-scent-orange/10 rounded-xs border px-1 py-0.2 font-mono text-[9px]"
                    title="Settings modified since last compression. Re-compress to apply."
                  >
                    New Est: ~{formatBytes(estimatedBytes)}
                  </span>
                )}
              </>
            ) : (
              item.status !== "processing" &&
              estimatedBytes > 0 && (
                <>
                  <span className="text-foreground/30">&rarr;</span>
                  <span
                    className="text-foreground/90 font-mono"
                    title="Estimated output size"
                  >
                    ~{formatBytes(estimatedBytes)}
                  </span>
                  {estimatedSavings && estimatedSavings.percentSaved > 0 && (
                    <span className="text-foreground/60 font-mono text-[9px]">
                      (Est. -{estimatedSavings.percentSaved}%)
                    </span>
                  )}
                </>
              )
            )}

            {item.status === "error" && (
              <span className="text-code-rust flex items-center gap-1 font-mono">
                <AlertCircle size={10} />
                <span className="max-w-[120px] truncate">
                  {item.errorMessage || "Failed"}
                </span>
              </span>
            )}
          </div>

          {/* Progress bar during processing */}
          {item.status === "processing" && (
            <div className="bg-foreground/10 relative h-1 w-full overflow-hidden rounded-full mt-0.5">
              <div
                className="bg-utils-scent-orange absolute top-0 bottom-0 left-0 transition-all duration-200"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {item.status === "processing" && (
          <div className="flex items-center gap-1 text-[10px] text-utils-scent-orange font-mono mr-1">
            <Loader2 size={12} className="animate-spin" />
            <span>{item.progress}%</span>
          </div>
        )}

        {/* Single Video Optimize Button */}
        {onCompressSingle &&
          (item.status === "idle" ||
            itemSettingsChanged ||
            item.status === "error" ||
            (item.status === "done" && itemSettingsChanged)) && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                if (!isProcessing) onCompressSingle();
              }}
              className={clsx(
                "border flex h-6 px-1.5 items-center gap-1 justify-center rounded-xs transition-all text-[10px] font-mono",
                itemSettingsChanged
                  ? "border-utils-scent-orange bg-utils-scent-orange text-white hover:opacity-90 shadow-xs"
                  : "border-border-color bg-white hover:bg-utils-scent-orange hover:text-white text-foreground/80",
                isProcessing ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
              )}
              title="Optimize this single video now"
              aria-label="Optimize video"
            >
              <Play size={9} className="fill-current" />
              <span className="hidden sm:inline">Optimize</span>
            </button>
          )}

        {/* Edit Studio Button */}
        {onOpenEdit && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              if (!isProcessing) onOpenEdit();
            }}
            className={clsx(
              "border-border-color flex h-6 w-6 items-center justify-center rounded-xs border transition-all",
              item.trim || item.stripAudio !== undefined
                ? "border-utils-scent-orange text-utils-scent-orange bg-[#ff9900]/5 hover:bg-[#ff9900]/15"
                : "text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground",
              isProcessing ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            )}
            title="Edit Video & Audio (Trim, Mute, Waveform Studio)"
            aria-label="Edit clip"
          >
            <Scissors size={11} />
          </button>
        )}

        {/* Compare Button */}
        {item.status === "done" && onOpenCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCompare();
            }}
            className="border-border-color text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-xs border transition-all"
            title="Compare Original vs Compressed"
            aria-label="Compare video"
          >
            <Columns2 size={12} />
          </button>
        )}

        {/* Download Button */}
        {item.status === "done" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="border-border-color text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-xs border transition-all"
            title="Download compressed video"
            aria-label="Download video"
          >
            <Download size={12} />
          </button>
        )}

        {/* Delete Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            if (!isProcessing) onDelete();
          }}
          className={clsx(
            "border-border-color text-foreground/50 flex h-6 w-6 items-center justify-center rounded-xs border transition-all",
            isProcessing
              ? "opacity-40 cursor-not-allowed"
              : "cursor-pointer hover:bg-rose-500/10 hover:text-rose-500",
          )}
          title={isProcessing ? "Disabled during compression" : "Remove from queue"}
          aria-label="Remove video"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
