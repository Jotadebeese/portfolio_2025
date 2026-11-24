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
    "border-foreground bg-foreground text-background hover:bg-foreground/90",
  secondary:
    "border-border-color bg-background text-foreground hover:bg-utils-scent-gray-01/35",
  outline:
    "border-border-color bg-white text-foreground hover:bg-background",
  danger:
    "border-border-color bg-white text-foreground/70 hover:text-code-rust hover:bg-utils-scent-gray-01/30",
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
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transform-none motion-reduce:transition-none";

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
