import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ToolButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "ghost";

export type ToolButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "icon-xs"
  | "icon-sm"
  | "icon-md";

export type ToolButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ToolButtonVariant;
  size?: ToolButtonSize;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<ToolButtonVariant, string> = {
  primary:
    "border-foreground bg-foreground text-background shadow-[0_1px_2px_rgba(24,20,17,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-foreground/90 active:translate-y-px active:shadow-none",
  secondary:
    "border-border-color/90 bg-[#f7f5f2] text-foreground shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] hover:bg-white active:translate-y-px active:shadow-none",
  outline:
    "border-border-color/90 bg-white text-foreground shadow-[0_1px_0_rgba(24,20,17,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-[#f7f5f2] active:translate-y-px active:shadow-none",
  danger:
    "border-border-color/90 bg-[#f7f5f2] text-foreground/75 shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-code-rust/40 hover:bg-white hover:text-code-rust active:translate-y-px active:shadow-none",
  ghost:
    "border-transparent bg-transparent text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground",
};

const SIZE_CLASSES: Record<ToolButtonSize, string> = {
  xs: "h-6 px-1.5 text-[10px]",
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-xs",
  "icon-xs": "h-6 w-6",
  "icon-sm": "h-8 w-8",
  "icon-md": "h-9 w-9",
};

const BASE_CLASSES =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transform-none motion-reduce:transition-none";

/**
 * Shared dense control button primitive for tools and toolbars (`rounded-md`).
 */
export default function ToolButton({
  variant = "secondary",
  size = "sm",
  type = "button",
  className,
  children,
  ...props
}: ToolButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
