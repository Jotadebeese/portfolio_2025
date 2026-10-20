"use client";

import React, { useState, useEffect } from "react";
import { Scissors, Minus, Plus, RotateCcw } from "lucide-react";
import { formatDuration } from "../utils/format";
import clsx from "clsx";

type Props = {
  duration: number; // total duration in seconds
  trim?: { start: number; end: number };
  onChange: (trim?: { start: number; end: number }) => void;
  disabled?: boolean;
};

export default function Trimmer({
  duration,
  trim,
  onChange,
  disabled = false,
}: Props) {
  const [start, setStart] = useState<number>(trim?.start || 0);
  const [end, setEnd] = useState<number>(trim?.end || duration || 0);
  const [isOpen, setIsOpen] = useState<boolean>(
    Boolean(trim && (trim.start > 0 || (trim.end > 0 && trim.end < duration))),
  );

  useEffect(() => {
    if (duration > 0 && (!trim || trim.end === 0)) {
      setEnd(duration);
    } else if (trim) {
      setStart(trim.start);
      setEnd(trim.end);
    }
  }, [duration, trim]);

  const handleUpdate = (newStart: number, newEnd: number) => {
    const s = Math.max(0, Math.min(newStart, newEnd - 0.5));
    const e = Math.min(duration, Math.max(newEnd, s + 0.5));
    setStart(s);
    setEnd(e);

    if (s === 0 && (e === duration || e === 0)) {
      onChange(undefined);
    } else {
      onChange({ start: Number(s.toFixed(1)), end: Number(e.toFixed(1)) });
    }
  };

  const handleReset = () => {
    setStart(0);
    setEnd(duration);
    onChange(undefined);
    setIsOpen(false);
  };

  if (duration <= 0) return null;

  const isTrimmed = start > 0 || end < duration;
  const effectiveLength = Math.max(0, end - start);

  return (
    <div
      className={clsx(
        "border border-border-color/60 bg-foreground/5 rounded-md p-2.5 flex flex-col gap-2 select-none transition-opacity",
        disabled && "opacity-45 pointer-events-none cursor-not-allowed",
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            if (!isOpen) {
              setIsOpen(true);
            } else if (isTrimmed) {
              handleReset();
            } else {
              setIsOpen(false);
            }
          }}
          className={clsx(
            "flex items-center gap-1.5 text-xs font-medium transition-colors",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            isTrimmed
              ? "text-utils-scent-orange"
              : "text-foreground/70 hover:text-foreground",
          )}
          title={disabled ? "Disabled during compression" : undefined}
        >
          <Scissors size={13} />
          <span>
            {isTrimmed
              ? `Trimmed (${effectiveLength.toFixed(1)}s)`
              : "Trim Video Clip"}
          </span>
        </button>

        {isTrimmed && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleReset}
            className="text-foreground/50 hover:text-foreground flex items-center gap-1 text-[10px] cursor-pointer"
            title="Reset to full length"
          >
            <RotateCcw size={10} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2 pt-1 border-t border-border-color/40">
          {/* Dual Input Steppers */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Start Time Stepper */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-foreground/60 uppercase tracking-wider">
                Start Time
              </span>
              <div className="border-border-color flex items-center rounded border bg-white p-0.5">
                <button
                  type="button"
                  disabled={disabled || start <= 0}
                  onClick={() => handleUpdate(start - 0.5, end)}
                  className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground h-5 w-5 flex items-center justify-center rounded cursor-pointer disabled:opacity-30"
                >
                  <Minus size={11} />
                </button>
                <span className="flex-1 text-center font-mono text-[11px] text-foreground">
                  {formatDuration(start)} ({start.toFixed(1)}s)
                </span>
                <button
                  type="button"
                  disabled={disabled || start >= end - 0.5}
                  onClick={() => handleUpdate(start + 0.5, end)}
                  className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground h-5 w-5 flex items-center justify-center rounded cursor-pointer disabled:opacity-30"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* End Time Stepper */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-foreground/60 uppercase tracking-wider">
                End Time
              </span>
              <div className="border-border-color flex items-center rounded border bg-white p-0.5">
                <button
                  type="button"
                  disabled={disabled || end <= start + 0.5}
                  onClick={() => handleUpdate(start, end - 0.5)}
                  className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground h-5 w-5 flex items-center justify-center rounded cursor-pointer disabled:opacity-30"
                >
                  <Minus size={11} />
                </button>
                <span className="flex-1 text-center font-mono text-[11px] text-foreground">
                  {formatDuration(end)} ({end.toFixed(1)}s)
                </span>
                <button
                  type="button"
                  disabled={disabled || end >= duration}
                  onClick={() => handleUpdate(start, end + 0.5)}
                  className="hover:bg-utils-scent-gray-01/30 text-foreground/70 hover:text-foreground h-5 w-5 flex items-center justify-center rounded cursor-pointer disabled:opacity-30"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-foreground/50 text-center">
            Clip will encode from {start.toFixed(1)}s to {end.toFixed(1)}s (
            {effectiveLength.toFixed(1)}s total)
          </div>
        </div>
      )}
    </div>
  );
}
