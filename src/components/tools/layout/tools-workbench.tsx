"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import clsx from "clsx";
import {
  Check,
  Plus,
  Share2,
  SlidersHorizontal,
  Wrench,
  RotateCcw,
} from "lucide-react";
import ToolCard from "../components/tool-card";
import ToolSkeleton from "./tool-skeleton";
import { AVAILABLE_TOOLS, ToolId } from "../types";

const SecretGenerator = lazy(() => import("../components/secret-generator"));

type Props = {
  heading?: string | null;
  description?: string | null;
  defaultTools?:
    | ("secret-generator" | "jwt-inspector" | "image-optimizer")[]
    | null;
};

export default function ToolsWorkbench({
  heading,
  description,
  defaultTools,
}: Props) {
  const fallbackTools: ToolId[] = defaultTools?.length
    ? (defaultTools as ToolId[])
    : ["secret-generator"];

  const [activeTools, setActiveTools] = useState<ToolId[]>(fallbackTools);
  const [copiedShare, setCopiedShare] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const toolsParam = params.get("tools");

    if (toolsParam) {
      const parsed = toolsParam
        .split(",")
        .filter((t) =>
          AVAILABLE_TOOLS.some((item) => item.id === t),
        ) as ToolId[];

      if (parsed.length > 0) {
        setActiveTools(parsed);
      }
    }

    const handleHash = () => {
      const hash = window.location.hash.replace("#", "") as ToolId;
      if (AVAILABLE_TOOLS.some((item) => item.id === hash)) {
        setActiveTools((prev) =>
          prev.includes(hash) ? prev : [...prev, hash],
        );
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const updateUrl = (tools: ToolId[]) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    if (tools.length > 0) {
      url.searchParams.set("tools", tools.join(","));
    } else {
      url.searchParams.delete("tools");
    }

    window.history.replaceState({}, "", url.toString());
  };

  const toggleTool = (id: ToolId) => {
    const next = activeTools.includes(id)
      ? activeTools.filter((t) => t !== id)
      : [...activeTools, id];

    setActiveTools(next);
    updateUrl(next);
  };

  const closeTool = (id: ToolId) => {
    const next = activeTools.filter((t) => t !== id);
    setActiveTools(next);
    updateUrl(next);
  };

  const resetTools = () => {
    setActiveTools(fallbackTools);
    updateUrl(fallbackTools);
  };

  const shareWorkspace = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const sectionHeading = heading || "Tools Workbench";
  const sectionId =
    sectionHeading
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "tools-workbench";

  return (
    <section id={sectionId} className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-1 pb-2">
        <h2>{sectionHeading}</h2>
        {description && <p>{description}</p>}
      </div>

      <div className="flex w-full flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <small>
              Tools{" "}
              <span className="bg-utils-scent-gray-01/60 rounded-md px-1.5 py-1">
                {activeTools.length} of {AVAILABLE_TOOLS.length} selected
              </span>
            </small>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={shareWorkspace}
              className="bg-background text-foreground flex cursor-pointer items-center gap-1.5 rounded-md p-1.5 text-xs transition-all hover:opacity-80"
              title="Copy shareable link with current active tools"
            >
              {copiedShare ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              <span>Share</span>
            </button>

            <button
              onClick={resetTools}
              className="bg-background text-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-md p-1.5 text-xs transition-all hover:opacity-80"
              title="Reset to default tools"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOOLS.map((tool) => {
            const isOpen = activeTools.includes(tool.id);

            return (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                className={clsx(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-all hover:opacity-80",
                  isOpen
                    ? "bg-foreground border-foreground border-solid text-white"
                    : "border-border-color border-dashed bg-white",
                )}
              >
                {isOpen ? (
                  <Check className="text-utils-scent-orange h-3.5 w-3.5 stroke-[2]" />
                ) : (
                  <Plus className="text-foreground/70 h-3.5 w-3.5" />
                )}
                <span>{tool.name}</span>
                <span className="text-foreground bg-background hidden rounded-md px-1.5 py-1 text-[10px] md:inline">
                  {tool.apiBadge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTools.length === 0 ? (
        <div className="border-border-color text-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
          <Wrench className="text-foreground h-5 w-5 stroke-1" />
          <small>All tools are currently closed.</small>
          <small className="text-foreground/70">
            Click any tool in the selector tray above to dock it into your
            workbench.
          </small>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activeTools.map((toolId) => {
            const def = AVAILABLE_TOOLS.find((t) => t.id === toolId);
            if (!def) return null;

            return (
              <ToolCard
                key={toolId}
                id={toolId}
                title={def.name}
                apiBadge={def.apiBadge}
                onClose={() => closeTool(toolId)}
              >
                <Suspense fallback={<ToolSkeleton toolId={toolId} />}>
                  {toolId === "secret-generator" && <SecretGenerator />}

                  {toolId === "jwt-inspector" && (
                    <div className="border-border-color flex flex-col items-center justify-center gap-1 rounded-md border border-dashed py-8 text-center">
                      <span className="text-utils-scent-orange font-mono text-xs uppercase">
                        Coming in Stage 2
                      </span>
                      <h4>Zero-Knowledge JWT Token Inspector</h4>
                      <p className="text-foreground/70 max-w-sm text-xs">
                        Paste and decode JWT tokens, inspect claims, and track
                        expiration timers completely in-browser with zero
                        network calls.
                      </p>
                    </div>
                  )}

                  {toolId === "image-optimizer" && (
                    <div className="border-border-color flex flex-col items-center justify-center gap-1 rounded-md border border-dashed py-8 text-center">
                      <span className="text-utils-scent-orange font-mono text-xs uppercase">
                        Coming in Stage 2
                      </span>
                      <h4>HTML5 Canvas Image Compressor</h4>
                      <p className="text-foreground/70 max-w-sm text-xs">
                        Batch compress images to WebP, downsample dimensions,
                        and calculate real-time byte savings locally.
                      </p>
                    </div>
                  )}
                </Suspense>
              </ToolCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
