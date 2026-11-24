"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  X,
} from "lucide-react";
import Badge from "@/components/ui/badge";

type Props = {
  id: string;
  title: string;
  description?: string;
  apiBadge: string;
  standaloneHref?: string;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
};

export default function ToolCard({
  id,
  title,
  description,
  apiBadge,
  standaloneHref,
  onClose,
  children,
  className,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyAnchor = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = id;
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <article
      id={id}
      className={clsx(
        "group border-border-color/50 w-full scroll-mt-24 rounded-xl border bg-white/30 p-1 backdrop-blur-xs",
        className,
      )}
    >
      <div className="w-full rounded-lg bg-white">
        <header
          className={clsx(
            "border-border-color flex flex-col gap-1 border-dashed px-2 py-2 sm:px-4",
            isCollapsed ? "border-none" : "border-b",
          )}
        >
          <div className="flex items-start justify-between gap-2 sm:items-center">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className="leading-snug">{title}</h4>
              <div className="flex items-center gap-1.5">
                <Badge variant="meta" size="xs" className="sm:py-1 sm:text-xs">
                  {apiBadge}
                </Badge>
                <button
                  onClick={handleCopyAnchor}
                  className="hover:bg-utils-scent-gray-01/30 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all sm:h-8 sm:w-8"
                  aria-label="Copy anchor link"
                  title="Copy anchor link"
                >
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {standaloneHref && (
                <Link
                  href={standaloneHref}
                  className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all"
                  aria-label="Open dedicated tool page"
                  title="Open dedicated tool page"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all"
                aria-label={isCollapsed ? "Expand tool" : "Collapse tool"}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="text-foreground/70 hover:bg-utils-scent-gray-01/30 hover:text-foreground flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all"
                  aria-label="Close tool"
                  title="Close tool"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {description && !isCollapsed && (
            <p className="text-foreground/70 text-xs leading-relaxed">
              {description}
            </p>
          )}
        </header>

      <div className={clsx("p-2 sm:p-4", isCollapsed && "hidden")}>{children}</div>
      </div>
    </article>
  );
}
