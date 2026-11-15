import clsx from "clsx";
import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type CTAButtonVariant = "primary" | "secondary";
type CTAButtonSize = "sm" | "md";

type CommonProps = {
  variant?: CTAButtonVariant;
  size?: CTAButtonSize;
  className?: string;
  children: ReactNode;
};

type LinkCTAProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href"> & {
    href: string;
    external?: boolean;
  };

type NativeButtonCTAProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

export type CTAButtonProps = LinkCTAProps | NativeButtonCTAProps;

const VARIANT_CLASSES: Record<CTAButtonVariant, string> = {
  primary:
    "border-foreground bg-foreground text-background shadow-xs hover:bg-foreground/90",
  secondary:
    "border-utils-scent-gray-01 bg-[color-mix(in_srgb,var(--utils-scent-gray-01)_60%,white)] text-foreground shadow-xs hover:bg-utils-scent-gray-01",
};

const SIZE_CLASSES: Record<CTAButtonSize, string> = {
  sm: "min-h-9 px-3.5 py-1.5 text-sm",
  md: "min-h-10 px-4 py-2 text-sm",
};

const BASE_CLASSES =
  "group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border font-normal transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground motion-reduce:transform-none motion-reduce:transition-none";

/**
 * Shared CTA component for actions (<button>), routes (<Link>), and same-page hash/external links (<a>).
 */
export default function CTAButton(props: CTAButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = clsx(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  if (typeof props.href === "string") {
    const {
      href,
      external,
      variant: _variant,
      size: _size,
      className: _className,
      children: _children,
      rel,
      target,
      ...anchorProps
    } = props;

    // Native <a> for hash anchors avoids Next.js router ignoring clicks when the hash is already in the URL.
    if (href.startsWith("#") || external) {
      return (
        <a
          href={href}
          target={external ? (target ?? "_blank") : target}
          rel={external ? (rel ?? "noopener noreferrer") : rel}
          className={classes}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const {
    href: _href,
    variant: _variant,
    size: _size,
    className: _className,
    children: _children,
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
