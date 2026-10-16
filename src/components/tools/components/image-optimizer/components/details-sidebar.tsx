"use client";

import React from "react";
import clsx from "clsx";
import {
  Download,
  Trash2,
  Columns2,
  FileCheck,
  Maximize2,
  Sparkles,
  Info,
} from "lucide-react";
import { ImageFileItem, OutputFormat } from "../types";
import {
  formatBytes,
  calculateSavings,
  getFilenameWithExtension,
  getFormatLabel,
} from "../utils/format";

type Props = {
  item: ImageFileItem | null;
  targetFormat: OutputFormat;
  onDownload: () => void;
  onDelete: () => void;
  onOpenCompare: () => void;
};

export default function DetailsSidebar({
  item,
  targetFormat,
  onDownload,
  onDelete,
  onOpenCompare,
}: Props) {
  if (!item) {
    return (
      <div className="border-border-color bg-background/30 flex h-full min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed p-6 text-center text-xs text-foreground/60">
        <Info className="h-6 w-6 stroke-1 text-foreground/40 mb-2" />
        <span className="font-medium text-foreground">No image selected</span>
        <span>Click any row in the file list to view details and live preview.</span>
      </div>
    );
  }

  const savings =
    item.optimizedSize !== undefined
      ? calculateSavings(item.originalSize, item.optimizedSize)
      : null;

  const targetName = getFilenameWithExtension(
    item.name,
    item.optimizedFormat || targetFormat,
  );

  return (
    <div className="border-border-color bg-white flex flex-col rounded-md border p-3.5 text-xs shadow-sm">
      {/* Top Preview Frame with Click to Compare */}
      <div
        onClick={onOpenCompare}
        className="group border-border-color relative flex aspect-[16/10] w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-[#f4f4f4] transition-all hover:border-utils-scent-orange"
        title="Click to view interactive before/after comparison"
      >
        <img
          src={item.optimizedUrl || item.originalUrl}
          alt={item.name}
          className="h-full w-full object-contain p-1"
        />

        <div className="bg-foreground/75 absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Columns2 className="text-utils-scent-orange h-4 w-4" />
          <span className="text-white text-[11px] font-medium">
            Click to Compare (Original vs. Optimized)
          </span>
          <Maximize2 className="text-white/70 h-3 w-3" />
        </div>
      </div>

      {/* Target Filename Header */}
      <div className="border-border-color mt-3 flex items-start justify-between gap-2 border-b border-dashed pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <FileCheck className="text-code-blue h-3.5 w-3.5 shrink-0" />
            <h4 className="truncate text-xs font-semibold text-foreground" title={targetName}>
              {targetName}
            </h4>
          </div>
          <span className="text-foreground/50 truncate text-[10px] block mt-0.5">
            Original: {item.name}
          </span>
        </div>

        {savings && savings.isReduced && (
          <span className="text-code-green bg-utils-scent-gray-01/60 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold shrink-0">
            -{savings.percentSaved}%
          </span>
        )}
        {savings &&
          !savings.isReduced &&
          item.optimizedSize !== undefined &&
          item.optimizedSize > item.originalSize && (
            <span className="text-foreground/60 bg-utils-scent-gray-01/60 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold shrink-0">
              +
              {Math.round(
                ((item.optimizedSize - item.originalSize) /
                  item.originalSize) *
                  100,
              )}
              %
            </span>
          )}
      </div>

      {/* Details Table (Finder / File Explorer Inspection Style) */}
      <div className="mt-2.5 flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
          Properties
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <span className="text-foreground/60">Type:</span>
          <span className="text-foreground font-mono text-right truncate">
            {getFormatLabel(item.originalType)} →{" "}
            {getFormatLabel(item.optimizedFormat || targetFormat)}
          </span>

          <span className="text-foreground/60">Original Size:</span>
          <span className="text-foreground font-mono text-right">
            {formatBytes(item.originalSize)}
          </span>

          <span className="text-foreground/60">Optimized Size:</span>
          <span className="text-foreground font-mono text-right font-medium">
            {item.optimizedSize !== undefined
              ? formatBytes(item.optimizedSize)
              : "Calculating..."}
          </span>

          {savings && (
            <>
              <span className="text-foreground/60">
                {savings.bytesSaved >= 0 ? "Space Saved:" : "Size Change:"}
              </span>
              <span
                className={clsx(
                  "font-mono text-right font-semibold",
                  savings.bytesSaved > 0
                    ? "text-code-green"
                    : savings.bytesSaved < 0
                      ? "text-foreground/70"
                      : "text-foreground/50",
                )}
              >
                {savings.bytesSaved > 0
                  ? `${formatBytes(savings.bytesSaved)} (-${savings.percentSaved}%)`
                  : savings.bytesSaved < 0
                    ? `+${formatBytes(Math.abs(savings.bytesSaved))} (+${Math.round(
                        ((item.optimizedSize! - item.originalSize) /
                          item.originalSize) *
                          100,
                      )}%)`
                    : "0 B (0%)"}
              </span>
            </>
          )}

          <span className="text-foreground/60">Dimensions:</span>
          <span className="text-foreground font-mono text-right truncate">
            {item.originalDimensions.width > 0
              ? `${item.originalDimensions.width}×${item.originalDimensions.height}`
              : "—"}
            {item.optimizedDimensions &&
              (item.optimizedDimensions.width !== item.originalDimensions.width ||
                item.optimizedDimensions.height !==
                  item.originalDimensions.height) && (
                <span className="text-utils-scent-orange ml-1">
                  → {item.optimizedDimensions.width}×
                  {item.optimizedDimensions.height}
                </span>
              )}
          </span>

          <span className="text-foreground/60">Status:</span>
          <span className="text-right font-medium">
            {item.status === "done" && (
              <span className="text-code-green">Ready</span>
            )}
            {item.status === "processing" && (
              <span className="text-utils-scent-orange">
                Optimizing ({item.progress}%)
              </span>
            )}
            {item.status === "error" && (
              <span className="text-code-rust">Error</span>
            )}
            {item.status === "idle" && (
              <span className="text-foreground/60">Queued</span>
            )}
          </span>
        </div>

        {savings && savings.bytesSaved < 0 && (
          <div className="border-border-color bg-background/50 text-foreground/70 mt-1 rounded border border-dashed p-2 text-[10px] leading-relaxed">
            💡 <strong>Tip:</strong> Image grew larger than original. Camera photos have fine sensor noise; select a resize preset like <strong>1920px</strong> or lower the quality slider to compress.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-border-color mt-3.5 flex flex-col gap-2 border-t border-dashed pt-3">
        <button
          onClick={onOpenCompare}
          disabled={item.status !== "done"}
          className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50"
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span>Compare Before & After</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            disabled={item.status !== "done"}
            className="bg-foreground text-background flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Download className="text-utils-scent-orange h-3.5 w-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={onDelete}
            className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-background flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-all"
            title="Delete from list"
            aria-label="Delete image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
