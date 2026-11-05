"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Film,
  Download,
  Trash2,
  CheckSquare,
  Sliders,
  Minus,
  Plus,
  VolumeX,
  Volume2,
  Play,
  Check,
  Square,
  Loader,
  X,
} from "lucide-react";
import {
  VideoOptimizerSettings,
  VideoOutputFormat,
  VideoResizePreset,
} from "../types";
import { formatBytes } from "../utils/format";
import clsx from "clsx";

type Props = {
  settings: VideoOptimizerSettings;
  onSettingsChange: (settings: VideoOptimizerSettings) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  selectedCount: number;
  selectedPendingCount?: number;
  selectedDoneCount?: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  onCompressSelected?: () => void;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  isDownloadingZip?: boolean;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalEstimatedBytes?: number;
  isProcessing: boolean;
  processingIndex: number;
  processingTotal: number;
  onStartCompress: () => void;
  onCancelCompress: () => void;
  hasUncompressed: boolean;
  hasPendingChanges?: boolean;
  uncompressedCount?: number;
  pendingChangesCount?: number;
  maxFiles?: number;
};

const FORMATS: { label: string; value: VideoOutputFormat; badge: string }[] = [
  { label: "MP4", value: "video/mp4", badge: "H.264" },
  { label: "WebM", value: "video/webm", badge: "VP9" },
];

const RESIZE_PRESETS: {
  label: string;
  value: VideoResizePreset;
  hint: string;
}[] = [
  { label: "1080p", value: "1080p", hint: "Desktop" },
  { label: "720p", value: "720p", hint: "Tablet" },
  { label: "480p", value: "480p", hint: "Web / SD" },
  { label: "360p", value: "360p", hint: "Mobile" },
  { label: "Original", value: "original", hint: "Native" },
  { label: "Custom", value: "custom", hint: "Custom px" },
];

export default function Toolbar({
  settings,
  onSettingsChange,
  onFilesSelected,
  selectedCount,
  selectedPendingCount = 0,
  selectedDoneCount = 0,
  totalCount,
  onToggleSelectAll,
  onCompressSelected,
  onDeleteSelected,
  onDownloadSelected,
  isDownloadingZip = false,
  totalOriginalBytes,
  totalCompressedBytes,
  totalEstimatedBytes,
  isProcessing,
  processingIndex,
  processingTotal,
  onStartCompress,
  onCancelCompress,
  hasUncompressed,
  hasPendingChanges = false,
  uncompressedCount,
  pendingChangesCount,
  maxFiles = 10,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isCustom = settings.resizePreset === "custom";
  const isQueueFull = totalCount >= maxFiles;

  useEffect(() => {
    if (isCustom) {
      customInputRef.current?.focus();
      customInputRef.current?.select();
    }
  }, [isCustom]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = "";
    }
  };

  const isAllSelected = totalCount > 0 && selectedCount === totalCount;
  const isSomeSelected = selectedCount > 0;
  const totalSavedBytes = Math.max(
    0,
    totalOriginalBytes - totalCompressedBytes,
  );
  const totalSavingsPct =
    totalOriginalBytes > 0
      ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
      : 0;

  return (
    <div className="border-border-color flex flex-col gap-3 border-b border-dashed pb-4 select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        disabled={isQueueFull || isProcessing}
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*,.mp4,.mov,.webm,.m4v"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isQueueFull && !isProcessing) fileInputRef.current?.click();
            }}
            disabled={isQueueFull || isProcessing}
            className="bg-background border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            title={
              isQueueFull
                ? `Queue limit reached (${maxFiles} clips max)`
                : "Add videos from your device"
            }
          >
            <Film className="text-foreground/70 h-3.5 w-3.5" />
            <span>Add</span>
            {totalCount > 0 && (
              <span className="font-mono text-[11px] opacity-75">
                ({totalCount}/{maxFiles})
              </span>
            )}
          </button>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader size={14} className="animate-spin" />
                <button
                  type="button"
                  onClick={onCancelCompress}
                  className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs transition-all"
                >
                  <span>
                    ({processingIndex + 1}/{processingTotal})
                  </span>
                  <Square className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartCompress}
                disabled={!hasUncompressed && !hasPendingChanges}
                className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs transition-all active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-white"
                title={
                  hasUncompressed || hasPendingChanges
                    ? "Run hardware-accelerated video compression"
                    : "All videos in queue are already optimized with current settings"
                }
              >
                {hasUncompressed || hasPendingChanges ? (
                  <Play className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Check className="text-code-green h-3.5 w-3.5" />
                )}
                <span>
                  {hasUncompressed
                    ? `Compress Queue (${(uncompressedCount ?? totalCount) + (pendingChangesCount ?? 0)})`
                    : hasPendingChanges
                      ? `Apply Changes (${pendingChangesCount ?? totalCount})`
                      : "All Optimized"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className={clsx(
          "border-border-color bg-background/50 flex flex-col justify-between gap-3 rounded-md border border-dashed p-2 text-xs transition-opacity lg:flex-row lg:items-stretch",
          isProcessing &&
            "pointer-events-none cursor-not-allowed opacity-50 select-none",
        )}
      >
        <div className="flex min-w-0 flex-col justify-center gap-2 lg:shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-foreground shrink-0">Format:</span>
            <div className="border-border-color flex items-center rounded-md border bg-white p-0.5">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    onSettingsChange({ ...settings, format: f.value })
                  }
                  className={clsx(
                    "flex cursor-pointer items-center gap-1 rounded px-2.5 py-0.5 text-xs transition-all",
                    settings.format === f.value
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  <span>{f.label}</span>
                  <span className="font-mono text-[9px] opacity-75">
                    ({f.badge})
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-foreground shrink-0">Audio:</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  stripAudio: !settings.stripAudio,
                })
              }
              className={clsx(
                "border-border-color flex cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-xs transition-all",
                settings.stripAudio ? "text-code-rust" : "text-foreground",
              )}
              title={
                settings.stripAudio
                  ? "Audio track stripped for lightweight web hero loops"
                  : "Audio track will be preserved"
              }
            >
              {settings.stripAudio ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Mute</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Keep </span>
                </>
              )}
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-foreground shrink-0">Size:</span>

              {isCustom ? (
                <div className="flex max-w-full shrink-0 items-center gap-1.5 overflow-x-auto">
                  <div className="border-border-color flex items-center rounded-md border bg-white p-0.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        onSettingsChange({
                          ...settings,
                          resizePreset: "1080p",
                        })
                      }
                      className="bg-foreground text-background shrink-0 cursor-pointer rounded px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
                      title="Click to return to standard presets"
                    >
                      Custom
                    </button>
                  </div>

                  <div className="border-border-color flex shrink-0 items-center rounded-md border bg-white p-0.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        onSettingsChange({
                          ...settings,
                          customMaxDimension: Math.max(
                            240,
                            (settings.customMaxDimension || 1280) - 100,
                          ),
                        })
                      }
                      className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-all active:scale-90"
                      title="Decrease 100px"
                      aria-label="Decrease custom size by 100px"
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <input
                      ref={customInputRef}
                      type="number"
                      min="240"
                      max="3840"
                      step="50"
                      disabled={isProcessing}
                      placeholder="1280"
                      value={settings.customMaxDimension || 1280}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          onSettingsChange({
                            ...settings,
                            resizePreset: "1080p",
                          });
                        }
                      }}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          customMaxDimension: Math.max(
                            100,
                            Number(e.target.value) || 1280,
                          ),
                        })
                      }
                      className="text-foreground focus:text-foreground w-12 [appearance:textfield] text-center font-mono text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        onSettingsChange({
                          ...settings,
                          customMaxDimension: Math.min(
                            3840,
                            (settings.customMaxDimension || 1280) + 100,
                          ),
                        })
                      }
                      className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-all active:scale-90"
                      title="Increase 100px"
                      aria-label="Increase custom size by 100px"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="text-foreground/70 shrink-0 text-[11px]">
                    px
                  </span>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        resizePreset: "1080p",
                      })
                    }
                    className="border-border-color text-foreground/50 hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border bg-white transition-colors"
                    title="Reset to 1080p"
                    aria-label="Reset to 1080p preset"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="border-border-color flex max-w-full items-center overflow-x-auto rounded-md border bg-white p-0.5 sm:overflow-visible">
                  {RESIZE_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        onSettingsChange({
                          ...settings,
                          resizePreset: p.value,
                          customMaxDimension:
                            p.value === "custom"
                              ? settings.customMaxDimension || 1280
                              : settings.customMaxDimension,
                        })
                      }
                      className={clsx(
                        "shrink-0 cursor-pointer rounded px-2 py-0.5 text-xs whitespace-nowrap transition-all",
                        settings.resizePreset === p.value
                          ? "bg-foreground text-background font-medium"
                          : "text-foreground/70 hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-foreground/70 hidden text-[11px] sm:inline">
              (Auto-detects & swaps for 9:16 portrait)
            </span>
          </div>
        </div>

        <div className="border-border-color flex min-w-0 flex-1 flex-col gap-2 border-t border-dashed pt-2.5 lg:border-t-0 lg:border-l lg:border-dashed lg:pt-0 lg:pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Sliders className="text-foreground/70 h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground shrink-0">Tuning:</span>
            </div>

            <div className="border-border-color flex shrink-0 items-center rounded-md border bg-white p-0.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  onSettingsChange({ ...settings, mode: "quality" })
                }
                className={clsx(
                  "cursor-pointer rounded px-2 py-0.5 text-[11px] transition-all",
                  settings.mode === "quality"
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Adaptive visual quality (CRF / Quantizer: preserves fine textures like images 80%)"
              >
                Quality (%)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  onSettingsChange({ ...settings, mode: "target-size" })
                }
                className={clsx(
                  "cursor-pointer rounded px-2 py-0.5 text-[11px] transition-all",
                  settings.mode === "target-size"
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Strict file size cap (e.g. Discord 8MB, Email 10MB, Slack 25MB)"
              >
                Fit to Size (MB)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  onSettingsChange({ ...settings, mode: "bitrate" })
                }
                className={clsx(
                  "cursor-pointer rounded px-2 py-0.5 text-[11px] transition-all",
                  settings.mode === "bitrate"
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Strict manual target bitrate budget in Mbps"
              >
                Bitrate (Mbps)
              </button>
            </div>
          </div>

          {settings.mode === "quality" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={
                    isProcessing || (settings.qualityPercent || 80) <= 10
                  }
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      qualityPercent: Math.max(
                        10,
                        (settings.qualityPercent || 80) - 5,
                      ),
                    })
                  }
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:opacity-30"
                  title="Decrease quality (-5%)"
                >
                  <Minus className="h-3 w-3" />
                </button>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  disabled={isProcessing}
                  value={settings.qualityPercent || 80}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      qualityPercent: Number(e.target.value),
                    })
                  }
                  className="accent-utils-scent-orange bg-utils-scent-gray-01/50 h-1.5 w-24 cursor-pointer appearance-none rounded-lg sm:w-28"
                />

                <button
                  type="button"
                  disabled={
                    isProcessing || (settings.qualityPercent || 80) >= 100
                  }
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      qualityPercent: Math.min(
                        100,
                        (settings.qualityPercent || 80) + 5,
                      ),
                    })
                  }
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:opacity-30"
                  title="Increase quality (+5%)"
                >
                  <Plus className="h-3 w-3" />
                </button>

                <span className="text-foreground min-w-7 text-right font-mono text-xs">
                  {settings.qualityPercent || 80}%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {[
                  { label: "Low", val: 40 },
                  { label: "Draft", val: 60 },
                  { label: "Good", val: 75 },
                  { label: "Crisp", val: 85 },
                  { label: "Max", val: 95 },
                ].map((qp) => (
                  <button
                    key={qp.val}
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      onSettingsChange({ ...settings, qualityPercent: qp.val })
                    }
                    className={clsx(
                      "border-border-color cursor-pointer rounded border border-dashed px-1.5 py-1 text-[10px] text-nowrap transition-all",
                      (settings.qualityPercent || 80) === qp.val
                        ? "bg-foreground/5 text-foreground border-foreground/5 border-solid"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                  >
                    {qp.label} ({qp.val}%)
                  </button>
                ))}
              </div>
            </div>
          ) : settings.mode === "target-size" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="border-border-color flex shrink-0 items-center rounded-md border bg-white p-0.5">
                  <button
                    type="button"
                    disabled={isProcessing || (settings.targetSizeMB || 8) <= 1}
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        targetSizeMB: Math.max(
                          1,
                          (settings.targetSizeMB || 8) - 1,
                        ),
                      })
                    }
                    className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-all active:scale-90 disabled:opacity-30"
                    title="Decrease target size (-1 MB)"
                    aria-label="Decrease target size by 1 MB"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    disabled={isProcessing}
                    value={settings.targetSizeMB || 8}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        targetSizeMB: Math.max(
                          1,
                          Math.min(500, Number(e.target.value) || 8),
                        ),
                      })
                    }
                    className="text-foreground focus:text-foreground w-10 [appearance:textfield] text-center font-mono text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    disabled={
                      isProcessing || (settings.targetSizeMB || 8) >= 500
                    }
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        targetSizeMB: Math.min(
                          500,
                          (settings.targetSizeMB || 8) + 1,
                        ),
                      })
                    }
                    className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-all active:scale-90 disabled:opacity-30"
                    title="Increase target size (+1 MB)"
                    aria-label="Increase target size by 1 MB"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <span className="text-foreground/70 shrink-0 text-[11px]">
                  MB cap
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {[
                  { label: "Mini", val: 1 },
                  { label: "Hero", val: 3 },
                  { label: "Discord", val: 8 },
                  { label: "Email", val: 10 },
                  { label: "Slack", val: 25 },
                  { label: "HD", val: 50 },
                ].map((sp) => (
                  <button
                    key={sp.val}
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      onSettingsChange({ ...settings, targetSizeMB: sp.val })
                    }
                    className={clsx(
                      "border-border-color cursor-pointer rounded border border-dashed px-1.5 py-1 text-[10px] text-nowrap transition-all",
                      (settings.targetSizeMB || 8) === sp.val
                        ? "bg-foreground/5 text-foreground border-foreground/5 border-solid"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                    title={`${sp.label} (${sp.val}MB max limit)`}
                  >
                    {sp.label} ({sp.val}M)
                  </button>
                ))}
              </div>

              {(settings.targetSizeMB || 8) <= 2 && (
                <span className="text-foreground/70 text-[11px]">
                  Auto-calibrates 64k audio & resolution ceiling to strictly
                  guarantee &le; {settings.targetSizeMB || 8} MB
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isProcessing || settings.bitrateMbps <= 0.4}
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      bitrateMbps: Math.max(
                        0.4,
                        Math.round((settings.bitrateMbps - 0.2) * 10) / 10,
                      ),
                    })
                  }
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:opacity-30"
                  title="Decrease bitrate (-0.2 Mbps)"
                >
                  <Minus className="h-3 w-3" />
                </button>

                <input
                  type="range"
                  min="0.4"
                  max="10.0"
                  step="0.2"
                  disabled={isProcessing}
                  value={settings.bitrateMbps}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      bitrateMbps: Number(e.target.value),
                    })
                  }
                  className="accent-utils-scent-orange bg-utils-scent-gray-01/50 h-1.5 w-24 cursor-pointer appearance-none rounded-lg sm:w-28"
                />

                <button
                  type="button"
                  disabled={isProcessing || settings.bitrateMbps >= 10.0}
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      bitrateMbps: Math.min(
                        10.0,
                        Math.round((settings.bitrateMbps + 0.2) * 10) / 10,
                      ),
                    })
                  }
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:opacity-30"
                  title="Increase bitrate (+0.2 Mbps)"
                >
                  <Plus className="h-3 w-3" />
                </button>

                <span className="text-foreground min-w-7 text-right font-mono text-xs">
                  {settings.bitrateMbps.toFixed(1)}M
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {[
                  { label: "Loop", val: 1.0 },
                  { label: "Web", val: 2.5 },
                  { label: "Detail", val: 6.0 },
                  { label: "Master", val: 10.0 },
                ].map((bp) => (
                  <button
                    key={bp.val}
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      onSettingsChange({ ...settings, bitrateMbps: bp.val })
                    }
                    className={clsx(
                      "border-border-color cursor-pointer rounded border border-dashed px-1.5 py-1 text-[10px] text-nowrap transition-all",
                      settings.bitrateMbps === bp.val
                        ? "bg-foreground/5 text-foreground border-foreground/5 border-solid"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                  >
                    {bp.label} ({bp.val}M)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSelectAll}
              disabled={isProcessing}
              className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all disabled:opacity-50"
              title={isAllSelected ? "Deselect all" : "Select all"}
            >
              {isAllSelected ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="text-foreground/70 h-3.5 w-3.5" />
              )}
              <span>All</span>
              <span className="text-foreground/70 font-mono text-[11px]">
                ({selectedCount}/{totalCount})
              </span>
            </button>

            {isSomeSelected && (
              <>
                {onCompressSelected && selectedPendingCount > 0 && (
                  <button
                    type="button"
                    onClick={onCompressSelected}
                    disabled={isProcessing}
                    className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all disabled:opacity-50"
                    title="Optimize selected videos with pending changes"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span className="font-mono text-[11px]">
                      ({selectedPendingCount})
                    </span>
                  </button>
                )}

                {selectedDoneCount > 0 && (
                  <button
                    type="button"
                    onClick={onDownloadSelected}
                    disabled={isDownloadingZip || isProcessing}
                    className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all disabled:opacity-50"
                    title="Download selected compressed clips"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="font-mono text-[11px]">
                      {isDownloadingZip
                        ? "Zipping..."
                        : `(${selectedDoneCount})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onDeleteSelected}
                  disabled={isProcessing}
                  className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs transition-all disabled:opacity-50"
                  title="Delete selected videos"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="font-mono text-[11px]">
                    ({selectedCount})
                  </span>
                </button>
              </>
            )}
          </div>
        )}
        {totalCompressedBytes > 0 && totalSavedBytes > 0 && !hasUncompressed ? (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground/70 hidden sm:inline">
                Saved:
              </span>
              <span className="text-code-green bg-utils-scent-gray-01/40 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                {formatBytes(totalSavedBytes)} (-{totalSavingsPct}%)
              </span>
            </div>

            {hasPendingChanges &&
              totalEstimatedBytes &&
              totalEstimatedBytes > 0 &&
              totalOriginalBytes > totalEstimatedBytes && (
                <div
                  className="flex items-center gap-1"
                  title="New estimated total output if re-compressed with current settings"
                >
                  <span className="text-foreground/70 hidden sm:inline">
                    New:
                  </span>
                  <span className="text-code-blue bg-utils-scent-gray-01/40 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                    ~{formatBytes(totalEstimatedBytes)} (-
                    {Math.round(
                      ((totalOriginalBytes - totalEstimatedBytes) /
                        totalOriginalBytes) *
                        100,
                    )}
                    %)
                  </span>
                </div>
              )}
          </div>
        ) : totalEstimatedBytes &&
          totalEstimatedBytes > 0 &&
          totalOriginalBytes > totalEstimatedBytes &&
          hasUncompressed ? (
          <div
            className="flex items-center gap-1.5 text-xs"
            title="Estimated total output file size based on selected bitrate and duration"
          >
            <span className="text-foreground/70 hidden sm:inline">
              Est. Output:
            </span>
            <span className="text-code-blue bg-utils-scent-gray-01/40 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              ~{formatBytes(totalEstimatedBytes)} (-
              {Math.round(
                ((totalOriginalBytes - totalEstimatedBytes) /
                  totalOriginalBytes) *
                  100,
              )}
              %)
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
