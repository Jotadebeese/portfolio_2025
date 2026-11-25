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
  AlertCircle,
} from "lucide-react";
import {
  VideoFpsOption,
  VideoOptimizerSettings,
  VideoOutputFormat,
  VideoResizePreset,
} from "../types";
import { formatBytes, calculateSavings, formatFps } from "../utils/format";
import clsx from "clsx";
import ToolButton from "@/components/ui/tool-button";
import Badge from "@/components/ui/badge";
import HardwareFader from "@/components/ui/hardware-fader";
import SegmentedSwitch from "@/components/ui/segmented-switch";

type Props = {
  settings: VideoOptimizerSettings;
  onSettingsChange: (settings: VideoOptimizerSettings) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  selectedCount: number;
  selectedPendingCount?: number;
  selectedDoneCount?: number;
  doneCount?: number;
  hasLargerItems?: boolean;
  hasOverCapItems?: boolean;
  totalCount: number;
  onToggleSelectAll: () => void;
  onCompressSelected?: () => void;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  onDownloadAll?: () => void;
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
  maxSourceFps?: number;
  maxFiles?: number;
};

const FPS_OPTIONS: { label: string; value: VideoFpsOption }[] = [
  { label: "Original", value: "original" },
  { label: "60", value: 60 },
  { label: "30", value: 30 },
  { label: "24", value: 24 },
  { label: "15", value: 15 },
];

const EXPORT_SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

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
  doneCount = 0,
  hasLargerItems = false,
  hasOverCapItems = false,
  totalCount,
  onToggleSelectAll,
  onCompressSelected,
  onDeleteSelected,
  onDownloadSelected,
  onDownloadAll,
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
  maxSourceFps,
  maxFiles = 10,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isCustom = settings.resizePreset === "custom";
  const isQueueFull = totalCount >= maxFiles;
  const [customInputText, setCustomInputText] = useState<string>(
    String(settings.customMaxDimension || 1280),
  );

  useEffect(() => {
    setCustomInputText(String(settings.customMaxDimension || 1280));
  }, [settings.customMaxDimension]);

  useEffect(() => {
    if (isCustom) {
      customInputRef.current?.focus();
      customInputRef.current?.select();
    }
  }, [isCustom]);

  useEffect(() => {
    if (!isCustom) return;
    const parsed = parseInt(customInputText, 10);
    if (isNaN(parsed) || parsed < 240 || parsed > 3840) return;
    if (parsed === (settings.customMaxDimension || 1280)) return;

    const timer = setTimeout(() => {
      onSettingsChange({
        ...settings,
        customMaxDimension: parsed,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [customInputText, isCustom, settings, onSettingsChange]);

  const commitCustomDimension = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      const fallback = settings.customMaxDimension || 1280;
      setCustomInputText(String(fallback));
      return;
    }
    const clamped = Math.min(3840, Math.max(240, parsed));
    setCustomInputText(String(clamped));
    if (clamped !== settings.customMaxDimension) {
      onSettingsChange({
        ...settings,
        customMaxDimension: clamped,
      });
    }
  };

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
  const totalSavingsPct = calculateSavings(
    totalOriginalBytes,
    totalCompressedBytes,
  ).percentSaved;
  const totalEstSavingsPct =
    totalEstimatedBytes && totalEstimatedBytes > 0
      ? calculateSavings(totalOriginalBytes, totalEstimatedBytes).percentSaved
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
          <ToolButton
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!isQueueFull && !isProcessing) fileInputRef.current?.click();
            }}
            disabled={isQueueFull || isProcessing}
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
          </ToolButton>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <>
                <Loader size={14} className="animate-spin" />
                <ToolButton
                  variant="danger"
                  size="sm"
                  onClick={onCancelCompress}
                >
                  <span>
                    ({processingIndex + 1}/{processingTotal})
                  </span>
                  <Square className="h-3.5 w-3.5" />
                </ToolButton>
              </>
            ) : (
              <ToolButton
                variant={
                  hasUncompressed || hasPendingChanges ? "primary" : "outline"
                }
                size="sm"
                onClick={onStartCompress}
                disabled={!hasUncompressed && !hasPendingChanges}
                title={
                  hasUncompressed || hasPendingChanges
                    ? "Run hardware-accelerated video compression"
                    : hasLargerItems
                      ? "Some compressed videos are larger than the original"
                      : hasOverCapItems
                        ? "Some videos exceeded the requested target size cap"
                        : "All videos in queue are already optimized with current settings"
                }
              >
                {hasUncompressed || hasPendingChanges ? (
                  <Play className="h-3.5 w-3.5 fill-current" />
                ) : hasLargerItems || hasOverCapItems ? (
                  <AlertCircle className="text-code-rust h-3.5 w-3.5" />
                ) : (
                  <Check className="text-code-green h-3.5 w-3.5" />
                )}
                <span>
                  {hasUncompressed
                    ? `Compress Queue (${(uncompressedCount ?? totalCount) + (pendingChangesCount ?? 0)})`
                    : hasPendingChanges
                      ? `Apply Changes (${pendingChangesCount ?? totalCount})`
                      : hasLargerItems
                        ? "Done (Larger)"
                        : hasOverCapItems
                          ? "Done (Over cap)"
                          : "All Optimized"}
                </span>
              </ToolButton>
            )}
          </div>
        )}
      </div>
      <div
        className={clsx(
          "border-border-color flex flex-col justify-between gap-3 rounded-md border border-dashed bg-[#f4f2ee]/90 p-2 text-xs transition-opacity lg:flex-row lg:items-stretch",
          isProcessing &&
            "pointer-events-none cursor-not-allowed opacity-50 select-none",
        )}
      >
        <div className="flex min-w-0 flex-col justify-center gap-2 lg:shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-foreground shrink-0">Format:</span>
            <SegmentedSwitch
              showLed
              disabled={isProcessing}
              ariaLabel="Output video format"
              value={settings.format}
              onChange={(nextFormat) =>
                onSettingsChange({ ...settings, format: nextFormat })
              }
              options={FORMATS.map((f) => ({
                value: f.value,
                label: f.label,
                sublabel: `(${f.badge})`,
              }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
                  "border-border-color/90 flex w-[88px] cursor-pointer items-center justify-start gap-1.5 rounded-md border bg-[#f7f5f2] px-2.5 py-1 text-xs font-medium shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all hover:bg-white active:translate-y-px active:shadow-none",
                  settings.stripAudio ? "text-code-rust" : "text-foreground",
                )}
                aria-pressed={settings.stripAudio}
                title={
                  settings.stripAudio
                    ? "Audio track is off (stripped on export)"
                    : "Audio track will be preserved on export"
                }
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "size-1.5 shrink-0 rounded-full",
                    settings.stripAudio ? "bg-code-rust/80" : "bg-code-green",
                  )}
                />
                {settings.stripAudio ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5" />
                    <span>Off</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Keep</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-foreground shrink-0">Speed:</span>
              <SegmentedSwitch
                size="xs"
                disabled={isProcessing}
                value={
                  EXPORT_SPEED_OPTIONS.find(
                    (spd) => Math.abs((settings.exportSpeed ?? 1) - spd) < 0.01,
                  ) ?? 1
                }
                onChange={(spd) =>
                  onSettingsChange({ ...settings, exportSpeed: spd })
                }
                title="Output playback speed multiplier baked into exported video"
                options={EXPORT_SPEED_OPTIONS.map((spd) => ({
                  value: spd,
                  label: `${spd}x`,
                  mono: true,
                  title: `Export video at ${spd}x speed`,
                }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground shrink-0">FPS:</span>
            <SegmentedSwitch
              disabled={isProcessing}
              ariaLabel="Target frame rate"
              value={settings.targetFps ?? "original"}
              onChange={(nextFps) =>
                onSettingsChange({ ...settings, targetFps: nextFps })
              }
              options={FPS_OPTIONS.filter(
                (opt) =>
                  opt.value === "original" ||
                  maxSourceFps === undefined ||
                  maxSourceFps <= 0 ||
                  opt.value < maxSourceFps - 0.5,
              ).map((opt) => ({
                value: opt.value,
                label: opt.label,
                mono: opt.value !== "original",
                title:
                  opt.value === "original"
                    ? "Keep original frame rate"
                    : `Downsample output to ${opt.value}fps`,
              }))}
            />
            {maxSourceFps !== undefined && maxSourceFps > 0 && (
              <span className="text-foreground/60 hidden font-mono text-[10px] sm:inline">
                (Source: {formatFps(maxSourceFps)}fps)
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-start gap-2 sm:items-center">
              <span className="text-foreground shrink-0 pt-1 sm:pt-0">
                Size:
              </span>

              {isCustom ? (
                <div className="flex max-w-full flex-wrap items-center gap-1.5">
                  <div className="border-border-color/90 flex items-center rounded-md border bg-[#e6e3dd] p-0.5 shadow-[inset_0_1px_2px_rgba(24,20,17,0.12)]">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        onSettingsChange({
                          ...settings,
                          resizePreset: "1080p",
                        })
                      }
                      className="bg-foreground text-background shrink-0 cursor-pointer rounded px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-[0_1px_2px_rgba(24,20,17,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      title="Click to return to standard presets"
                    >
                      Custom
                    </button>
                  </div>

                  <div className="border-border-color/90 flex max-w-full flex-wrap items-center gap-0.5 rounded-md border bg-[#e6e3dd] p-0.5 shadow-[inset_0_1px_2px_rgba(24,20,17,0.12)]">
                    <button
                      type="button"
                      disabled={
                        isProcessing ||
                        (settings.customMaxDimension || 1280) <= 240
                      }
                      onClick={() => {
                        const next = Math.max(
                          240,
                          (settings.customMaxDimension || 1280) - 100,
                        );
                        setCustomInputText(String(next));
                        onSettingsChange({
                          ...settings,
                          customMaxDimension: next,
                        });
                      }}
                      className="text-foreground/75 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-transparent bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08)] transition-all hover:bg-white active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
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
                      value={customInputText}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => commitCustomDimension(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          onSettingsChange({
                            ...settings,
                            resizePreset: "1080p",
                          });
                        } else if (e.key === "Enter") {
                          e.currentTarget.blur();
                          commitCustomDimension(customInputText);
                        }
                      }}
                      onChange={(e) => setCustomInputText(e.target.value)}
                      className="text-foreground focus:text-foreground mx-0.5 w-12 [appearance:textfield] rounded bg-white/85 py-0.5 text-center font-mono text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      disabled={
                        isProcessing ||
                        (settings.customMaxDimension || 1280) >= 3840
                      }
                      onClick={() => {
                        const next = Math.min(
                          3840,
                          (settings.customMaxDimension || 1280) + 100,
                        );
                        setCustomInputText(String(next));
                        onSettingsChange({
                          ...settings,
                          customMaxDimension: next,
                        });
                      }}
                      className="text-foreground/75 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-transparent bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08)] transition-all hover:bg-white active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-30"
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
                    className="border-border-color text-foreground/65 hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all hover:bg-white active:translate-y-px active:shadow-none"
                    title="Reset to 1080p"
                    aria-label="Reset to 1080p preset"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <SegmentedSwitch
                  disabled={isProcessing}
                  ariaLabel="Output video resolution preset"
                  value={settings.resizePreset}
                  onChange={(nextPreset) =>
                    onSettingsChange({
                      ...settings,
                      resizePreset: nextPreset,
                      customMaxDimension:
                        nextPreset === "custom"
                          ? settings.customMaxDimension || 1280
                          : settings.customMaxDimension,
                    })
                  }
                  options={RESIZE_PRESETS.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />
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

            <SegmentedSwitch
              size="xs"
              showLed
              disabled={isProcessing}
              ariaLabel="Compression tuning mode"
              value={settings.mode}
              onChange={(nextMode) =>
                onSettingsChange({ ...settings, mode: nextMode })
              }
              options={[
                {
                  value: "quality",
                  label: "Quality (%)",
                  title:
                    "Adaptive visual quality (CRF / Quantizer: preserves fine textures like images 80%)",
                },
                {
                  value: "target-size",
                  label: "Fit to Size (MB)",
                  title:
                    "Strict file size cap (e.g. Discord 8MB, Email 10MB, Slack 25MB)",
                },
                {
                  value: "bitrate",
                  label: "Bitrate (Mbps)",
                  title: "Strict manual target bitrate budget in Mbps",
                },
              ]}
            />
          </div>

          {settings.mode === "quality" ? (
            <div className="flex flex-col gap-1.5">
              <HardwareFader
                min={10}
                max={100}
                step={5}
                disabled={isProcessing}
                value={settings.qualityPercent || 80}
                onChange={(next) =>
                  onSettingsChange({
                    ...settings,
                    qualityPercent: next,
                  })
                }
                ariaLabel="Video quality percentage"
                onDecrement={() =>
                  onSettingsChange({
                    ...settings,
                    qualityPercent: Math.max(
                      10,
                      (settings.qualityPercent || 80) - 5,
                    ),
                  })
                }
                onIncrement={() =>
                  onSettingsChange({
                    ...settings,
                    qualityPercent: Math.min(
                      100,
                      (settings.qualityPercent || 80) + 5,
                    ),
                  })
                }
                decrementTitle="Decrease quality (-5%)"
                incrementTitle="Increase quality (+5%)"
                decrementAriaLabel="Decrease video quality by 5%"
                incrementAriaLabel="Increase video quality by 5%"
                readout={`${settings.qualityPercent || 80}%`}
                readoutClassName="min-w-10"
              />

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
                      "shrink-0 cursor-pointer rounded border px-1.5 py-1 text-[10px] text-nowrap transition-all",
                      (settings.qualityPercent || 80) === qp.val
                        ? "border-foreground bg-foreground text-background shadow-[0_1px_2px_rgba(24,20,17,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
                        : "border-border-color/85 text-foreground/75 hover:text-foreground bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] hover:bg-white active:translate-y-px active:shadow-none",
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
                <div className="border-border-color/90 flex max-w-full flex-wrap items-center gap-0.5 rounded-md border bg-[#e6e3dd] p-0.5 shadow-[inset_0_1px_2px_rgba(24,20,17,0.12)]">
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
                    className="text-foreground/75 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-transparent bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08)] transition-all hover:bg-white active:translate-y-px active:shadow-none disabled:opacity-30"
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
                    className="text-foreground focus:text-foreground mx-0.5 w-10 [appearance:textfield] rounded bg-white/85 py-0.5 text-center font-mono text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                    className="text-foreground/75 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border border-transparent bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08)] transition-all hover:bg-white active:translate-y-px active:shadow-none disabled:opacity-30"
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
                      "shrink-0 cursor-pointer rounded border px-1.5 py-1 text-[10px] text-nowrap transition-all",
                      (settings.targetSizeMB || 8) === sp.val
                        ? "border-foreground bg-foreground text-background shadow-[0_1px_2px_rgba(24,20,17,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
                        : "border-border-color/85 text-foreground/75 hover:text-foreground bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] hover:bg-white active:translate-y-px active:shadow-none",
                    )}
                    title={`${sp.label} (${sp.val}MB max limit)`}
                  >
                    {sp.label} ({sp.val}M)
                  </button>
                ))}
              </div>

              {(settings.targetSizeMB || 8) <= 2 && (
                <span className="text-foreground/70 text-[11px]">
                  Auto-calibrates bitrate, 64k audio &amp; resolution (retries
                  automatically if needed) to fit &le;{" "}
                  {settings.targetSizeMB || 8} MB
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <HardwareFader
                min={0.4}
                max={10.0}
                step={0.2}
                disabled={isProcessing}
                value={settings.bitrateMbps}
                onChange={(next) =>
                  onSettingsChange({
                    ...settings,
                    bitrateMbps: next,
                  })
                }
                ariaLabel="Video target bitrate Mbps"
                onDecrement={() =>
                  onSettingsChange({
                    ...settings,
                    bitrateMbps: Math.max(
                      0.4,
                      Math.round((settings.bitrateMbps - 0.2) * 10) / 10,
                    ),
                  })
                }
                onIncrement={() =>
                  onSettingsChange({
                    ...settings,
                    bitrateMbps: Math.min(
                      10.0,
                      Math.round((settings.bitrateMbps + 0.2) * 10) / 10,
                    ),
                  })
                }
                decrementTitle="Decrease bitrate (-0.2 Mbps)"
                incrementTitle="Increase bitrate (+0.2 Mbps)"
                decrementAriaLabel="Decrease video bitrate by 0.2 Mbps"
                incrementAriaLabel="Increase video bitrate by 0.2 Mbps"
                readout={`${settings.bitrateMbps.toFixed(1)}M`}
                readoutClassName="min-w-11"
              />

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
                      "shrink-0 cursor-pointer rounded border px-1.5 py-1 text-[10px] text-nowrap transition-all",
                      settings.bitrateMbps === bp.val
                        ? "border-foreground bg-foreground text-background shadow-[0_1px_2px_rgba(24,20,17,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
                        : "border-border-color/85 text-foreground/75 hover:text-foreground bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] hover:bg-white active:translate-y-px active:shadow-none",
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <ToolButton
              variant="secondary"
              size="sm"
              onClick={onToggleSelectAll}
              disabled={isProcessing}
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
            </ToolButton>

            {!isSomeSelected && doneCount >= 2 && onDownloadAll && (
              <ToolButton
                variant="secondary"
                size="sm"
                onClick={onDownloadAll}
                disabled={isDownloadingZip || isProcessing}
                title="Download all compressed clips as a ZIP archive"
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {isDownloadingZip
                    ? "Zipping..."
                    : `Download All (${doneCount})`}
                </span>
              </ToolButton>
            )}

            {isSomeSelected && (
              <>
                {onCompressSelected && selectedPendingCount > 0 && (
                  <ToolButton
                    variant="secondary"
                    size="sm"
                    onClick={onCompressSelected}
                    disabled={isProcessing}
                    title="Optimize selected videos with pending changes"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span className="font-mono text-[11px]">
                      ({selectedPendingCount})
                    </span>
                  </ToolButton>
                )}

                {selectedDoneCount > 0 && (
                  <ToolButton
                    variant="secondary"
                    size="sm"
                    onClick={onDownloadSelected}
                    disabled={isDownloadingZip || isProcessing}
                    title="Download selected compressed clips"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="font-mono text-[11px]">
                      {isDownloadingZip
                        ? "Zipping..."
                        : `(${selectedDoneCount})`}
                    </span>
                  </ToolButton>
                )}

                <ToolButton
                  variant="danger"
                  size="sm"
                  onClick={onDeleteSelected}
                  disabled={isProcessing}
                  title="Delete selected videos"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="font-mono text-[11px]">
                    ({selectedCount})
                  </span>
                </ToolButton>
              </>
            )}
          </div>
        )}
        {totalCompressedBytes > 0 && totalSavedBytes > 0 && !hasUncompressed ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 text-xs whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground/70 hidden sm:inline">
                Saved:
              </span>
              <Badge variant="success">
                {formatBytes(totalSavedBytes)} (-{totalSavingsPct}%)
              </Badge>
            </div>

            {hasPendingChanges &&
              (totalEstimatedBytes ?? 0) > 0 &&
              totalOriginalBytes > (totalEstimatedBytes ?? 0) && (
                <div
                  className="flex items-center gap-1"
                  title="New estimated total output if re-compressed with current settings"
                >
                  <span className="text-foreground/70 hidden sm:inline">
                    New:
                  </span>
                  <Badge variant="info">
                    ~{formatBytes(totalEstimatedBytes ?? 0)} (-
                    {totalEstSavingsPct}%)
                  </Badge>
                </div>
              )}
          </div>
        ) : totalCompressedBytes > totalOriginalBytes &&
          totalOriginalBytes > 0 &&
          !hasUncompressed ? (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap">
            <span className="text-foreground/70 hidden sm:inline">
              Size change:
            </span>
            <Badge variant="danger">
              +{formatBytes(totalCompressedBytes - totalOriginalBytes)} (+
              {Math.round(
                ((totalCompressedBytes - totalOriginalBytes) /
                  totalOriginalBytes) *
                  100,
              )}
              %)
            </Badge>
          </div>
        ) : (totalEstimatedBytes ?? 0) > 0 &&
          totalOriginalBytes > 0 &&
          hasUncompressed ? (
          <div
            className="ml-auto flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap"
            title="Estimated total output file size based on selected bitrate and duration"
          >
            <span className="text-foreground/70 hidden sm:inline">
              Est. Output:
            </span>
            <Badge
              variant={
                totalOriginalBytes >= (totalEstimatedBytes ?? 0)
                  ? "info"
                  : "danger"
              }
            >
              ~{formatBytes(totalEstimatedBytes ?? 0)} (
              {totalOriginalBytes >= (totalEstimatedBytes ?? 0)
                ? `-${totalEstSavingsPct}%`
                : `+${Math.abs(totalEstSavingsPct)}%`}
              )
            </Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
