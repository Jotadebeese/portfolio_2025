"use client";

import React, { useRef } from "react";
import {
  ImagePlus,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Sliders,
  Sparkles,
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
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-foreground border-foreground text-background flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all hover:opacity-90 active:scale-[0.98]"
            title="Upload images from device"
          >
            <ImagePlus className="text-utils-scent-orange h-3.5 w-3.5" />
            <span>Add Images</span>
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
                  <Square className="text-foreground/60 h-3.5 w-3.5" />
                )}
                <span>Select All</span>
                <span className="text-foreground/60 font-mono text-[11px]">
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
                    <span>
                      {isDownloadingZip
                        ? "Zipping..."
                        : `Download Selected (${selectedCount})`}
                    </span>
                  </button>

                  <button
                    onClick={onDeleteSelected}
                    className="border-border-color text-code-rust bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all"
                    title="Delete selected images from queue"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete ({selectedCount})</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {totalOptimizedBytes > 0 && totalSavedBytes > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Sparkles className="text-code-green h-3.5 w-3.5" />
            <span className="text-foreground/70 hidden sm:inline">Saved:</span>
            <span className="text-code-green bg-utils-scent-gray-01/40 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              {formatBytes(totalSavedBytes)} (-{totalSavingsPct}%)
            </span>
          </div>
        )}
      </div>

      <div className="border-border-color bg-background/50 flex flex-col md:flex-row md:items-stretch justify-between gap-3 rounded-md border border-dashed p-2 text-xs">
        {/* Left Container: Format & Max Size (True Flex Column) */}
        <div className="flex flex-col justify-center gap-2.5 flex-1 min-w-0">
          {/* Format */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-foreground shrink-0">Format:</span>
            <div className="border-border-color flex items-center rounded-md border bg-white p-0.5">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() =>
                    onSettingsChange({ ...settings, format: f.value })
                  }
                  className={clsx(
                    "cursor-pointer rounded px-2.5 py-0.5 text-xs transition-all",
                    settings.format === f.value
                      ? "bg-foreground text-background font-medium"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Size */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-foreground shrink-0">Max Size:</span>
            <div className="border-border-color flex items-center rounded-md border bg-white p-0.5 overflow-x-auto max-w-full">
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
                    "cursor-pointer rounded px-2 py-0.5 text-xs transition-all shrink-0 whitespace-nowrap",
                    settings.resizePreset === p.value
                      ? "bg-foreground text-background font-medium"
                      : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {settings.resizePreset === "custom" && (
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min="50"
                  max="8000"
                  step="50"
                  placeholder="1600"
                  value={settings.customMaxDimension || 1600}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      customMaxDimension: Math.max(
                        10,
                        Number(e.target.value) || 1600,
                      ),
                    })
                  }
                  className="border-border-color text-foreground focus:border-utils-scent-orange w-16 rounded border bg-white px-1.5 py-0.5 text-center font-mono text-xs focus:outline-none"
                />
                <span className="text-foreground/70 text-[11px]">px</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Container: Quality Slider */}
        <div className="border-border-color md:border-l md:border-dashed md:pl-4 flex items-center gap-2 shrink-0 border-t border-dashed pt-2.5 md:border-t-0 md:pt-0">
          <Sliders className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground shrink-0">Quality:</span>
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
            className="accent-utils-scent-orange w-20 cursor-pointer sm:w-28"
          />
          <span className="text-foreground w-6 text-right font-mono">
            {settings.quality}%
          </span>
        </div>
      </div>
    </div>
  );
}
