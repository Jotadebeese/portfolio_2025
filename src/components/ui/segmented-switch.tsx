"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  sublabel?: ReactNode;
  title?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  struck?: boolean;
  mono?: boolean;
}

type SegmentedSwitchProps<T extends string | number> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "xs" | "sm";
  showLed?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
};

/**
 * Recessed hardware channel housing tactile raised keycaps for mutually
 * exclusive tool parameter switches.
 */
export default function SegmentedSwitch<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  size = "sm",
  showLed = false,
  className,
  title,
  ariaLabel,
}: SegmentedSwitchProps<T>) {
  return (
    <div
      title={title}
      aria-label={ariaLabel}
      className={clsx(
        "border-border-color/90 inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-md border bg-[#e6e3dd] p-0.5 shadow-[inset_0_1px_2px_rgba(24,20,17,0.12)]",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = !opt.struck && value === opt.value;
        const isBtnDisabled = disabled || opt.disabled;

        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={isBtnDisabled}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            aria-label={opt.ariaLabel}
            className={clsx(
              "inline-flex shrink-0 cursor-pointer items-center gap-1 rounded font-medium whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-45",
              size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
              opt.mono && "font-mono",
              opt.struck
                ? "text-foreground/45 hover:text-foreground/75"
                : isActive
                  ? "bg-foreground text-background shadow-[0_1px_2px_rgba(24,20,17,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : "text-foreground/70 hover:bg-white/65 hover:text-foreground active:translate-y-px",
              opt.className,
            )}
          >
            {showLed && (
              <span
                aria-hidden="true"
                className={clsx(
                  "size-1.5 shrink-0 rounded-full transition-colors",
                  isActive ? "bg-utils-scent-orange" : "bg-foreground/15",
                )}
              />
            )}
            <span className={clsx(opt.struck && "line-through")}>{opt.label}</span>
            {opt.sublabel && (
              <span className="font-mono text-[9px] opacity-75">
                {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
