"use client";

import clsx from "clsx";
import {
  Download,
  Trash2,
  Columns2,
  FileCheck,
  Maximize2,
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
      <div className="border-border-color bg-background/30 text-foreground/70 flex h-full min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed p-6 text-center text-xs">
        <Info className="text-foreground/70 mb-2 h-6 w-6 stroke-1" />
        <span className="text-foreground">No image selected</span>
        <span>
          Click any row in the file list to view details and live preview.
        </span>
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
    <div className="flex flex-col gap-2.5 bg-white pt-2 text-xs">
      <div
        onClick={onOpenCompare}
        className="group bg-background/40 relative flex aspect-[16/10] w-full cursor-pointer items-center justify-center overflow-hidden transition-all"
        title="Click to view interactive before/after comparison"
      >
        <img
          src={item.optimizedUrl || item.originalUrl}
          alt={item.name}
          className="h-full w-full object-contain"
        />

        <div className="bg-foreground/40 absolute inset-0 flex items-center justify-center gap-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Columns2 className="h-3 w-3" />
          <span className="text-xs">Compare (Original vs. Optimized)</span>
          <Maximize2 className="h-3 w-3" />
        </div>
      </div>

      <div className="border-border-color flex items-start justify-between gap-2 border-b border-dashed pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <FileCheck strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" />
            <h4 title={targetName}>{targetName}</h4>
          </div>
          <span className="text-foreground/70 block truncate text-[10px]">
            Original: {item.name}
          </span>
        </div>

        {savings && savings.isReduced && (
          <span className="text-code-green bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
            -{savings.percentSaved}%
          </span>
        )}
        {savings &&
          !savings.isReduced &&
          item.optimizedSize !== undefined &&
          item.optimizedSize > item.originalSize && (
            <span className="text-foreground/70 bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
              +
              {Math.round(
                ((item.optimizedSize - item.originalSize) / item.originalSize) *
                  100,
              )}
              %
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
            {getFormatLabel(item.originalType)} →{" "}
            {getFormatLabel(item.optimizedFormat || targetFormat)}
          </span>

          <span className="text-foreground">Original Size:</span>
          <span className="text-foreground text-right font-mono">
            {formatBytes(item.originalSize)}
          </span>

          <span className="text-foreground">Optimized Size:</span>
          <span className="text-foreground text-right font-mono">
            {item.optimizedSize !== undefined
              ? formatBytes(item.optimizedSize)
              : "Calculating..."}
          </span>

          {savings && (
            <>
              <span className="text-foreground">
                {savings.bytesSaved >= 0 ? "Space Saved:" : "Size Change:"}
              </span>
              <span
                className={clsx(
                  "text-right font-mono",
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

          <span className="text-foreground">Dimensions:</span>
          <span className="text-foreground truncate text-right font-mono">
            {item.originalDimensions.width > 0
              ? `${item.originalDimensions.width}×${item.originalDimensions.height}`
              : "—"}
            {item.optimizedDimensions &&
              (item.optimizedDimensions.width !==
                item.originalDimensions.width ||
                item.optimizedDimensions.height !==
                  item.originalDimensions.height) && (
                <span className="ml-1">
                  → {item.optimizedDimensions.width}×
                  {item.optimizedDimensions.height}
                </span>
              )}
          </span>

          <span className="text-foreground">Status:</span>
          <span className="text-right">
            {item.status === "done" && <span>Ready</span>}
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

        {savings && savings.bytesSaved < 0 && (
          <div className="bg-background/40 text-foreground rounded p-2 text-[10px] leading-relaxed">
            <strong>Tip:</strong> Image grew larger than original. Camera photos
            have fine sensor noise; select a resize preset like{" "}
            <strong>1920px</strong> or lower the quality slider to compress.
          </div>
        )}
      </div>

      <div className="border-border-color flex gap-2 border-t border-dashed pt-3">
        <button
          onClick={onOpenCompare}
          disabled={item.status !== "done"}
          className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span>Compare</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            disabled={item.status !== "done"}
            className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={onDelete}
            className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-utils-scent-gray-01/30 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-all"
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
