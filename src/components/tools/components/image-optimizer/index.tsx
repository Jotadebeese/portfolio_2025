"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import JSZip from "jszip";
import { ImageFileItem, OptimizerSettings } from "./types";
import { compressImage } from "./utils/compress-image";
import { getFilenameWithExtension, formatBytes } from "./utils/format";
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
  const [comparingId, setComparingId] = useState<string | null>(null);
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

  const containerRef = useRef<HTMLDivElement>(null);
  const batchRunIdRef = useRef<number>(0);
  const settingsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (warningNotice) {
      const timer = setTimeout(() => setWarningNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [warningNotice]);

  useEffect(() => {
    return () => {
      if (settingsDebounceRef.current) {
        clearTimeout(settingsDebounceRef.current);
      }
      itemsRef.current.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.optimizedUrl) URL.revokeObjectURL(item.optimizedUrl);
      });
    };
  }, []);

  const processImageItem = useCallback(
    async (
      item: ImageFileItem,
      currentSettings: OptimizerSettings,
      runId?: number,
    ) => {
      const activeRunId = runId ?? batchRunIdRef.current;

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
            if (activeRunId !== batchRunIdRef.current) return;
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, progress } : i)),
            );
          },
        );

        if (
          activeRunId !== batchRunIdRef.current ||
          !itemsRef.current.some((i) => i.id === item.id)
        ) {
          if (result.url) URL.revokeObjectURL(result.url);
          return;
        }

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
              hasAlpha: result.hasAlpha,
            };
          }),
        );
      } catch (err: unknown) {
        if (activeRunId !== batchRunIdRef.current) return;
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
      setIsDraggingOver(false);
      const allFiles = Array.from(fileList);
      if (allFiles.length === 0) return;

      const incoming = allFiles.filter((f) => f.type.startsWith("image/"));
      const unsupportedCount = allFiles.length - incoming.length;

      if (incoming.length === 0) {
        const hasHeic = allFiles.some((f) =>
          /\.(heic|heif)$/i.test(f.name),
        );
        setWarningNotice(
          hasHeic
            ? "HEIC/HEIF files are not natively decoded by browsers. Please use PNG, JPEG, WebP, AVIF, or GIF."
            : "Unsupported file format. Please drop PNG, JPEG, WebP, AVIF, or GIF images.",
        );
        return;
      }

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
      if (unsupportedCount > 0) {
        notices.push(
          `Skipped ${unsupportedCount} unsupported file${unsupportedCount > 1 ? "s" : ""}.`,
        );
      }
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

      const currentRunId = batchRunIdRef.current;
      newItems.forEach((item) => {
        processImageItem(item, settingsRef.current, currentRunId);
      });
    },
    [deviceLimits, processImageItem],
  );

  // Support Ctrl+V / Cmd+V clipboard image pasting anywhere when not typing in an input
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const pastedFiles: File[] = [];
      const clipboardFiles = e.clipboardData?.files;
      if (clipboardFiles && clipboardFiles.length > 0) {
        for (let i = 0; i < clipboardFiles.length; i++) {
          const f = clipboardFiles[i];
          if (
            f.type.startsWith("image/") ||
            /\.(png|jpe?g|webp|avif|gif)$/i.test(f.name)
          ) {
            const namedFile =
              f.name && f.name !== "image.png"
                ? f
                : new File(
                    [f],
                    `clipboard-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.${(f.type.split("/")[1] || "png")}`,
                    { type: f.type || "image/png" },
                  );
            pastedFiles.push(namedFile);
          }
        }
      } else if (e.clipboardData?.items) {
        const clipboardItems = e.clipboardData.items;
        for (let i = 0; i < clipboardItems.length; i++) {
          const item = clipboardItems[i];
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              const ext = item.type.split("/")[1] || "png";
              const namedFile =
                file.name && file.name !== "image.png"
                  ? file
                  : new File(
                      [file],
                      `clipboard-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.${ext}`,
                      { type: file.type },
                    );
              pastedFiles.push(namedFile);
            }
          }
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleFilesSelected(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFilesSelected]);

  // Ensure drag highlight always resets when moving outside this tool, dropping, or leaving the window
  useEffect(() => {
    if (!isDraggingOver) return;
    const resetDrag = () => setIsDraggingOver(false);
    const handleWindowDrag = (e: DragEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isOutsideRect =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      const isOutsideNode =
        e.target instanceof Node && !el.contains(e.target);
      if (isOutsideRect || isOutsideNode) {
        setIsDraggingOver(false);
      }
    };
    const handleWindowDragLeave = (e: DragEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (
        !e.relatedTarget ||
        (e.relatedTarget instanceof Node && !el.contains(e.relatedTarget))
      ) {
        setIsDraggingOver(false);
      }
    };
    window.addEventListener("dragenter", handleWindowDrag, true);
    window.addEventListener("dragover", handleWindowDrag, true);
    window.addEventListener("dragleave", handleWindowDragLeave, true);
    window.addEventListener("drop", resetDrag, true);
    window.addEventListener("dragend", resetDrag, true);
    window.addEventListener("blur", resetDrag);
    return () => {
      window.removeEventListener("dragenter", handleWindowDrag, true);
      window.removeEventListener("dragover", handleWindowDrag, true);
      window.removeEventListener("dragleave", handleWindowDragLeave, true);
      window.removeEventListener("drop", resetDrag, true);
      window.removeEventListener("dragend", resetDrag, true);
      window.removeEventListener("blur", resetDrag);
    };
  }, [isDraggingOver]);

  const handleSettingsChange = useCallback(
    (newSettings: OptimizerSettings) => {
      const prevSettings = settingsRef.current;
      setSettings(newSettings);

      const nextRunId = batchRunIdRef.current + 1;
      batchRunIdRef.current = nextRunId;

      if (settingsDebounceRef.current) {
        clearTimeout(settingsDebounceRef.current);
        settingsDebounceRef.current = null;
      }

      const isQualityOnlyChange =
        prevSettings.format === newSettings.format &&
        prevSettings.resizePreset === newSettings.resizePreset &&
        prevSettings.customMaxDimension === newSettings.customMaxDimension &&
        prevSettings.quality !== newSettings.quality;

      if (isQualityOnlyChange) {
        settingsDebounceRef.current = setTimeout(() => {
          itemsRef.current.forEach((item) => {
            processImageItem(item, newSettings, nextRunId);
          });
        }, 150);
      } else {
        itemsRef.current.forEach((item) => {
          processImageItem(item, newSettings, nextRunId);
        });
      }
    },
    [processImageItem],
  );

  const handleRenameItem = (id: string, customName?: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, customName } : it)),
    );
  };

  const handleDownloadSingle = (item: ImageFileItem) => {
    if (!item.optimizedUrl) return;
    const targetName = getFilenameWithExtension(
      item.name,
      item.optimizedFormat || settings.format,
      item.customName,
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
      const usedNames = new Set<string>();

      for (const item of toDownload) {
        if (item.optimizedBlob) {
          const baseFilename = getFilenameWithExtension(
            item.name,
            item.optimizedFormat || settings.format,
            item.customName,
          );
          let filename = baseFilename;
          let counter = 1;
          while (usedNames.has(filename.toLowerCase())) {
            const dotIdx = baseFilename.lastIndexOf(".");
            if (dotIdx !== -1) {
              filename = `${baseFilename.slice(0, dotIdx)}_${counter}${baseFilename.slice(dotIdx)}`;
            } else {
              filename = `${baseFilename}_${counter}`;
            }
            counter++;
          }
          usedNames.add(filename.toLowerCase());
          zip.file(filename, item.optimizedBlob);
        }
      }

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
      if (activeId && selectedIds.has(activeId)) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
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
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (
      !e.relatedTarget ||
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const activeItem = items.find((i) => i.id === activeId) || null;
  const comparingItem = items.find((i) => i.id === comparingId) || null;

  const totalOriginalBytes = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalOptimizedBytes = items.reduce(
    (acc, i) =>
      acc + (i.optimizedSize !== undefined ? i.optimizedSize : i.originalSize),
    0,
  );

  return (
    <div
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
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
        <div className="bg-code-rust/10 text-foreground flex items-center justify-between gap-2 rounded-md p-2 text-xs transition-all">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">Notice:</span>
            <span className="text-foreground/70 truncate sm:whitespace-normal">
              {warningNotice}
            </span>
          </div>
          <button
            onClick={() => setWarningNotice(null)}
            className="text-foreground/70 hover:text-foreground shrink-0 cursor-pointer p-0.5"
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-2 lg:col-span-7">
            <div className="flex flex-col bg-white">
              <div className="border-utils-scent-gray-01/40 text-foreground/70 flex items-center gap-2 border-b p-2 text-[11px] tracking-wider uppercase">
                <span>
                  Queued Files ({items.length}/{deviceLimits.maxFiles})
                </span>
                <span>&bull;</span>
                <span>{formatBytes(totalOriginalBytes)}</span>
              </div>

              <div className="flex max-h-[480px] flex-col overflow-y-auto">
                {items.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    targetFormat={settings.format}
                    isSelected={selectedIds.has(item.id)}
                    isActive={activeId === item.id}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                    onActivate={() => setActiveId(item.id)}
                    onDownload={() => handleDownloadSingle(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onOpenCompare={() => setComparingId(item.id)}
                  />
                ))}
              </div>
            </div>

            <Dropzone
              onFilesSelected={handleFilesSelected}
              isDraggingOver={isDraggingOver}
              compact
              maxFiles={deviceLimits.maxFiles}
              maxFileSizeMb={deviceLimits.maxFileSizeMb}
              disabled={items.length >= deviceLimits.maxFiles}
            />
          </div>

          <div className="lg:col-span-5">
            <DetailsSidebar
              item={activeItem}
              settings={settings}
              targetFormat={settings.format}
              supportsWebP={supportsWebP}
              onApplySettings={(patch) =>
                handleSettingsChange({ ...settings, ...patch })
              }
              onDownload={() => activeItem && handleDownloadSingle(activeItem)}
              onDelete={() => activeItem && handleDeleteItem(activeItem.id)}
              onOpenCompare={() => activeItem && setComparingId(activeItem.id)}
              onRename={(newName) =>
                activeItem && handleRenameItem(activeItem.id, newName)
              }
            />
          </div>
        </div>
      )}

      <OptimizationGuide />

      {comparingItem && (
        <CompareModal
          item={comparingItem}
          isOpen={!!comparingItem}
          onClose={() => setComparingId(null)}
          onDownload={() => handleDownloadSingle(comparingItem)}
        />
      )}
    </div>
  );
}
