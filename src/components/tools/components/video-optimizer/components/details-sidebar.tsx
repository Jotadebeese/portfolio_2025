"use client";

import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  Download,
  Trash2,
  Columns2,
  Film,
  Info,
  Scissors,
  Pencil,
  Check,
  X,
  Play,
} from "lucide-react";
import {
  VideoFileItem,
  VideoOptimizerSettings,
  VideoOutputFormat,
} from "../types";
import {
  formatBytes,
  calculateSavings,
  getDefaultOutputBaseName,
  getVideoFilenameWithExtension,
  getFormatLabel,
  formatDuration,
  formatFps,
  getEffectiveVideoDuration,
  hasEffectiveTrim,
  hasSettingsChanged,
  getVideoOrientation,
  getAdaptedPresetForTargetSize,
  getMinTargetSizeBytes,
  estimateVideoSize,
  resolveTargetFps,
} from "../utils/format";
import { calculateTargetVideoDimensions } from "../utils/compress-video";
import ToolButton from "@/components/ui/tool-button";

type Props = {
  item: VideoFileItem | null;
  settings: VideoOptimizerSettings;
  isProcessing?: boolean;
  onDownload: () => void;
  onDownloadOriginal?: () => void;
  onDelete: () => void;
  onOpenCompare: () => void;
  onOpenEdit: () => void;
  onCompressSingle?: () => void;
  onRename?: (newCustomName?: string) => void;
  onApplySettings?: (patch: Partial<VideoOptimizerSettings>) => void;
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
  isProcessing = false,
  onDownload,
  onDownloadOriginal,
  onDelete,
  onOpenCompare,
  onOpenEdit,
  onCompressSingle,
  onRename,
  onApplySettings,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditingName(false);
  }, [item?.id, isProcessing]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

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

  const effectiveExportSpeed =
    item.exportSpeed !== undefined
      ? item.exportSpeed
      : settings.exportSpeed ?? 1;
  const effectiveTargetFpsSetting =
    item.targetFps !== undefined ? item.targetFps : settings.targetFps;
  const hasSpeedChange = Math.abs(effectiveExportSpeed - 1) > 0.01;
  const resolvedTargetFps = resolveTargetFps(
    effectiveTargetFpsSetting,
    item.originalFps,
  );

  const effectiveDuration = getEffectiveVideoDuration(
    item.duration,
    item.trim,
    item.sections,
    effectiveExportSpeed,
  );

  const isTrimmed = hasEffectiveTrim(item.duration, item.trim, item.sections);

  const itemSettingsChanged = hasSettingsChanged(
    settings,
    item.lastCompressedSettings,
    item.trim,
    item.stripAudio,
    item.sections,
    item.duration,
    item.exportSpeed,
    item.originalFps,
    item.targetFps,
  );

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
    exportSpeed: effectiveExportSpeed,
    targetFps: effectiveTargetFpsSetting,
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
    item.originalFps,
  );

  const realSavings =
    item.compressedSize !== undefined
      ? calculateSavings(item.originalSize, item.compressedSize)
      : null;

  const estimatedSavings =
    estimatedBytes > 0
      ? calculateSavings(item.originalSize, estimatedBytes)
      : null;

  const targetCapMB = settings.targetSizeMB ?? 8;
  const targetCapBytes = targetCapMB * 1024 * 1024;
  const minPlayableBytes =
    settings.mode === "target-size" && effectiveDuration > 0
      ? getMinTargetSizeBytes(
          effectiveDuration,
          Boolean(isStrippedAudio),
          targetCapMB,
        )
      : 0;
  const isCapBelowFloor =
    settings.mode === "target-size" && minPlayableBytes > targetCapBytes;
  const showPostOverCap =
    item.status === "done" &&
    Boolean(item.exceededTargetCap) &&
    !itemSettingsChanged;
  const showPreOverCap =
    isCapBelowFloor && (item.status !== "done" || itemSettingsChanged);

  const activeFormat = (item.compressedFormat ||
    settings.format) as VideoOutputFormat;
  const outputExt = activeFormat === "video/webm" ? ".webm" : ".mp4";

  const targetName = getVideoFilenameWithExtension(
    item.name,
    activeFormat,
    item.customName,
  );

  const startEditingName = () => {
    if (!onRename || isProcessing) return;
    setDraftName(item.customName || getDefaultOutputBaseName(item.name));
    setIsEditingName(true);
  };

  const commitNameEdit = () => {
    if (!onRename) {
      setIsEditingName(false);
      return;
    }
    const cleaned = draftName.trim().replace(/\.(mp4|webm|mov|m4v|mkv)$/i, "");
    const defaultBase = getDefaultOutputBaseName(item.name);
    onRename(!cleaned || cleaned === defaultBase ? undefined : cleaned);
    setIsEditingName(false);
  };

  const origFormatLabel = getOriginalFormatLabel(item.name, item.file);
  const targetFormatLabel = getFormatLabel(activeFormat);

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
          {isEditingName ? (
            <div className="flex h-6 min-w-0 items-center gap-1">
              <Film
                strokeWidth={1.5}
                className="text-foreground/70 h-3.5 w-3.5 shrink-0"
              />
              <div className="border-border-color flex h-6 min-w-0 flex-1 items-center rounded border bg-white px-1.5">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitNameEdit();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={commitNameEdit}
                  className="text-foreground h-full min-w-0 flex-1 bg-transparent text-xs leading-none focus:outline-none"
                  aria-label="Output filename"
                />
                <span className="text-foreground/50 shrink-0 font-mono text-[10px] leading-none">
                  {outputExt}
                </span>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitNameEdit}
                className="border-border-color text-code-green hover:bg-utils-scent-gray-01/30 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border bg-white"
                title="Save output filename (Enter)"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsEditingName(false)}
                className="border-border-color text-foreground/60 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border bg-white"
                title="Cancel (Esc)"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="group flex h-6 min-w-0 items-center gap-1">
              <Film
                strokeWidth={1.5}
                className="text-foreground/70 h-3.5 w-3.5 shrink-0"
              />
              <h4
                title={`${targetName} (Click to rename output file)`}
                onClick={startEditingName}
                className={clsx(
                  "truncate leading-none",
                  onRename &&
                    !isProcessing &&
                    "hover:text-utils-scent-orange cursor-pointer transition-colors",
                )}
              >
                {targetName}
              </h4>
              {onRename && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={startEditingName}
                  className="text-foreground/50 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  title="Rename output file"
                  aria-label="Rename output file"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <span className="text-foreground/70 block truncate text-[10px]">
            Original: {item.name}
          </span>
        </div>

        {realSavings && realSavings.isReduced && (
          <span className="text-code-green bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
            -{realSavings.percentSaved}%
          </span>
        )}
        {realSavings &&
          !realSavings.isReduced &&
          item.compressedSize !== undefined &&
          item.compressedSize > item.originalSize && (
            <span className="text-code-rust bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
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
          <span
            className={clsx(
              "bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]",
              estimatedSavings.isReduced
                ? "text-foreground/70"
                : "text-code-rust",
            )}
          >
            {estimatedSavings.isReduced
              ? `~-${estimatedSavings.percentSaved}% (Est.)`
              : `~+${Math.abs(estimatedSavings.percentSaved)}% (Est.)`}
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
                : estimatedBytes > 0
                  ? `~${formatBytes(estimatedBytes)} (Est.)`
                  : "Adaptive (VBR)"}
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
                      ? "text-code-rust"
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
              <span className="text-foreground">
                {estimatedSavings.bytesSaved >= 0
                  ? "Estimated Savings:"
                  : "Estimated Change:"}
              </span>
              <span
                className={clsx(
                  "text-right font-mono",
                  estimatedSavings.bytesSaved >= 0
                    ? "text-foreground"
                    : "text-code-rust",
                )}
              >
                {estimatedSavings.bytesSaved >= 0
                  ? `~${formatBytes(estimatedSavings.bytesSaved)} (-${estimatedSavings.percentSaved}%)`
                  : `+~${formatBytes(Math.abs(estimatedSavings.bytesSaved))} (+${Math.abs(estimatedSavings.percentSaved)}%)`}
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

          <span className="text-foreground">Frame Rate:</span>
          <span className="text-foreground truncate text-right font-mono">
            {item.originalFps ? `${formatFps(item.originalFps)}fps` : "—"}
            {item.compressedFps &&
              !itemSettingsChanged &&
              item.originalFps &&
              Math.abs(item.compressedFps - item.originalFps) > 0.5 && (
                <span className="text-foreground/70 ml-1">
                  → {formatFps(item.compressedFps)}fps
                </span>
              )}
            {(!item.compressedFps || itemSettingsChanged) &&
              resolvedTargetFps && (
                <span className="text-foreground/70 ml-1">
                  → {resolvedTargetFps}fps
                </span>
              )}
            {item.targetFps !== undefined &&
              item.targetFps !== (settings.targetFps ?? "original") && (
                <span className="text-foreground/70 ml-1">(Custom)</span>
              )}
          </span>

          <span className="text-foreground">Duration:</span>
          <span className="text-foreground truncate text-right font-mono">
            {item.duration > 0 ? formatDuration(item.duration) : "—"}
            {(isTrimmed || hasSpeedChange) && (
              <span className="text-foreground/70 ml-1">
                → {formatDuration(effectiveDuration)}
              </span>
            )}
          </span>

          <span className="text-foreground">Output Speed:</span>
          <span className="text-foreground truncate text-right font-mono">
            {hasSpeedChange ? `${effectiveExportSpeed}x` : "1x (Normal)"}
            {item.exportSpeed !== undefined &&
              item.exportSpeed !== (settings.exportSpeed ?? 1) && (
                <span className="text-foreground/70 ml-1">(Custom)</span>
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
            {item.status === "done" &&
              (item.compressedSize !== undefined &&
              item.compressedSize >= item.originalSize ? (
                <span className="text-code-rust">Larger than source</span>
              ) : item.exceededTargetCap ? (
                <span className="text-code-rust">Over target cap</span>
              ) : (
                <span className="text-code-green">Optimized</span>
              ))}
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

        {realSavings &&
          realSavings.bytesSaved < 0 &&
          (() => {
            const usedSettings = item.lastCompressedSettings || settings;
            const maxOrigDim = Math.max(
              item.originalDimensions.width,
              item.originalDimensions.height,
            );
            const canDownscaleTo720 =
              maxOrigDim > 1280 &&
              (settings.resizePreset === "1080p" ||
                settings.resizePreset === "original");

            const downloadOriginalBtn = onDownloadOriginal ? (
              <ToolButton
                variant="primary"
                size="sm"
                onClick={onDownloadOriginal}
                className="py-1"
              >
                <Download className="h-3 w-3" />
                <span>Keep Original</span>
              </ToolButton>
            ) : null;

            if (
              usedSettings.mode === "quality" &&
              (usedSettings.qualityPercent || 80) > 85
            ) {
              return (
                <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                  <div>
                    <strong className="text-foreground">
                      Why size increased:
                    </strong>{" "}
                    Re-encoding at{" "}
                    <strong className="text-foreground">
                      {usedSettings.qualityPercent}% quality
                    </strong>{" "}
                    inflates an already-compressed {origFormatLabel} clip
                    without adding visual detail. Drop to the{" "}
                    <strong className="text-foreground">80% sweet spot</strong>
                    {canDownscaleTo720 ? " or downscale to 720p" : ""}.
                  </div>
                  {((onApplySettings && !isProcessing) ||
                    downloadOriginalBtn) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {downloadOriginalBtn}
                      {onApplySettings && !isProcessing && (
                        <>
                          <ToolButton
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onApplySettings({
                                mode: "quality",
                                qualityPercent: 80,
                              })
                            }
                            className="py-1"
                          >
                            Set Quality to 80%
                          </ToolButton>
                          {canDownscaleTo720 && (
                            <ToolButton
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onApplySettings({ resizePreset: "720p" })
                              }
                              className="py-1"
                            >
                              Resize to 720p
                            </ToolButton>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (usedSettings.mode === "bitrate") {
              return (
                <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                  <div>
                    <strong className="text-foreground">
                      Why size increased:
                    </strong>{" "}
                    Target bitrate (
                    <strong className="text-foreground">
                      {usedSettings.bitrateMbps.toFixed(1)} Mbps
                    </strong>
                    ) exceeds the source clip&apos;s original bitrate. Lower the
                    bitrate budget or switch to{" "}
                    <strong className="text-foreground">Quality (80%)</strong>{" "}
                    mode.
                  </div>
                  {((onApplySettings && !isProcessing) ||
                    downloadOriginalBtn) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {downloadOriginalBtn}
                      {onApplySettings && !isProcessing && (
                        <ToolButton
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onApplySettings({
                              mode: "quality",
                              qualityPercent: 80,
                            })
                          }
                          className="py-1"
                        >
                          Switch to Quality (80%)
                        </ToolButton>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                <div>
                  <strong className="text-foreground">
                    Why size increased:
                  </strong>{" "}
                  This {origFormatLabel} is already tightly compressed or has
                  high visual entropy. Keep the smaller original, lower quality
                  to <strong className="text-foreground">60%–75%</strong>, or
                  use <strong className="text-foreground">Fit to Size</strong>.
                </div>
                {((onApplySettings && !isProcessing) ||
                  downloadOriginalBtn) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {downloadOriginalBtn}
                    {onApplySettings && !isProcessing && (
                      <>
                        <ToolButton
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onApplySettings({
                              mode: "quality",
                              qualityPercent: 75,
                            })
                          }
                          className="py-1"
                        >
                          Set Quality to 75%
                        </ToolButton>
                        {canDownscaleTo720 && (
                          <ToolButton
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onApplySettings({ resizePreset: "720p" })
                            }
                            className="py-1"
                          >
                            Resize to 720p
                          </ToolButton>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {(showPostOverCap || showPreOverCap) &&
          !(realSavings && realSavings.bytesSaved < 0) &&
          (() => {
            const usedTargetMB = showPostOverCap
              ? (item.lastCompressedSettings?.targetSizeMB ?? targetCapMB)
              : targetCapMB;
            const usedStripAudio = showPostOverCap
              ? Boolean(
                  item.lastCompressedSettings?.stripAudio ?? isStrippedAudio,
                )
              : Boolean(isStrippedAudio);
            const usedMinPlayableBytes =
              effectiveDuration > 0
                ? getMinTargetSizeBytes(
                    effectiveDuration,
                    usedStripAudio,
                    usedTargetMB,
                  )
                : 0;
            const isPhysicalFloor =
              usedMinPlayableBytes > usedTargetMB * 1024 * 1024;
            const recommendedMB = Math.min(
              500,
              Math.max(
                usedTargetMB + 1,
                Math.ceil(
                  Math.max(
                    usedMinPlayableBytes,
                    showPostOverCap && item.compressedSize
                      ? item.compressedSize
                      : 0,
                  ) /
                    (1024 * 1024),
                ),
              ),
            );
            const hasActiveAudio = item.hasAudio && !usedStripAudio;

            return (
              <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                <div>
                  <strong className="text-foreground">
                    {isPhysicalFloor
                      ? showPostOverCap
                        ? "Why it exceeded the cap:"
                        : "Cap below physical minimum:"
                      : "Why it exceeded the cap:"}
                  </strong>{" "}
                  {isPhysicalFloor ? (
                    <>
                      A{" "}
                      <strong className="text-foreground">
                        {formatDuration(effectiveDuration)}
                      </strong>{" "}
                      clip{hasActiveAudio ? " with audio" : ""} requires at
                      least{" "}
                      <strong className="text-foreground">
                        ~{formatBytes(usedMinPlayableBytes)}
                      </strong>{" "}
                      at minimum playable bitrate (
                      {hasActiveAudio ? "64k audio + " : ""}60k video).
                    </>
                  ) : (
                    <>
                      High visual detail couldn&apos;t fit under{" "}
                      <strong className="text-foreground">
                        {usedTargetMB} MB
                      </strong>{" "}
                      even after retry passes. Trim the clip, turn audio off,
                      or raise the cap.
                    </>
                  )}
                </div>

                {!isProcessing && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {onApplySettings && (
                      <ToolButton
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onApplySettings({
                            mode: "target-size",
                            targetSizeMB: recommendedMB,
                          })
                        }
                        className="py-1"
                      >
                        Set Cap to {recommendedMB} MB
                      </ToolButton>
                    )}
                    {onApplySettings && hasActiveAudio && (
                      <ToolButton
                        variant="outline"
                        size="sm"
                        onClick={() => onApplySettings({ stripAudio: true })}
                        className="py-1"
                      >
                        Turn Audio Off
                      </ToolButton>
                    )}
                    <ToolButton
                      variant="outline"
                      size="sm"
                      onClick={onOpenEdit}
                      className="py-1"
                    >
                      Trim Clip
                    </ToolButton>
                  </div>
                )}
              </div>
            );
          })()}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {onCompressSingle &&
            item.status !== "processing" &&
            (item.status === "idle" ||
              item.status === "error" ||
              itemSettingsChanged) && (
              <ToolButton
                variant="primary"
                size="md"
                onClick={onCompressSingle}
                disabled={isProcessing}
                className="flex-1"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>
                  {itemSettingsChanged ? "Apply Changes" : "Optimize"}
                </span>
              </ToolButton>
            )}
          <ToolButton
            variant="secondary"
            size="md"
            onClick={onOpenEdit}
            disabled={isProcessing}
            className="flex-1"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Edit Studio</span>
          </ToolButton>
        </div>

        <div className="border-border-color flex gap-2 border-t border-dashed pt-3">
          <ToolButton
            variant="secondary"
            size="md"
            onClick={onOpenCompare}
            disabled={item.status !== "done"}
            className="flex-1"
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Compare</span>
          </ToolButton>
          <ToolButton
            variant={
              item.status === "done" && !itemSettingsChanged
                ? "primary"
                : "secondary"
            }
            size="md"
            onClick={onDownload}
            disabled={item.status !== "done"}
            className="flex-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </ToolButton>

          <ToolButton
            variant="danger"
            size="icon-md"
            onClick={onDelete}
            disabled={isProcessing}
            title="Delete from list"
            aria-label="Delete video"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ToolButton>
        </div>
      </div>
    </div>
  );
}
