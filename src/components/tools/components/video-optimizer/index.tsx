"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import JSZip from "jszip";
import { VideoFileItem, VideoOptimizerSettings, VideoSection } from "./types";
import {
  getVideoMetadata,
  compressVideo,
  calculateTargetVideoDimensions,
} from "./utils/compress-video";
import {
  formatBytes,
  formatDuration,
  calculateSavings,
  estimateVideoSize,
  getVideoOrientation,
  getVideoFilenameWithExtension,
  hasSettingsChanged,
  getAdaptedPresetForTargetSize,
  getEffectiveVideoDuration,
  hasEffectiveTrim,
} from "./utils/format";
import Dropzone from "./components/dropzone";
import FileRow from "./components/file-row";
import Toolbar from "./components/toolbar";
import CompareModal from "./components/compare-modal";
import EditModal from "./components/edit-modal";
import {
  Film,
  Trash2,
  X,
  Volume2,
  VolumeX,
  Download,
  Columns2,
  Scissors,
} from "lucide-react";

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

  const activeOrientation = activeItem
    ? getVideoOrientation(
        activeItem.originalDimensions.width,
        activeItem.originalDimensions.height,
      )
    : null;

  const activeEffectiveDuration = activeItem
    ? getEffectiveVideoDuration(
        activeItem.duration,
        activeItem.trim,
        activeItem.sections,
      )
    : 0;

  const activeItemIsTrimmed = activeItem
    ? hasEffectiveTrim(
        activeItem.duration,
        activeItem.trim,
        activeItem.sections,
      )
    : false;

  const activeEffectiveStripAudio = activeItem
    ? activeItem.stripAudio !== undefined
      ? activeItem.stripAudio
      : Boolean(settings.stripAudio)
    : Boolean(settings.stripAudio);

  const activeEffectivePreset =
    activeItem && settings.mode === "target-size"
      ? getAdaptedPresetForTargetSize(
          settings.targetSizeMB ?? 8,
          activeEffectiveDuration,
          activeEffectiveStripAudio,
          settings.resizePreset,
          settings.format,
        )
      : settings.resizePreset;

  const activeTargetDims =
    activeItem && activeItem.originalDimensions.width > 0
      ? calculateTargetVideoDimensions(
          activeItem.originalDimensions.width,
          activeItem.originalDimensions.height,
          activeEffectivePreset,
          settings.customMaxDimension,
        )
      : null;

  const activeEffectiveSettings = activeItem
    ? {
        ...settings,
        stripAudio: activeEffectiveStripAudio,
        sections: activeItem.sections,
      }
    : settings;

  const activeEstimatedBytes = activeItem
    ? estimateVideoSize(
        activeItem.duration,
        activeEffectiveSettings,
        activeItem.trim,
        activeItem.originalDimensions.width,
        activeItem.originalDimensions.height,
        activeItem.originalSize,
        activeItem.sections,
      )
    : 0;

  const activeItemHasChanged =
    activeItem && activeItem.status === "done"
      ? hasSettingsChanged(
          settings,
          activeItem.lastCompressedSettings,
          activeItem.trim,
          activeItem.stripAudio,
          activeItem.sections,
          activeItem.duration,
        )
      : false;

  const activeEstimatedSavings =
    activeItem && activeEstimatedBytes > 0
      ? calculateSavings(activeItem.originalSize, activeEstimatedBytes)
      : null;

  const activeRealSavings =
    activeItem && activeItem.compressedSize !== undefined
      ? calculateSavings(activeItem.originalSize, activeItem.compressedSize)
      : null;

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

      {/* Notice Alert */}
      {warningNotice && (
        <div className="bg-code-rust/10 text-foreground flex items-center justify-between gap-2 rounded-md p-2 text-xs transition-all">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-medium">Notice:</span>
            <span className="text-foreground/70 truncate">{warningNotice}</span>
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
          {/* Main Queue (Left) */}
          <div className="flex flex-col gap-2 lg:col-span-7">
            <div className="flex flex-col bg-white">
              {/* Header Bar */}
              <div className="border-utils-scent-gray-01/40 text-foreground/70 flex items-center justify-between border-b p-2 text-[11px] tracking-wider uppercase">
                <div className="flex items-center gap-2">
                  <span>Queued Videos ({items.length}/10)</span>
                  <span className="text-foreground/40">&bull;</span>
                  <span>{formatBytes(totalOriginalBytes)}</span>
                </div>

                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleDeleteSelected}
                    className="flex cursor-pointer items-center gap-1 text-rose-600 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      isProcessing
                        ? "Disabled during compression"
                        : "Delete selected"
                    }
                  >
                    <Trash2 size={12} />
                    <span>Delete ({selectedIds.size})</span>
                  </button>
                )}
              </div>

              {/* Items List */}
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

            {/* Compact Dropzone for adding more clips */}
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

          {/* Inspector / Preview Pane (Right) */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            <div className="border-border-color/40 flex flex-col gap-3 border bg-white p-3">
              <div className="border-utils-scent-gray-01/40 text-foreground/70 flex items-center justify-between border-b pb-2 text-[11px] tracking-wider uppercase">
                <span>Clip Inspector</span>
                {activeOrientation && (
                  <span className="text-foreground/70 font-mono text-[10px]">
                    {activeOrientation.label} ({activeOrientation.ratio})
                  </span>
                )}
              </div>

              {activeItem && activeOrientation ? (
                <div className="flex flex-col gap-3">
                  {/* Aspect-Ratio-Preserving Preview Container */}
                  <div className="border-border-color relative flex max-h-[300px] min-h-[200px] w-full items-center justify-center overflow-hidden rounded border bg-black/95 p-1.5">
                    {activeItem.compressedUrl ? (
                      <video
                        src={activeItem.compressedUrl}
                        controls
                        playsInline
                        className="max-h-[285px] w-auto max-w-full rounded object-contain"
                      />
                    ) : activeItem.thumbnailUrl ? (
                      <img
                        src={activeItem.thumbnailUrl}
                        alt={activeItem.name}
                        className="max-h-[285px] w-auto max-w-full rounded object-contain"
                      />
                    ) : (
                      <Film className="h-8 w-8 text-white/30" />
                    )}

                    {/* Orientation Badge Overlaid */}
                    <span className="absolute top-2 left-2 rounded border border-white/20 bg-black/80 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-xs">
                      {activeOrientation.label} &bull; {activeOrientation.ratio}
                    </span>

                    {/* Duration Badge Overlaid */}
                    {!activeItem.compressedUrl && activeItem.duration > 0 && (
                      <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
                        {formatDuration(activeEffectiveDuration)}
                      </span>
                    )}
                  </div>

                  {/* Comprehensive Specs Grid: Native -> Proposed/Target -> Final */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Resolution Card */}
                    <div className="bg-foreground/5 flex flex-col justify-between rounded p-2">
                      <span className="text-foreground/60 block text-[10px] tracking-wider uppercase">
                        Resolution
                      </span>
                      <div className="mt-1">
                        <span className="text-foreground block text-xs font-medium">
                          {activeItem.originalDimensions.width > 0
                            ? `${activeItem.originalDimensions.width} × ${activeItem.originalDimensions.height}`
                            : "Probing..."}
                        </span>

                        {activeItem.status === "done" &&
                        activeItem.compressedDimensions ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="block font-mono text-[10px] font-medium text-emerald-600">
                              &rarr; {activeItem.compressedDimensions.width}{" "}
                              &times; {activeItem.compressedDimensions.height}{" "}
                              (Done)
                            </span>
                            {activeTargetDims &&
                              (activeTargetDims.width !==
                                activeItem.compressedDimensions.width ||
                                activeTargetDims.height !==
                                  activeItem.compressedDimensions.height) && (
                                <span className="text-utils-scent-orange block font-mono text-[9px]">
                                  New Target: {activeTargetDims.width} &times;{" "}
                                  {activeTargetDims.height}
                                  {activeEffectivePreset !==
                                  settings.resizePreset
                                    ? ` (Auto-adapted to ${activeEffectivePreset})`
                                    : ` (${settings.resizePreset})`}
                                </span>
                              )}
                          </div>
                        ) : activeTargetDims ? (
                          <span className="text-foreground/60 block font-mono text-[10px]">
                            &rarr; {activeTargetDims.width} &times;{" "}
                            {activeTargetDims.height}
                            {activeEffectivePreset !== settings.resizePreset
                              ? ` (Auto-adapted to ${activeEffectivePreset})`
                              : ` (${settings.resizePreset})`}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* File Size Card (Original -> Estimated -> Real) */}
                    <div className="bg-foreground/5 flex flex-col justify-between rounded p-2">
                      <span className="text-foreground/60 block text-[10px] tracking-wider uppercase">
                        File Size
                      </span>
                      <div className="mt-1">
                        <span className="text-foreground block text-xs font-medium">
                          {formatBytes(activeItem.originalSize)}
                        </span>

                        {activeItem.status === "done" &&
                        activeItem.compressedSize !== undefined ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="block font-mono text-[10px] font-semibold text-emerald-600">
                              &rarr; {formatBytes(activeItem.compressedSize)} (
                              {activeRealSavings?.isReduced
                                ? `-${activeRealSavings.percentSaved}%`
                                : `+${Math.abs(activeRealSavings?.percentSaved || 0)}%`}
                              )
                            </span>
                            {activeItemHasChanged && activeEstimatedSavings && (
                              <span className="text-utils-scent-orange block font-mono text-[10px] font-medium">
                                New Est: ~{formatBytes(activeEstimatedBytes)} (
                                {activeEstimatedSavings.isReduced
                                  ? `-${activeEstimatedSavings.percentSaved}%`
                                  : `+${Math.abs(activeEstimatedSavings.percentSaved)}%`}
                                )
                              </span>
                            )}
                          </div>
                        ) : activeEstimatedSavings ? (
                          <span className="text-utils-scent-orange block font-mono text-[10px]">
                            &rarr; ~{formatBytes(activeEstimatedBytes)} (Est. -
                            {activeEstimatedSavings.percentSaved}%)
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Duration Card (Native -> Trimmed) */}
                    <div className="bg-foreground/5 flex flex-col justify-between rounded p-2">
                      <span className="text-foreground/60 block text-[10px] tracking-wider uppercase">
                        Duration
                      </span>
                      <div className="mt-1">
                        <span className="text-foreground block text-xs font-medium">
                          {activeItem.duration > 0
                            ? `${formatDuration(activeItem.duration)} (${activeItem.duration.toFixed(1)}s)`
                            : "Probing..."}
                        </span>

                        {activeItemIsTrimmed && (
                          <span className="text-utils-scent-orange block font-mono text-[10px]">
                            &rarr; {formatDuration(activeEffectiveDuration)} (
                            {activeEffectiveDuration.toFixed(1)}s trimmed)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Audio Track Card */}
                    <div className="bg-foreground/5 flex flex-col justify-between rounded p-2">
                      <span className="text-foreground/60 block text-[10px] tracking-wider uppercase">
                        Audio Track
                      </span>
                      <div className="mt-1">
                        <span className="text-foreground flex items-center gap-1 text-xs font-medium">
                          {activeItem.hasAudio ? (
                            <>
                              <Volume2 size={12} className="text-emerald-500" />
                              <span>Present</span>
                            </>
                          ) : (
                            <>
                              <VolumeX
                                size={12}
                                className="text-foreground/40"
                              />
                              <span>Muted</span>
                            </>
                          )}
                        </span>

                        <span className="text-foreground/60 block font-mono text-[10px]">
                          &rarr;{" "}
                          {(
                            activeItem.stripAudio !== undefined
                              ? activeItem.stripAudio
                              : settings.stripAudio
                          )
                            ? "Strip (Muted Loop)"
                            : "Preserve Audio"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Studio & Waveform Action Card */}
                  <div className="border-border-color/60 bg-foreground/5 flex flex-col gap-2 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                          Edit Studio & Waveform
                        </span>
                        <span className="text-foreground mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                          {activeItem.sections &&
                          activeItem.sections.some((s) => s.isDeleted) ? (
                            <span className="text-utils-scent-orange font-mono">
                              {
                                activeItem.sections.filter((s) => s.isDeleted)
                                  .length
                              }{" "}
                              cuts ({formatDuration(activeEffectiveDuration)}{" "}
                              kept)
                            </span>
                          ) : activeItemIsTrimmed && activeItem.trim ? (
                            <span className="text-utils-scent-orange font-mono">
                              Trim: {formatDuration(activeItem.trim.start)}{" "}
                              &rarr; {formatDuration(activeItem.trim.end)}
                            </span>
                          ) : (
                            <span className="text-foreground/70">
                              Full clip ({formatDuration(activeItem.duration)})
                            </span>
                          )}
                          <span className="text-foreground/30">&bull;</span>
                          <span className="text-foreground/70 font-mono">
                            {(
                              activeItem.stripAudio !== undefined
                                ? activeItem.stripAudio
                                : settings.stripAudio
                            )
                              ? "Audio Stripped"
                              : "Audio Kept"}
                          </span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingItem(activeItem)}
                        className="bg-foreground text-background hover:bg-utils-scent-orange flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium shadow-xs transition-colors hover:text-white"
                      >
                        <Scissors size={13} />
                        <span>Open Studio</span>
                      </button>
                    </div>
                  </div>

                  {/* Compressed Summary & Compare Button if Done */}
                  {activeItem.status === "done" &&
                    activeItem.compressedSize !== undefined && (
                      <div className="flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold tracking-wider text-emerald-600 uppercase">
                              Final Output
                            </span>
                            <span className="text-foreground text-xs font-medium">
                              {formatBytes(activeItem.compressedSize)} &bull;{" "}
                              {activeItem.compressedDimensions?.width} &times;{" "}
                              {activeItem.compressedDimensions?.height}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setComparingItem(activeItem)}
                              className="border-border-color hover:bg-utils-scent-gray-01/30 text-foreground flex cursor-pointer items-center gap-1 rounded border bg-white px-2 py-1 text-xs font-medium transition-colors"
                              title="Compare original vs compressed video side-by-side"
                            >
                              <Columns2 size={12} />
                              <span className="hidden sm:inline">Compare</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(activeItem)}
                              className="flex cursor-pointer items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                              title="Download compressed video"
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-foreground/50 py-12 text-center text-xs">
                  Select a video from the queue to inspect details
                </div>
              )}
            </div>
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
