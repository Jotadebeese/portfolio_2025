import clsx from "clsx";
import type { ReactNode } from "react";

export type BadgeVariant = "meta" | "success" | "danger" | "info" | "subtle";
export type BadgeSize = "xs" | "sm";

export type BadgeProps = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  mono?: boolean;
  className?: string;
  title?: string;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  meta: "bg-utils-scent-gray-01/60 text-foreground",
  success: "bg-utils-scent-gray-01/40 text-code-green",
  danger: "bg-utils-scent-gray-01/40 text-code-rust",
  info: "bg-utils-scent-gray-01/40 text-code-blue",
  subtle: "bg-background text-foreground/80",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-1.5 py-0.5 text-[11px]",
};

/**
 * Shared metadata and status pill used across tool cards, selectors, and readouts.
 */
export default function Badge({
  variant = "meta",
  size = "sm",
  mono = true,
  className,
  title,
  children,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center rounded-md whitespace-nowrap",
        mono && "font-mono",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
