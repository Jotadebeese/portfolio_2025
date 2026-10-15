"use client";

import React, { useRef } from "react";
import { ImagePlus, ShieldCheck, UploadCloud } from "lucide-react";
import clsx from "clsx";

type Props = {
  onFilesSelected: (files: FileList | File[]) => void;
  isDraggingOver: boolean;
  compact?: boolean;
};

export default function Dropzone({
  onFilesSelected,
  isDraggingOver,
  compact = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          "border-border-color flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-3 px-4 text-xs transition-all",
          isDraggingOver
            ? "border-utils-scent-orange bg-utils-scent-orange/5 text-utils-scent-orange"
            : "bg-background/40 hover:bg-background/70 text-foreground/70 hover:text-foreground",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          onChange={(e) => {
            if (e.target.files) onFilesSelected(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <UploadCloud className="h-4 w-4" />
        <span>Drop additional images here or click to browse</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={clsx(
        "border-border-color flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-14 px-6 text-center transition-all",
        isDraggingOver
          ? "border-utils-scent-orange bg-utils-scent-orange/5"
          : "bg-background/30 hover:bg-background/60",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="border-border-color bg-white flex h-12 w-12 items-center justify-center rounded-full border shadow-xs">
        <ImagePlus className="text-utils-scent-orange h-6 w-6 stroke-[1.5]" />
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground">
          Drop your images here, or browse files
        </h4>
        <p className="text-foreground/60 max-w-sm text-xs">
          Batch compress, convert to modern WebP / JPEG / PNG, and inspect visual quality in real-time.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
        {["PNG", "JPEG", "WebP", "AVIF"].map((ext) => (
          <span
            key={ext}
            className="border-border-color bg-white text-foreground/70 rounded border px-1.5 py-0.5 font-mono"
          >
            .{ext.toLowerCase()}
          </span>
        ))}
        <span
          className="border-border-color bg-white text-foreground/70 rounded border px-1.5 py-0.5 font-mono"
          title="GIFs are converted to modern static format (first frame extracted)"
        >
          .gif <span className="text-[10px] text-foreground/50">(static frame)</span>
        </span>
      </div>

      <div className="border-border-color mt-2 flex items-center gap-1.5 border-t border-dashed pt-3 text-[11px] text-foreground/60">
        <ShieldCheck className="text-code-blue h-3.5 w-3.5 shrink-0" />
        <span>100% Client-Side. Images never leave your device.</span>
      </div>
    </div>
  );
}
