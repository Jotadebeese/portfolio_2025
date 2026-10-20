"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Film,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Sliders,
  Sparkles,
  Minus,
  Plus,
  VolumeX,
  Volume2,
  Loader2,
  Play,
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
  totalCount: number;
  onToggleSelectAll: () => void;
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
  totalCount,
  onToggleSelectAll,
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

          {totalCount > 0 && (
            <>
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
                  <button
                    type="button"
                    onClick={onDownloadSelected}
                    disabled={isDownloadingZip || isProcessing}
                    className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all disabled:opacity-50"
                    title="Download selected compressed clips"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="font-mono text-[11px]">
                      {isDownloadingZip ? "Zipping..." : `(${selectedCount})`}
                    </span>
                  </button>

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
            </>
          )}
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <button
                type="button"
                onClick={onCancelCompress}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-600 transition-all hover:bg-rose-500/20"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  Compressing ({processingIndex + 1}/{processingTotal}) &bull;
                  Stop
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartCompress}
                className={clsx(
                  "flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all active:scale-[0.98]",
                  hasUncompressed || hasPendingChanges
                    ? "bg-foreground text-background hover:bg-foreground/90 border border-transparent"
                    : "bg-utils-scent-gray-01/40 border-border-color text-foreground hover:bg-utils-scent-gray-01/60 border",
                )}
                title="Run hardware-accelerated video compression"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>
                  {hasUncompressed
                    ? `Compress Queue (${totalCount})`
                    : hasPendingChanges
                      ? `Apply Changes (${totalCount})`
                      : "Re-compress All"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-3">
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

            {/* Live re-estimation as user adjusts tools after batch is compressed */}
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
            <Sparkles className="text-utils-scent-orange h-3.5 w-3.5" />
            <span className="text-foreground/70 hidden sm:inline">
              Est. Output:
            </span>
            <span className="text-foreground/90 rounded-md border border-[#ff9900]/30 bg-[#ff9900]/10 px-1.5 py-0.5 font-mono text-[11px] font-medium">
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
      {/* Settings Row (Disabled & dimmed during active compression) */}
      <div
        className={clsx(
          "border-border-color bg-background/50 flex flex-col justify-between gap-3 rounded-md border border-dashed p-2.5 text-xs transition-opacity md:flex-row md:items-stretch",
          isProcessing &&
            "pointer-events-none cursor-not-allowed opacity-50 select-none",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
          {/* Format & Audio Strip Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Format Selector */}
            <div className="flex items-center gap-2">
              <span className="text-foreground shrink-0 font-medium">
                Format:
              </span>
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
                        ? "bg-foreground text-background font-medium"
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

            {/* Strip Audio Toggle (ConvertVideos.ps1 -an parity) */}
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
                "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all",
                settings.stripAudio
                  ? "border-utils-scent-orange bg-utils-scent-orange/10 text-utils-scent-orange font-medium"
                  : "border-border-color text-foreground/70 hover:text-foreground bg-white",
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
                  <span>Mute / Strip Audio (Web Loop)</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Keep Audio Track</span>
                </>
              )}
            </button>
          </div>

          {/* Resolution Preset Pills (ConvertVideos.ps1 parity) */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-foreground shrink-0 font-medium">
              Target Size:
            </span>

            {isCustom ? (
              <div className="flex shrink-0 items-center gap-1.5">
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
                    className="bg-foreground text-background shrink-0 cursor-pointer rounded px-2.5 py-0.5 text-xs font-medium"
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
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        customMaxDimension: Math.max(
                          100,
                          Number(e.target.value) || 1280,
                        ),
                      })
                    }
                    className="text-foreground focus:text-foreground w-12 [appearance:textfield] text-center font-mono text-xs focus:outline-none"
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
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="text-foreground/50 pr-1 font-mono text-[10px]">
                    px
                  </span>
                </div>
              </div>
            ) : (
              <div className="border-border-color flex flex-wrap items-center rounded-md border bg-white p-0.5">
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
                      "shrink-0 cursor-pointer rounded px-2.5 py-0.5 text-xs whitespace-nowrap transition-all",
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
            <span className="text-foreground/50 hidden text-[10px] sm:inline">
              (Auto-detects & swaps for 9:16 portrait)
            </span>
          </div>
        </div>

        {/* Compression Quality & Bitrate Tuning */}
        <div className="border-border-color flex shrink-0 flex-col gap-2 border-t border-dashed pt-2.5 md:border-t-0 md:border-l md:border-dashed md:pt-0 md:pl-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sliders className="text-foreground/70 h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground shrink-0 font-medium">
                Tuning:
              </span>
            </div>

            {/* Mode Toggle: Quality / CRF vs Fit to Size vs Bitrate */}
            <div className="border-border-color flex items-center rounded-md border bg-white p-0.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  onSettingsChange({ ...settings, mode: "quality" })
                }
                className={clsx(
                  "cursor-pointer rounded px-2 py-0.5 text-[11px] transition-all",
                  settings.mode === "quality"
                    ? "bg-foreground text-background font-medium"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Adaptive visual quality (CRF / Quantizer: preserves fine textures like images 80%)"
              >
                Quality / CRF (%)
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
                    ? "bg-foreground text-background font-medium"
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
                    ? "bg-foreground text-background font-medium"
                    : "text-foreground/70 hover:text-foreground",
                )}
                title="Strict manual target bitrate budget in Mbps"
              >
                Bitrate (Mbps)
              </button>
            </div>
          </div>

          {/* Conditional Control: Quality % vs Fit to Size MB vs Bitrate Slider */}
          {settings.mode === "quality" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={
                    isProcessing || (settings.qualityPercent || 80) <= 50
                  }
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      qualityPercent: Math.max(
                        50,
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
                  min="50"
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

                <span className="text-foreground min-w-[42px] text-right font-mono text-xs font-semibold">
                  {settings.qualityPercent || 80}%
                </span>
              </div>

              {/* Quick Quality Presets */}
              <div className="flex items-center gap-1">
                {[
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
                      "cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] transition-all",
                      (settings.qualityPercent || 80) === qp.val
                        ? "bg-foreground/10 text-foreground font-semibold"
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
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:opacity-30"
                  title="Decrease target size (-1 MB)"
                >
                  <Minus className="h-3 w-3" />
                </button>

                <div className="border-border-color flex items-center rounded-md border bg-white px-1.5 py-0.5">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    disabled={isProcessing}
                    value={settings.targetSizeMB || 8}
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        targetSizeMB: Math.max(
                          1,
                          Math.min(500, Number(e.target.value) || 8),
                        ),
                      })
                    }
                    className="text-foreground w-9 [appearance:textfield] text-center font-mono text-xs font-semibold focus:outline-none"
                  />
                  <span className="text-foreground/60 pl-0.5 font-mono text-[10px]">
                    MB cap
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isProcessing || (settings.targetSizeMB || 8) >= 500}
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      targetSizeMB: Math.min(
                        500,
                        (settings.targetSizeMB || 8) + 1,
                      ),
                    })
                  }
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:opacity-30"
                  title="Increase target size (+1 MB)"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Quick File Size Presets */}
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
                      "cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] transition-all",
                      (settings.targetSizeMB || 8) === sp.val
                        ? "bg-foreground/10 text-foreground font-semibold"
                        : "text-foreground/50 hover:text-foreground",
                    )}
                    title={`${sp.label} (${sp.val}MB max limit)`}
                  >
                    {sp.label} ({sp.val}M)
                  </button>
                ))}
              </div>

              {(settings.targetSizeMB || 8) <= 2 && (
                <span className="text-foreground/60 font-mono text-[10px]">
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

                <span className="text-foreground min-w-[42px] text-right font-mono text-xs font-semibold">
                  {settings.bitrateMbps.toFixed(1)}M
                </span>
              </div>

              {/* Quick Bitrate Presets */}
              <div className="flex items-center gap-1">
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
                      "cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] transition-all",
                      settings.bitrateMbps === bp.val
                        ? "bg-foreground/10 text-foreground font-semibold"
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
    </div>
  );
}
