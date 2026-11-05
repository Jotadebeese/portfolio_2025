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

  if (compact) {
    return (
      <div
        onClick={() => {
          if (!disabled) fileInputRef.current?.click();
        }}
        className={clsx(
          "border-border-color text-foreground/70 flex items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-xs transition-all",
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
      onClick={() => fileInputRef.current?.click()}
      className={clsx(
        "border-border-color flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-14 text-center transition-all",
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

      <div className="border-border-color flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xs">
        <Film className="text-foreground/70 h-6 w-6 stroke-[1]" />
      </div>

      <div className="flex flex-col gap-1">
        <h4>Drop your videos here, or browse files</h4>
        <p className="text-foreground/70 max-w-sm text-xs">
          Batch optimize up to {maxFiles} videos &bull; 100% locally in your
          browser.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
        {["mp4", "mov", "webm", "m4v"].map((ext) => (
          <span
            key={ext}
            className="border-border-color text-foreground/70 rounded bg-white px-1.5 py-0.5 font-mono"
          >
            .{ext}
          </span>
        ))}
      </div>

      <div className="border-border-color text-foreground/70 flex items-center gap-1.5 border-t border-dashed pt-3 text-[11px]">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span>
          100% Private. Compressed locally in your browser via GPU WebCodecs
        </span>
      </div>
    </div>
  );
}
