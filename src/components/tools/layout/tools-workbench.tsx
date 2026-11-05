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
import { notifyWorkbenchTools } from "../utils/toc-sync";

const SecretGenerator = lazy(() => import("../components/secret-generator"));
const ImageOptimizer = lazy(() => import("../components/image-optimizer"));
const VideoOptimizer = lazy(() => import("../components/video-optimizer"));

type Props = {
  heading?: string | null;
  description?: string | null;
  availableTools?: ToolId[] | null;
  defaultTools?: ToolId[] | null;
  hideSelector?: boolean | null;
};

export default function ToolsWorkbench({
  heading,
  description,
  availableTools,
  defaultTools,
  hideSelector,
}: Props) {
  // Determine the pool of tools allowed in this block instance
  const toolsToDisplay =
    availableTools && availableTools.length > 0
      ? AVAILABLE_TOOLS.filter((t) => availableTools.includes(t.id))
      : AVAILABLE_TOOLS;

  // Determine initial active tools:
  // - If hideSelector is true (standalone mode), open the available/selected tool(s)
  // - If selector is enabled: ONLY open what was explicitly chosen in defaultTools.
  //   If no tool is selected in defaultTools, fallback is [] (no tools opened).
  const getInitialTools = (): ToolId[] => {
    if (hideSelector) {
      if (availableTools && availableTools.length > 0) {
        return toolsToDisplay.map((t) => t.id);
      }
      if (defaultTools && defaultTools.length > 0) {
        return defaultTools.filter((id) =>
          toolsToDisplay.some((t) => t.id === id),
        ) as ToolId[];
      }
      return toolsToDisplay.map((t) => t.id);
    }

    if (defaultTools && defaultTools.length > 0) {
      return defaultTools.filter((id) =>
        toolsToDisplay.some((t) => t.id === id),
      ) as ToolId[];
    }

    return [];
  };

  const fallbackTools = getInitialTools();
  const [activeTools, setActiveTools] = useState<ToolId[]>(fallbackTools);
  const [copiedShare, setCopiedShare] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    notifyWorkbenchTools(activeTools);
  }, [activeTools]);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    if (!hideSelector) {
      const params = new URLSearchParams(window.location.search);
      const toolsParam = params.get("tools");

      if (toolsParam) {
        const parsed = toolsParam
          .split(",")
          .filter((t) =>
            toolsToDisplay.some((item) => item.id === t),
          ) as ToolId[];

        if (parsed.length > 0) {
          setActiveTools(parsed);
          if (
            window.location.search.includes("%2C") ||
            window.location.search.includes("%2c")
          ) {
            const cleanUrl = window.location.href.replace(/%2C/gi, ",");
            window.history.replaceState({}, "", cleanUrl);
          }
        }
      }
    }

    const handleHash = () => {
      const hash = window.location.hash.replace("#", "") as ToolId;
      if (toolsToDisplay.some((item) => item.id === hash)) {
        setActiveTools((prev) =>
          prev.includes(hash) ? prev : [...prev, hash],
        );
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [hideSelector, toolsToDisplay]);

  const updateUrl = (tools: ToolId[]) => {
    if (typeof window === "undefined" || hideSelector) return;
    const url = new URL(window.location.href);

    if (tools.length > 0) {
      url.searchParams.set("tools", tools.join(","));
    } else {
      url.searchParams.delete("tools");
    }

    const cleanUrl = url.toString().replace(/%2C/gi, ",");
    window.history.replaceState({}, "", cleanUrl);
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
    const cleanUrl = window.location.href.replace(/%2C/gi, ",");
    navigator.clipboard.writeText(cleanUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const customHeading = heading?.trim();
  const sectionHeading =
    customHeading || (!hideSelector ? "Tools Workbench" : null);
  const sectionId =
    sectionHeading
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "tools-workbench";

  return (
    <section id={sectionId} className="flex w-full scroll-mt-24 flex-col gap-2">
      {(sectionHeading || description) && (
        <div className="flex flex-col gap-1 pb-2">
          {sectionHeading && <h2>{sectionHeading}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}

      {!hideSelector && (
        <div className="flex w-full flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <small>
                Tools{" "}
                <span className="bg-utils-scent-gray-01/60 rounded-md px-1.5 py-1">
                  {activeTools.length} of {toolsToDisplay.length} selected
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
            {toolsToDisplay.map((tool) => {
              const isOpen = activeTools.includes(tool.id);

              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={clsx(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-all hover:opacity-80",
                    isOpen
                      ? "bg-background border-background border-solid"
                      : "border-border-color border-dashed bg-white",
                  )}
                >
                  {isOpen ? (
                    <Check className="text-foreground h-3.5 w-3.5 stroke-[2]" />
                  ) : (
                    <Plus className="text-foreground/70 h-3.5 w-3.5" />
                  )}
                  <span>{tool.name}</span>
                  <span
                    className={clsx(
                      "text-foreground bg-background hidden rounded-md px-1.5 py-1 text-[10px] md:inline",
                      isOpen && "bg-white",
                    )}
                  >
                    {tool.apiBadge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTools.length === 0 ? (
        !hideSelector ? (
          <div className="border-border-color text-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
            <Wrench className="text-foreground h-5 w-5 stroke-1" />
            <small>All tools are currently closed.</small>
            <small className="text-foreground/70">
              Click any tool in the selector tray above to dock it into your
              workbench.
            </small>
          </div>
        ) : null
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
                onClose={hideSelector ? undefined : () => closeTool(toolId)}
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

                  {toolId === "image-optimizer" && <ImageOptimizer />}
                  {toolId === "video-optimizer" && <VideoOptimizer />}
                </Suspense>
              </ToolCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
