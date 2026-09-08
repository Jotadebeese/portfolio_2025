"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, ChevronUp, Link2, X } from "lucide-react";

type Props = {
  id: string;
  title: string;
  apiBadge: string;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
};

export default function ToolCard({
  id,
  title,
  apiBadge,
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
        "group border-border-color w-full rounded-lg bg-white shadow-sm transition-all duration-200",
        className,
      )}
    >
      <header
        className={clsx(
          "border-border-color flex flex-wrap items-center justify-between gap-2 border-dashed px-4 py-2",
          isCollapsed ? "border-none" : "border-b",
        )}
      >
        <div className="flex items-center gap-2">
          <h4>{title}</h4>
          <span className="bg-utils-scent-gray-01/60 text-foreground hidden items-center rounded-md px-1.5 py-1 text-xs sm:inline-flex">
            {apiBadge}
          </span>
          <button
            onClick={handleCopyAnchor}
            className="hover:bg-utils-scent-gray-01/30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all"
            aria-label="Copy anchor link"
            title="Copy anchor link"
          >
            {copiedLink ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
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
      </header>

      {!isCollapsed && <div className="p-4">{children}</div>}
    </article>
  );
}
