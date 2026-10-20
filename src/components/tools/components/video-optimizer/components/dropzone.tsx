"use client";

import React, { useRef } from "react";
import { Film, ShieldCheck, UploadCloud } from "lucide-react";
import clsx from "clsx";

type Props = {
  onFilesSelected: (files: FileList | File[]) => void;
  isDraggingOver: boolean;
  compact?: boolean;
  maxFiles?: number;
  disabled?: boolean;
};

export default function Dropzone({
  onFilesSelected,
  isDraggingOver,
  compact = false,
  maxFiles = 10,
  disabled = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) fileInputRef.current?.click();
        }}
        className={clsx(
          "border-border-color text-foreground/70 flex items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-xs transition-all select-none",
          disabled
            ? "bg-background/20 text-foreground/40 cursor-not-allowed opacity-60"
            : isDraggingOver
              ? "border-utils-scent-orange bg-utils-scent-orange/5 cursor-pointer"
              : "bg-background/30 hover:bg-background/70 hover:text-foreground cursor-pointer",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={disabled}
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*,.mp4,.mov,.webm,.m4v"
          onChange={(e) => {
            if (e.target.files) onFilesSelected(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <UploadCloud className="h-4 w-4" />
        <span>
          {disabled
            ? `Batch limit reached (${maxFiles} videos max)`
            : `Drop additional videos or click to browse (up to ${maxFiles} clips)`}
        </span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={clsx(
        "border-border-color flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-14 text-center transition-all select-none",
        isDraggingOver
          ? "border-utils-scent-orange bg-utils-scent-orange/5"
          : "bg-background/30 hover:bg-background/70",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*,.mp4,.mov,.webm,.m4v"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="bg-foreground/5 text-foreground/80 flex h-12 w-12 items-center justify-center rounded-full">
        <Film className="h-6 w-6 stroke-[1.5]" />
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-foreground text-sm font-semibold">
          Drag and drop your videos here
        </h4>
        <small className="text-foreground/70 text-xs">
          Supports MP4, MOV, and WebM &bull; Up to {maxFiles} files per batch
        </small>
      </div>

      <div className="border-border-color/60 bg-background/50 text-foreground/80 mt-1 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]">
        <ShieldCheck className="text-utils-scent-orange h-3.5 w-3.5" />
        <span>
          100% Private &bull; Compressed locally in your browser via GPU WebCodecs
        </span>
      </div>
    </div>
  );
}
