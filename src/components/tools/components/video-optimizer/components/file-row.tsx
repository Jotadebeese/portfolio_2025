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
  Volume2,
  Loader,
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
            "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-all",
            isProcessing
              ? "border-border-color bg-utils-scent-gray-01/20 cursor-not-allowed opacity-40"
              : isSelected
                ? "border-utils-scent-orange bg-utils-scent-orange/60 cursor-pointer text-white"
                : "border-border-color hover:border-utils-scent-orange cursor-pointer bg-white",
          )}
          title={
            isProcessing
              ? "Disabled during compression"
              : isSelected
                ? "Deselect video"
                : "Select video"
          }
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

        <div className="border-border-color bg-background relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Film className="text-foreground/30 h-4 w-4" />
          )}

          {item.duration > 0 && (
            <span className="py-0.2 bg-utils-scent-gray-01 border-border-color text-foreground absolute right-0.5 bottom-0.5 rounded-xs border px-0.5 font-mono text-[9px] leading-none">
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

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex w-full items-center gap-1.5 text-nowrap min-w-0">
            <span
              className="text-foreground truncate text-[11px]"
              title={item.name}
            >
              {item.name}
            </span>

            {item.originalDimensions.width > 0 && (
              <span
                className={
                  "py-0.2 border-border-color bg-utils-scent-gray-01/30 text-foreground/70 rounded-xs border px-1 font-mono text-[9px]"
                }
              >
                {orientation.label} ({orientation.ratio})
              </span>
            )}

            {isTrimmed && (
              <span className="py-0.2 border-border-color bg-utils-scent-gray-01/30 text-foreground/70 flex items-center gap-0.5 rounded-xs border px-1 font-mono text-[9px]">
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

            {item.stripAudio !== undefined &&
              (item.stripAudio ? (
                <span className="py-0.2 border-border-color bg-utils-scent-gray-01/30 text-code-rust flex items-center gap-0.5 rounded-xs border px-1 font-mono text-[9px]">
                  <VolumeX size={9} />
                  <span>Muted</span>
                </span>
              ) : (
                <span className="py-0.2 border-border-color bg-utils-scent-gray-01/30 text-code-green flex items-center gap-0.5 rounded-xs border px-1 font-mono text-[9px]">
                  <Volume2 size={9} />
                  <span>Audio</span>
                </span>
              ))}
          </div>
          <div className="flex">
            <div className="text-foreground/70 flex flex-wrap items-center gap-1.5 text-[10px]">
              {item.originalDimensions.width > 0 && (
                <span>
                  {item.originalDimensions.width}&times;
                  {item.originalDimensions.height}
                  {targetDims &&
                    (targetDims.width !== item.originalDimensions.width ||
                      targetDims.height !== item.originalDimensions.height) && (
                      <span className="text-foreground">
                        {" "}
                        &rarr; {targetDims.width}&times;{targetDims.height}
                      </span>
                    )}
                </span>
              )}

              <span className="text-foreground">&bull;</span>

              <span>{formatBytes(item.originalSize)}</span>

              {item.status === "done" && item.compressedSize !== undefined ? (
                <>
                  <span className="text-foreground">&rarr;</span>
                  <span className="text-foreground">
                    {formatBytes(item.compressedSize)}
                  </span>
                  {savings && (
                    <span
                      className={clsx(
                        "bg-border-color/30 rounded-sm px-1 font-mono text-[9px]",
                        savings.isReduced
                          ? "text-code-green"
                          : "text-foreground",
                      )}
                    >
                      {savings.isReduced
                        ? `-${savings.percentSaved}%`
                        : `+${Math.abs(savings.percentSaved)}%`}
                    </span>
                  )}
                  {itemSettingsChanged && (
                    <span
                      className="py-0.2 border-border-color bg-utils-scent-gray-01/30 text-foreground/70 flex items-center gap-0.5 rounded-xs border px-1 font-mono text-[9px]"
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
                <span className="text-code-rust flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span className="max-w-[120px] truncate">
                    {item.errorMessage || "Failed"}
                  </span>
                </span>
              )}
            </div>
          </div>

          {item.status === "processing" && (
            <div className="flex w-full items-center gap-2">
              <div className="bg-border-color/30 relative mt-0.5 h-1 w-full overflow-hidden rounded-full">
                <div
                  className="bg-utils-scent-orange absolute top-0 bottom-0 left-0 transition-all duration-200"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-foreground flex items-center gap-1 font-mono text-[10px]">
                <Loader className="h-2.5 w-2.5 animate-spin" />
                <span>{item.progress}%</span>
              </span>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1">
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
                    "flex h-6 items-center justify-center gap-1 rounded-xs border px-1.5 font-mono text-[10px] transition-all",
                    itemSettingsChanged
                      ? "border-foreground bg-foreground text-white shadow-xs hover:opacity-90"
                      : "border-border-color hover:bg-foreground text-foreground bg-white hover:text-white",
                    isProcessing
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer",
                  )}
                  title="Optimize this single video now"
                  aria-label="Optimize video"
                >
                  <Play size={9} className="fill-current" />
                  <span className="hidden sm:inline">Optimize</span>
                </button>
              )}

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
                    ? "border-border-color text-code-rust hover:bg-utils-scent-gray-01/30"
                    : "text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground",
                  isProcessing
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer",
                )}
                title="Edit Video & Audio (Trim, Mute, Waveform Studio)"
                aria-label="Edit clip"
              >
                <Scissors size={11} />
              </button>
            )}

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
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-utils-scent-gray-01/30 hover:text-code-rust cursor-pointer",
              )}
              title={
                isProcessing
                  ? "Disabled during compression"
                  : "Remove from queue"
              }
              aria-label="Remove video"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
