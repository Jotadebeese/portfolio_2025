"use client";

import {
  Download,
  Trash2,
  Columns2,
  FileImage,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import clsx from "clsx";
import { ImageFileItem } from "../types";
import { formatBytes, calculateSavings } from "../utils/format";

type Props = {
  item: ImageFileItem;
  isSelected: boolean;
  isActive: boolean;
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
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={clsx(
            "flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-all",
            isSelected
              ? "border-utils-scent-orange bg-utils-scent-orange/60 text-white"
              : "border-border-color hover:border-utils-scent-orange bg-white",
          )}
          title="Select for bulk action"
          aria-label={isSelected ? "Deselect image" : "Select image"}
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

        <div className="border-border-color bg-background relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded">
          {item.originalUrl ? (
            <img
              src={item.optimizedUrl || item.originalUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <FileImage className="text-foreground/30 h-4 w-4" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-foreground truncate text-[11px]"
              title={item.name}
            >
              {item.name}
            </span>
          </div>

          {item.status === "processing" && (
            <div className="flex w-full max-w-xs items-center gap-2">
              <div className="bg-border-color/30 h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-utils-scent-orange h-full transition-all duration-300"
                  style={{ width: `${Math.max(10, item.progress)}%` }}
                />
              </div>
              <span className="text-foreground/70 flex items-center gap-1 font-mono text-[10px]">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {item.progress}%
              </span>
            </div>
          )}

          {item.status === "error" && (
            <div className="text-code-rust flex items-center gap-1 text-[11px]">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {item.errorMessage || "Compression failed"}
              </span>
            </div>
          )}

          {item.status === "done" && item.optimizedSize !== undefined && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-foreground/50 font-mono">
                {formatBytes(item.originalSize)}
              </span>
              <span className="text-foreground/70">→</span>
              <span className="text-foreground font-mono">
                {formatBytes(item.optimizedSize)}
              </span>

              {savings && savings.isReduced && (
                <span className="text-code-green bg-utils-scent-gray-01/40 rounded px-1 font-mono text-[10px]">
                  -{savings.percentSaved}%
                </span>
              )}

              {savings &&
                !savings.isReduced &&
                item.optimizedSize > item.originalSize && (
                  <span
                    className="text-foreground/70 bg-utils-scent-gray-01/40 rounded px-1 font-mono text-[10px]"
                    title="File size increased. Try downscaling (e.g. 1920px) or lowering quality."
                  >
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
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.status === "done" && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCompare();
              }}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-background flex h-8 cursor-pointer items-center gap-1 rounded border bg-white px-2 text-xs transition-all"
              title="Compare original vs optimized"
            >
              <Columns2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="border-border-color text-foreground/70 hover:text-foreground hover:bg-background flex h-8 w-8 cursor-pointer items-center justify-center rounded border bg-white transition-all"
              title="Download optimized image"
              aria-label={`Download ${item.name}`}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="border-border-color text-foreground/70 hover:text-code-rust hover:bg-background flex h-8 w-8 cursor-pointer items-center justify-center rounded border bg-white transition-all"
          title="Remove from queue"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
