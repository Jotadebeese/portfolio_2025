"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import JSZip from "jszip";
import { ImageFileItem, OptimizerSettings } from "./types";
import { compressImage } from "./utils/compress-image";
import { getFilenameWithExtension } from "./utils/format";
import {
  getDeviceLimits,
  DeviceLimits,
  checkWebPEncodingSupport,
} from "./utils/device";
import { X } from "lucide-react";
import Toolbar from "./components/toolbar";
import FileRow from "./components/file-row";
import DetailsSidebar from "./components/details-sidebar";
import CompareModal from "./components/compare-modal";
import Dropzone from "./components/dropzone";
import OptimizationGuide from "./components/optimization-guide";

const DEFAULT_SETTINGS: OptimizerSettings = {
  format: "image/webp",
  quality: 80,
  resizePreset: "original",
};

export default function ImageOptimizer() {
  const [items, setItems] = useState<ImageFileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<OptimizerSettings>(DEFAULT_SETTINGS);
  const [supportsWebP, setSupportsWebP] = useState<boolean>(true);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [comparingItem, setComparingItem] = useState<ImageFileItem | null>(
    null,
  );
  const [deviceLimits] = useState<DeviceLimits>(() => getDeviceLimits());
  const [warningNotice, setWarningNotice] = useState<string | null>(null);

  // Detect if the browser canvas genuinely supports WebP encoding (fails silently on iOS WebKit)
  useEffect(() => {
    const hasWebp = checkWebPEncodingSupport();
    setSupportsWebP(hasWebp);
    if (!hasWebp) {
      setSettings((prev) =>
        prev.format === "image/webp" ? { ...prev, format: "image/jpeg" } : prev,
      );
    }
  }, []);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (warningNotice) {
      const timer = setTimeout(() => setWarningNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [warningNotice]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.optimizedUrl) URL.revokeObjectURL(item.optimizedUrl);
      });
    };
  }, []);

  const processImageItem = useCallback(
    async (item: ImageFileItem, currentSettings: OptimizerSettings) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "processing",
                progress: 15,
                errorMessage: undefined,
              }
            : i,
        ),
      );

      try {
        const result = await compressImage(
          item.file,
          currentSettings,
          (progress) => {
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, progress } : i)),
            );
          },
        );

        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== item.id) return i;
            if (i.optimizedUrl) URL.revokeObjectURL(i.optimizedUrl);

            return {
              ...i,
              status: "done",
              progress: 100,
              optimizedBlob: result.blob,
              optimizedUrl: result.url,
              optimizedSize: result.size,
              optimizedDimensions: result.dimensions,
              originalDimensions:
                result.originalDimensions || i.originalDimensions,
              optimizedFormat: result.format,
            };
          }),
        );
      } catch (err: unknown) {
        console.error("Image optimization error:", err);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  errorMessage:
                    err instanceof Error ? err.message : "Compression failed",
                }
              : i,
          ),
        );
      }
    },
    [],
  );

  const handleFilesSelected = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (incoming.length === 0) return;

      const currentCount = itemsRef.current.length;
      const remainingSlots = Math.max(0, deviceLimits.maxFiles - currentCount);

      if (remainingSlots <= 0) {
        setWarningNotice(
          `Queue limit reached (${deviceLimits.maxFiles} images max). Download or remove items to add more.`,
        );
        return;
      }

      const maxBytes = deviceLimits.maxFileSizeMb * 1024 * 1024;
      const validFiles: File[] = [];
      const oversizedFiles: File[] = [];

      for (const file of incoming) {
        if (file.size > maxBytes) {
          oversizedFiles.push(file);
        } else {
          validFiles.push(file);
        }
      }

      const allowedFiles = validFiles.slice(0, remainingSlots);
      const truncatedCount = validFiles.length - allowedFiles.length;

      const notices: string[] = [];
      if (oversizedFiles.length > 0) {
        if (oversizedFiles.length === 1) {
          notices.push(
            `Skipped "${oversizedFiles[0].name}" (exceeds ${deviceLimits.maxFileSizeMb}MB limit).`,
          );
        } else {
          notices.push(
            `Skipped ${oversizedFiles.length} files exceeding ${deviceLimits.maxFileSizeMb}MB limit.`,
          );
        }
      }
      if (truncatedCount > 0) {
        notices.push(
          `Added first ${allowedFiles.length} images (queue limit of ${deviceLimits.maxFiles} reached).`,
        );
      }
      if (notices.length > 0) {
        setWarningNotice(notices.join(" "));
      }

      if (allowedFiles.length === 0) return;

      const newItems: ImageFileItem[] = allowedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        originalSize: file.size,
        originalType: file.type,
        originalDimensions: { width: 0, height: 0 },
        originalUrl: URL.createObjectURL(file),
        status: "idle",
        progress: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);
      setActiveId((currentActive) => currentActive || newItems[0].id);

      newItems.forEach((item) => {
        processImageItem(item, settingsRef.current);
      });
    },
    [deviceLimits, processImageItem],
  );

  const handleSettingsChange = (newSettings: OptimizerSettings) => {
    setSettings(newSettings);
    items.forEach((item) => {
      processImageItem(item, newSettings);
    });
  };

  const handleDownloadSingle = (item: ImageFileItem) => {
    if (!item.optimizedUrl) return;
    const targetName = getFilenameWithExtension(
      item.name,
      item.optimizedFormat || settings.format,
    );

    const a = document.createElement("a");
    a.href = item.optimizedUrl;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSelected = async () => {
    const toDownload = items.filter(
      (item) =>
        selectedIds.has(item.id) &&
        item.status === "done" &&
        item.optimizedBlob,
    );
    if (toDownload.length === 0) return;

    if (toDownload.length === 1) {
      handleDownloadSingle(toDownload[0]);
      return;
    }

    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();

      toDownload.forEach((item) => {
        if (item.optimizedBlob) {
          const filename = getFilenameWithExtension(
            item.name,
            item.optimizedFormat || settings.format,
          );
          zip.file(filename, item.optimizedBlob);
        }
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = "optimized-images.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(zipUrl);
    } catch (err) {
      console.error("Error creating ZIP:", err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        if (target.originalUrl) URL.revokeObjectURL(target.originalUrl);
        if (target.optimizedUrl) URL.revokeObjectURL(target.optimizedUrl);
      }
      const updated = prev.filter((i) => i.id !== id);
      if (activeId === id) {
        setActiveId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    setItems((prev) => {
      prev.forEach((item) => {
        if (selectedIds.has(item.id)) {
          if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
          if (item.optimizedUrl) URL.revokeObjectURL(item.optimizedUrl);
        }
      });
      const remaining = prev.filter((item) => !selectedIds.has(item.id));
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });

    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const activeItem = items.find((i) => i.id === activeId) || null;

  const totalOriginalBytes = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalOptimizedBytes = items.reduce(
    (acc, i) =>
      acc + (i.optimizedSize !== undefined ? i.optimizedSize : i.originalSize),
    0,
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex w-full flex-col gap-4"
    >
      <Toolbar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onFilesSelected={handleFilesSelected}
        selectedCount={selectedIds.size}
        totalCount={items.length}
        onToggleSelectAll={handleToggleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        onDownloadSelected={handleDownloadSelected}
        isDownloadingZip={isDownloadingZip}
        totalOriginalBytes={totalOriginalBytes}
        totalOptimizedBytes={totalOptimizedBytes}
        maxFiles={deviceLimits.maxFiles}
        supportsWebP={supportsWebP}
      />

      {warningNotice && (
        <div className="border-border-color bg-utils-scent-orange/10 text-foreground flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-xs transition-all">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-utils-scent-orange shrink-0 font-semibold">
              Notice:
            </span>
            <span className="truncate sm:whitespace-normal">
              {warningNotice}
            </span>
          </div>
          <button
            onClick={() => setWarningNotice(null)}
            className="text-foreground/60 hover:text-foreground shrink-0 cursor-pointer p-0.5"
            title="Dismiss"
            aria-label="Dismiss notice"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFilesSelected}
          isDraggingOver={isDraggingOver}
          maxFiles={deviceLimits.maxFiles}
          maxFileSizeMb={deviceLimits.maxFileSizeMb}
          disabled={items.length >= deviceLimits.maxFiles}
        />
      ) : (
        /* Split Pane: Explorer List on Left, Details & Inspection on Right */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Column: Explorer File List */}
          <div className="flex flex-col gap-2 lg:col-span-7">
            <div className="border-border-color flex flex-col rounded-md border bg-white shadow-xs">
              {/* Explorer List Header */}
              <div className="border-border-color text-foreground/60 flex items-center justify-between border-b border-dashed px-3 py-2 text-[11px] font-semibold tracking-wider uppercase">
                <span>
                  Queued Files ({items.length}/{deviceLimits.maxFiles})
                </span>
                <span>Original → Optimized</span>
              </div>

              {/* File Rows */}
              <div className="flex max-h-[480px] flex-col overflow-y-auto">
                {items.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    isActive={activeId === item.id}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                    onActivate={() => setActiveId(item.id)}
                    onDownload={() => handleDownloadSingle(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onOpenCompare={() => setComparingItem(item)}
                  />
                ))}
              </div>
            </div>

            {/* Compact dropzone for appending more files */}
            <Dropzone
              onFilesSelected={handleFilesSelected}
              isDraggingOver={isDraggingOver}
              compact
              maxFiles={deviceLimits.maxFiles}
              maxFileSizeMb={deviceLimits.maxFileSizeMb}
              disabled={items.length >= deviceLimits.maxFiles}
            />
          </div>

          {/* Right Column: Inspector / Details Pane */}
          <div className="lg:col-span-5">
            <DetailsSidebar
              item={activeItem}
              targetFormat={settings.format}
              onDownload={() => activeItem && handleDownloadSingle(activeItem)}
              onDelete={() => activeItem && handleDeleteItem(activeItem.id)}
              onOpenCompare={() => activeItem && setComparingItem(activeItem)}
            />
          </div>
        </div>
      )}

      {/* Educational Optimization Guide */}
      <OptimizationGuide />

      {/* Comparison Modal */}
      {comparingItem && (
        <CompareModal
          item={comparingItem}
          isOpen={!!comparingItem}
          onClose={() => setComparingItem(null)}
          onDownload={() => handleDownloadSingle(comparingItem)}
        />
      )}
    </div>
  );
}
