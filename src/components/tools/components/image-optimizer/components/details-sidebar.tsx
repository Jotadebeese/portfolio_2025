"use client";

import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  Download,
  Trash2,
  Columns2,
  FileCheck,
  Maximize2,
  Info,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  ImageFileItem,
  OptimizerSettings,
  OutputFormat,
  ResizePreset,
} from "../types";
import {
  formatBytes,
  calculateSavings,
  getDefaultOutputBaseName,
  getFilenameWithExtension,
  getFormatLabel,
} from "../utils/format";

type Props = {
  item: ImageFileItem | null;
  settings: OptimizerSettings;
  targetFormat: OutputFormat;
  supportsWebP?: boolean;
  onApplySettings?: (patch: Partial<OptimizerSettings>) => void;
  onDownload: () => void;
  onDelete: () => void;
  onOpenCompare: () => void;
  onRename?: (newCustomName?: string) => void;
};

export default function DetailsSidebar({
  item,
  settings,
  targetFormat,
  supportsWebP = true,
  onApplySettings,
  onDownload,
  onDelete,
  onOpenCompare,
  onRename,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsEditingName(false);
  }, [item?.id]);

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

  const activeFormat = (item.optimizedFormat || targetFormat) as OutputFormat;
  const outputExt =
    activeFormat === "image/jpeg"
      ? ".jpg"
      : activeFormat === "image/png"
        ? ".png"
        : ".webp";

  const targetName = getFilenameWithExtension(
    item.name,
    activeFormat,
    item.customName,
  );

  const startEditingName = () => {
    if (!onRename) return;
    setDraftName(item.customName || getDefaultOutputBaseName(item.name));
    setIsEditingName(true);
  };

  const commitNameEdit = () => {
    if (!onRename) {
      setIsEditingName(false);
      return;
    }
    const cleaned = draftName
      .trim()
      .replace(/\.(webp|jpe?g|png|avif|gif)$/i, "");
    const defaultBase = getDefaultOutputBaseName(item.name);
    onRename(!cleaned || cleaned === defaultBase ? undefined : cleaned);
    setIsEditingName(false);
  };

  return (
    <div className="flex flex-col gap-2.5 bg-white pt-2 text-xs">
      <div
        onClick={item.status === "done" ? onOpenCompare : undefined}
        style={{
          backgroundColor: "#d8d2cc",
          backgroundImage:
            "linear-gradient(45deg, #bcb4ac 25%, transparent 25%), linear-gradient(-45deg, #bcb4ac 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bcb4ac 75%), linear-gradient(-45deg, transparent 75%, #bcb4ac 75%)",
          backgroundSize: "14px 14px",
          backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
        }}
        className={clsx(
          "group border-border-color relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded border transition-all",
          item.status === "done" ? "cursor-pointer" : "cursor-default",
        )}
        title={
          item.status === "done"
            ? "Click to view interactive before/after comparison"
            : "Optimizing image..."
        }
      >
        <img
          src={item.optimizedUrl || item.originalUrl}
          alt={item.name}
          className="h-full w-full object-contain"
        />

        {item.status === "done" && (
          <div className="bg-foreground/40 absolute inset-0 flex items-center justify-center gap-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Columns2 className="h-3 w-3" />
            <span className="text-xs">Compare (Original vs. Optimized)</span>
            <Maximize2 className="h-3 w-3" />
          </div>
        )}
      </div>

      <div className="border-border-color flex items-start justify-between gap-2 border-b border-dashed pb-2.5">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex h-6 min-w-0 items-center gap-1">
              <FileCheck
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
              <FileCheck
                strokeWidth={1.5}
                className="text-foreground/70 h-3.5 w-3.5 shrink-0"
              />
              <h4
                title={`${targetName} (Click to rename output file)`}
                onClick={startEditingName}
                className={clsx(
                  "truncate leading-none",
                  onRename &&
                    "hover:text-utils-scent-orange cursor-pointer transition-colors",
                )}
              >
                {targetName}
              </h4>
              {onRename && (
                <button
                  type="button"
                  onClick={startEditingName}
                  className="text-foreground/50 hover:text-foreground hover:bg-utils-scent-gray-01/30 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors"
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

        {savings && savings.isReduced && (
          <span className="text-code-green bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
            -{savings.percentSaved}%
          </span>
        )}
        {savings &&
          !savings.isReduced &&
          item.optimizedSize !== undefined &&
          item.optimizedSize > item.originalSize && (
            <span className="text-code-rust bg-utils-scent-gray-01/40 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
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
                      ? "text-code-rust"
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

        {savings &&
          savings.bytesSaved < 0 &&
          (() => {
            const origLabel = getFormatLabel(item.originalType);
            const isOrigLossy =
              item.originalType === "image/webp" ||
              item.originalType === "image/jpeg" ||
              item.originalType === "image/avif";
            const isOrigModern =
              item.originalType === "image/webp" ||
              item.originalType === "image/avif";
            const maxOrigDim = Math.max(
              item.originalDimensions.width,
              item.originalDimensions.height,
            );
            const suggestedPreset: ResizePreset =
              maxOrigDim > 1920
                ? "1920"
                : maxOrigDim > 1280
                  ? "1280"
                  : maxOrigDim > 800
                    ? "800"
                    : "50%";
            const suggestedPresetLabel =
              suggestedPreset === "50%" ? "50%" : `${suggestedPreset}px`;

            if (activeFormat === "image/png" && isOrigLossy) {
              return (
                <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                  <div>
                    <strong className="text-foreground">
                      Why size increased:
                    </strong>{" "}
                    Converting <strong className="text-foreground">{origLabel} → PNG</strong> unpacks a
                    lossy photo into a lossless container without recovering
                    detail. Use <strong className="text-foreground">WebP</strong> for optimal web delivery,
                    or lower PNG quality below <strong className="text-foreground">80%</strong> if you
                    strictly need a <code>.png</code> file.
                  </div>
                  {onApplySettings && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {supportsWebP && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplySettings({
                              format: "image/webp",
                              quality: Math.min(settings.quality, 80),
                            })
                          }
                          className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                        >
                          Switch to WebP (80%)
                        </button>
                      )}
                      {settings.quality > 70 && (
                        <button
                          type="button"
                          onClick={() => onApplySettings({ quality: 70 })}
                          className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                        >
                          Compress PNG (70%)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (activeFormat === "image/jpeg" && isOrigModern) {
              return (
                <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                  <div>
                    <strong className="text-foreground">
                      Why size increased:
                    </strong>{" "}
                    <strong className="text-foreground">{origLabel}</strong> is ~30% more efficient than{" "}
                    <strong className="text-foreground">JPEG</strong>. Converting{" "}
                    <strong className="text-foreground">{origLabel} → JPEG</strong> at {settings.quality}%
                    inflates file size (and flattens transparency to white).
                    Keep <strong className="text-foreground">WebP</strong> unless you need{" "}
                    <code>.jpg</code> for legacy compatibility.
                  </div>
                  {onApplySettings && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {supportsWebP && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplySettings({
                              format: "image/webp",
                              quality: Math.min(settings.quality, 80),
                            })
                          }
                          className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                        >
                          Switch to WebP
                        </button>
                      )}
                      {settings.quality > 75 && (
                        <button
                          type="button"
                          onClick={() => onApplySettings({ quality: 75 })}
                          className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                        >
                          Lower Quality to 75%
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (settings.quality > 85) {
              return (
                <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
                  <div>
                    <strong className="text-foreground">
                      Why size increased:
                    </strong>{" "}
                    Re-encoding at <strong className="text-foreground">{settings.quality}% quality</strong>{" "}
                    inflates an already-compressed {origLabel} without adding
                    visual detail. Drop to the <strong className="text-foreground">80% sweet spot</strong>
                    {settings.resizePreset === "original" && maxOrigDim > 800
                      ? ` or downscale to ${suggestedPresetLabel}`
                      : ""}
                    .
                  </div>
                  {onApplySettings && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onApplySettings({ quality: 80 })}
                        className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                      >
                        Set Quality to 80%
                      </button>
                      {settings.resizePreset === "original" && (
                        <button
                          type="button"
                          onClick={() =>
                            onApplySettings({ resizePreset: suggestedPreset })
                          }
                          className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                        >
                          Resize to {suggestedPresetLabel}
                        </button>
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
                  This {origLabel} is already heavily compressed. Lower quality
                  further or resize to <strong className="text-foreground">{suggestedPresetLabel}</strong>{" "}
                  to reduce file size.
                </div>
                {onApplySettings && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {supportsWebP && targetFormat !== "image/webp" && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplySettings({
                            format: "image/webp",
                            quality: Math.min(settings.quality, 80),
                          })
                        }
                        className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                      >
                        Switch to WebP ({Math.min(settings.quality, 80)}%)
                      </button>
                    )}
                    {settings.quality > 55 && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplySettings({
                            quality: Math.max(50, settings.quality - 15),
                          })
                        }
                        className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                      >
                        Lower Quality ({Math.max(50, settings.quality - 15)}%)
                      </button>
                    )}
                    {settings.resizePreset === "original" && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplySettings({ resizePreset: suggestedPreset })
                        }
                        className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                      >
                        Resize to {suggestedPresetLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {item.status === "done" &&
          item.hasAlpha &&
          (item.optimizedFormat || targetFormat) === "image/jpeg" && (
            <div className="bg-background/40 border-border-color text-foreground/80 flex flex-col gap-2 rounded border border-dashed p-2 text-[10px] leading-relaxed">
              <div>
                <strong className="text-foreground">
                  Transparency notice:
                </strong>{" "}
                <strong className="text-foreground">JPEG</strong> does not
                support transparent backgrounds (transparent areas are filled
                with solid white). Use{" "}
                <strong className="text-foreground">
                  {supportsWebP ? "WebP" : "PNG"}
                </strong>{" "}
                to keep transparency.
              </div>
              {onApplySettings && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {supportsWebP && (
                    <button
                      type="button"
                      onClick={() => onApplySettings({ format: "image/webp" })}
                      className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                    >
                      Switch to WebP
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onApplySettings({ format: "image/png" })}
                    className="border-border-color text-foreground hover:bg-utils-scent-gray-01/30 flex cursor-pointer items-center justify-center rounded-md border bg-white px-2.5 py-1 text-xs transition-all"
                  >
                    Switch to PNG
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      <div className="border-border-color flex gap-2 border-t border-dashed pt-3">
        <button
          onClick={onOpenCompare}
          disabled={item.status !== "done"}
          className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span>Compare</span>
        </button>
        <button
          onClick={onDownload}
          disabled={item.status !== "done"}
          className="border-border-color text-foreground bg-background hover:bg-utils-scent-gray-01/30 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-50"
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
  );
}
