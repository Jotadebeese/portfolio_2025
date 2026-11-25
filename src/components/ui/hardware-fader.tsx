"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Minus, Plus } from "lucide-react";

type HardwareFaderProps = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  trackWidthClassName?: string;
  ticks?: number;
  onDecrement?: () => void;
  onIncrement?: () => void;
  decrementTitle?: string;
  incrementTitle?: string;
  decrementAriaLabel?: string;
  incrementAriaLabel?: string;
  readout?: ReactNode;
  readoutClassName?: string;
};

const STEPPER_BUTTON_CLASSES =
  "border-border-color text-foreground/75 hover:text-foreground flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border bg-[#f7f5f2] shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all hover:bg-white active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-35";

/**
 * Tactile audio-mixer style range fader backed by a native `<input type="range">`
 * for full keyboard, screen-reader, and touch support.
 */
export default function HardwareFader({
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  className,
  trackWidthClassName = "w-28 sm:w-32",
  ticks = 9,
  onDecrement,
  onIncrement,
  decrementTitle,
  incrementTitle,
  decrementAriaLabel,
  incrementAriaLabel,
  readout,
  readoutClassName,
}: HardwareFaderProps) {
  const pct =
    max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  const tickCount = Math.max(2, ticks);
  const midIndex = Math.floor((tickCount - 1) / 2);

  return (
    <div className={clsx("flex items-center gap-1.5", className)}>
      {onDecrement && (
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled || value <= min}
          className={STEPPER_BUTTON_CLASSES}
          title={decrementTitle}
          aria-label={decrementAriaLabel}
        >
          <Minus className="h-3 w-3" />
        </button>
      )}

      <div
        className={clsx(
          "relative flex flex-col justify-center py-0.5 select-none",
          trackWidthClassName,
          disabled && "opacity-50",
        )}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <div className="pointer-events-none relative flex h-5 items-center">
          <div className="border-border-color/90 relative h-2 w-full overflow-hidden rounded-full border bg-[#e2dfda] shadow-[inset_0_1px_2px_rgba(24,20,17,0.18)]">
            {pct > 0 && (
              <div
                className="bg-utils-scent-orange/75 absolute inset-y-[2px] left-[2px] rounded-full"
                style={{ width: `calc(${pct}% - 2px)` }}
              />
            )}
          </div>

          <div className="absolute inset-x-[7px] inset-y-0">
            <div
              style={{ left: `${pct}%` }}
              className="border-foreground bg-foreground peer-focus-visible:ring-utils-scent-orange absolute top-1/2 flex h-4.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[4px] border shadow-[0_1.5px_3px_rgba(24,20,17,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] transition-transform duration-100 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-active:scale-95"
            >
              <span className="bg-utils-scent-orange h-2.5 w-[2px] rounded-full" />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none mt-0.5 flex w-full items-start justify-between px-[6px]"
        >
          {Array.from({ length: tickCount }).map((_, i) => {
            const isMajor = i === 0 || i === tickCount - 1 || i === midIndex;
            return (
              <span
                key={i}
                className={clsx(
                  "w-px",
                  isMajor ? "bg-foreground/30 h-1.5" : "bg-foreground/20 h-1",
                )}
              />
            );
          })}
        </div>
      </div>

      {onIncrement && (
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled || value >= max}
          className={STEPPER_BUTTON_CLASSES}
          title={incrementTitle}
          aria-label={incrementAriaLabel}
        >
          <Plus className="h-3 w-3" />
        </button>
      )}

      {readout !== undefined && (
        <span
          className={clsx(
            "border-border-color/80 text-foreground inline-flex items-center justify-center rounded border bg-[#eae7e1]/90 px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums shadow-[inset_0_1px_2px_rgba(24,20,17,0.08)]",
            readoutClassName,
          )}
        >
          {readout}
        </span>
      )}
    </div>
  );
}
