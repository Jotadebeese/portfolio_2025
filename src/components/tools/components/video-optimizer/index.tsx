"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import JSZip from "jszip";
import { VideoFileItem, VideoOptimizerSettings, VideoSection } from "./types";
import { getVideoMetadata, compressVideo } from "./utils/compress-video";
import {
  formatBytes,
  estimateVideoSize,
  getVideoFilenameWithExtension,
  hasSettingsChanged,
} from "./utils/format";
import Dropzone from "./components/dropzone";
import FileRow from "./components/file-row";
import Toolbar from "./components/toolbar";
import CompareModal from "./components/compare-modal";
import EditModal from "./components/edit-modal";
import DetailsSidebar from "./components/details-sidebar";
import { X } from "lucide-react";

const DEFAULT_SETTINGS: VideoOptimizerSettings = {
  format: "video/mp4",
  mode: "quality",
  qualityPercent: 80,
  bitrateMbps: 2.5,
  targetSizeMB: 8,
  resizePreset: "1080p",
  stripAudio: true,
};

export default function VideoOptimizer() {
  const [items, setItems] = useState<VideoFileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] =
    useState<VideoOptimizerSettings>(DEFAULT_SETTINGS);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingIndex, setProcessingIndex] = useState<number>(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [comparingItem, setComparingItem] = useState<VideoFileItem | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<VideoFileItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      });
    };
  }, []);

  const handleFilesSelected = useCallback(
    async (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter(
        (f) =>
          f.type.startsWith("video/") ||
          /\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name),
      );

      if (validFiles.length === 0) {
        setWarningNotice("Please drop valid video files (MP4, MOV, or WebM).");
        return;
      }

      const maxBatch = 10;
      const remainingSlots = maxBatch - itemsRef.current.length;
      if (remainingSlots <= 0) {
        setWarningNotice(`Batch limit of ${maxBatch} videos reached.`);
        return;
      }

      const filesToAdd = validFiles.slice(0, remainingSlots);

      const newItems: VideoFileItem[] = filesToAdd.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        file,
        name: file.name,
        originalSize: file.size,
        originalType: file.type || "video/mp4",
        originalDimensions: { width: 0, height: 0 },
        duration: 0,
        thumbnailUrl: "",
        originalUrl: URL.createObjectURL(file),
        hasAudio: false,
        status: "idle",
        progress: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);
      if (!activeId && newItems.length > 0) {
        setActiveId(newItems[0].id);
      }

      for (const item of newItems) {
        try {
          const meta = await getVideoMetadata(item.file);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    originalDimensions: {
                      width: meta.width,
                      height: meta.height,
                    },
                    duration: meta.duration,
                    thumbnailUrl: meta.thumbnailUrl,
                    hasAudio: meta.hasAudio,
                  }
                : i,
            ),
          );
        } catch (err) {
          console.warn("Failed to extract metadata for", item.name, err);
        }
      }
    },
    [activeId],
  );

  const handleApplyEdit = useCallback(
    (
      targetItem: VideoFileItem,
      newTrim?: { start: number; end: number },
      newStripAudio?: boolean,
      newSections?: VideoSection[],
    ) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === targetItem.id
            ? {
                ...it,
                trim: newTrim,
                stripAudio: newStripAudio,
                sections: newSections,
              }
            : it,
        ),
      );
    },
    [],
  );

  const handleStartCompress = async () => {
    if (isProcessing || items.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    const currentItems = [...itemsRef.current];
    const baseSettings = { ...settingsRef.current };

    for (let i = 0; i < currentItems.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      const item = currentItems[i];
      setProcessingIndex(i);

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: "processing",
                progress: 5,
                errorMessage: undefined,
              }
            : it,
        ),
      );

      const itemSettings: VideoOptimizerSettings = {
        ...baseSettings,
        trim: item.trim || baseSettings.trim,
        sections: item.sections,
        stripAudio:
          item.stripAudio !== undefined
            ? item.stripAudio
            : baseSettings.stripAudio,
      };

      try {
        const result = await compressVideo(
          item.file,
          itemSettings,
          (progress) => {
            setItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress } : it)),
            );
          },
        );

        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: "done",
                  progress: 100,
                  compressedBlob: result.blob,
                  compressedUrl: result.url,
                  compressedSize: result.size,
                  compressedDimensions: result.dimensions,
                  compressedFormat: result.format,
                  compressedDuration: result.duration,
                  lastCompressedSettings: { ...itemSettings },
                }
              : it,
          ),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Compression failed";
        console.error("Compression failed for", item.name, err);
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: "error", progress: 0, errorMessage: msg }
              : it,
          ),
        );
      }
    }

    setIsProcessing(false);
  };

  const handleCompressSingle = async (targetItem: VideoFileItem) => {
    if (isProcessing) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    const baseSettings = { ...settingsRef.current };

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetItem.id
          ? {
              ...it,
              status: "processing",
              progress: 5,
              errorMessage: undefined,
            }
          : it,
      ),
    );

    const itemSettings: VideoOptimizerSettings = {
      ...baseSettings,
      trim: targetItem.trim || baseSettings.trim,
      sections: targetItem.sections,
      stripAudio:
        targetItem.stripAudio !== undefined
          ? targetItem.stripAudio
          : baseSettings.stripAudio,
    };

    try {
      const result = await compressVideo(
        targetItem.file,
        itemSettings,
        (progress) => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === targetItem.id ? { ...it, progress } : it,
            ),
          );
        },
      );

      setItems((prev) =>
        prev.map((it) =>
          it.id === targetItem.id
            ? {
                ...it,
                status: "done",
                progress: 100,
                compressedBlob: result.blob,
                compressedUrl: result.url,
                compressedSize: result.size,
                compressedDimensions: result.dimensions,
                compressedFormat: result.format,
                compressedDuration: result.duration,
                lastCompressedSettings: { ...itemSettings },
              }
            : it,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Compression failed";
      console.error("Compression failed for", targetItem.name, err);
      setItems((prev) =>
        prev.map((it) =>
          it.id === targetItem.id
            ? { ...it, status: "error", progress: 0, errorMessage: msg }
            : it,
        ),
      );
    }

    setIsProcessing(false);
  };

  const handleCancelCompress = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setItems((prev) =>
      prev.map((it) =>
        it.status === "processing"
          ? { ...it, status: "idle", progress: 0 }
          : it,
      ),
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const handleDeleteItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalUrl) URL.revokeObjectURL(target.originalUrl);
      if (target?.compressedUrl) URL.revokeObjectURL(target.compressedUrl);
      return prev.filter((i) => i.id !== id);
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeId === id) {
      const remaining = items.filter((i) => i.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleDeleteSelected = () => {
    setItems((prev) => {
      prev.forEach((i) => {
        if (selectedIds.has(i.id)) {
          if (i.originalUrl) URL.revokeObjectURL(i.originalUrl);
          if (i.compressedUrl) URL.revokeObjectURL(i.compressedUrl);
        }
      });
      return prev.filter((i) => !selectedIds.has(i.id));
    });
    setSelectedIds(new Set());
    setActiveId(null);
  };

  const handleDownloadSingle = (item: VideoFileItem) => {
    if (!item.compressedBlob || !item.compressedUrl) return;
    const a = document.createElement("a");
    a.href = item.compressedUrl;
    a.download = getVideoFilenameWithExtension(
      item.name,
      item.compressedFormat || settings.format,
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSelected = async () => {
    const selectedItems = items.filter(
      (i) => selectedIds.has(i.id) && i.status === "done" && i.compressedBlob,
    );
    if (selectedItems.length === 0) return;

    if (selectedItems.length === 1) {
      handleDownloadSingle(selectedItems[0]);
      return;
    }

    try {
      setIsDownloadingZip(true);
      const zip = new JSZip();

      for (const item of selectedItems) {
        if (item.compressedBlob) {
          const filename = getVideoFilenameWithExtension(
            item.name,
            item.compressedFormat || settings.format,
          );
          zip.file(filename, item.compressedBlob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compressed_videos.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate zip", err);
      setWarningNotice("Failed to bundle videos into ZIP archive.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
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
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const activeItem = items.find((i) => i.id === activeId) || null;
  const totalOriginalBytes = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalCompressedBytes = items.reduce(
    (acc, i) =>
      acc +
      (i.compressedSize !== undefined ? i.compressedSize : i.originalSize),
    0,
  );
  const totalEstimatedBytes = items.reduce((acc, item) => {
    const effectiveItemSettings = {
      ...settings,
      stripAudio:
        item.stripAudio !== undefined ? item.stripAudio : settings.stripAudio,
      sections: item.sections,
    };
    const est = estimateVideoSize(
      item.duration,
      effectiveItemSettings,
      item.trim,
      item.originalDimensions.width,
      item.originalDimensions.height,
      item.originalSize,
      item.sections,
    );
    return acc + (est > 0 ? est : item.originalSize);
  }, 0);
  const hasUncompressed = items.some((i) => i.status !== "done");
  const hasPendingChanges = items.some(
    (i) =>
      i.status === "done" &&
      hasSettingsChanged(
        settings,
        i.lastCompressedSettings,
        i.trim,
        i.stripAudio,
        i.sections,
        i.duration,
      ),
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex w-full flex-col gap-4 select-none"
    >
      <Toolbar
        settings={settings}
        onSettingsChange={setSettings}
        onFilesSelected={handleFilesSelected}
        selectedCount={selectedIds.size}
        totalCount={items.length}
        onToggleSelectAll={handleToggleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        onDownloadSelected={handleDownloadSelected}
        isDownloadingZip={isDownloadingZip}
        totalOriginalBytes={totalOriginalBytes}
        totalCompressedBytes={totalCompressedBytes}
        totalEstimatedBytes={totalEstimatedBytes}
        isProcessing={isProcessing}
        processingIndex={processingIndex}
        processingTotal={items.length}
        onStartCompress={handleStartCompress}
        onCancelCompress={handleCancelCompress}
        hasUncompressed={hasUncompressed}
        hasPendingChanges={hasPendingChanges}
        maxFiles={10}
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
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFilesSelected}
          isDraggingOver={isDraggingOver}
          maxFiles={10}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-2 lg:col-span-7">
            <div className="flex flex-col bg-white">
              <div className="border-utils-scent-gray-01/40 text-foreground/70 flex items-center gap-2 border-b p-2 text-[11px] tracking-wider uppercase">
                <span>Queued Videos ({items.length}/10)</span>
                <span>&bull;</span>
                <span>{formatBytes(totalOriginalBytes)}</span>
              </div>

              <div className="flex max-h-[480px] flex-col overflow-y-auto">
                {items.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    settings={settings}
                    isSelected={selectedIds.has(item.id)}
                    isActive={activeId === item.id}
                    isProcessing={isProcessing}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                    onActivate={() => setActiveId(item.id)}
                    onDownload={() => handleDownloadSingle(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onOpenEdit={() => setEditingItem(item)}
                    onCompressSingle={() => handleCompressSingle(item)}
                    onOpenCompare={
                      item.status === "done" && item.compressedUrl
                        ? () => setComparingItem(item)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>

            {items.length < 10 && (
              <Dropzone
                compact
                disabled={isProcessing}
                onFilesSelected={handleFilesSelected}
                isDraggingOver={isDraggingOver}
                maxFiles={10}
              />
            )}
          </div>

          <div className="lg:col-span-5">
            <DetailsSidebar
              item={activeItem}
              settings={settings}
              onDownload={() => activeItem && handleDownloadSingle(activeItem)}
              onDelete={() => activeItem && handleDeleteItem(activeItem.id)}
              onOpenCompare={() => activeItem && setComparingItem(activeItem)}
              onOpenEdit={() => activeItem && setEditingItem(activeItem)}
            />
          </div>
        </div>
      )}

      {/* Synchronized Before / After Compare Modal */}
      {comparingItem && (
        <CompareModal
          item={comparingItem}
          isOpen={Boolean(comparingItem)}
          onClose={() => setComparingItem(null)}
          onDownload={() => handleDownloadSingle(comparingItem)}
        />
      )}

      {/* Loom / CapCut Style Precision Edit & Audio Studio Modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          settings={settings}
          onClose={() => setEditingItem(null)}
          onApply={handleApplyEdit}
          onCompressNow={(targetItem, newTrim, newStripAudio, newSections) => {
            handleApplyEdit(targetItem, newTrim, newStripAudio, newSections);
            handleCompressSingle({
              ...targetItem,
              trim: newTrim,
              stripAudio: newStripAudio,
              sections: newSections,
            });
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
