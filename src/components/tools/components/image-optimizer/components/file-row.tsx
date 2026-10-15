"use client";

import React from "react";
import {
  Download,
  Trash2,
  Columns2,
  FileImage,
  AlertCircle,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { ImageFileItem } from "../types";
import { formatBytes, calculateSavings } from "../utils/format";

type Props = {
  item: ImageFileItem;
  isSelected: boolean; // For batch checkbox selection
  isActive: boolean; // For Explorer-style right sidebar inspection
  onToggleSelect: () => void;
  onActivate: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onOpenCompare: () => void;
};

export default function FileRow({
  item,
  isSelected,
  isActive,
  onToggleSelect,
  onActivate,
  onDownload,
  onDelete,
  onOpenCompare,
}: Props) {
  const savings =
    item.optimizedSize !== undefined
      ? calculateSavings(item.originalSize, item.optimizedSize)
      : null;

  return (
    <div
      onClick={onActivate}
      className={clsx(
        "group border-border-color flex cursor-pointer items-center justify-between gap-3 border-b border-dashed px-3 py-2.5 transition-all select-none",
        isActive
          ? "bg-utils-scent-gray-01/40 font-medium"
          : "hover:bg-utils-scent-gray-01/15 bg-white",
      )}
    >
      {/* Left: Checkbox & Thumbnail & Name */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="accent-utils-scent-orange h-4 w-4 shrink-0 cursor-pointer rounded"
          title="Select for bulk action"
        />

        {/* Thumbnail with checkerboard background */}
        <div className="border-border-color relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border bg-[#f9f9f9]">
          {item.originalUrl ? (
            <img
              src={item.optimizedUrl || item.originalUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <FileImage className="text-foreground/40 h-4 w-4" />
          )}
        </div>

        {/* Filename & Progress Bar or Size stats */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span
              className="truncate text-xs text-foreground"
              title={item.name}
            >
              {item.name}
            </span>
          </div>

          {/* Status / Progression Bar */}
          {item.status === "processing" && (
            <div className="mt-1 flex w-full max-w-xs items-center gap-2">
              <div className="bg-border-color/40 h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-utils-scent-orange h-full transition-all duration-300"
                  style={{ width: `${Math.max(10, item.progress)}%` }}
                />
              </div>
              <span className="text-foreground/60 flex items-center gap-1 font-mono text-[10px]">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {item.progress}%
              </span>
            </div>
          )}

          {item.status === "error" && (
            <div className="text-code-rust mt-0.5 flex items-center gap-1 text-[11px]">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {item.errorMessage || "Compression failed"}
              </span>
            </div>
          )}

          {item.status === "done" && item.optimizedSize !== undefined && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-foreground/60 font-mono">
                {formatBytes(item.originalSize)}
              </span>
              <span className="text-foreground/40">→</span>
              <span className="text-foreground font-mono font-medium">
                {formatBytes(item.optimizedSize)}
              </span>

              {savings && savings.isReduced && (
                <span className="text-code-green bg-utils-scent-gray-01/60 rounded px-1 font-mono text-[10px] font-semibold">
                  -{savings.percentSaved}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {item.status === "done" && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCompare();
              }}
              className="border-border-color text-foreground/80 hover:text-foreground hover:bg-background flex h-8 items-center gap-1 rounded border bg-white px-2 text-xs transition-all"
              title="Compare original vs optimized"
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="border-border-color text-foreground/80 hover:text-foreground hover:bg-background flex h-8 w-8 items-center justify-center rounded border bg-white transition-all"
              title="Download optimized image"
              aria-label={`Download ${item.name}`}
            >
              <Download className="text-code-blue h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="border-border-color text-foreground/60 hover:text-code-rust hover:bg-background flex h-8 w-8 items-center justify-center rounded border bg-white transition-all"
          title="Remove from queue"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
