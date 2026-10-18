"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  ImagePlus,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Sliders,
  Sparkles,
  Minus,
  Plus,
  X,
  HelpCircle,
  Info,
} from "lucide-react";
import { OptimizerSettings, OutputFormat, ResizePreset } from "../types";
import { formatBytes } from "../utils/format";
import clsx from "clsx";

type Props = {
  settings: OptimizerSettings;
  onSettingsChange: (settings: OptimizerSettings) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  isDownloadingZip: boolean;
  totalOriginalBytes: number;
  totalOptimizedBytes: number;
  maxFiles?: number;
  supportsWebP?: boolean;
};

const FORMATS: { label: string; value: OutputFormat }[] = [
  { label: "WebP", value: "image/webp" },
  { label: "JPEG", value: "image/jpeg" },
  { label: "PNG", value: "image/png" },
];

const RESIZE_PRESETS: { label: string; value: ResizePreset }[] = [
  { label: "Original", value: "original" },
  { label: "1920px", value: "1920" },
  { label: "1280px", value: "1280" },
  { label: "800px", value: "800" },
  { label: "50%", value: "50%" },
  { label: "Custom", value: "custom" },
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
  isDownloadingZip,
  totalOriginalBytes,
  totalOptimizedBytes,
  maxFiles = 50,
  supportsWebP = true,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const isCustom = settings.resizePreset === "custom";
  const isQueueFull = totalCount >= maxFiles;
  const [showWebpExplainer, setShowWebpExplainer] = useState(false);

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
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
  const totalSavingsPct =
    totalOriginalBytes > 0
      ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
      : 0;

  return (
    <div className="border-border-color flex flex-col gap-3 border-b border-dashed pb-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        disabled={isQueueFull}
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (!isQueueFull) fileInputRef.current?.click();
            }}
            disabled={isQueueFull}
            className="bg-background border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            title={
              isQueueFull
                ? `Queue limit reached (${maxFiles} images max)`
                : "Upload images from device"
            }
          >
            <ImagePlus className="text-foreground/70 h-3.5 w-3.5" />
            <span>Add</span>
            {totalCount > 0 && (
              <span className="font-mono text-[10px] opacity-75">
                ({totalCount}/{maxFiles})
              </span>
            )}
          </button>

          {totalCount > 0 && (
            <>
              <button
                onClick={onToggleSelectAll}
                className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all select-none"
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
                    onClick={onDownloadSelected}
                    disabled={isDownloadingZip}
                    className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all disabled:opacity-50"
                    title="Download selected images as a ZIP archive"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="font-mono text-[11px]">
                      {isDownloadingZip ? "Zipping..." : `(${selectedCount})`}
                    </span>
                  </button>

                  <button
                    onClick={onDeleteSelected}
                    className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-xs transition-all"
                    title="Delete selected images from queue"
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

        {totalOptimizedBytes > 0 && totalSavedBytes > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Sparkles className="text-foreground/70 h-3.5 w-3.5" />
            <span className="text-foreground/70 hidden sm:inline">Saved:</span>
            <span className="text-code-green bg-utils-scent-gray-01/40 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              {formatBytes(totalSavedBytes)} (-{totalSavingsPct}%)
            </span>
          </div>
        )}
      </div>

      <div className="border-border-color bg-background/50 flex flex-col justify-between gap-3 rounded-md border border-dashed p-2 text-xs md:flex-row md:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-foreground shrink-0">Format:</span>
            <div className="border-border-color flex items-center rounded-md border bg-white p-0.5">
              {FORMATS.map((f) => {
                const isWebpUnsupported =
                  f.value === "image/webp" && !supportsWebP;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      if (isWebpUnsupported) {
                        setShowWebpExplainer((prev) => !prev);
                      } else {
                        onSettingsChange({ ...settings, format: f.value });
                      }
                    }}
                    title={
                      isWebpUnsupported
                        ? "WebP canvas encoding is not supported on iOS WebKit browsers. Tap to learn why."
                        : undefined
                    }
                    className={clsx(
                      "cursor-pointer rounded px-2.5 py-0.5 text-xs transition-all",
                      isWebpUnsupported
                        ? "text-foreground/45 hover:text-foreground/75"
                        : settings.format === f.value
                          ? "bg-foreground text-background font-medium"
                          : "text-foreground/70 hover:text-foreground",
                    )}
                  >
                    <span className={clsx(isWebpUnsupported && "line-through")}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {!supportsWebP && (
              <button
                type="button"
                onClick={() => setShowWebpExplainer((prev) => !prev)}
                className="text-foreground/70 hover:text-foreground flex cursor-pointer items-center gap-1 font-mono text-[10px] underline underline-offset-2 transition-colors"
                title="Click to see why WebP is disabled on iOS"
              >
                <HelpCircle className="h-3 w-3 shrink-0" />
                <span>Why is WebP disabled?</span>
              </button>
            )}
          </div>

          {showWebpExplainer && (
            <div className="text-foreground flex items-start justify-between gap-2.5 rounded-md bg-white p-2 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 text-[11px]">
                  <span className="text-foreground font-semibold">
                    Apple WebKit Engine Limitation
                  </span>
                  <span>
                    iOS (Safari, Chrome iOS, and all iPhone browsers) does not
                    support native WebP canvas encoding. When requested, iOS
                    silently falls back to an uncompressed 15MB PNG.
                  </span>
                  <span className="text-foreground/70">
                    We automatically select <strong>JPEG</strong> so your photos
                    compress properly with full quality control.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWebpExplainer(false)}
                className="text-foreground/50 hover:text-foreground shrink-0 cursor-pointer p-0.5"
                aria-label="Close explainer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex min-w-0 items-center gap-2">
            <span className="text-foreground shrink-0">Max Size:</span>

            {isCustom ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="border-border-color flex items-center rounded-md border bg-white p-0.5">
                  <button
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        resizePreset: "original",
                      })
                    }
                    className="bg-foreground text-background shrink-0 cursor-pointer rounded px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
                    title="Click to return to presets"
                  >
                    Custom
                  </button>
                </div>

                <div className="border-border-color flex shrink-0 items-center rounded-md border bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        customMaxDimension: Math.max(
                          50,
                          (settings.customMaxDimension || 1600) - 100,
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
                    min="50"
                    max="8000"
                    step="50"
                    placeholder="1600"
                    value={settings.customMaxDimension || 1600}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        onSettingsChange({
                          ...settings,
                          resizePreset: "original",
                        });
                      }
                    }}
                    onChange={(e) =>
                      onSettingsChange({
                        ...settings,
                        customMaxDimension: Math.max(
                          10,
                          Number(e.target.value) || 1600,
                        ),
                      })
                    }
                    className="text-foreground focus:text-foreground w-12 [appearance:textfield] text-center font-mono text-xs focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        customMaxDimension: Math.min(
                          8000,
                          (settings.customMaxDimension || 1600) + 100,
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
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      resizePreset: "original",
                    })
                  }
                  className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/60 hover:text-foreground flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-all active:scale-95"
                  title="Reset to Original presets (Esc)"
                  aria-label="Reset to Original presets"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="border-border-color flex max-w-full items-center overflow-x-auto rounded-md border bg-white p-0.5">
                {RESIZE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        resizePreset: p.value,
                        customMaxDimension:
                          p.value === "custom" && !settings.customMaxDimension
                            ? 1600
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
          </div>
        </div>

        <div className="border-border-color flex shrink-0 items-center gap-2 border-t border-dashed pt-2.5 md:border-t-0 md:border-l md:border-dashed md:pt-0 md:pl-4">
          <Sliders className="text-foreground/70 h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground shrink-0">Quality:</span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  quality: Math.max(10, settings.quality - 5),
                })
              }
              disabled={settings.quality <= 10}
              className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
              title="Decrease quality (-5%)"
              aria-label="Decrease quality by 5%"
            >
              <Minus className="h-3 w-3" />
            </button>

            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={settings.quality}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  quality: Number(e.target.value),
                })
              }
              className="accent-utils-scent-orange w-25 cursor-pointer sm:w-20"
              aria-label="Quality percentage"
            />

            <button
              type="button"
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  quality: Math.min(100, settings.quality + 5),
                })
              }
              disabled={settings.quality >= 100}
              className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded border bg-white transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
              title="Increase quality (+5%)"
              aria-label="Increase quality by 5%"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <span className="text-foreground w-7 text-center font-mono">
            {settings.quality}%
          </span>
        </div>
      </div>
    </div>
  );
}
